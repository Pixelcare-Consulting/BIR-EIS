import {
  businessStatusLabel,
  deriveBusinessStatus,
} from "@/features/documents/lib/document-business-status";
import { CANCELLATION_REASON_LABELS } from "@/features/documents/schemas/document.schema";

export type LifecycleEventTone = "default" | "success" | "warning" | "danger";

export type DocumentLifecycleEvent = {
  id: string;
  at: Date;
  title: string;
  detail?: string;
  tone: LifecycleEventTone;
};

/** Dates may arrive as Date or ISO string depending on the RSC prop boundary. */
export type LifecycleDate = Date | string;

export type DocumentLifecycleSource = {
  id: string;
  status: string;
  documentNumber: string;
  issueDate: LifecycleDate | null | undefined;
  createdAt: LifecycleDate;
  submittedAt: LifecycleDate | null;
  eisAckAt: LifecycleDate | null;
  eisAckStatus: string | null;
  eisReferenceId: string | null;
  eisAckMessage: string | null;
  cancellationStatus: string | null;
  cancellationReason: string | null;
  cancellationRequestedAt: LifecycleDate | null;
  cancellationReferenceId: string | null;
  cancellationAckAt: LifecycleDate | null;
  cancellationAckMessage: string | null;
  cancelledAt: LifecycleDate | null;
  cancellationRequestedBy?: {
    name: string | null;
    email: string | null;
  } | null;
};

type AuditRow = {
  id: string;
  action: string;
  createdAt: LifecycleDate;
  metadata: unknown;
  user: { name: string | null; email: string | null } | null;
};

function auditDetail(row: AuditRow): string | undefined {
  const meta =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : null;
  const message =
    typeof meta?.cancellationAckMessage === "string"
      ? meta.cancellationAckMessage
      : undefined;
  const actor = row.user?.name || row.user?.email;
  if (message && actor) return `${message} · ${actor}`;
  if (message) return message;
  if (actor) return actor;
  return undefined;
}

function cancellationReasonLabel(reason: string | null): string | undefined {
  if (!reason) return undefined;
  const labels = CANCELLATION_REASON_LABELS as Record<string, string>;
  return labels[reason] ?? reason.replace(/_/g, " ");
}

function pushEvent(
  events: DocumentLifecycleEvent[],
  event: Omit<DocumentLifecycleEvent, "tone"> & { tone?: LifecycleEventTone },
) {
  events.push({ tone: "default", ...event });
}

/** Stable ordering when multiple milestones share the same timestamp. */
function lifecycleEventRank(eventId: string): number {
  if (eventId.endsWith("-created")) return 0;
  if (eventId.endsWith("-submitted")) return 10;
  if (eventId.endsWith("-eis-ack")) return 20;
  if (eventId.endsWith("-cancel-requested")) return 30;
  if (eventId.endsWith("-cancel-pending")) return 40;
  if (eventId.endsWith("-cancel-accepted")) return 50;
  if (eventId.endsWith("-cancel-rejected")) return 55;
  if (eventId.endsWith("-cancelled")) return 60;
  return 70;
}

function toDate(value: LifecycleDate | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function requireDate(
  value: LifecycleDate | null | undefined,
  fallback: Date,
): Date {
  return toDate(value) ?? fallback;
}

/** Prefer invoice issue date when it is not after the row was created. */
function invoiceCreatedAt(document: DocumentLifecycleSource): Date {
  const created = toDate(document.createdAt) ?? new Date(0);
  const issue = toDate(document.issueDate);
  if (!issue) return created;
  return issue.getTime() <= created.getTime() ? issue : created;
}

export function buildDocumentLifecycleEvents(
  document: DocumentLifecycleSource,
  auditRows: AuditRow[],
): DocumentLifecycleEvent[] {
  const events: DocumentLifecycleEvent[] = [];
  const createdAt = invoiceCreatedAt(document);
  const submittedAt = toDate(document.submittedAt);
  const eisAckAt = toDate(document.eisAckAt);
  const cancellationRequestedAt = toDate(document.cancellationRequestedAt);
  const cancellationAckAt = toDate(document.cancellationAckAt);
  const cancelledAt = toDate(document.cancelledAt);

  pushEvent(events, {
    id: `${document.id}-created`,
    at: createdAt,
    title: "Invoice created",
    detail: document.documentNumber,
  });

  if (submittedAt) {
    pushEvent(events, {
      id: `${document.id}-submitted`,
      at: submittedAt,
      title: "Submitted to BIR EIS",
    });
  }

  if (eisAckAt && document.eisAckStatus) {
    const accepted = document.eisAckStatus === "accepted";
    pushEvent(events, {
      id: `${document.id}-eis-ack`,
      at: eisAckAt,
      title: accepted ? "EIS accepted" : "EIS rejected",
      detail: [
        document.eisReferenceId,
        document.eisAckMessage,
      ]
        .filter(Boolean)
        .join(" · "),
      tone: accepted ? "success" : "danger",
    });
  }

  if (cancellationRequestedAt) {
    const requester =
      document.cancellationRequestedBy?.name ||
      document.cancellationRequestedBy?.email;
    pushEvent(events, {
      id: `${document.id}-cancel-requested`,
      at: cancellationRequestedAt,
      title: "Cancellation requested",
      detail: [
        cancellationReasonLabel(document.cancellationReason),
        requester,
      ]
        .filter(Boolean)
        .join(" · "),
      tone: "warning",
    });
  }

  if (
    document.cancellationReferenceId &&
    (document.cancellationStatus === "pending" ||
      document.cancellationStatus === "accepted" ||
      document.cancellationStatus === "rejected")
  ) {
    pushEvent(events, {
      id: `${document.id}-cancel-pending`,
      at: requireDate(
        cancellationAckAt ?? cancellationRequestedAt,
        createdAt,
      ),
      title: "Cancellation submitted (awaiting EIS)",
      detail: document.cancellationReferenceId,
      tone: "warning",
    });
  }

  if (cancellationAckAt && document.cancellationStatus === "accepted") {
    pushEvent(events, {
      id: `${document.id}-cancel-accepted`,
      at: cancellationAckAt,
      title: "Cancellation acknowledged",
      detail: document.cancellationAckMessage ?? undefined,
      tone: "success",
    });
  }

  if (cancellationAckAt && document.cancellationStatus === "rejected") {
    pushEvent(events, {
      id: `${document.id}-cancel-rejected`,
      at: cancellationAckAt,
      title: "Cancellation rejected by EIS (sandbox)",
      detail: document.cancellationAckMessage ?? undefined,
      tone: "danger",
    });
  }

  if (cancelledAt) {
    pushEvent(events, {
      id: `${document.id}-cancelled`,
      at: cancelledAt,
      title: "Invoice cancelled",
      tone: "success",
    });
  }

  for (const row of auditRows) {
    if (row.action === "document.cancellation_rejected") {
      const at = toDate(row.createdAt);
      if (!at) continue;
      pushEvent(events, {
        id: row.id,
        at,
        title: "Cancellation rejected by EIS (sandbox)",
        detail: auditDetail(row),
        tone: "danger",
      });
    }
  }

  events.sort((a, b) => {
    const byTime = a.at.getTime() - b.at.getTime();
    if (byTime !== 0) return byTime;
    return lifecycleEventRank(a.id) - lifecycleEventRank(b.id);
  });

  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

export function currentBusinessStatusLabel(document: DocumentLifecycleSource) {
  return businessStatusLabel(
    deriveBusinessStatus({
      status: document.status,
      cancellationStatus: document.cancellationStatus,
    }),
    { direction: "outbound" },
  );
}
