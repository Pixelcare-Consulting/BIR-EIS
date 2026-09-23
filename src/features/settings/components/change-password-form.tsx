"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  changePasswordAction,
  type ChangePasswordActionState,
} from "@/features/settings/actions/change-password.action";
import { settingsFieldClassName } from "@/features/settings/lib/field-styles";
import { PASSWORD_RULES } from "@/features/settings/lib/password-rules";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  disabled,
  show,
  onToggleShow,
  onValueChange,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  disabled: boolean;
  show: boolean;
  onToggleShow: () => void;
  onValueChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          className={cn(settingsFieldClassName, "pr-10")}
          disabled={disabled}
          required
          onChange={
            onValueChange
              ? (event) => onValueChange(event.target.value)
              : undefined
          }
        />
        <button
          type="button"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          onClick={onToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const [state, formAction, pending] = useActionState(
    async (
      prev: ChangePasswordActionState,
      formData: FormData,
    ): Promise<ChangePasswordActionState> => {
      const result = await changePasswordAction(prev, formData);
      if (result.success) {
        setFormKey((key) => key + 1);
        setNewPassword("");
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
      }
      return result;
    },
    {} as ChangePasswordActionState,
  );

  return (
    <form key={formKey} action={formAction} className="space-y-5">
      <PasswordField
        id="current-password"
        name="currentPassword"
        label="Current password"
        autoComplete="current-password"
        disabled={pending}
        show={showCurrent}
        onToggleShow={() => setShowCurrent((prev) => !prev)}
      />

      <PasswordField
        id="new-password"
        name="newPassword"
        label="New password"
        autoComplete="new-password"
        disabled={pending}
        show={showNew}
        onToggleShow={() => setShowNew((prev) => !prev)}
        onValueChange={setNewPassword}
      />

      <ul className="grid gap-1.5 rounded-md border border-border/70 bg-muted/30 px-3.5 py-3 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(newPassword);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-xs",
                passed
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground",
              )}
            >
              {passed ? (
                <Check className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <X className="size-3.5 shrink-0 opacity-50" aria-hidden />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>

      <PasswordField
        id="confirm-password"
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        disabled={pending}
        show={showConfirm}
        onToggleShow={() => setShowConfirm((prev) => !prev)}
      />

      {state.error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
          Password updated. Use your new password the next time you sign in.
        </div>
      ) : null}

      <div className="flex items-center border-t border-border/60 pt-5">
        <ActionButton
          type="submit"
          loading={pending}
          loadingText="Updating…"
          className="h-10 rounded-md px-5 font-semibold shadow-sm"
        >
          Update password
        </ActionButton>
      </div>
    </form>
  );
}
