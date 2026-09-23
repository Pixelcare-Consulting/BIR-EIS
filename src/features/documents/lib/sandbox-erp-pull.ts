import {
  applyErpFieldMap,
  DEFAULT_ERP_FIELD_MAP,
} from "@/features/documents/lib/bir-portal-field-map";
import type { IngestRowInput } from "@/features/documents/lib/create-outbound-drafts";

type ErpSamplePayload = Record<string, string>;

/** Sandbox ERP sync: a few varied drafts per run (no live HTTP). */
export const SANDBOX_ERP_SYNC_BATCH_MIN = 3;
export const SANDBOX_ERP_SYNC_BATCH_MAX = 5;

const SANDBOX_DOC_TYPES = [
  "sales_invoice",
  "official_receipt",
  "service_billing",
  "debit_note",
  "credit_note",
] as const;

const SANDBOX_COUNTERPARTS: Array<{ name: string; tin: string }> = [
  { name: "Sandbox Trading Co.", tin: "123-456-789-00000" },
  { name: "Demo Retail Partners", tin: "987-654-321-00000" },
  { name: "Acme Services PH", tin: "111-222-333-00000" },
  { name: "Northern Distributors Inc.", tin: "555-666-777-00000" },
  { name: "Metro Supply Chain Ltd.", tin: "444-333-222-00000" },
  { name: "Pacific Logistics Hub", tin: "" },
  { name: "Sunrise Manufacturing", tin: "222-111-000-00000" },
  { name: "Cebu Wholesale Group", tin: "888-777-666-00000" },
];

const DOC_NUM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]!;
}

function randomAlphanumeric(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += DOC_NUM_ALPHABET[randomInt(0, DOC_NUM_ALPHABET.length - 1)];
  }
  return out;
}

function randomIssueDate(): string {
  const daysAgo = randomInt(0, 90);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

/**
 * Random sandbox ERP documents (no live HTTP).
 * Uses SAP B1–style source keys; apply `fieldMap` to portal fields.
 */
function buildSandboxPayloads(connectionId: string): ErpSamplePayload[] {
  const stamp = connectionId.slice(-4).toUpperCase() || "DEMO";
  const batchSize = randomInt(
    SANDBOX_ERP_SYNC_BATCH_MIN,
    SANDBOX_ERP_SYNC_BATCH_MAX,
  );
  const usedNumbers = new Set<string>();
  const payloads: ErpSamplePayload[] = [];

  for (let index = 0; index < batchSize; index++) {
    let docNum: string;
    do {
      docNum = `ERP-${stamp}-${randomAlphanumeric(6)}`;
    } while (usedNumbers.has(docNum));
    usedNumbers.add(docNum);

    const counterpart = randomPick(SANDBOX_COUNTERPARTS);
    const docType = randomPick(SANDBOX_DOC_TYPES);
    const netBase = randomInt(400, 45_000);
    const netCents = randomInt(0, 99) / 100;
    const net = netBase + netCents;
    const vat = Math.round(net * 0.12 * 100) / 100;
    const total = Math.round((net + vat) * 100) / 100;

    payloads.push({
      DocType: docType,
      DocNum: docNum,
      DocDate: randomIssueDate(),
      DocCurrency: "PHP",
      CardName: counterpart.name,
      LicTradNum: counterpart.tin,
      DocTotalNet: formatMoney(net),
      VatSum: formatMoney(vat),
      DocTotal: formatMoney(total),
      Comments: `Sandbox ERP sync sample ${index + 1}`,
    });
  }

  return payloads;
}

function asStringRecord(
  value: unknown,
): Record<string, string> | null | undefined {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

/**
 * Pull sandbox ERP invoices and map them to portal draft field rows.
 */
export function sandboxErpPull(params: {
  connectionId: string;
  fieldMap: unknown;
}): IngestRowInput[] {
  const map =
    asStringRecord(params.fieldMap) ??
    (DEFAULT_ERP_FIELD_MAP as Record<string, string>);
  const payloads = buildSandboxPayloads(params.connectionId);

  return payloads.map((payload, index) => ({
    row: index + 1,
    fields: applyErpFieldMap(payload, map),
  }));
}
