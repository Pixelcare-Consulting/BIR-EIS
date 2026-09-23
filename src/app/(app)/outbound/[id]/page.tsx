import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileOutput } from "lucide-react";

import { PageHeaderCard } from "@/app/(app)/_components/page-header-card";
import { DocumentContentCard } from "@/features/documents/components/document-content-card";
import { DocumentDetailActions } from "@/features/documents/components/document-detail-actions";
import { DocumentLifecycleTimeline } from "@/features/documents/components/document-lifecycle-timeline";
import {
  BusinessStatusBadge,
  CancellationStatusBadge,
  EisAckStatusBadge,
} from "@/features/documents/components/document-status-badge";
import { QueueOutboundButton } from "@/features/documents/components/outbound-document-actions";
import { OutboundDocumentForm } from "@/features/documents/components/outbound-document-form";
import { ViewEisJsonButton } from "@/features/documents/components/view-eis-json-button";
import {
  formatDocumentType,
  formatIssueDate,
  formatMoney,
  toDateInputValue,
} from "@/features/documents/lib/document-format";
import { getDocumentById } from "@/features/documents/lib/document-queries";
import {
  CANCELLATION_REASON_LABELS,
} from "@/features/documents/schemas/document.schema";
import { Button } from "@/components/ui/button";
import {
  hasPermission,
  requirePermission,
} from "@/lib/auth/permissions";

export const metadata = {
  title: "Outbound document · BIR EIS",
};

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCancellationReason(reason: string | null | undefined): string {
  if (!reason) return "—";
  const labels = CANCELLATION_REASON_LABELS as Record<string, string>;
  return labels[reason] ?? reason.replace(/_/g, " ");
}

