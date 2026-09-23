"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import type { DocumentActionState } from "@/features/documents/actions/create-outbound-document.action";
import { queueOutboundDocumentAction } from "@/features/documents/actions/queue-outbound-document.action";
import { formatDocumentType } from "@/features/documents/lib/document-format";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/utils/cn";

type QueueOutboundButtonProps = {
  documentId: string;
  documentType: string;
  /** Use `onNavy` when rendering in a DashboardNavySurface header. */
  variant?: "default" | "onNavy";
  className?: string;
};

export function QueueOutboundButton({
  documentId,
  documentType,
  variant = "default",
  className,
}: QueueOutboundButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successDismissed, setSuccessDismissed] = useState(false);
  const [state, formAction, pending] = useActionState(
    queueOutboundDocumentAction,
    {} as DocumentActionState,
  );

  const onNavy = variant === "onNavy";
  const typeLabel = formatDocumentType(documentType);
  const confirmDialogOpen = confirmOpen && !state.success;
  const successOpen = Boolean(state.success && !successDismissed);

  function handleConfirmOpenChange(next: boolean) {
    if (pending && !next) return;
    setConfirmOpen(next);
  }

  function handleSuccessOpenChange(next: boolean) {
    if (!next) {
      setSuccessDismissed(true);
      router.refresh();
    }
  }

  return (
    <>
      <Dialog open={confirmDialogOpen} onOpenChange={handleConfirmOpenChange}>
        <div
          className={cn(
            "flex flex-col items-stretch gap-1 sm:items-end",
            className,
          )}
        >
          {state.error && !confirmOpen && !successOpen ? (
            <p
              className={cn(
                "text-sm",
                onNavy ? "text-rose-200" : "text-destructive",
              )}
              role="alert"
            >
              {state.error}
            </p>
          ) : null}
          <DialogTrigger asChild>
            <Button type="button" variant={variant}>
              Submit to EIS
            </Button>
          </DialogTrigger>
        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to EIS?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this {typeLabel} to EIS? This will
              mark the document as ready for transmission.
            </DialogDescription>
          </DialogHeader>
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <form action={formAction}>
              <input type="hidden" name="id" value={documentId} />
              <ActionButton
                type="submit"
                loading={pending}
                loadingText="Submitting…"
              >
                Submit to EIS
              </ActionButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={handleSuccessOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submitted to EIS</DialogTitle>
            <DialogDescription>
              {state.message ??
                "This document is now pending transmission to BIR EIS."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => handleSuccessOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
