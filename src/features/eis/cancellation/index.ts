export type {
  CancellationAdapter,
  CancellationSubmitRequest,
  CancellationSubmitResult,
  CancellationSyncRequest,
  CancellationSyncResult,
} from "./types";
export { sandboxCancellationAdapter } from "./sandbox-cancellation-adapter";
export { liveCancellationAdapter } from "./live-cancellation-adapter";

/** Default adapter for the portal — sandbox / certification simulation only. */
export { sandboxCancellationAdapter as defaultCancellationAdapter } from "./sandbox-cancellation-adapter";
