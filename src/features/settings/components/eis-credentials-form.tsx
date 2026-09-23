"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  upsertEisCredentialsAction,
  type EisCredentialsActionState,
} from "@/features/settings/actions/upsert-eis-credentials.action";
import {
  settingsFieldClassName,
  settingsSelectTriggerClassName,
  settingsTextareaClassName,
} from "@/features/settings/lib/field-styles";
import {
  EIS_ENVIRONMENT_LABELS,
  EIS_ENVIRONMENTS,
  PTT_STATUS_LABELS,
  PTT_STATUSES,
} from "@/features/settings/schemas/settings.schema";
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

export interface EisCredentialsFormProps {
  canManage: boolean;
  initial: {
    tin: string;
    environment: string;
    pttNumber: string;
    pttStatus: string;
    apiKeyLast4: string | null;
    notes: string;
  };
}

export function EisCredentialsForm({
  canManage,
  initial,
}: EisCredentialsFormProps) {
  const router = useRouter();
  const [environment, setEnvironment] = useState(
    initial.environment || "cert",
  );
  const [pttStatus, setPttStatus] = useState(
    initial.pttStatus || "not_started",
  );
  const [replacingKey, setReplacingKey] = useState(false);
  const [state, formAction, pending] = useActionState(
    upsertEisCredentialsAction,
    {} as EisCredentialsActionState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const hasStoredKey = Boolean(initial.apiKeyLast4);
  const showMaskedKey =
    hasStoredKey && (!replacingKey || Boolean(state.success));
  const showKeyInput = !showMaskedKey && !state.success;
  const selectsDisabled = !canManage || pending;

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="environment" value={environment} />
      <input type="hidden" name="pttStatus" value={pttStatus} />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-1">
          <Label htmlFor="eis-tin">Taxpayer Identification Number (TIN)</Label>
          <Input
            id="eis-tin"
            name="tin"
            defaultValue={initial.tin}
            placeholder="000-000-000-00000"
            className={settingsFieldClassName}
            required
            minLength={9}
            disabled={!canManage || pending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="eis-environment">EIS environment</Label>
          <Select
            value={environment}
            onValueChange={setEnvironment}
            disabled={selectsDisabled}
            required
          >
            <SelectTrigger
              id="eis-environment"
              className={settingsSelectTriggerClassName}
              aria-required
            >
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              {EIS_ENVIRONMENTS.map((value) => (
                <SelectItem key={value} value={value}>
                  {EIS_ENVIRONMENT_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="eis-ptt-number">Permit to Transmit (PTT) number</Label>
          <Input
            id="eis-ptt-number"
            name="pttNumber"
            defaultValue={initial.pttNumber}
            placeholder="Optional"
            className={settingsFieldClassName}
            disabled={!canManage || pending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="eis-ptt-status">PTT status</Label>
          <Select
            value={pttStatus}
            onValueChange={setPttStatus}
            disabled={selectsDisabled}
            required
          >
            <SelectTrigger
              id="eis-ptt-status"
              className={settingsSelectTriggerClassName}
              aria-required
            >
              <SelectValue placeholder="Select PTT status" />
            </SelectTrigger>
            <SelectContent>
              {PTT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {PTT_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="eis-api-key">EIS API key</Label>
        {showMaskedKey ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="inline-flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 font-mono text-sm text-muted-foreground">
              •••• •••• •••• {initial.apiKeyLast4}
            </p>
            {canManage && !state.success ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-md border-border bg-background hover:border-primary/40"
                onClick={() => setReplacingKey(true)}
                disabled={pending}
              >
                Replace key
              </Button>
            ) : null}
          </div>
        ) : null}
        {showKeyInput ? (
          <>
            <Input
              id="eis-api-key"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder={
                hasStoredKey
                  ? "Enter a new API key to replace the saved one"
                  : "Paste API key (stored encrypted)"
              }
              className={settingsFieldClassName}
              disabled={!canManage || pending}
            />
            {hasStoredKey && canManage ? (
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => setReplacingKey(false)}
              >
                Keep existing key
              </button>
            ) : null}
          </>
        ) : null}
        <p className="text-xs leading-relaxed text-muted-foreground">
          The full key is never shown after save. Leave blank to keep the
          current key.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="eis-notes">Notes</Label>
        <Textarea
          id="eis-notes"
          name="notes"
          defaultValue={initial.notes}
          placeholder="Optional internal notes (no secrets)"
          rows={3}
          className={settingsTextareaClassName}
          disabled={!canManage || pending}
        />
      </div>

      {state.error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
          EIS credentials saved.
        </div>
      ) : null}

      <div className="flex items-center border-t border-border/60 pt-3.5">
        {canManage ? (
          <ActionButton
            type="submit"
            loading={pending}
            loadingText="Saving…"
            className="h-10 rounded-md px-5 font-semibold shadow-sm"
          >
            Save EIS credentials
          </ActionButton>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can view these credentials. Ask an admin to make changes.
          </p>
        )}
      </div>
    </form>
  );
}
