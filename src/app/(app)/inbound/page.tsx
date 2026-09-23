import { FileInput } from "lucide-react";

import { PageHeaderCard } from "@/app/(app)/_components/page-header-card";
import { DocumentFiltersCard } from "@/features/documents/components/document-filters-card";
import { DocumentListTable } from "@/features/documents/components/document-list-table";
import { SyncEisResponsesButton } from "@/features/documents/components/sync-eis-responses-button";
import {
  BUSINESS_STATUS_LABELS,
  OUTBOUND_BUSINESS_FILTER_STATUSES,
} from "@/features/documents/lib/document-business-status";
import {
  isOutboundBusinessFilterStatus,
  listDocuments,
} from "@/features/documents/lib/document-queries";
import { DOCUMENT_TYPES } from "@/features/documents/schemas/document.schema";
import {
  hasPermission,
  requirePermission,
} from "@/lib/auth/permissions";

export const metadata = {
  title: "Inbound · BIR EIS",
};

export default async function InboundPage({
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

  const { total, documents, page: safePage, totalPages } = await listDocuments({
    tenantId: session.user.tenantId,
    direction: "inbound",
    status,
    documentType,
    q,
    page,
  });

  const canManage = hasPermission(
    session.user.permissions,
    "documents.manage",
  );

  const filters = { status, q, documentType };

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHeaderCard
        icon={<FileInput className="size-5" />}
        title="Inbound"
        description="Inbox of BIR EIS responses for your outbound submissions—accepted, rejected, or still pending."
        aside={
          canManage ? (
            <div className="ml-auto flex justify-end">
              <SyncEisResponsesButton />
            </div>
          ) : null
        }
      />

      <DocumentFiltersCard
        direction="inbound"
        q={q}
        documentType={documentType}
        status={status}
        statusOptions={OUTBOUND_BUSINESS_FILTER_STATUSES.filter(
          (value) => value !== "draft",
        ).map((value) => ({
          value,
          label: BUSINESS_STATUS_LABELS[value],
        }))}
      />

      <DocumentListTable
        direction="inbound"
        documents={documents}
        total={total}
        page={safePage}
        totalPages={totalPages}
        filters={filters}
        canManage={canManage}
        emptyTitle={
          status || q || documentType
            ? "No responses match these filters"
            : "No EIS responses yet"
        }
        emptyDescription={
          canManage
            ? "Queue outbound documents, then use Sync from EIS to refresh sandbox responses until live transmit is available."
            : "When outbound submissions receive EIS replies, they will appear here."
        }
      />
    </div>
  );
}
