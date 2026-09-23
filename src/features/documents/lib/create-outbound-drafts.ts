import {
  toNullableNotes,
  toNullableTin,
} from "@/features/documents/lib/document-form-data";
import {
  buildEisJsonPersistFields,
  loadEisSellerForTenant,
  newInvoiceDocumentId,
} from "@/features/documents/lib/eis-json-persist";
import { createOutboundDocumentSchema } from "@/features/documents/schemas/document.schema";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { prisma } from "@/lib/database/client";
import { logPerfTotal, measureStage } from "@/lib/perf/measure";

export type IngestDraftSource = "import" | "erp_sync";

export type IngestRowInput = {
  /** 1-based row number for UI error reporting (CSV data row or ERP sample index). */
  row: number;
  fields: Record<string, string>;
};

export type IngestRowError = {
  row: number;
  message: string;
};

export type CreateOutboundDraftsResult = {
  created: number;
  skipped: number;
  errors: IngestRowError[];
  createdIds: string[];
};

type ValidatedDraft = {
  row: number;
  documentType: string;
  documentNumber: string;
  issueDate: string;
  currency: string;
  counterpartName: string;
  counterpartTin: string | undefined;
  lineExtensionAmount: string;
  taxAmount: string;
  totalAmount: string;
  notes: string | undefined;
};

/**
 * Validate portal-shaped rows, skip duplicate document numbers, create outbound drafts.
 * Prefetches existing numbers once and batches writes + a summary audit (no N+1).
 */
export async function createOutboundDrafts(params: {
  tenantId: string;
  userId: string;
  rows: IngestRowInput[];
  source: IngestDraftSource;
  /** ERP provider code when source is erp_sync. */
  sourceSystem?: string | null;
  /** ERP connection display name when source is erp_sync. */
  sourceLabel?: string | null;
}): Promise<CreateOutboundDraftsResult> {
  const { tenantId, userId, rows, source, sourceSystem, sourceLabel } = params;
  const perfStart = performance.now();
  const errors: IngestRowError[] = [];
  const seenInBatch = new Set<string>();
  const validated: ValidatedDraft[] = [];
  let skipped = 0;

  const auditAction =
    source === "import" ? "document.imported" : "document.created";

  for (const item of rows) {
    const parsed = createOutboundDocumentSchema.safeParse({
      documentType: item.fields.documentType,
      documentNumber: item.fields.documentNumber,
      issueDate: item.fields.issueDate,
      currency: item.fields.currency || "PHP",
      counterpartName: item.fields.counterpartName,
      counterpartTin: item.fields.counterpartTin ?? "",
      lineExtensionAmount: item.fields.lineExtensionAmount,
      taxAmount: item.fields.taxAmount,
      totalAmount: item.fields.totalAmount,
      notes: item.fields.notes ?? "",
    });

    if (!parsed.success) {
      errors.push({
        row: item.row,
        message: parsed.error.issues[0]?.message ?? "Invalid row",
      });
      continue;
    }

    const data = parsed.data;
    const numberKey = data.documentNumber.toLowerCase();

    if (seenInBatch.has(numberKey)) {
      skipped += 1;
      errors.push({
        row: item.row,
        message: `Skipped duplicate document number in this batch: ${data.documentNumber}`,
      });
      continue;
    }

    seenInBatch.add(numberKey);
    validated.push({
      row: item.row,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      issueDate: data.issueDate,
      currency: data.currency,
      counterpartName: data.counterpartName,
      counterpartTin: data.counterpartTin,
      lineExtensionAmount: data.lineExtensionAmount,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
      notes: data.notes,
    });
  }

  if (validated.length === 0) {
    logPerfTotal("createOutboundDrafts", perfStart);
    return {
      created: 0,
      skipped,
      errors,
      createdIds: [],
    };
  }

  const candidateNumbers = validated.map((v) => v.documentNumber);
  const existingRows = await measureStage("prefetch existing numbers", () =>
    prisma.invoiceDocument.findMany({
      where: {
        tenantId,
        direction: "outbound",
        deletedAt: null,
        documentNumber: { in: candidateNumbers },
      },
      select: { documentNumber: true },
    }),
  );
  const existingNumbers = new Set(
    existingRows.map((row) => row.documentNumber.toLowerCase()),
  );

  const toCreate: ValidatedDraft[] = [];
  for (const item of validated) {
    if (existingNumbers.has(item.documentNumber.toLowerCase())) {
      skipped += 1;
      errors.push({
        row: item.row,
        message: `Skipped — outbound document ${item.documentNumber} already exists`,
      });
      continue;
    }
    toCreate.push(item);
  }

  if (toCreate.length === 0) {
    logPerfTotal("createOutboundDrafts", perfStart);
    return {
      created: 0,
      skipped,
      errors,
      createdIds: [],
    };
  }

  try {
    const seller = await measureStage("load EIS seller", () =>
      loadEisSellerForTenant(tenantId),
    );

    const created = await measureStage("db batch create", () =>
      prisma.$transaction(async (tx) => {
        return tx.invoiceDocument.createManyAndReturn({
          data: toCreate.map((data) => {
            const id = newInvoiceDocumentId();
            const issueDate = new Date(data.issueDate);
            const counterpartTin = toNullableTin(data.counterpartTin);
            const notes = toNullableNotes(data.notes);
            const currency = data.currency.toUpperCase();
            const eisJson = buildEisJsonPersistFields(
              {
                id,
                documentType: data.documentType,
                documentNumber: data.documentNumber,
                issueDate,
                currency,
                counterpartName: data.counterpartName,
                counterpartTin,
                lineExtensionAmount: data.lineExtensionAmount,
                taxAmount: data.taxAmount,
                totalAmount: data.totalAmount,
                notes,
              },
              seller,
            );

            return {
              id,
              tenantId,
              createdById: userId,
              direction: "outbound",
              status: "draft",
              source,
              sourceSystem: sourceSystem?.trim() || null,
              sourceLabel: sourceLabel?.trim() || null,
              documentType: data.documentType,
              documentNumber: data.documentNumber,
              issueDate,
              currency,
              counterpartName: data.counterpartName,
              counterpartTin,
              lineExtensionAmount: data.lineExtensionAmount,
              taxAmount: data.taxAmount,
              totalAmount: data.totalAmount,
              notes,
              ...eisJson,
            };
          }),
          select: { id: true, documentNumber: true },
        });
      }),
    );

    const createdIds = created.map((row) => row.id);

    await measureStage("audit", () =>
      writeAuditLog({
        tenantId,
        userId,
        action: auditAction,
        entityType: "invoice_document",
        entityId: null,
        metadata: {
          direction: "outbound",
          status: "draft",
          source,
          createdCount: createdIds.length,
          createdIds,
          documentNumbers: created.map((row) => row.documentNumber),
        },
      }),
    );

    logPerfTotal("createOutboundDrafts", perfStart);
    return {
      created: createdIds.length,
      skipped,
      errors,
      createdIds,
    };
  } catch {
    for (const item of toCreate) {
      errors.push({
        row: item.row,
        message: "Could not create draft for this row",
      });
    }
    logPerfTotal("createOutboundDrafts", perfStart);
    return {
      created: 0,
      skipped,
      errors,
      createdIds: [],
    };
  }
}
