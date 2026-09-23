import type {
  CancellationAdapter,
  CancellationSubmitRequest,
  CancellationSubmitResult,
  CancellationSyncRequest,
  CancellationSyncResult,
} from "./types";

const NOT_IMPLEMENTED =
  "Live BIR EIS cancellation HTTP is not implemented. Official cancel/correct API contract is not in this repository — use sandbox certification simulation until a BIR-published endpoint is integrated.";

/**
 * Placeholder for a future production BIR cancellation client.
 * Intentionally not wired as `defaultCancellationAdapter`.
 */
export const liveCancellationAdapter: CancellationAdapter = {
  async submitCancellation(
    _request: CancellationSubmitRequest,
  ): Promise<CancellationSubmitResult> {
    void _request;
    throw new Error(NOT_IMPLEMENTED);
  },

  async syncCancellationResponse(
    _request: CancellationSyncRequest,
  ): Promise<CancellationSyncResult> {
    void _request;
    throw new Error(NOT_IMPLEMENTED);
  },
};
