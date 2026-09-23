import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

/** Card shell matching settings/feature content panels. */
export function DocumentContentCard({
  title,
  description,
  headerAction,
  children,
  className,
}: {
  title?: string;
  description?: string;
  /** Optional control aligned to the far right of the title row (e.g. View JSON). */
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-transparent bg-card px-5 py-5 shadow-[0_6px_22px_rgba(15,23,42,0.07)] sm:px-6",
        className,
      )}
    >
      {title ? (
        <div
          className={cn(
            "mb-4",
            headerAction
              ? "flex flex-wrap items-start justify-between gap-3"
              : "space-y-1",
          )}
        >
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {headerAction ? (
            <div className="shrink-0 self-start">{headerAction}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
