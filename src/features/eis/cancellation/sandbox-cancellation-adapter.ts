import type {
  CancellationAdapter,
  CancellationSubmitRequest,
  CancellationSubmitResult,
  CancellationSyncRequest,
  CancellationSyncResult,
} from "./types";

const SANDBOX_LABEL = "Sandbox EIS (certification simulation)";

function cancellationReferenceId(documentNumber: string): string {
  return `EIS-CANCEL-SANDBOX-${documentNumber}`;
}

/**
 * Deterministic accept/reject — same hash style as EIS response sync.
 * Biased toward accept for reliable demos (reject bucket ~12%).
 */
function sandboxDecideCancellation(
  documentNumber: string,
): "accepted" | "rejected" {
  const key = `cancel:${documentNumber}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 100 < 12 ? "rejected" : "accepted";
}

function sandboxCancellationMessage(
  status: "accepted" | "rejected",
): string {
  if (status === "accepted") {
    return `${SANDBOX_LABEL}: cancellation accepted.`;
  }
  return `${SANDBOX_LABEL}: cancellation rejected.`;
}

/**
 * Local certification simulator only — no HTTP to BIR production.
 *
 * When replacing with a live BIR HTTP adapter: keep network I/O outside any
 * Prisma `$transaction`. Sandbox is in-process and still follows that shape
 * so callers do not learn a BEGIN → HTTP → COMMIT pattern.
 */
export const sandboxCancellationAdapter: CancellationAdapter = {
  async submitCancellation(
    request: CancellationSubmitRequest,
  ): Promise<CancellationSubmitResult> {
    void request.eisReferenceId;
    void request.reason;
    void request.remarks;

    return {
      cancellationReferenceId: cancellationReferenceId(request.documentNumber),
      cancellationAckStatus: "pending",
      cancellationAckMessage: `${SANDBOX_LABEL}: cancellation submitted; awaiting response.`,
    };
  },

  async syncCancellationResponse(
    request: CancellationSyncRequest,
  ): Promise<CancellationSyncResult> {
    const decision = sandboxDecideCancellation(request.documentNumber);
    const referenceId =
      request.cancellationReferenceId?.trim() ||
      cancellationReferenceId(request.documentNumber);
    const now = new Date();

    return {
      cancellationStatus: decision,
      cancellationAckStatus: decision,
      cancellationAckMessage: sandboxCancellationMessage(decision),
      cancellationReferenceId: referenceId,
      cancelledAt: decision === "accepted" ? now : null,
    };
  },
};
