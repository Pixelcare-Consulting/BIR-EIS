import {
  deriveBusinessStatus,
  type BusinessStatus,
} from "@/features/documents/lib/document-business-status";

/**
 * Eligibility for requesting invoice cancellation.
 * Keeps EIS transmission `status` separate from `cancellationStatus`.
 */

export type CancellationEligibilityInput = {
  status: string;
  cancellationStatus?: string | null;
};

export type CancellationEligibilityResult = {
  allowed: boolean;
  reason: string;
};

const UNAVAILABLE_REASON: Partial<Record<BusinessStatus, string>> = {
  draft: "Draft documents cannot be cancelled.",
  queued: "Queued documents cannot be cancelled until EIS accepts them.",
  submitted: "Submitted documents cannot be cancelled until EIS accepts them.",
  rejected: "Rejected documents cannot be cancelled.",
  cancellation_pending: "A cancellation request is already in progress.",
  cancelled: "This invoice is already cancelled.",
};

export function canRequestCancellation(
  document: CancellationEligibilityInput,
): CancellationEligibilityResult {
  const businessStatus = deriveBusinessStatus(document);

  if (businessStatus === "accepted") {
    return { allowed: true, reason: "" };
  }

  return {
    allowed: false,
    reason:
      UNAVAILABLE_REASON[businessStatus] ??
      "Only accepted invoices can be cancelled.",
  };
}
