/** Types for EIS cancellation adapters (sandbox or future HTTP). */

/**
 * Live BIR HTTP (when added) must sit outside long DB transactions.
 * Adapters themselves should be pure I/O; callers own short Prisma updates
 * before and after the adapter call — never wrap HTTP inside `$transaction`.
 */

export type CancellationSubmitRequest = {
  documentId: string;
  documentNumber: string;
  eisReferenceId: string | null;
  reason: string;
  remarks?: string | null;
};

export type CancellationSubmitResult = {
  cancellationReferenceId: string;
  cancellationAckStatus: "pending";
  cancellationAckMessage: string;
};

export type CancellationSyncRequest = {
  documentId: string;
  documentNumber: string;
  cancellationReferenceId: string | null;
  eisReferenceId: string | null;
};

export type CancellationSyncResult = {
  cancellationStatus: "accepted" | "rejected";
  cancellationAckStatus: "accepted" | "rejected";
  cancellationAckMessage: string;
  cancellationReferenceId: string;
  cancelledAt: Date | null;
};

export interface CancellationAdapter {
  submitCancellation(
    request: CancellationSubmitRequest,
  ): Promise<CancellationSubmitResult>;
  syncCancellationResponse(
    request: CancellationSyncRequest,
  ): Promise<CancellationSyncResult>;
}
