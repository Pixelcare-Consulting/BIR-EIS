"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { DocumentActionState } from "@/features/documents/actions/create-outbound-document.action";
import { requestDocumentCancellationAction } from "@/features/documents/actions/request-document-cancellation.action";
import {
  formatIssueDate,
  formatMoney,
  formatDocumentType,
} from "@/features/documents/lib/document-format";
import {
  CANCELLATION_REASONS,
  CANCELLATION_REASON_LABELS,
  OUTBOUND_STATUS_LABELS,
} from "@/features/documents/schemas/document.schema";
import {
  settingsSelectTriggerClassName,
  settingsTextareaClassName,
} from "@/features/settings/lib/field-styles";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";

export type RequestCancellationDialogDocument = {
  id: string;
  documentNumber: string;
  documentType: string;
  counterpartName: string;
  issueDate: string | Date;
  currency: string;
  totalAmount: string | number;
  status: string;
  eisReferenceId: string | null;
};

type RequestCancellationDialogProps = {
  document: RequestCancellationDialogDocument;
  /** Use `onNavy` when rendering in a DashboardNavySurface header. */
  variant?: "default" | "onNavy";
  className?: string;
  /** When false, dialog is opened via external controls (`open` / `onOpenChange`). */
  showTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Mirrors form submit pending state for external Cancel buttons. */
  onPendingChange?: (pending: boolean) => void;
};

export function RequestCancellationDialog({
  document,
  variant = "default",
  className,
  showTrigger = true,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onPendingChange,
}: RequestCancellationDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const [reason, setReason] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [state, formAction, pending] = useActionState(
    requestDocumentCancellationAction,
    {} as DocumentActionState,
  );

  const onNavy = variant === "onNavy";
  const dialogOpen = open && !state.success;

  function setOpen(next: boolean) {
    if (isControlled) {
      controlledOnOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  }

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);
  const statusLabel =
    OUTBOUND_STATUS_LABELS[
      document.status as keyof typeof OUTBOUND_STATUS_LABELS
    ] ?? document.status;

  function handleOpenChange(next: boolean) {
    if (pending && !next) return;
    setOpen(next);
    if (!next) {
      setReason("");
      setRemarks("");
    }
  }

  const shell = (
    <>
      {state.error && !open && showTrigger ? (
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
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={pending}>
            {pending ? "Cancelling…" : "Request Cancellation"}
          </Button>
        </DialogTrigger>
      ) : null}
    </>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {showTrigger ? (
        <div
          className={cn(
            "flex flex-col items-stretch gap-1 sm:items-end",
            className,
          )}
        >
          {shell}
        </div>
      ) : (
        shell
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Request cancellation for {document.documentNumber}?
          </DialogTitle>
          <DialogDescription>
            This submits a cancellation request to Sandbox EIS (certification
            simulation only — not live BIR acknowledgement). The invoice stays
            Cancelled only after EIS acknowledges the cancellation (use Sync
            from EIS on Inbound). Original acceptance and EIS reference are
            never overwritten.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Number</dt>
            <dd className="font-medium">{document.documentNumber}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd>{formatDocumentType(document.documentType)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Customer</dt>
            <dd>{document.counterpartName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Issue date</dt>
            <dd>{formatIssueDate(document.issueDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="tabular-nums">
              {formatMoney(document.totalAmount, document.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">EIS status</dt>
            <dd>{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">EIS reference</dt>
            <dd className="font-mono text-xs break-all">
              {document.eisReferenceId || "—"}
            </dd>
          </div>
        </dl>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={document.id} />
          <input type="hidden" name="reason" value={reason} />

          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger
                id="cancellation-reason"
                className={settingsSelectTriggerClassName}
              >
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CANCELLATION_REASON_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-remarks">
              Remarks{reason === "other" ? " (required)" : " (optional)"}
            </Label>
            <Textarea
              id="cancellation-remarks"
              name="remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Add context for this cancellation request"
              className={settingsTextareaClassName}
              rows={3}
            />
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Close
              </Button>
            </DialogClose>
            <ActionButton
              type="submit"
              variant="destructive"
              disabled={!reason}
              loading={pending}
              loadingText="Cancelling…"
            >
              Confirm cancellation request
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