export default async function OutboundDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("documents.view");
  const { id } = await params;
  const document = await getDocumentById(session.user.tenantId, id);

  if (!document || document.direction !== "outbound") {
    notFound();
  }

  const canManage = hasPermission(
    session.user.permissions,
    "documents.manage",
  );
  const isDraft = document.status === "draft";
  const canQueue = canManage && isDraft;
  const showCancellationSection = Boolean(document.cancellationStatus);
  const showResponseInboxLink =
    document.status === "queued" ||
    document.status === "submitted" ||
    document.status === "accepted" ||
    document.status === "rejected";

  const cancellationDialogDocument = {
    id: document.id,
    documentNumber: document.documentNumber,
    documentType: document.documentType,
    counterpartName: document.counterpartName,
    issueDate: document.issueDate,
    currency: document.currency,
    totalAmount: document.totalAmount.toString(),
    status: document.status,
    eisReferenceId: document.eisReferenceId,
    cancellationStatus: document.cancellationStatus,
  };

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHeaderCard
        icon={<FileOutput className="size-5" />}
        title={document.documentNumber}
        description={`${formatDocumentType(document.documentType)} · ${document.counterpartName}`}
        aside={
          <DocumentDetailActions
            detailHref={`/outbound/${document.id}`}
            detailLabel="View outbound"
            canManage={canManage}
            document={cancellationDialogDocument}
            leading={
              <>
                <Button asChild variant="onNavyOutline">
                  <Link href="/outbound">
                    <ArrowLeft className="size-4" />
                    Back to list
                  </Link>
                </Button>
                {showResponseInboxLink ? (
                  <Button asChild variant="onNavy">
                    <Link href={`/inbound/${document.id}`}>View EIS response</Link>
                  </Button>
                ) : null}
                {canQueue ? (
                  <QueueOutboundButton
                    documentId={document.id}
                    documentType={document.documentType}
                    variant="onNavy"
                  />
                ) : null}
              </>
            }
            menuTriggerVariant="onNavy"
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <DocumentContentCard title="Summary" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <BusinessStatusBadge
                  direction="outbound"
                  document={{
                    status: document.status,
                    cancellationStatus: document.cancellationStatus,
                  }}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Issue date</dt>
              <dd>{formatIssueDate(document.issueDate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Net</dt>
              <dd className="tabular-nums">
                {formatMoney(document.lineExtensionAmount, document.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular-nums">
                {formatMoney(document.taxAmount, document.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold tabular-nums">
                {formatMoney(document.totalAmount, document.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">EIS response</dt>
              <dd>
                <EisAckStatusBadge status={document.eisAckStatus} />
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="max-w-[60%] text-right font-mono text-xs break-all">
                {document.eisReferenceId || "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Submitted</dt>
              <dd className="text-right text-muted-foreground">
                {formatDateTime(document.submittedAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Responded at</dt>
              <dd className="text-right text-muted-foreground">
                {formatDateTime(document.eisAckAt)}
              </dd>
            </div>
            {document.eisAckMessage ? (
              <div className="space-y-1 border-t border-border/50 pt-3">
                <dt className="text-muted-foreground">Response message</dt>
                <dd className="text-foreground">{document.eisAckMessage}</dd>
              </div>
            ) : null}
            {document.notes ? (
              <div className="space-y-1 border-t border-border/50 pt-3">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="text-foreground">{document.notes}</dd>
              </div>
            ) : null}
          </dl>
        </DocumentContentCard>

        <div className="space-y-5 lg:col-span-2">
          {isDraft && canManage ? (
            <DocumentContentCard
              title="Edit draft"
              description="Update details before submitting to BIR EIS."
              headerAction={
                <ViewEisJsonButton payload={document.eisJsonPayload} />
              }
            >
              <OutboundDocumentForm
                mode="edit"
                initial={{
                  id: document.id,
                  documentType: document.documentType,
                  documentNumber: document.documentNumber,
                  issueDate: toDateInputValue(document.issueDate),
                  currency: document.currency,
                  counterpartName: document.counterpartName,
                  counterpartTin: document.counterpartTin ?? "",
                  lineExtensionAmount: document.lineExtensionAmount.toString(),
                  taxAmount: document.taxAmount.toString(),
                  totalAmount: document.totalAmount.toString(),
                  notes: document.notes ?? "",
                }}
              />
            </DocumentContentCard>
          ) : (
            <DocumentContentCard
              title="Document details"
              headerAction={
                <ViewEisJsonButton payload={document.eisJsonPayload} />
              }
            >
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{formatDocumentType(document.documentType)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Counterpart TIN</dt>
                  <dd>{document.counterpartTin || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Counterpart</dt>
                  <dd>{document.counterpartName}</dd>
                </div>
              </dl>
            </DocumentContentCard>
          )}

          <DocumentLifecycleTimeline
            tenantId={session.user.tenantId}
            document={{
              id: document.id,
              status: document.status,
              documentNumber: document.documentNumber,
              issueDate: document.issueDate?.toISOString() ?? null,
              createdAt: document.createdAt.toISOString(),
              submittedAt: document.submittedAt?.toISOString() ?? null,
              eisAckAt: document.eisAckAt?.toISOString() ?? null,
              eisAckStatus: document.eisAckStatus,
              eisReferenceId: document.eisReferenceId,
              eisAckMessage: document.eisAckMessage,
              cancellationStatus: document.cancellationStatus,
              cancellationReason: document.cancellationReason,
              cancellationRequestedAt: document.cancellationRequestedAt?.toISOString() ?? null,
              cancellationReferenceId: document.cancellationReferenceId,
              cancellationAckAt: document.cancellationAckAt?.toISOString() ?? null,
              cancellationAckMessage: document.cancellationAckMessage,
              cancelledAt: document.cancelledAt?.toISOString() ?? null,
              cancellationRequestedBy: document.cancellationRequestedBy,
            }}
          />

          {showCancellationSection ? (
            <DocumentContentCard
              title="Cancellation details"
              description="Sandbox EIS / certification simulation — original EIS transmission fields stay unchanged."
            >
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Cancellation status</dt>
                  <dd className="mt-1">
                    <CancellationStatusBadge
                      status={document.cancellationStatus}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reason</dt>
                  <dd>
                    {formatCancellationReason(document.cancellationReason)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Requested by</dt>
                  <dd>
                    {document.cancellationRequestedBy?.name ||
                      document.cancellationRequestedBy?.email ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Requested at</dt>
                  <dd>
                    {formatDateTime(document.cancellationRequestedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Cancellation reference</dt>
                  <dd className="font-mono text-xs break-all">
                    {document.cancellationReferenceId || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Cancelled at</dt>
                  <dd>{formatDateTime(document.cancelledAt)}</dd>
                </div>
                {document.cancellationRemarks ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Remarks</dt>
                    <dd>{document.cancellationRemarks}</dd>
                  </div>
                ) : null}
                {document.cancellationAckMessage ? (
                  <div className="sm:col-span-2 border-t border-border/50 pt-3">
                    <dt className="text-muted-foreground">
                      EIS sandbox response
                    </dt>
                    <dd className="mt-1">{document.cancellationAckMessage}</dd>
                  </div>
                ) : null}
              </dl>
            </DocumentContentCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
