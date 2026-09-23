"use client";

import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";

import {
  updateOrganizationAction,
  type OrganizationActionState,
} from "@/features/settings/actions/update-organization.action";
import {
  settingsFieldClassName,
  settingsTextareaClassName,
} from "@/features/settings/lib/field-styles";
import {
  fileToLogoDataUrl,
  LOGO_ACCEPT,
} from "@/features/settings/lib/logo-file";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";

export interface OrganizationSettingsFormProps {
  canManage: boolean;
  initial: {
    name: string;
    tagline: string;
    logo: string;
  };
}

export function OrganizationSettingsForm({
  canManage,
  initial,
}: OrganizationSettingsFormProps) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState(initial.logo);
  const [showUrlField, setShowUrlField] = useState(
    () => Boolean(initial.logo) && !initial.logo.startsWith("data:"),
  );
  const [logoError, setLogoError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateOrganizationAction,
    {} as OrganizationActionState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const busy = pending || compressing;
  const disabled = !canManage || busy;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLogoError(null);
    setCompressing(true);
    void fileToLogoDataUrl(file)
      .then((dataUrl) => {
        setLogo(dataUrl);
        setShowUrlField(false);
      })
      .catch((error: unknown) => {
        setLogoError(
          error instanceof Error
            ? error.message
            : "Could not process that logo.",
        );
      })
      .finally(() => {
        setCompressing(false);
      });
  }

  function clearLogo() {
    setLogo("");
    setLogoError(null);
    setShowUrlField(false);
  }

  return (
    <form action={formAction} className="space-y-3.5">
      <div className="space-y-1">
        <Label htmlFor="org-name">Company name</Label>
        <Input
          id="org-name"
          name="name"
          defaultValue={initial.name}
          className={settingsFieldClassName}
          required
          minLength={2}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="org-tagline">Tagline</Label>
        <Input
          id="org-tagline"
          name="tagline"
          defaultValue={initial.tagline}
          placeholder="Short description for your workspace"
          className={settingsFieldClassName}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={fileInputId}>Logo</Label>
        <input type="hidden" name="logo" value={logo} />
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/50 ring-1 ring-border/40",
              !logo && "text-muted-foreground",
            )}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs / arbitrary tenant URLs
              <img
                src={logo}
                alt="Organization logo preview"
                className="size-full object-cover"
              />
            ) : (
              <ImagePlus className="size-5 opacity-55" aria-hidden />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-md border-border bg-background hover:border-primary/40"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
              >
                {compressing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {logo ? "Replace logo" : "Upload logo"}
              </Button>
              {logo ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-md text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                  disabled={disabled}
                  onClick={clearLogo}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              PNG, JPG, WebP, or SVG up to 5 MB. Images are compressed for
              storage.
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept={LOGO_ACCEPT}
          className="sr-only"
          disabled={disabled}
          onChange={handleFileChange}
        />

        {logoError ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
            {logoError}
          </div>
        ) : null}

        <div className="space-y-2">
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            disabled={disabled}
            onClick={() => setShowUrlField((open) => !open)}
          >
            {showUrlField ? "Hide URL option" : "Or paste a logo URL"}
          </button>
          {showUrlField ? (
            <>
              <Textarea
                id="org-logo-url"
                value={logo}
                onChange={(event) => {
                  setLogo(event.target.value);
                  setLogoError(null);
                }}
                placeholder="https://… or data:image/…"
                rows={3}
                className={settingsTextareaClassName}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Paste a public image URL if you host the logo
                elsewhere.
              </p>
            </>
          ) : null}
        </div>
      </div>

      {state.error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
          Organization settings saved.
        </div>
      ) : null}

      <div className="flex items-center border-t border-border/60 pt-3.5">
        {canManage ? (
          <ActionButton
            type="submit"
            disabled={busy}
            loading={pending}
            loadingText="Saving…"
            className="h-10 rounded-md px-5 font-semibold shadow-sm"
          >
            Save organization
          </ActionButton>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can view these settings. Ask an admin to make changes.
          </p>
        )}
      </div>
    </form>
  );
}
