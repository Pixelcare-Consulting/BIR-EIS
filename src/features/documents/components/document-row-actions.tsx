"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, Eye } from "lucide-react";

import {
  RequestCancellationDialog,
  type RequestCancellationDialogDocument,
} from "@/features/documents/components/request-cancellation-dialog";
import { canRequestCancellation } from "@/features/documents/lib/cancellation-eligibility";
import { Button } from "@/components/ui/button";

export type DocumentRowActionsProps = {
  detailHref: string;
  canManage: boolean;
  document: RequestCancellationDialogDocument & {
    cancellationStatus?: string | null;
  };
};

export function DocumentRowActions({
  detailHref,
  canManage,
  document,
}: DocumentRowActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const eligibility = canRequestCancellation(document);
  const showCancel = canManage && eligibility.allowed;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={detailHref} className="inline-flex items-center gap-1.5">
          <Eye className="size-3.5" />
          View
        </Link>
      </Button>
      {showCancel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={cancelling}
          onClick={() => setCancelOpen(true)}
        >
          <Ban className="size-3.5" />
          {cancelling ? "Cancelling…" : "Cancel"}
        </Button>
      ) : null}

      {showCancel ? (
        <RequestCancellationDialog
          document={document}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          showTrigger={false}
          onPendingChange={setCancelling}
        />
      ) : null}
    </div>
  );
}
