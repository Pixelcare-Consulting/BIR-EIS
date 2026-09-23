import { z } from "zod";

export const DOCUMENT_DIRECTIONS = ["outbound", "inbound"] as const;
export const DOCUMENT_TYPES = [
  "sales_invoice",
  "official_receipt",
  "service_billing",
  "debit_note",
  "credit_note",
] as const;

export const OUTBOUND_STATUSES = [
  "draft",
  "queued",
  "submitted",
  "accepted",
  "rejected",
] as const;

/** Status chips on the Inbound (EIS response) inbox — outbound submissions only. */
export const INBOUND_RESPONSE_STATUSES = [
  "queued",
  "submitted",
  "accepted",
  "rejected",
] as const;

export const EIS_ACK_STATUSES = ["pending", "accepted", "rejected"] as const;

export const DOCUMENT_TYPE_LABELS: Record<
  (typeof DOCUMENT_TYPES)[number],
  string
> = {
  sales_invoice: "Sales Invoice",
  official_receipt: "Official Receipt",
  service_billing: "Service Billing",
  debit_note: "Debit Note",
  credit_note: "Credit Note",
};

export const OUTBOUND_STATUS_LABELS: Record<
  (typeof OUTBOUND_STATUSES)[number],
  string
> = {
  draft: "Draft",
  queued: "Queued",
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
};

export const INBOUND_RESPONSE_STATUS_LABELS: Record<
  (typeof INBOUND_RESPONSE_STATUSES)[number],
  string
> = {
  queued: "Queued",
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
};

export const EIS_ACK_STATUS_LABELS: Record<
  (typeof EIS_ACK_STATUSES)[number],
  string
> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

export const CANCELLATION_STATUSES = [
  "requested",
  "pending",
  "accepted",
  "rejected",
] as const;

export const CANCELLATION_STATUS_LABELS: Record<
  (typeof CANCELLATION_STATUSES)[number],
  string
> = {
  requested: "Cancellation Requested",
  pending: "Cancellation Pending",
  accepted: "Cancelled",
  rejected: "Cancellation Rejected",
};

export const CANCELLATION_REASONS = [
  "customer_request",
  "incorrect_customer_information",
  "incorrect_amount",
  "duplicate_invoice",
  "incorrect_items_services",
  "transaction_voided",
  "other",
] as const;

export const CANCELLATION_REASON_LABELS: Record<
  (typeof CANCELLATION_REASONS)[number],
  string
> = {
  customer_request: "Customer Request",
  incorrect_customer_information: "Incorrect Customer Information",
  incorrect_amount: "Incorrect Amount",
  duplicate_invoice: "Duplicate Invoice",
  incorrect_items_services: "Incorrect Items / Services",
  transaction_voided: "Transaction Voided",
  other: "Other",
};

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (up to 2 decimals)");

const optionalTin = z
  .string()
  .trim()
  .max(32, "TIN is too long")
  .optional()
  .or(z.literal(""));

const documentBaseFields = {
  documentType: z.enum(DOCUMENT_TYPES, {
    message: "Choose a document type",
  }),
  documentNumber: z
    .string()
    .trim()
    .min(1, "Document number is required")
    .max(64, "Document number is too long"),
  issueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid issue date"),
  currency: z
    .string()
    .trim()
    .min(3, "Currency is required")
    .max(3, "Use a 3-letter currency code")
    .default("PHP"),
  counterpartName: z
    .string()
    .trim()
    .min(2, "Counterpart name is required")
    .max(200, "Counterpart name is too long"),
  counterpartTin: optionalTin,
  lineExtensionAmount: moneyString,
  taxAmount: moneyString,
  totalAmount: moneyString,
  notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .optional()
    .or(z.literal("")),
};

export const createOutboundDocumentSchema = z.object({
  ...documentBaseFields,
});

export const updateOutboundDocumentSchema = z.object({
  id: z.string().trim().min(1, "Document id is required"),
  ...documentBaseFields,
});

export const queueOutboundDocumentSchema = z.object({
  id: z.string().trim().min(1, "Document id is required"),
});

export const requestDocumentCancellationSchema = z
  .object({
    id: z.string().trim().min(1, "Document id is required"),
    reason: z.enum(CANCELLATION_REASONS, {
      message: "Choose a cancellation reason",
    }),
    remarks: z
      .string()
      .trim()
      .max(2000, "Remarks are too long")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.reason === "other" && !value.remarks?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["remarks"],
        message: "Remarks are required when the reason is Other",
      });
    }
  });

export type CreateOutboundDocumentInput = z.infer<
  typeof createOutboundDocumentSchema
>;
export type UpdateOutboundDocumentInput = z.infer<
  typeof updateOutboundDocumentSchema
>;
export type RequestDocumentCancellationInput = z.infer<
  typeof requestDocumentCancellationSchema
>;
