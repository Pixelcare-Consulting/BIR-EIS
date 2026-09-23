/** Shared seed constants — no DB access. */

import {
  FOUNDATION_PERMISSIONS,
  FOUNDATION_ROLES,
} from "../src/lib/auth/rbac-defaults";

export const DEMO_PASSWORD = "DemoPass123";

export const DEMO_USERS = [
  { email: "superadmin@demo.local", name: "Super Admin", roleSlug: "super_admin" },
  { email: "admin@demo.local", name: "Tenant Admin", roleSlug: "tenant_admin" },
  { email: "user@demo.local", name: "Member", roleSlug: "member" },
] as const;

export const PERMISSIONS = FOUNDATION_PERMISSIONS;
export const ROLES = FOUNDATION_ROLES;

export type SeedProfile = "core" | "minimal";

export function resolveSeedProfile(): SeedProfile {
  const raw = process.env.SEED_PROFILE?.trim().toLowerCase();
  if (raw === "core") return "core";
  return "minimal";
}

export interface DemoInvoiceDocumentSeed {
  direction: "outbound" | "inbound";
  documentType: string;
  status: string;
  documentNumber: string;
  issueDate: string;
  currency: string;
  counterpartName: string;
  counterpartTin?: string;
  lineExtensionAmount: string;
  taxAmount: string;
  totalAmount: string;
  lineItems?: Array<Record<string, string | number>>;
  eisReferenceId?: string;
  eisAckStatus?: string;
  eisAckMessage?: string;
  eisAckAt?: string;
  submittedAt?: string;
  notes?: string;
  cancellationStatus?: string;
  cancellationReason?: string;
  cancellationRemarks?: string;
  cancellationRequestedAt?: string;
  cancelledAt?: string;
  cancellationReferenceId?: string;
  cancellationAckStatus?: string;
  cancellationAckMessage?: string;
  cancellationAckAt?: string;
}

/**
 * Demo outbound submissions for the demo tenant (additive seed).
 * Inbound inbox is EIS responses for these outbound docs (not buyer invoices).
 */
