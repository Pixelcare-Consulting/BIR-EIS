import type { Prisma } from "@/lib/database/generated/prisma/client";
import { prisma } from "@/lib/database/client";
import {
  OUTBOUND_BUSINESS_FILTER_STATUSES,
  type OutboundBusinessFilterStatus,
} from "@/features/documents/lib/document-business-status";
import {
  DOCUMENT_PAGE_SIZE,
  type DocumentDirection,
} from "@/features/documents/lib/document-list-shared";
import { logPerfTotal, measureStage } from "@/lib/perf/measure";
import { OUTBOUND_STATUSES } from "@/features/documents/schemas/document.schema";

export { DOCUMENT_PAGE_SIZE, type DocumentDirection };

/** Outbound submissions eligible for the EIS response inbox (Inbound). */
export const RESPONSE_INBOX_STATUSES = [
  "queued",
  "submitted",
  "accepted",
  "rejected",
] as const;

export interface ListDocumentsParams {
  tenantId: string;
  direction: DocumentDirection;
  status?: string;
  documentType?: string;
  q?: string;
  page?: number;
}

/** Shared scalar fields for detail pages — omits heavy `lineItems` JSON. */
const documentDetailScalars = {
  id: true,
  tenantId: true,
  direction: true,
  documentType: true,
  status: true,
  documentNumber: true,
  issueDate: true,
  currency: true,
  counterpartName: true,
  counterpartTin: true,
  lineExtensionAmount: true,
  taxAmount: true,
  totalAmount: true,
  eisJsonPayload: true,
  eisJsonMappedAt: true,
  eisReferenceId: true,
  eisAckStatus: true,
  eisAckMessage: true,
  eisAckAt: true,
  submittedAt: true,
  notes: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.InvoiceDocumentSelect;

const cancellationScalars = {
  cancellationStatus: true,
  cancellationReason: true,
  cancellationRemarks: true,
  cancellationRequestedAt: true,
  cancellationRequestedById: true,
  cancelledAt: true,
  cancellationReferenceId: true,
  cancellationAckStatus: true,
  cancellationAckMessage: true,
  cancellationAckAt: true,
  originalDocumentId: true,
} satisfies Prisma.InvoiceDocumentSelect;

function buildListWhere(
  params: ListDocumentsParams,
): Prisma.InvoiceDocumentWhereInput {
  const q = params.q?.trim();

  const base: Prisma.InvoiceDocumentWhereInput = {
    tenantId: params.tenantId,
    deletedAt: null,
    ...(params.documentType ? { documentType: params.documentType } : {}),
    ...(q
      ? {
          OR: [
            {
              documentNumber: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              counterpartName: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  if (params.direction === "inbound") {
    const statusFilter = params.status;
    if (statusFilter === "cancelled") {
      return {
        ...base,
        direction: "outbound",
        cancellationStatus: "accepted",
      };
    }
    if (statusFilter === "cancellation_pending") {
      return {
        ...base,
        direction: "outbound",
        cancellationStatus: { in: ["requested", "pending"] },
      };
    }
    return {
      ...base,
      direction: "outbound",
      status: statusFilter
        ? statusFilter
        : { in: [...RESPONSE_INBOX_STATUSES] },
      ...(statusFilter === "accepted"
        ? {
            OR: [
              { cancellationStatus: null },
              { cancellationStatus: "rejected" },
            ],
          }
        : {}),
    };
  }

  const statusFilter = params.status;
  if (statusFilter === "cancelled") {
    return {
      ...base,
      direction: "outbound",
      cancellationStatus: "accepted",
    };
  }
  if (statusFilter === "cancellation_pending") {
    return {
      ...base,
      direction: "outbound",
      cancellationStatus: { in: ["requested", "pending"] },
    };
  }

  const transmissionStatus =
    statusFilter &&
    (OUTBOUND_STATUSES as readonly string[]).includes(statusFilter)
      ? statusFilter
      : undefined;

  return {
    ...base,
    direction: "outbound",
    ...(transmissionStatus ? { status: transmissionStatus } : {}),
    ...(transmissionStatus === "accepted"
      ? {
          OR: [
            { cancellationStatus: null },
            { cancellationStatus: "rejected" },
          ],
        }
      : {}),
  };
}

export function isOutboundBusinessFilterStatus(
  value: string | undefined,
): value is OutboundBusinessFilterStatus {
  return (
    value !== undefined &&
    (OUTBOUND_BUSINESS_FILTER_STATUSES as readonly string[]).includes(value)
  );
}

export async function listDocuments(params: ListDocumentsParams) {
  const perfStart = performance.now();
  const pageRaw = params.page ?? 1;
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const skip = (page - 1) * DOCUMENT_PAGE_SIZE;
  const where = buildListWhere(params);

  const [total, rows] = await measureStage("listDocuments query", () =>
    Promise.all([
      prisma.invoiceDocument.count({ where }),
      prisma.invoiceDocument.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: DOCUMENT_PAGE_SIZE,
        select: {
          id: true,
          direction: true,
          documentType: true,
          status: true,
          documentNumber: true,
          issueDate: true,
          currency: true,
          counterpartName: true,
          counterpartTin: true,
          totalAmount: true,
          eisAckStatus: true,
          cancellationStatus: true,
          eisReferenceId: true,
          source: true,
          sourceSystem: true,
          sourceLabel: true,
          createdAt: true,
        },
      }),
    ]),
  );

  // Plain JSON for Client Components (Prisma Decimal/Date are not RSC-serializable).
  const documents = rows.map((doc) => ({
    id: doc.id,
    direction: doc.direction,
    documentType: doc.documentType,
    status: doc.status,
    documentNumber: doc.documentNumber,
    issueDate: doc.issueDate.toISOString(),
    currency: doc.currency,
    counterpartName: doc.counterpartName,
    counterpartTin: doc.counterpartTin,
    totalAmount: doc.totalAmount.toString(),
    eisAckStatus: doc.eisAckStatus,
    cancellationStatus: doc.cancellationStatus,
    eisReferenceId: doc.eisReferenceId,
    source: doc.source,
    sourceSystem: doc.sourceSystem,
    sourceLabel: doc.sourceLabel,
    createdAt: doc.createdAt.toISOString(),
  }));

  const totalPages = Math.max(1, Math.ceil(total / DOCUMENT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  logPerfTotal("listDocuments", perfStart);
  return { total, documents, page: safePage, totalPages };
}

export type GetDocumentByIdOptions = {
  /** When false, skips cancellation columns + requester relation (inbound detail). */
  includeCancellation?: boolean;
};

export async function getDocumentById(
  tenantId: string,
  id: string,
  options?: GetDocumentByIdOptions,
) {
  const includeCancellation = options?.includeCancellation !== false;

  return measureStage("getDocumentById", () =>
    prisma.invoiceDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        ...documentDetailScalars,
        ...(includeCancellation ? cancellationScalars : {}),
        createdBy: { select: { id: true, name: true, email: true } },
        ...(includeCancellation
          ? {
              cancellationRequestedBy: {
                select: { id: true, name: true, email: true },
              },
            }
          : {}),
      },
    }),
  );
}

export async function documentNumberExists(params: {
  tenantId: string;
  direction: DocumentDirection;
  documentNumber: string;
  excludeId?: string;
}): Promise<boolean> {
  const existing = await prisma.invoiceDocument.findFirst({
    where: {
      tenantId: params.tenantId,
      direction: params.direction,
      documentNumber: params.documentNumber,
      deletedAt: null,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
}

export async function getDocumentDashboardStats(tenantId: string) {
  const perfStart = performance.now();
  const baseWhere = { tenantId, deletedAt: null };

  const [statusGroups, counterparts, cancellationGroups] = await measureStage(
    "dashboard stats",
    () =>
      Promise.all([
        prisma.invoiceDocument.groupBy({
          by: ["status"],
          where: { ...baseWhere, direction: "outbound" },
          _count: { _all: true },
        }),
        prisma.invoiceDocument.groupBy({
          by: ["counterpartName"],
          where: { ...baseWhere, direction: "outbound" },
          _count: { _all: true },
          _sum: { totalAmount: true },
          orderBy: { _count: { counterpartName: "desc" } },
          take: 5,
        }),
        prisma.invoiceDocument.groupBy({
          by: ["cancellationStatus"],
          where: {
            ...baseWhere,
            direction: "outbound",
            cancellationStatus: { not: null },
          },
          _count: { _all: true },
        }),
      ]),
  );

  let outboundCount = 0;
  let inboundCount = 0;
  for (const group of statusGroups) {
    outboundCount += group._count._all;
    if (group.status === "accepted" || group.status === "rejected") {
      inboundCount += group._count._all;
    }
  }

  let cancellationPendingCount = 0;
  let cancelledCount = 0;
  for (const group of cancellationGroups) {
    if (group.cancellationStatus === "pending") {
      cancellationPendingCount = group._count._all;
    } else if (group.cancellationStatus === "accepted") {
      cancelledCount = group._count._all;
    }
  }

  logPerfTotal("getDocumentDashboardStats", perfStart);
  return {
    outboundCount,
    inboundCount,
    statusGroups,
    counterparts,
    cancellationPendingCount,
    cancelledCount,
  };
}

const DOCUMENT_LIFECYCLE_AUDIT_ACTIONS = [
  "document.cancellation_requested",
  "document.cancellation_submitted",
  "document.cancellation_accepted",
  "document.cancellation_rejected",
  "document.queued",
  "document.eis_synced",
] as const;

export async function listDocumentLifecycleAuditEvents(
  tenantId: string,
  documentId: string,
) {
  return measureStage("listDocumentLifecycleAuditEvents", () =>
    prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: "invoice_document",
        entityId: documentId,
        action: { in: [...DOCUMENT_LIFECYCLE_AUDIT_ACTIONS] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        createdAt: true,
        metadata: true,
        user: { select: { name: true, email: true } },
      },
    }),
  );
}
