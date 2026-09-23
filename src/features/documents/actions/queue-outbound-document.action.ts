"use server";

import { revalidatePath } from "next/cache";

import { queueOutboundDocumentSchema } from "@/features/documents/schemas/document.schema";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/database/client";
import { logPerfTotal, measureStage } from "@/lib/perf/measure";

import type { DocumentActionState } from "./create-outbound-document.action";

export async function queueOutboundDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const perfStart = performance.now();

  const session = await measureStage("auth", () =>
    requirePermission("documents.manage"),
  );
  const tenantId = session.user.tenantId;

  const parsed = queueOutboundDocumentSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    logPerfTotal("queueOutboundDocument", perfStart);
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
      select: { id: true, status: true, documentNumber: true },
    }),
  );

  if (!existing) {
    logPerfTotal("queueOutboundDocument", perfStart);
    return { error: "Document not found." };
  }

  if (existing.status !== "draft") {
    logPerfTotal("queueOutboundDocument", perfStart);
    return { error: "Only draft documents can be queued." };
  }

  try {
    const updated = await measureStage("db update", () =>
      prisma.invoiceDocument.update({
        where: { id: existing.id },
        data: { status: "queued", eisAckStatus: "pending" },
        select: { id: true, documentNumber: true, status: true },
      }),
    );

    await measureStage("audit", () =>
      writeAuditLog({
        tenantId,
        userId: session.user.id,
        action: "document.queued",
        entityType: "invoice_document",
        entityId: updated.id,
        metadata: {
          direction: "outbound",
          documentNumber: updated.documentNumber,
          status: updated.status,
        },
      }),
    );

    await measureStage("revalidate", async () => {
      revalidatePath("/outbound");
      revalidatePath(`/outbound/${updated.id}`);
    });

    logPerfTotal("queueOutboundDocument", perfStart);
    return {
      success: true,
      message: "Document submitted and queued for EIS transmission.",
    };
  } catch {
    logPerfTotal("queueOutboundDocument", perfStart);
    return { error: "Could not queue the document. Please try again." };
  }
}
