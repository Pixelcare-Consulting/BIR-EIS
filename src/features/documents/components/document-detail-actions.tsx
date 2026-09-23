"use client";

import { useState, type ReactNode } from "react";
import { Ban } from "lucide-react";

import {
  RequestCancellationDialog,
  type RequestCancellationDialogDocument,
} from "@/features/documents/components/request-cancellation-dialog";
import { canRequestCancellation } from "@/features/documents/lib/cancellation-eligibility";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export type DocumentDetailActionsProps = {
  detailHref: string;
  detailLabel?: string;
  canManage: boolean;
  document: RequestCancellationDialogDocument & {
    cancellationStatus?: string | null;
  };
  /** Extra header buttons rendered before cancel (e.g. Back, Sync). */
  leading?: ReactNode;
  menuTriggerVariant?: "default" | "onNavy";
  className?: string;
};

export function DocumentDetailActions({
  canManage,
  document,
  leading,
  menuTriggerVariant = "default",
  className,
}: DocumentDetailActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const eligibility = canRequestCancellation(document);
  const showCancel = canManage && eligibility.allowed;
  const onNavy = menuTriggerVariant === "onNavy";

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      {leading}
      {showCancel ? (
        <>
          <Button
            type="button"
            variant={onNavy ? "onNavyOutline" : "outline"}
            className={
              onNavy
                ? "border-rose-300/80 text-rose-100 hover:bg-rose-500/20 hover:text-white"
                : "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            }
            disabled={cancelling}
            onClick={() => setCancelOpen(true)}
          >
            <Ban className="size-4" />
            {cancelling ? "Cancelling…" : "Cancel invoice"}
          </Button>
          <RequestCancellationDialog
            document={document}
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            showTrigger={false}
            variant={onNavy ? "onNavy" : "default"}
            onPendingChange={setCancelling}
          />
        </>
      ) : null}
    </div>
  );
}
