"use client";

import Link from "next/link";
import { PlugZap, RefreshCw } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  syncErpDocumentsAction,
  type SyncErpDocumentsState,
} from "@/features/documents/actions/sync-erp-documents.action";
import {
  ERP_PROVIDER_LABELS,
  ERP_PROVIDERS,
} from "@/features/settings/schemas/erp-connection.schema";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/cn";

export type ErpSyncConnectionOption = {
  id: string;
  name: string;
  provider: string;
  lastSyncAt: string | null;
};

export function ErpSyncPanel({
  connections,
  onDone,
  variant = "page",
}: {
  connections: ErpSyncConnectionOption[];
  /** When set (e.g. modal), closes the host dialog after sync finishes. */
  onDone?: () => void;
  /** `dialog` fills modal height with a frozen footer; `page` fits card layouts. */
  variant?: "page" | "dialog";
}) {
  const router = useRouter();
  const toastedKeyRef = useRef<string | null>(null);
  const [connectionId, setConnectionId] = useState(
    connections[0]?.id ?? "",
  );
  const [state, formAction, pending] = useActionState(
    syncErpDocumentsAction,
    {} as SyncErpDocumentsState,
  );
  const isDialog = variant === "dialog";
  const createdCount = state.created ?? 0;
  const isCreatedSuccess = Boolean(state.success && createdCount > 0);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  useEffect(() => {
    const key = [
      state.success ? "ok" : "",
      state.error ?? "",
      state.message ?? "",
      state.created ?? "",
      state.skipped ?? "",
      state.errors?.length ?? 0,
    ].join("|");

    if (!state.success && !state.error) return;
    if (toastedKeyRef.current === key) return;
    toastedKeyRef.current = key;

    if (state.error) {
      toast.error(state.error);
    }

    if (state.success && state.message) {
      const created = state.created ?? 0;
      // Green only when at least one draft was created.
      // All-duplicate / zero-created results use warning so they don't look successful.
      if (created > 0) {
        toast.success(state.message);
      } else {
        toast.warning(state.message);
      }
    }

    // Match Excel import: close the host modal after a finished sync result.
    // Toast carries the outcome so feedback is not only in-modal.
    if (onDone && (state.success || state.error)) {
      onDone();
    }
  }, [state, onDone]);

  if (connections.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-8 text-center",
          isDialog && "mx-6 mb-6",
        )}
      >
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground">
          <PlugZap className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-medium text-foreground">
          No ERP connections yet
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Add an enabled connection under Settings → Integrations to sync sandbox
          sample invoices into Outbound drafts.
        </p>
        <Button asChild variant="outline" className="mt-5 h-10 cursor-pointer">
          <Link href="/settings/integrations/erp">Open ERP connections</Link>
        </Button>
      </div>
    );
  }

  const selected = connections.find((c) => c.id === connectionId);

  return (
    <form
      action={formAction}
      className={cn("flex flex-col", isDialog && "min-h-0 flex-1")}
    >
      <input type="hidden" name="connectionId" value={connectionId} />

      <div
        className={cn(
          "space-y-5",
          isDialog && "min-h-0 flex-1 overflow-y-auto px-6 pb-4",
        )}
      >
        <div className="space-y-2">
          <Label htmlFor="erp-sync-connection">ERP connection</Label>
          <Select
            value={connectionId}
            onValueChange={setConnectionId}
            disabled={pending}
          >
            <SelectTrigger
              id="erp-sync-connection"
              className="h-10 w-full cursor-pointer"
            >
              <SelectValue placeholder="Select connection" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((connection) => {
                const provider = ERP_PROVIDERS.find(
                  (value) => value === connection.provider,
                );
                const providerLabel = provider
                  ? ERP_PROVIDER_LABELS[provider]
                  : connection.provider;
                return (
                  <SelectItem
                    key={connection.id}
                    value={connection.id}
                    className="cursor-pointer"
                  >
                    {connection.name} · {providerLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selected?.lastSyncAt ? (
            <p className="text-xs text-muted-foreground">
              Last sync{" "}
              {new Date(selected.lastSyncAt).toLocaleString("en-PH")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              This connection has not synced yet.
            </p>
          )}
        </div>

        {state.error ? (
          <div
            className="rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
            role="alert"
          >
            {state.error}
          </div>
        ) : null}

        {state.success && state.message ? (
          <div
            className={cn(
              "rounded-lg px-3.5 py-2.5 text-sm",
              // Green only when at least one draft was created.
              // All-duplicate / zero-created results use warning so they don't look successful.
              isCreatedSuccess
                ? "border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"
                : "border border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
            )}
            role="status"
          >
            {state.message}
          </div>
        ) : null}

        {state.errors && state.errors.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border/70">
            <div className="border-b border-border/60 bg-muted/40 px-3 py-2">
              <p className="text-sm font-medium text-foreground">
                Sync notes ({state.errors.length})
              </p>
            </div>
            <ul className="max-h-48 divide-y divide-border/50 overflow-auto text-sm">
              {state.errors.map((item, index) => (
                <li key={`${item.row}-${index}`} className="px-3 py-2">
                  <span className="text-muted-foreground">Row {item.row}: </span>
                  {item.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-border/70 bg-card",
          isDialog ? "px-6 py-4" : "mt-5 pt-4",
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {state.success && !onDone ? (
              <Link
                href="/outbound"
                className="cursor-pointer text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                View Outbound
              </Link>
            ) : (
              <span className="hidden text-sm text-muted-foreground sm:inline" />
            )}
            <Button asChild variant="ghost" className="h-10 cursor-pointer">
              <Link href="/settings/integrations/erp">Manage connections</Link>
            </Button>
          </div>
          <ActionButton
            type="submit"
            disabled={!connectionId}
            loading={pending}
            loadingText="Syncing…"
            className="h-10 w-full cursor-pointer sm:ml-auto sm:w-auto"
          >
            <RefreshCw className="size-4" />
            Sync now
          </ActionButton>
        </div>
      </div>
    </form>
  );
}
