"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
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
  updateProfileAction,
  type ProfileActionState,
} from "@/features/settings/actions/update-profile.action";
import { settingsFieldClassName } from "@/features/settings/lib/field-styles";
import {
  fileToLogoDataUrl,
  LOGO_ACCEPT,
} from "@/features/settings/lib/logo-file";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProfileSettingsFormProps {
  initial: {
    name: string;
    email: string;
    roleLabel: string;
    image: string;
  };
}

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (parts[0] && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email.slice(0, 2) || "U").toUpperCase();
}

export function ProfileSettingsForm({ initial }: ProfileSettingsFormProps) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(initial.image);
  const [imageError, setImageError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    {} as ProfileActionState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const busy = pending || compressing;
  const initials = getInitials(initial.name, initial.email);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImageError(null);
    setCompressing(true);
    void fileToLogoDataUrl(file)
      .then((dataUrl) => {
        setImage(dataUrl);
      })
      .catch((error: unknown) => {
        setImageError(
          error instanceof Error
            ? error.message.replace(/\blogo\b/gi, "photo")
            : "Could not process that photo.",
        );
      })
      .finally(() => {
        setCompressing(false);
      });
  }

  function clearImage() {
    setImage("");
    setImageError(null);
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={fileInputId}>Profile photo</Label>
        <input type="hidden" name="image" value={image} />
        <div className="flex items-start gap-3.5">
          <Avatar className="size-16 ring-1 ring-border/50">
            {image ? (
              <AvatarImage src={image} alt="Profile photo preview" />
            ) : null}
            <AvatarFallback className="bg-primary text-base font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-md border-border bg-background hover:border-primary/40"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {compressing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {image ? "Replace photo" : "Upload photo"}
              </Button>
              {image ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-md text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                  disabled={busy}
                  onClick={clearImage}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              PNG, JPG, WebP, or SVG up to 5 MB. Photos are compressed for
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
          disabled={busy}
          onChange={handleFileChange}
        />
        {imageError ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
            {imageError}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="profile-name">Full name</Label>
          <Input
            id="profile-name"
            name="name"
            defaultValue={initial.name}
            placeholder="Your name"
            className={settingsFieldClassName}
            required
            minLength={2}
            maxLength={120}
            disabled={busy}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            type="email"
            value={initial.email}
            readOnly
            className={settingsFieldClassName}
            disabled
            aria-readonly
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Email is used to sign in and cannot be changed here.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-role">Role</Label>
          <Input
            id="profile-role"
            value={initial.roleLabel}
            readOnly
            className={settingsFieldClassName}
            disabled
            aria-readonly
          />
        </div>
      </div>

      {state.error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
          Profile saved.
        </div>
      ) : null}

      <div className="flex items-center border-t border-border/60 pt-5">
        <ActionButton
          type="submit"
          disabled={busy}
          loading={pending}
          loadingText="Saving…"
          className="h-10 rounded-md px-5 font-semibold shadow-sm"
        >
          Save profile
        </ActionButton>
      </div>
    </form>
  );
}
