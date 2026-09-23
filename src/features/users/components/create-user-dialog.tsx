"use client";

import { Check, Copy, Eye, EyeOff, Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createUserAction,
  type CreateUserActionState,
} from "@/features/users/actions/create-user.action";
import { generateTempPassword } from "@/features/users/lib/generate-temp-password";
import {
  ASSIGNABLE_TENANT_ROLE_LABELS,
  ASSIGNABLE_TENANT_ROLES,
  type AssignableTenantRole,
} from "@/features/users/schemas/users.schema";
import {
  settingsFieldClassName,
  settingsSelectTriggerClassName,
} from "@/features/settings/lib/field-styles";
import { PASSWORD_RULES } from "@/features/settings/lib/password-rules";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { cn } from "@/utils/cn";

function CreateUserForm({
  onCreated,
  onPendingChange,
}: {
  onCreated: (result: CreateUserActionState) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [role, setRole] = useState<AssignableTenantRole>("member");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (
      prev: CreateUserActionState,
      formData: FormData,
    ): Promise<CreateUserActionState> => {
      const result = await createUserAction(prev, formData);
      if (result.success && result.temporaryPassword) {
        onCreated(result);
      }
      return result;
    },
    {} as CreateUserActionState,
  );

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="role" value={role} />

      <div className="space-y-1">
        <Label htmlFor="create-user-name">Name</Label>
        <Input
          id="create-user-name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          className={settingsFieldClassName}
          disabled={pending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="create-user-email">Email</Label>
        <Input
          id="create-user-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={settingsFieldClassName}
          disabled={pending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="create-user-role">Role</Label>
        <Select
          value={role}
          onValueChange={(value) => setRole(value as AssignableTenantRole)}
          disabled={pending}
        >
          <SelectTrigger
            id="create-user-role"
            className={settingsSelectTriggerClassName}
          >
            <SelectValue placeholder="Choose a role" />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_TENANT_ROLES.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {ASSIGNABLE_TENANT_ROLE_LABELS[slug]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="create-user-password">Temporary password</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={pending}
            onClick={() => {
              setPassword(generateTempPassword());
              setShowPassword(true);
            }}
          >
            Generate
          </Button>
        </div>
        <div className="relative">
          <Input
            id="create-user-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={cn(settingsFieldClassName, "pr-10")}
            disabled={pending}
          />
          <button
            type="button"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
        <ul className="grid gap-1.5 rounded-md border border-border/70 bg-muted/30 px-3 py-2.5 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(password);
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
      </div>

      {state.error ? (
        <div
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <DialogFooter>
        <ActionButton
          type="submit"
          className="h-10"
          loading={pending}
          loadingText="Creating…"
        >
          Create user
        </ActionButton>
      </DialogFooter>
    </form>
  );
}

function CreatedUserSuccess({
  result,
  onDone,
}: {
  result: CreateUserActionState;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    if (!result.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>User created</DialogTitle>
        <DialogDescription>
          Share this temporary password once. It will not be shown again.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 rounded-md border border-border/70 bg-muted/30 px-3.5 py-3">
        <div className="space-y-0.5 text-sm">
          <p className="font-medium text-foreground">
            {result.createdName || "New user"}
          </p>
          <p className="text-muted-foreground">{result.createdEmail}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="created-temp-password">Temporary password</Label>
          <div className="flex gap-2">
            <Input
              id="created-temp-password"
              readOnly
              value={result.temporaryPassword ?? ""}
              className={cn(settingsFieldClassName, "font-mono text-sm")}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              onClick={() => void copyPassword()}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" className="h-10" onClick={onDone}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}

export function CreateUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [formPending, setFormPending] = useState(false);
  const [created, setCreated] = useState<CreateUserActionState | null>(null);

  function handleOpenChange(next: boolean) {
    if (formPending && !next) return;
    setOpen(next);
    if (!next) {
      setCreated(null);
      setFormPending(false);
      setFormKey((key) => key + 1);
    }
  }

  function handleCreated(result: CreateUserActionState) {
    setCreated(result);
    setFormPending(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="h-10 rounded-md px-4 font-semibold shadow-sm"
        >
          <Plus className="size-4" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {created?.temporaryPassword ? (
          <CreatedUserSuccess
            result={created}
            onDone={() => handleOpenChange(false)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                Create an account for someone in your organization. They can
                change their password after signing in.
              </DialogDescription>
            </DialogHeader>
            <CreateUserForm
              key={formKey}
              onCreated={handleCreated}
              onPendingChange={setFormPending}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
