/**
 * Port for submitting and syncing invoice cancellations.
 *
 * **Official BIR cancel/correct HTTP contract is not present in this repo.**
 * The wired default is {@link sandboxCancellationAdapter} (certification simulation
 * only — not live BIR acknowledgement). See {@link liveCancellationAdapter} for
 * the explicit not-implemented production stub.
 *
 * EIS / BIR HTTP must always run outside long-lived DB transactions
 * (never BEGIN → HTTP → COMMIT). Callers persist local state, invoke the
 * adapter, then write ack fields in a separate update.
 */
export type { CancellationAdapter } from "./types";
