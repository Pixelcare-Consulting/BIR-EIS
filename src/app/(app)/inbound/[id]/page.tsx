import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileInput, FileOutput } from "lucide-react";

import { PageHeaderCard } from "@/app/(app)/_components/page-header-card";
import { DocumentContentCard } from "@/features/documents/components/document-content-card";
import { DocumentDetailActions } from "@/features/documents/components/document-detail-actions";
import { DocumentLifecycleTimeline } from "@/features/documents/components/document-lifecycle-timeline";
import {
  BusinessStatusBadge,
  EisAckStatusBadge,
} from "@/features/documents/components/document-status-badge";
import {
  formatDocumentType,
  formatIssueDate,
  formatMoney,
} from "@/features/documents/lib/document-format";
import {
  getDocumentById,
  RESPONSE_INBOX_STATUSES,
} from "@/features/documents/lib/document-queries";
import { Button } from "@/components/ui/button";
import {
  hasPermission,
  requirePermission,
} from "@/lib/auth/permissions";

export const metadata = {
  title: "EIS response · BIR EIS",
};

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function InboundDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("documents.view");
  const { id } = await params;
  const document = await getDocumentById(session.user.tenantId, id);

  const isResponseInboxDoc =
    document &&
    document.direction === "outbound" &&
    (RESPONSE_INBOX_STATUSES as readonly string[]).includes(document.status);

  if (!isResponseInboxDoc || !document) {
    notFound();
  }

  const canManage = hasPermission(
    session.user.permissions,
    "documents.manage",
  );

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
        icon={<FileInput className="size-5" />}
        title={document.documentNumber}
        description={`EIS response · ${formatDocumentType(document.documentType)} · ${document.counterpartName}`}
        aside={
          <DocumentDetailActions
            detailHref={`/inbound/${document.id}`}
            detailLabel="View EIS response"
            canManage={canManage}
            document={cancellationDialogDocument}
            leading={
              <>
                <Button asChild variant="onNavyOutline">
                  <Link href="/inbound">
                    <ArrowLeft className="size-4" />
                    Back to list
                  </Link>
                </Button>
                <Button asChild variant="onNavy">
                  <Link href={`/outbound/${document.id}`}>
                    <FileOutput className="size-4" />
                    Open outbound
                  </Link>
                </Button>
              </>
            }
            menuTriggerVariant="onNavy"
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <DocumentContentCard title="EIS response" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Response</dt>
              <dd>
                <EisAckStatusBadge status={document.eisAckStatus} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Current status</dt>
              <dd>
                <BusinessStatusBadge
                  document={{
                    status: document.status,
                    cancellationStatus: document.cancellationStatus,
                  }}
                />
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
          </dl>
        </DocumentContentCard>

        <div className="space-y-5 lg:col-span-2">
          <DocumentContentCard
            title="Submission summary"
            description="This is the outbound document that received the EIS response."
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd>{formatDocumentType(document.documentType)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Issue date</dt>
                <dd>{formatIssueDate(document.issueDate)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Counterpart</dt>
                <dd>{document.counterpartName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Counterpart TIN</dt>
                <dd>{document.counterpartTin || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-semibold tabular-nums">
                  {formatMoney(document.totalAmount, document.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Net</dt>
                <dd className="tabular-nums">
                  {formatMoney(document.lineExtensionAmount, document.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="tabular-nums">
                  {formatMoney(document.taxAmount, document.currency)}
                </dd>
              </div>
              {document.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd>{document.notes}</dd>
                </div>
              ) : null}
            </dl>
          </DocumentContentCard>

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
        </div>
      </div>
    </div>
  );
}