export const DEMO_INVOICE_DOCUMENTS: DemoInvoiceDocumentSeed[] = [
  {
    direction: "outbound",
    documentType: "sales_invoice",
    status: "draft",
    documentNumber: "SI-2026-0001",
    issueDate: "2026-08-01",
    currency: "PHP",
    counterpartName: "San Miguel Foods",
    counterpartTin: "000123456789",
    lineExtensionAmount: "10000.00",
    taxAmount: "1200.00",
    totalAmount: "11200.00",
    lineItems: [
      {
        description: "Wholesale goods",
        quantity: 10,
        unitPrice: "1000.00",
        amount: "10000.00",
      },
    ],
    notes: "Draft sales invoice for demo",
  },
  {
    direction: "outbound",
    documentType: "official_receipt",
    status: "queued",
    documentNumber: "OR-2026-0002",
    issueDate: "2026-08-03",
    currency: "PHP",
    counterpartName: "Metro Retail Corp.",
    counterpartTin: "000987654321",
    lineExtensionAmount: "5000.00",
    taxAmount: "600.00",
    totalAmount: "5600.00",
    eisAckStatus: "pending",
    notes: "Queued for transmission — pending EIS response (demo)",
  },
  {
    direction: "outbound",
    documentType: "service_billing",
    status: "submitted",
    documentNumber: "SB-2026-0003",
    issueDate: "2026-08-05",
    currency: "PHP",
    counterpartName: "Pacific Trade PH",
    counterpartTin: "000555666777",
    lineExtensionAmount: "25000.00",
    taxAmount: "3000.00",
    totalAmount: "28000.00",
    eisReferenceId: "EIS-DEMO-SB-0003",
    eisAckStatus: "pending",
    submittedAt: "2026-08-05T10:00:00+08:00",
    notes: "Submitted — awaiting EIS response (demo)",
  },
  {
    direction: "outbound",
    documentType: "sales_invoice",
    status: "accepted",
    documentNumber: "SI-2026-0004",
    issueDate: "2026-08-06",
    currency: "PHP",
    counterpartName: "San Miguel Foods",
    counterpartTin: "000123456789",
    lineExtensionAmount: "15000.00",
    taxAmount: "1800.00",
    totalAmount: "16800.00",
    eisReferenceId: "EIS-DEMO-SI-0004",
    eisAckStatus: "accepted",
    eisAckMessage: "Document accepted by EIS (demo)",
    eisAckAt: "2026-08-06T14:30:00+08:00",
    submittedAt: "2026-08-06T09:15:00+08:00",
  },
  {
    direction: "outbound",
    documentType: "debit_note",
    status: "rejected",
    documentNumber: "DN-2026-0005",
    issueDate: "2026-08-07",
    currency: "PHP",
    counterpartName: "Metro Retail Corp.",
    counterpartTin: "000987654321",
    lineExtensionAmount: "800.00",
    taxAmount: "96.00",
    totalAmount: "896.00",
    eisReferenceId: "EIS-DEMO-DN-0005",
    eisAckStatus: "rejected",
    eisAckMessage: "Buyer TIN mismatch (demo rejection)",
    eisAckAt: "2026-08-07T11:00:00+08:00",
    submittedAt: "2026-08-07T08:00:00+08:00",
  },
  {
    direction: "outbound",
    documentType: "credit_note",
    status: "submitted",
    documentNumber: "CN-2026-0006",
    issueDate: "2026-08-08",
    currency: "PHP",
    counterpartName: "Island Logistics Co.",
    counterpartTin: "000444555666",
    lineExtensionAmount: "2200.00",
    taxAmount: "264.00",
    totalAmount: "2464.00",
    eisReferenceId: "EIS-DEMO-CN-0006",
    eisAckStatus: "pending",
    submittedAt: "2026-08-08T13:00:00+08:00",
    notes: "Credit note pending EIS response (demo)",
  },
  {
    direction: "outbound",
    documentType: "official_receipt",
    status: "accepted",
    documentNumber: "OR-2026-0007",
    issueDate: "2026-08-09",
    currency: "PHP",
    counterpartName: "Pacific Trade PH",
    counterpartTin: "000555666777",
    lineExtensionAmount: "4100.00",
    taxAmount: "492.00",
    totalAmount: "4592.00",
    eisReferenceId: "EIS-DEMO-OR-0007",
    eisAckStatus: "accepted",
    eisAckMessage: "Document accepted by EIS (demo)",
    eisAckAt: "2026-08-09T16:45:00+08:00",
    submittedAt: "2026-08-09T10:20:00+08:00",
  },
  {
    direction: "outbound",
    documentType: "sales_invoice",
    status: "accepted",
    documentNumber: "SI-2026-0008",
    issueDate: "2026-09-10",
    currency: "PHP",
    counterpartName: "Island Logistics Co.",
    counterpartTin: "000444555666",
    lineExtensionAmount: "9200.00",
    taxAmount: "1104.00",
    totalAmount: "10304.00",
    eisReferenceId: "EIS-DEMO-SI-0008",
    eisAckStatus: "accepted",
    eisAckMessage: "Document accepted by EIS (demo)",
    eisAckAt: "2026-09-10T11:00:00+08:00",
    submittedAt: "2026-09-10T08:30:00+08:00",
    cancellationStatus: "pending",
    cancellationReason: "incorrect_amount",
    cancellationRemarks: "Demo: amount correction pending sandbox EIS response",
    cancellationRequestedAt: "2026-09-12T09:00:00+08:00",
    cancellationReferenceId: "EIS-CANCEL-SANDBOX-SI-2026-0008",
    cancellationAckStatus: "pending",
    cancellationAckMessage:
      "Sandbox EIS (certification simulation): cancellation submitted; awaiting response.",
  },
  {
    direction: "outbound",
    documentType: "sales_invoice",
    status: "accepted",
    documentNumber: "SI-2026-0009",
    issueDate: "2026-09-11",
    currency: "PHP",
    counterpartName: "San Miguel Foods",
    counterpartTin: "000123456789",
    lineExtensionAmount: "6400.00",
    taxAmount: "768.00",
    totalAmount: "7168.00",
    eisReferenceId: "EIS-DEMO-SI-0009",
    eisAckStatus: "accepted",
    eisAckMessage: "Document accepted by EIS (demo)",
    eisAckAt: "2026-09-11T14:00:00+08:00",
    submittedAt: "2026-09-11T09:00:00+08:00",
    cancellationStatus: "accepted",
    cancellationReason: "customer_request",
    cancellationRemarks: "Demo: customer voided the order",
    cancellationRequestedAt: "2026-09-13T10:00:00+08:00",
    cancelledAt: "2026-09-13T10:15:00+08:00",
    cancellationReferenceId: "EIS-CANCEL-SANDBOX-SI-2026-0009",
    cancellationAckStatus: "accepted",
    cancellationAckMessage:
      "Sandbox EIS (certification simulation): cancellation accepted.",
    cancellationAckAt: "2026-09-13T10:15:00+08:00",
  },
  {
    direction: "outbound",
    documentType: "sales_invoice",
    status: "accepted",
    documentNumber: "SI-2026-0010",
    issueDate: "2026-09-14",
    currency: "PHP",
    counterpartName: "Metro Retail Corp.",
    counterpartTin: "000987654321",
    lineExtensionAmount: "3300.00",
    taxAmount: "396.00",
    totalAmount: "3696.00",
    eisReferenceId: "EIS-DEMO-SI-0010",
    eisAckStatus: "accepted",
    eisAckMessage: "Document accepted by EIS (demo)",
    eisAckAt: "2026-09-14T15:00:00+08:00",
    submittedAt: "2026-09-14T10:00:00+08:00",
    cancellationStatus: "rejected",
    cancellationReason: "duplicate_invoice",
    cancellationRemarks: "Demo: sandbox rejected this cancellation attempt",
    cancellationRequestedAt: "2026-09-15T11:00:00+08:00",
    cancellationReferenceId: "EIS-CANCEL-SANDBOX-SI-2026-0010",
    cancellationAckStatus: "rejected",
    cancellationAckMessage:
      "Sandbox EIS (certification simulation): cancellation rejected.",
    cancellationAckAt: "2026-09-15T11:20:00+08:00",
  },
];
