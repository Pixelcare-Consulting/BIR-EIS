import { OUTBOUND_STATUSES } from "@/features/documents/schemas/document.schema";

/** User-facing status derived from transmission + cancellation tracks. */
export const BUSINESS_STATUSES = [
  ...OUTBOUND_STATUSES,
  "cancellation_pending",
  "cancelled",
] as const;

export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export type BusinessStatusInput = {
  status: string;
  cancellationStatus?: string | null;
};

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
  cancellation_pending: "Cancellation pending",
  cancelled: "Cancelled",
};

/**
 * Outbound list chips: All | Draft | Pending | Submitted.
 * DB value stays `queued`; UI label is Pending via `businessStatusLabel`.
 */
export const OUTBOUND_LIST_FILTER_STATUSES = [
  "draft",
  "queued",
  "submitted",
] as const;

export type OutboundListFilterStatus =
  (typeof OUTBOUND_LIST_FILTER_STATUSES)[number];

/**
 * Full business filter values (Inbound chips + URL validation for cancel states).
 */
export const OUTBOUND_BUSINESS_FILTER_STATUSES = [
  ...OUTBOUND_STATUSES,
  "cancellation_pending",
  "cancelled",
] as const;

export type OutboundBusinessFilterStatus =
  (typeof OUTBOUND_BUSINESS_FILTER_STATUSES)[number];

export function deriveBusinessStatus(
  input: BusinessStatusInput,
): BusinessStatus {
  const cancellation = input.cancellationStatus ?? null;

  if (cancellation === "accepted") {
    return "cancelled";
  }
  if (cancellation === "requested" || cancellation === "pending") {
    return "cancellation_pending";
  }

  if (
    (OUTBOUND_STATUSES as readonly string[]).includes(input.status)
  ) {
    return input.status as BusinessStatus;
  }

  return "draft";
}

export function businessStatusLabel(
  status: BusinessStatus,
  options?: { direction?: "outbound" | "inbound" },
): string {
  if (options?.direction === "outbound" && status === "queued") {
    return "Pending";
  }
  return BUSINESS_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}
