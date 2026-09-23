"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  deactivateTenantAction,
  type DeactivateTenantActionState,
} from "@/features/provider/actions/deactivate-tenant.action";
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

export interface DeactivateTenantButtonProps {
  tenantId: string;
  tenantName: string;
}

export function DeactivateTenantButton({
  tenantId,
  tenantName,
}: DeactivateTenantButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deactivateTenantAction,
    {} as DeactivateTenantActionState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const dialogOpen = open && !state.success;

  function handleOpenChange(next: boolean) {
    if (pending && !next) return;
    setOpen(next);
  }

  return (
    <div className="space-y-2">
      {state.error && !open ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Workspace deactivated.
        </p>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="destructive">
            Deactivate workspace
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate “{tenantName}”?</DialogTitle>
            <DialogDescription>
              Users in this workspace will no longer be able to sign in once
              sessions expire.
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
              <input type="hidden" name="tenantId" value={tenantId} />
              <ActionButton
                type="submit"
                variant="destructive"
                loading={pending}
                loadingText="Deactivating…"
              >
                Deactivate workspace
              </ActionButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
