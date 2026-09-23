import { FileOutput } from "lucide-react";

import { PageHeaderCard } from "@/app/(app)/_components/page-header-card";
import { DocumentFiltersCard } from "@/features/documents/components/document-filters-card";
import { DocumentListTable } from "@/features/documents/components/document-list-table";
import { NewDocumentChooser } from "@/features/documents/components/new-document-chooser";
import {
  isOutboundBusinessFilterStatus,
  listDocuments,
} from "@/features/documents/lib/document-queries";
import {
  businessStatusLabel,
  OUTBOUND_LIST_FILTER_STATUSES,
} from "@/features/documents/lib/document-business-status";
import {
  DOCUMENT_TYPES,
} from "@/features/documents/schemas/document.schema";
import {
  hasPermission,
  requirePermission,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/database/client";

export const metadata = {
  title: "Outbound · BIR EIS",
};

export default async function OutboundPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    q?: string;
    documentType?: string;
  }>;
}) {
  const session = await requirePermission("documents.view");
  const params = await searchParams;
  const pageRaw = Number(params.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const status = isOutboundBusinessFilterStatus(params.status)
    ? params.status
    : undefined;
  const documentType =
    params.documentType &&
    (DOCUMENT_TYPES as readonly string[]).includes(params.documentType)
      ? params.documentType
      : undefined;
  const q = params.q?.trim() || undefined;

  const canManage = hasPermission(
    session.user.permissions,
    "documents.manage",
  );

  const [listResult, erpConnections] = await Promise.all([
    listDocuments({
      tenantId: session.user.tenantId,
      direction: "outbound",
      status,
      documentType,
      q,
      page,
    }),
    canManage
      ? prisma.erpConnection
          .findMany({
            where: {
              tenantId: session.user.tenantId,
              deletedAt: null,
              enabled: true,
            },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              provider: true,
              lastSyncAt: true,
            },
          })
          .then((rows) =>
            rows.map((connection) => ({
              id: connection.id,
              name: connection.name,
              provider: connection.provider,
              lastSyncAt: connection.lastSyncAt
                ? connection.lastSyncAt.toISOString()
                : null,
            })),
          )
      : Promise.resolve(
          [] as Array<{
            id: string;
            name: string;
            provider: string;
            lastSyncAt: string | null;
          }>,
        ),
  ]);

  const { total, documents, page: safePage, totalPages } = listResult;
  const filters = { status, q, documentType };

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHeaderCard
        icon={<FileOutput className="size-5" />}
        title="Outbound"
        description="Prepare invoices and receipts, then queue them for submission to BIR EIS."
        aside={
          canManage ? (
            <NewDocumentChooser erpConnections={erpConnections} />
          ) : null
        }
      />

      <DocumentFiltersCard
        direction="outbound"
        q={q}
        documentType={documentType}
        status={status}
        statusOptions={OUTBOUND_LIST_FILTER_STATUSES.map((value) => ({
          value,
          label: businessStatusLabel(value, { direction: "outbound" }),
        }))}
      />

      <DocumentListTable
        direction="outbound"
        documents={documents}
        total={total}
        page={safePage}
        totalPages={totalPages}
        filters={filters}
        canManage={canManage}
        emptyTitle={
          status || q || documentType
            ? "No documents match these filters"
            : "No outbound documents yet"
        }
        emptyDescription={
          canManage
            ? "Create a draft sales invoice or receipt, submit it to EIS, then check Inbound for EIS responses."
            : "When your team prepares outbound invoices, they will appear here."
        }
      />
    </div>
  );
}
