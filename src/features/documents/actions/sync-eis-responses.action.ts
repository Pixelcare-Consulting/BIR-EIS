"use server";

import { revalidatePath } from "next/cache";

import { deriveBusinessStatus } from "@/features/documents/lib/document-business-status";
import { defaultCancellationAdapter } from "@/features/eis/cancellation";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/database/client";
import { logPerfTotal, measureStage } from "@/lib/perf/measure";

import type { DocumentActionState } from "./create-outbound-document.action";

/** Cap per sync run so UI stays responsive; caller can run again for remainder. */
const SYNC_BATCH_SIZE = 50;
/** Parallel Prisma updates per chunk (ack payloads differ per document). */
const UPDATE_CHUNK_SIZE = 10;

function sandboxDecide(
  documentNumber: string,
  environment: string,
): "accepted" | "rejected" {
  const key = `${environment}:${documentNumber}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  // Deterministic demo mix; cert leans toward accept.
  const rejectBucket = environment === "prod" ? 28 : 18;
  return hash % 100 < rejectBucket ? "rejected" : "accepted";
}

function sandboxMessage(
  status: "accepted" | "rejected",
  environment: string,
): string {
  const envLabel = environment === "prod" ? "production" : "certification";
  if (status === "accepted") {
    return `Sandbox EIS (${envLabel}): document accepted.`;
  }
  return `Sandbox EIS (${envLabel}): document rejected (demo validation).`;
}

async function mapInChunks<T>(
  items: T[],
  chunkSize: number,
  mapper: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(mapper));
  }
}

/**
 * Sandbox refresh of pending EIS responses — no live BIR HTTP.
 * Also syncs pending invoice cancellations via the sandbox cancellation adapter.
 * Applies deterministic accept/reject using the tenant credential environment label.
 *
 * PERF / correctness: sandbox EIS calls stay outside any long DB transaction.
 * When a live BIR HTTP adapter is added, keep the same pattern — never
 * BEGIN → HTTP → COMMIT around financial POSTs.
 */
export async function syncEisResponsesAction(
  _prev: DocumentActionState,
  _formData: FormData,
): Promise<DocumentActionState> {
  void _formData;
  const perfStart = performance.now();

  const session = await measureStage("auth", () =>
    requirePermission("documents.manage"),
  );
  const tenantId = session.user.tenantId;

  const credential = await measureStage("fetch credentials", () =>
    prisma.eisCredential.findFirst({
      where: { tenantId, deletedAt: null },
      select: { environment: true },
    }),
  );
  const environment = credential?.environment === "prod" ? "prod" : "cert";

  const [pending, pendingCancellations] = await measureStage(
    "fetch pending",
    () =>
      Promise.all([
        prisma.invoiceDocument.findMany({
          where: {
            tenantId,
            direction: "outbound",
            deletedAt: null,
            status: { in: ["queued", "submitted"] },
            OR: [{ eisAckStatus: null }, { eisAckStatus: "pending" }],
          },
          select: {
            id: true,
            documentNumber: true,
            eisReferenceId: true,
            submittedAt: true,
          },
          orderBy: { createdAt: "asc" },
          take: SYNC_BATCH_SIZE,
        }),
        prisma.invoiceDocument.findMany({
          where: {
            tenantId,
            direction: "outbound",
            deletedAt: null,
            cancellationStatus: "pending",
          },
          select: {
            id: true,
            documentNumber: true,
            status: true,
            eisReferenceId: true,
            cancellationReferenceId: true,
            cancellationReason: true,
            cancellationRemarks: true,
            cancellationStatus: true,
          },
          orderBy: { createdAt: "asc" },
          take: SYNC_BATCH_SIZE,
        }),
      ]),
  );

  if (pending.length === 0 && pendingCancellations.length === 0) {
    logPerfTotal("syncEisResponses", perfStart);
    return {
      success: true,
      message: "No pending EIS responses or cancellations to refresh.",
    };
  }

  const batchMayHaveMore =
    pending.length === SYNC_BATCH_SIZE ||
    pendingCancellations.length === SYNC_BATCH_SIZE;

  const now = new Date();
  const cancellationOutcomes: Array<"accepted" | "rejected"> = [];

  try {
    await measureStage("db update responses", async () => {
      await mapInChunks(pending, UPDATE_CHUNK_SIZE, async (doc) => {
        const eisAckStatus = sandboxDecide(doc.documentNumber, environment);
        const eisReferenceId =
          doc.eisReferenceId?.trim() ||
          `EIS-SANDBOX-${environment.toUpperCase()}-${doc.documentNumber}`;

        await prisma.invoiceDocument.update({
          where: { id: doc.id },
          data: {
            status: eisAckStatus,
            eisAckStatus,
            eisAckMessage: sandboxMessage(eisAckStatus, environment),
            eisAckAt: now,
            eisReferenceId,
            submittedAt: doc.submittedAt ?? now,
          },
        });
      });
    });
    const synced = pending.length;

    await measureStage("eis + db update cancellations", async () => {
      await mapInChunks(
        pendingCancellations,
        UPDATE_CHUNK_SIZE,
        async (doc) => {
          // EIS adapter call is intentionally outside a wrapping DB transaction.
          const result =
            await defaultCancellationAdapter.syncCancellationResponse({
              documentId: doc.id,
              documentNumber: doc.documentNumber,
              cancellationReferenceId: doc.cancellationReferenceId,
              eisReferenceId: doc.eisReferenceId,
            });

          // Never mutate EIS transmission `status` or original `eisReferenceId`.
          await prisma.invoiceDocument.update({
            where: { id: doc.id },
            data: {
              cancellationStatus: result.cancellationStatus,
              cancellationReferenceId: result.cancellationReferenceId,
              cancellationAckStatus: result.cancellationAckStatus,
              cancellationAckMessage: result.cancellationAckMessage,
              cancellationAckAt: now,
              cancelledAt: result.cancelledAt,
            },
          });

          const previousBusinessStatus = deriveBusinessStatus({
            status: doc.status,
            cancellationStatus: doc.cancellationStatus,
          });

          await writeAuditLog({
            tenantId,
            userId: session.user.id,
            action:
              result.cancellationStatus === "accepted"
                ? "document.cancellation_accepted"
                : "document.cancellation_rejected",
            entityType: "invoice_document",
            entityId: doc.id,
            metadata: {
              documentNumber: doc.documentNumber,
              originalEisReferenceId: doc.eisReferenceId,
              cancellationReferenceId: result.cancellationReferenceId,
              reason: doc.cancellationReason,
              remarks: doc.cancellationRemarks,
              previousStatus: doc.status,
              previousBusinessStatus,
              cancellationStatus: result.cancellationStatus,
              cancellationAckMessage: result.cancellationAckMessage,
            },
          });

          cancellationOutcomes.push(result.cancellationStatus);
        },
      );
    });
    const cancellationsSynced = pendingCancellations.length;
    const cancellationsAccepted = cancellationOutcomes.filter(
      (status) => status === "accepted",
    ).length;
    const cancellationsRejected = cancellationsSynced - cancellationsAccepted;

    await measureStage("audit", () =>
      writeAuditLog({
        tenantId,
        userId: session.user.id,
        action: "document.eis_synced",
        entityType: "invoice_document",
        entityId: null,
        metadata: {
          environment,
          syncedCount: synced,
          documentNumbers: pending.map((d) => d.documentNumber),
          cancellationSyncedCount: cancellationsSynced,
          cancellationAcceptedCount: cancellationsAccepted,
          cancellationRejectedCount: cancellationsRejected,
          cancellationDocumentNumbers: pendingCancellations.map(
            (d) => d.documentNumber,
          ),
          batchSize: SYNC_BATCH_SIZE,
          batchMayHaveMore,
        },
      }),
    );

    await measureStage("revalidate", async () => {
      revalidatePath("/inbound");
      revalidatePath("/outbound");
      revalidatePath("/dashboard");
      for (const doc of pendingCancellations) {
        revalidatePath(`/outbound/${doc.id}`);
        revalidatePath(`/inbound/${doc.id}`);
      }
      for (const doc of pending) {
        revalidatePath(`/outbound/${doc.id}`);
        revalidatePath(`/inbound/${doc.id}`);
      }
    });

    const parts: string[] = [];
    if (synced > 0) {
      parts.push(
        synced === 1
          ? "1 EIS response"
          : `${synced} EIS responses`,
      );
    }
    if (cancellationsSynced > 0) {
      parts.push(
        cancellationsSynced === 1
          ? "1 cancellation"
          : `${cancellationsSynced} cancellations`,
      );
    }

    const baseMessage =
      parts.length === 0
        ? "Nothing to sync from sandbox."
        : `Synced ${parts.join(" and ")} from sandbox.`;
    const message = batchMayHaveMore
      ? `${baseMessage} Run again if more remain.`
      : baseMessage;

    logPerfTotal("syncEisResponses", perfStart);
    return {
      success: true,
      message,
    };
  } catch {
    logPerfTotal("syncEisResponses", perfStart);
    return {
      error: "Could not sync EIS responses. Please try again.",
    };
  }
}
