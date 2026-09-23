import { DocumentContentCard } from "@/features/documents/components/document-content-card";
import {
  buildDocumentLifecycleEvents,
  currentBusinessStatusLabel,
  type DocumentLifecycleEvent,
  type DocumentLifecycleSource,
} from "@/features/documents/lib/document-lifecycle-events";
import { listDocumentLifecycleAuditEvents } from "@/features/documents/lib/document-queries";
import { cn } from "@/utils/cn";

const TONE_DOT: Record<DocumentLifecycleEvent["tone"], string> = {
  default: "bg-slate-400",
  success: "bg-teal-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

const MUTED_DOT = "bg-muted-foreground/35";

function formatEventTime(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function DocumentLifecycleTimeline({
  tenantId,
  document,
}: {
  tenantId: string;
  document: DocumentLifecycleSource;
}) {
  const auditRows = await listDocumentLifecycleAuditEvents(
    tenantId,
    document.id,
  );
  const events = buildDocumentLifecycleEvents(document, auditRows);
  const currentStatus = currentBusinessStatusLabel(document);

  return (
    <DocumentContentCard
      title="Transaction history"
      description="Submission, EIS acknowledgement, and cancellation steps — original EIS acceptance is always kept on record."
    >
      <ol className="relative space-y-0 border-l border-border/70 pl-5">
        {events.map((event, index) => {
          const isLatest = index === events.length - 1;
          return (
          <li key={event.id} className="relative pb-6 last:pb-0">
            <span
              className={cn(
                "absolute top-1 -left-[calc(0.625rem+1px)] size-2.5 rounded-full ring-2 ring-card",
                isLatest ? TONE_DOT[event.tone] : MUTED_DOT,
              )}
              aria-hidden
            />
            <div className="space-y-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  isLatest ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {event.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatEventTime(event.at)}
              </p>
              {event.detail ? (
                <p className="text-sm text-muted-foreground">{event.detail}</p>
              ) : null}
            </div>
            {index === events.length - 1 ? null : (
              <span className="sr-only">Next event</span>
            )}
          </li>
          );
        })}
      </ol>
      <p className="mt-4 border-t border-border/50 pt-3 text-sm text-foreground">
        Current status:{" "}
        <span className="font-semibold">{currentStatus}</span>
      </p>
    </DocumentContentCard>
  );
}
