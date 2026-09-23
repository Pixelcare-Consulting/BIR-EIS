"use client";

import { RefreshCw } from "lucide-react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import type { DocumentActionState } from "@/features/documents/actions/create-outbound-document.action";
import { syncEisResponsesAction } from "@/features/documents/actions/sync-eis-responses.action";
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

export function SyncEisResponsesButton() {
  const router = useRouter();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    syncEisResponsesAction,
    {} as DocumentActionState,
  );

  const resultKey =
    state.success || state.error
      ? `${state.success ? "ok" : "err"}:${state.message ?? ""}:${state.error ?? ""}`
      : null;
  const resultOpen = Boolean(resultKey && resultKey !== dismissedKey);
  const isError = Boolean(state.error);

  function handleResultOpenChange(next: boolean) {
    if (next || !resultKey) return;
    setDismissedKey(resultKey);
    if (state.success) {
      router.refresh();
    }
  }

  function handleSyncAction(formData: FormData) {
    setDismissedKey(null);
    return formAction(formData);
  }

  return (
    <>
      <form action={handleSyncAction} className="flex justify-end">
        <ActionButton type="submit" loading={pending} loadingText="Syncing…">
          <RefreshCw className="size-4" />
          Sync from EIS
        </ActionButton>
      </form>

      <Dialog open={resultOpen} onOpenChange={handleResultOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isError ? "Sync failed" : "Sync complete"}
            </DialogTitle>
            <DialogDescription>
              {state.error ??
                state.message ??
                "EIS responses were refreshed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => handleResultOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
