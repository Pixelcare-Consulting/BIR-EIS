"use server";

import { revalidatePath } from "next/cache";

import { canRequestCancellation } from "@/features/documents/lib/cancellation-eligibility";
import { deriveBusinessStatus } from "@/features/documents/lib/document-business-status";
import { requestDocumentCancellationSchema } from "@/features/documents/schemas/document.schema";
import { defaultCancellationAdapter } from "@/features/eis/cancellation";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/database/client";
import { logPerfTotal, measureStage } from "@/lib/perf/measure";

import type { DocumentActionState } from "./create-outbound-document.action";

/**
 * Request + submit cancellation to the EIS adapter.
 *
 * Correctness: adapter (sandbox today; live BIR HTTP later) must stay outside
 * any long-lived DB transaction — never BEGIN → HTTP → COMMIT. Persist local
 * "requested" state, call the adapter, then persist "pending" ack fields.
 */
export async function requestDocumentCancellationAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const perfStart = performance.now();

  const session = await measureStage("auth", () =>
    requirePermission("documents.manage"),
  );
  const tenantId = session.user.tenantId;

  const parsed = requestDocumentCancellationSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason"),
    remarks: formData.get("remarks") ?? "",
  });

  if (!parsed.success) {
    logPerfTotal("requestDocumentCancellation", perfStart);
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await measureStage("fetch", () =>
    prisma.invoiceDocument.findFirst({
      where: {
        id: parsed.data.id,
        tenantId,
        direction: "outbound",
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        documentNumber: true,
        eisReferenceId: true,
        cancellationStatus: true,
      },
    }),
  );

  if (!existing) {
    logPerfTotal("requestDocumentCancellation", perfStart);
    return { error: "Document not found." };
  }

  const eligibility = canRequestCancellation(existing);
  if (!eligibility.allowed) {
    logPerfTotal("requestDocumentCancellation", perfStart);
    return { error: eligibility.reason };
  }

  const previousBusinessStatus = deriveBusinessStatus(existing);
  const remarks = parsed.data.remarks?.trim() || null;
  const now = new Date();

  try {
    await measureStage("db update requested", () =>
      prisma.invoiceDocument.update({
        where: { id: existing.id },
        data: {
          cancellationStatus: "requested",
          cancellationReason: parsed.data.reason,
          cancellationRemarks: remarks,
          cancellationRequestedAt: now,
          cancellationRequestedById: session.user.id,
          // Clear prior rejection ack when retrying after a rejected cancel.
          cancelledAt: null,
          cancellationReferenceId: null,
          cancellationAckStatus: null,
          cancellationAckMessage: null,
          cancellationAckAt: null,
        },
      }),
    );

    await measureStage("audit requested", () =>
      writeAuditLog({
        tenantId,
        userId: session.user.id,
        action: "document.cancellation_requested",
        entityType: "invoice_document",
        entityId: existing.id,
        metadata: {
          documentNumber: existing.documentNumber,
          originalEisReferenceId: existing.eisReferenceId,
          reason: parsed.data.reason,
          remarks,
          previousStatus: existing.status,
          previousBusinessStatus,
          cancellationStatus: "requested",
        },
      }),
    );

    // EIS call outside DB transaction (sandbox in-process; future HTTP must match).
    const submitResult = await measureStage("eis submit", () =>
      defaultCancellationAdapter.submitCancellation({
        documentId: existing.id,
        documentNumber: existing.documentNumber,
        eisReferenceId: existing.eisReferenceId,
        reason: parsed.data.reason,
        remarks,
      }),
    );

    await measureStage("db update pending", () =>
      prisma.invoiceDocument.update({
        where: { id: existing.id },
        data: {
          cancellationStatus: "pending",
          cancellationReferenceId: submitResult.cancellationReferenceId,
          cancellationAckStatus: submitResult.cancellationAckStatus,
          cancellationAckMessage: submitResult.cancellationAckMessage,
          cancellationAckAt: null,
        },
      }),
    );

    await measureStage("audit submitted", () =>
      writeAuditLog({
        tenantId,
        userId: session.user.id,
        action: "document.cancellation_submitted",
        entityType: "invoice_document",
        entityId: existing.id,
        metadata: {
          documentNumber: existing.documentNumber,
          originalEisReferenceId: existing.eisReferenceId,
          cancellationReferenceId: submitResult.cancellationReferenceId,
          reason: parsed.data.reason,
          remarks,
          previousStatus: existing.status,
          previousBusinessStatus,
          cancellationStatus: "pending",
        },
      }),
    );

    await measureStage("revalidate", async () => {
      revalidatePath("/outbound");
      revalidatePath(`/outbound/${existing.id}`);
      revalidatePath("/inbound");
      revalidatePath(`/inbound/${existing.id}`);
      revalidatePath("/dashboard");
    });

    logPerfTotal("requestDocumentCancellation", perfStart);
    return {
      success: true,
      message: "Cancellation submitted to Sandbox EIS (certification simulation).",
    };
  } catch {
    logPerfTotal("requestDocumentCancellation", perfStart);
    return {
      error: "Could not request cancellation. Please try again.",
    };
  }
}
