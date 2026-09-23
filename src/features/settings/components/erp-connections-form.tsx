"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { formatDefaultFieldMapHelp } from "@/features/documents/lib/bir-portal-field-map";
import { deleteErpConnectionAction } from "@/features/settings/actions/delete-erp-connection.action";
import { testErpConnectionAction } from "@/features/settings/actions/test-erp-connection.action";
import {
  upsertErpConnectionAction,
  type ErpConnectionActionState,
} from "@/features/settings/actions/upsert-erp-connection.action";
import {
  settingsFieldClassName,
  settingsSelectTriggerClassName,
  settingsTextareaClassName,
} from "@/features/settings/lib/field-styles";
import {
  ERP_PROVIDER_LABELS,
  ERP_PROVIDERS,
} from "@/features/settings/schemas/erp-connection.schema";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
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

export type ErpConnectionListItem = {
  id: string;
  provider: string;
  name: string;
  baseUrl: string | null;
  username: string | null;
  secretLast4: string | null;
  enabled: boolean;
  lastSyncAt: string | null;
  notes: string | null;
};

export interface ErpConnectionsFormProps {
  canManage: boolean;
  connections: ErpConnectionListItem[];
}

function ConnectionEditor({
  canManage,
  initial,
  onDone,
}: {
  canManage: boolean;
  initial: ErpConnectionListItem | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial?.provider || "sap_b1");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [replacingSecret, setReplacingSecret] = useState(false);
  const [state, formAction, pending] = useActionState(
    upsertErpConnectionAction,
    {} as ErpConnectionActionState,
  );
  const [testState, testAction, testPending] = useActionState(
    testErpConnectionAction,
    {} as ErpConnectionActionState,
  );

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    onDone?.();
    // Intentionally depend on success flag only so parent callbacks do not loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone is a one-shot after save
  }, [state.success, router]);

  const hasStoredSecret = Boolean(initial?.secretLast4);
  const showMaskedSecret =
    hasStoredSecret && (!replacingSecret || Boolean(state.success));
  const showSecretInput = !showMaskedSecret && !state.success;
  const selectsDisabled = !canManage || pending;

  return (
    <div className="space-y-3.5 rounded-lg border border-border/70 bg-muted/20 p-4">
      <form action={formAction} className="space-y-3.5">
        {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
        <input type="hidden" name="provider" value={provider} />
        <input
          type="hidden"
          name="enabled"
          value={enabled ? "true" : "false"}
        />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`erp-name-${initial?.id ?? "new"}`}>
              Connection name
            </Label>
            <Input
              id={`erp-name-${initial?.id ?? "new"}`}
              name="name"
              defaultValue={initial?.name ?? ""}
              placeholder="e.g. SAP B1 production"
              className={settingsFieldClassName}
              required
              minLength={2}
              disabled={!canManage || pending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`erp-provider-${initial?.id ?? "new"}`}>
              Provider
            </Label>
            <Select
              value={provider}
              onValueChange={setProvider}
              disabled={selectsDisabled}
              required
            >
              <SelectTrigger
                id={`erp-provider-${initial?.id ?? "new"}`}
                className={settingsSelectTriggerClassName}
                aria-required
              >
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {ERP_PROVIDERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {ERP_PROVIDER_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`erp-url-${initial?.id ?? "new"}`}>Base URL</Label>
            <Input
              id={`erp-url-${initial?.id ?? "new"}`}
              name="baseUrl"
              defaultValue={initial?.baseUrl ?? ""}
              placeholder="https://erp.example.com (optional for sandbox)"
              className={settingsFieldClassName}
              disabled={!canManage || pending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`erp-username-${initial?.id ?? "new"}`}>
              Username
            </Label>
            <Input
              id={`erp-username-${initial?.id ?? "new"}`}
              name="username"
              defaultValue={initial?.username ?? ""}
              placeholder="Optional"
              className={settingsFieldClassName}
              disabled={!canManage || pending}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`erp-secret-${initial?.id ?? "new"}`}>
            API secret / password
          </Label>
          {showMaskedSecret ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="inline-flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 font-mono text-sm text-muted-foreground">
                •••• •••• •••• {initial?.secretLast4}
              </p>
              {canManage && !state.success ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-md border-border bg-background hover:border-primary/40"
                  onClick={() => setReplacingSecret(true)}
                  disabled={pending}
                >
                  Replace secret
                </Button>
              ) : null}
            </div>
          ) : null}
          {showSecretInput ? (
            <>
              <Input
                id={`erp-secret-${initial?.id ?? "new"}`}
                name="secret"
                type="password"
                autoComplete="off"
                placeholder={
                  hasStoredSecret
                    ? "Enter a new secret to replace the saved one"
                    : "Paste secret (stored encrypted)"
                }
                className={settingsFieldClassName}
                disabled={!canManage || pending}
              />
              {hasStoredSecret && canManage ? (
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => setReplacingSecret(false)}
                >
                  Keep existing secret
                </button>
              ) : null}
            </>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            The full secret is never shown after save. Leave blank to keep the
            current secret.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id={`erp-enabled-${initial?.id ?? "new"}`}
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            disabled={!canManage || pending}
            className="size-4 rounded border-border accent-primary"
          />
          <Label
            htmlFor={`erp-enabled-${initial?.id ?? "new"}`}
            className="font-normal"
          >
            Enabled for sync
          </Label>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`erp-notes-${initial?.id ?? "new"}`}>Notes</Label>
          <Textarea
            id={`erp-notes-${initial?.id ?? "new"}`}
            name="notes"
            defaultValue={initial?.notes ?? ""}
            placeholder="Optional internal notes (no secrets)"
            rows={2}
            className={settingsTextareaClassName}
            disabled={!canManage || pending}
          />
        </div>

        <div className="rounded-md border border-border/60 bg-background/70 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">
            Default field map (read-only for MVP)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {formatDefaultFieldMapHelp()}
          </p>
        </div>

        {state.error ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
            {state.error}
          </div>
        ) : null}
        {state.success ? (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
            {state.message ?? "ERP connection saved."}
          </div>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3.5">
            <ActionButton
              type="submit"
              loading={pending}
              loadingText="Saving…"
              className="h-10 rounded-md px-5 font-semibold shadow-sm"
            >
              {initial ? "Save changes" : "Save connection"}
            </ActionButton>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can view ERP connections. Ask an admin to make changes.
          </p>
        )}
      </form>

      {initial && canManage ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <form action={testAction}>
            <input type="hidden" name="id" value={initial.id} />
            <ActionButton
              type="submit"
              variant="outline"
              size="sm"
              disabled={pending}
              loading={testPending}
              loadingText="Testing…"
              className="h-9"
            >
              Test connection
            </ActionButton>
          </form>
          {testState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {testState.error}
            </p>
          ) : null}
          {testState.success && testState.message ? (
            <p className="text-sm text-emerald-800 dark:text-emerald-200" role="status">
              {testState.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DeleteConnectionButton({
  connectionId,
  canManage,
}: {
  connectionId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteErpConnectionAction,
    {} as ErpConnectionActionState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  if (!canManage) return null;

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={connectionId} />
      <ActionButton
        type="submit"
        variant="outline"
        size="sm"
        loading={pending}
        loadingText="Removing…"
        className="h-8 text-destructive hover:bg-destructive/5 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
        Remove
      </ActionButton>
      {state.error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function ErpConnectionsForm({
  canManage,
  connections,
}: ErpConnectionsFormProps) {
  const [adding, setAdding] = useState(connections.length === 0 && canManage);

  return (
    <div className="space-y-5">
      {connections.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">
          No ERP connections yet. Add one to pull sandbox drafts into Outbound.
        </p>
      ) : null}

      <ul className="space-y-4">
        {connections.map((connection) => (
          <li key={connection.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {connection.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ERP_PROVIDER_LABELS[
                    connection.provider as keyof typeof ERP_PROVIDER_LABELS
                  ] ?? connection.provider}
                  {connection.enabled ? " · Enabled" : " · Disabled"}
                  {connection.lastSyncAt
                    ? ` · Last sync ${new Date(connection.lastSyncAt).toLocaleString("en-PH")}`
                    : ""}
                </p>
              </div>
              <DeleteConnectionButton
                connectionId={connection.id}
                canManage={canManage}
              />
            </div>
            <ConnectionEditor
              key={[
                connection.id,
                connection.name,
                connection.provider,
                connection.secretLast4 ?? "",
                String(connection.enabled),
                connection.notes ?? "",
              ].join("|")}
              canManage={canManage}
              initial={connection}
            />
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            New ERP connection
          </p>
          <ConnectionEditor
            canManage={canManage}
            initial={null}
            onDone={() => setAdding(false)}
          />
        </div>
      ) : null}

      {canManage && !adding ? (
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" />
          Add connection
        </Button>
      ) : null}
    </div>
  );
}
