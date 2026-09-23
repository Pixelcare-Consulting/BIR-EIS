"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createOutboundDocumentAction,
  type DocumentActionState,
} from "@/features/documents/actions/create-outbound-document.action";
import { updateOutboundDocumentAction } from "@/features/documents/actions/update-outbound-document.action";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} from "@/features/documents/schemas/document.schema";
import {
  settingsFieldClassName,
  settingsSelectTriggerClassName,
  settingsTextareaClassName,
} from "@/features/settings/lib/field-styles";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface OutboundDocumentFormValues {
  id?: string;
  documentType: string;
  documentNumber: string;
  issueDate: string;
  currency: string;
  counterpartName: string;
  counterpartTin: string;
  lineExtensionAmount: string;
  taxAmount: string;
  totalAmount: string;
  notes: string;
}

export function OutboundDocumentForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: OutboundDocumentFormValues;
}) {
  const router = useRouter();
  const [documentType, setDocumentType] = useState(
    initial?.documentType || "sales_invoice",
  );
  const [dismissedSuccessId, setDismissedSuccessId] = useState<string | null>(
    null,
  );
  const action =
    mode === "create"
      ? createOutboundDocumentAction
      : updateOutboundDocumentAction;
  const [state, formAction, pending] = useActionState(
    action,
    {} as DocumentActionState,
  );

  const createdDocumentId =
    mode === "create" && state.success ? state.documentId : undefined;
  const successOpen = Boolean(
    createdDocumentId && createdDocumentId !== dismissedSuccessId,
  );

  useEffect(() => {
    if (state.success && mode === "edit") {
      router.refresh();
    }
  }, [state.success, mode, router]);

  function handleSuccessOpenChange(next: boolean) {
    if (!next && createdDocumentId) {
      setDismissedSuccessId(createdDocumentId);
    }
  }

  return (
    <>
      <form action={formAction} className="space-y-3.5">
        {mode === "edit" && initial?.id ? (
          <input type="hidden" name="id" value={initial.id} />
        ) : null}
        <input type="hidden" name="documentType" value={documentType} />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="documentType">Document type</Label>
            <Select
              value={documentType}
              onValueChange={setDocumentType}
              disabled={pending}
            >
              <SelectTrigger
                id="documentType"
                className={settingsSelectTriggerClassName}
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {DOCUMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="documentNumber">Document number</Label>
            <Input
              id="documentNumber"
              name="documentNumber"
              required
              defaultValue={initial?.documentNumber}
              className={settingsFieldClassName}
              disabled={pending}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="issueDate">Issue date</Label>
            <Input
              id="issueDate"
              name="issueDate"
              type="date"
              required
              defaultValue={initial?.issueDate}
              className={settingsFieldClassName}
              disabled={pending}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              name="currency"
              defaultValue={initial?.currency || "PHP"}
              maxLength={3}
              className={settingsFieldClassName}
              disabled={pending}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="counterpartName">Buyer / counterpart</Label>
            <Input
              id="counterpartName"
              name="counterpartName"
              required
              defaultValue={initial?.counterpartName}
              className={settingsFieldClassName}
              disabled={pending}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="counterpartTin">Counterpart TIN (optional)</Label>
            <Input
              id="counterpartTin"
              name="counterpartTin"
              defaultValue={initial?.counterpartTin}
              className={settingsFieldClassName}
              disabled={pending}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="lineExtensionAmount">Net amount</Label>
            <Input
              id="lineExtensionAmount"
              name="lineExtensionAmount"
              required
              inputMode="decimal"
              defaultValue={initial?.lineExtensionAmount}
              className={settingsFieldClassName}
              disabled={pending}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="taxAmount">Tax amount</Label>
            <Input
              id="taxAmount"
              name="taxAmount"
              required
              inputMode="decimal"
              defaultValue={initial?.taxAmount}
              className={settingsFieldClassName}
              disabled={pending}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="totalAmount">Total amount</Label>
            <Input
              id="totalAmount"
              name="totalAmount"
              required
              inputMode="decimal"
              defaultValue={initial?.totalAmount}
              className={settingsFieldClassName}
              disabled={pending}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={initial?.notes}
              className={settingsTextareaClassName}
              disabled={pending}
            />
          </div>
        </div>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success && mode === "edit" ? (
          <p className="text-sm text-teal-700" role="status">
            Document saved.
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <ActionButton
            type="submit"
            loading={pending}
            loadingText="Saving…"
          >
            {mode === "create" ? "Create draft" : "Save changes"}
          </ActionButton>
        </div>
      </form>

      {mode === "create" ? (
        <Dialog open={successOpen} onOpenChange={handleSuccessOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Draft created</DialogTitle>
              <DialogDescription>
                {state.message ??
                  "Your outbound draft is ready. You can open it now or return to the Outbound list."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button asChild variant="outline">
                <Link href="/outbound">Back to Outbound</Link>
              </Button>
              {createdDocumentId ? (
                <Button asChild>
                  <Link href={`/outbound/${createdDocumentId}`}>
                    View document
                  </Link>
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
