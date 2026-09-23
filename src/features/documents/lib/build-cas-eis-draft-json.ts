/**
 * Builds an unsigned CAS-shaped BIR EIS draft JSON body from portal document fields.
 *
 * Shape follows public CAS v2.01 guidance (e.g. ClearTax PH primers)—not a claim of
 * full EIS Cert spreadsheet completeness. JWS signing / AES transmit remain later.
 */

export type CasEisDocumentType =
  | "sales_invoice"
  | "official_receipt"
  | "service_billing"
  | "debit_note"
  | "credit_note";

export type CasEisSellerInput = {
  tin: string | null | undefined;
  registeredName: string | null | undefined;
};

export type CasEisLineItemInput = {
  description?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  lineExtensionAmount?: number | string | null;
  taxAmount?: number | string | null;
  totalAmount?: number | string | null;
};

export type CasEisDraftDocumentInput = {
  id: string;
  documentType: string;
  documentNumber: string;
  issueDate: Date | string;
  currency?: string | null;
  counterpartName: string;
  counterpartTin?: string | null;
  lineExtensionAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  notes?: string | null;
  lineItems?: CasEisLineItemInput[] | null;
};

/** Sandbox cert segment until real EIS-Cert ID is wired (8 chars). */
export const CAS_EIS_SANDBOX_CERT_SEGMENT = "SANDBOX0";

const DOC_TYPE_MAP: Record<CasEisDocumentType, string> = {
  sales_invoice: "SI",
  official_receipt: "OR",
  service_billing: "SB",
  debit_note: "DN",
  credit_note: "CN",
};

/** Strip non-digits and return 9-digit TIN, or null if incomplete. */
export function normalizeTinDigits(
  tin: string | null | undefined,
): string | null {
  if (!tin) return null;
  const digits = tin.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(0, 9);
}

/** Format issue date as YYYYMMDD (UTC calendar date from Date, or parse YYYY-MM-DD). */
export function formatIssueDtm(issueDate: Date | string): string {
  if (typeof issueDate === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(issueDate.trim());
    if (match) return `${match[1]}${match[2]}${match[3]}`;
    const parsed = new Date(issueDate);
    if (!Number.isNaN(parsed.getTime())) {
      return formatIssueDtm(parsed);
    }
    return "00000000";
  }
  const y = issueDate.getUTCFullYear();
  const m = String(issueDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(issueDate.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function mapPortalDocTypeToCas(documentType: string): string {
  if (documentType in DOC_TYPE_MAP) {
    return DOC_TYPE_MAP[documentType as CasEisDocumentType];
  }
  return "SI";
}

function toMoneyNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Provisional 24-char EisUniqueId:
 * YYYYMMDD (8) + sandbox cert segment (8) + control from id/number (8).
 * Middleware-generated until real EIS-Cert ID assignment is wired.
 */
export function buildProvisionalEisUniqueId(params: {
  issueDate: Date | string;
  documentId: string;
  documentNumber: string;
  certSegment?: string;
}): string {
  const issue = formatIssueDtm(params.issueDate);
  const cert = (params.certSegment ?? CAS_EIS_SANDBOX_CERT_SEGMENT)
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 8)
    .padEnd(8, "0")
    .toUpperCase();
  const controlSource = `${params.documentId}:${params.documentNumber}`;
  let hash = 0;
  for (let i = 0; i < controlSource.length; i += 1) {
    hash = (hash * 31 + controlSource.charCodeAt(i)) >>> 0;
  }
  const control = hash.toString(16).toUpperCase().padStart(8, "0").slice(-8);
  return `${issue}${cert}${control}`;
}

export type CasEisDraftJson = {
  EisUniqueId: string;
  IssueDtm: string;
  DocType: string;
  DocNumber: string;
  Remarks: string | null;
  Currency: string;
  Seller: {
    Tin: string | null;
    BranchCode: string;
    RegisteredName: string | null;
    Address: null;
    VatClassification: null;
  };
  Buyer: {
    Tin: string | null;
    RegisteredName: string | null;
    Address: null;
    VatClassification: null;
  };
  Amounts: {
    LineExtensionAmount: number;
    TaxAmount: number;
    TotalAmount: number;
  };
  ItemList: Array<{
    LineNo: number;
    Description: string | null;
    Quantity: number;
    UnitPrice: number;
    LineExtensionAmount: number;
    TaxAmount: number;
    TotalAmount: number;
  }>;
  _meta: {
    shape: "CAS_v2.01_draft";
    signed: false;
    note: string;
  };
};

export function buildCasEisDraftJson(
  document: CasEisDraftDocumentInput,
  seller: CasEisSellerInput,
): CasEisDraftJson {
  const lineExtensionAmount = toMoneyNumber(document.lineExtensionAmount);
  const taxAmount = toMoneyNumber(document.taxAmount);
  const totalAmount = toMoneyNumber(document.totalAmount);
  const currency = (document.currency ?? "PHP").toUpperCase() || "PHP";

  const rawLines = Array.isArray(document.lineItems) ? document.lineItems : [];
  let itemList: CasEisDraftJson["ItemList"];

  if (rawLines.length > 0) {
    itemList = rawLines.map((line, index) => {
      const lineNet = toMoneyNumber(
        line.lineExtensionAmount ?? lineExtensionAmount,
      );
      const lineTax = toMoneyNumber(line.taxAmount ?? 0);
      const lineTotal = toMoneyNumber(line.totalAmount ?? lineNet + lineTax);
      return {
        LineNo: index + 1,
        Description: line.description?.trim() || null,
        Quantity: toMoneyNumber(line.quantity ?? 1),
        UnitPrice: toMoneyNumber(line.unitPrice ?? lineNet),
        LineExtensionAmount: lineNet,
        TaxAmount: lineTax,
        TotalAmount: lineTotal,
      };
    });
  } else {
    // MVP: one synthetic line from header amounts when lineItems empty.
    itemList = [
      {
        LineNo: 1,
        Description: document.documentNumber || null,
        Quantity: 1,
        UnitPrice: lineExtensionAmount,
        LineExtensionAmount: lineExtensionAmount,
        TaxAmount: taxAmount,
        TotalAmount: totalAmount,
      },
    ];
  }

  const remarks = document.notes?.trim() || null;

  return {
    EisUniqueId: buildProvisionalEisUniqueId({
      issueDate: document.issueDate,
      documentId: document.id,
      documentNumber: document.documentNumber,
    }),
    IssueDtm: formatIssueDtm(document.issueDate),
    DocType: mapPortalDocTypeToCas(document.documentType),
    DocNumber: document.documentNumber,
    Remarks: remarks,
    Currency: currency,
    Seller: {
      Tin: normalizeTinDigits(seller.tin),
      BranchCode: "00000",
      RegisteredName: seller.registeredName?.trim() || null,
      Address: null,
      VatClassification: null,
    },
    Buyer: {
      Tin: normalizeTinDigits(document.counterpartTin),
      RegisteredName: document.counterpartName?.trim() || null,
      Address: null,
      VatClassification: null,
    },
    Amounts: {
      LineExtensionAmount: lineExtensionAmount,
      TaxAmount: taxAmount,
      TotalAmount: totalAmount,
    },
    ItemList: itemList,
    _meta: {
      shape: "CAS_v2.01_draft",
      signed: false,
      note: "Draft EIS JSON (CAS-shaped) — not yet JWS-signed.",
    },
  };
}
