"use client";

import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import {
  deactivateUserAction,
  type DeactivateUserActionState,
} from "@/features/users/actions/deactivate-user.action";
import {
  setUserRoleAction,
  type SetUserRoleActionState,
} from "@/features/users/actions/set-user-role.action";
import {
  ASSIGNABLE_TENANT_ROLE_LABELS,
  ASSIGNABLE_TENANT_ROLES,
  type AssignableTenantRole,
} from "@/features/users/schemas/users.schema";
import { settingsSelectTriggerClassName } from "@/features/settings/lib/field-styles";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isPlatformOperator } from "@/lib/auth/role-constants";

export type UsersTableRow = {
  id: string;
  name: string;
  email: string;
  roleSlugs: string[];
};

export interface UsersTableProps {
  users: UsersTableRow[];
  currentUserId: string;
}

function roleLabel(slugs: string[]): string {
  if (slugs.length === 0) return "—";
  return slugs
    .map((slug) => {
      if (slug === "tenant_admin" || slug === "member") {
        return ASSIGNABLE_TENANT_ROLE_LABELS[slug];
      }
      if (slug === "super_admin") return "Super Admin";
      return slug;
    })
    .join(", ");
}

function primaryAssignableRole(slugs: string[]): AssignableTenantRole | null {
  if (slugs.includes("tenant_admin")) return "tenant_admin";
  if (slugs.includes("member")) return "member";
  return null;
}

function UserRoleSelect({
  user,
  disabled,
}: {
  user: UsersTableRow;
  disabled: boolean;
}) {
  const router = useRouter();
  const serverRole = primaryAssignableRole(user.roleSlugs) ?? "member";
  const [draftRole, setDraftRole] = useState<AssignableTenantRole | null>(null);

  const [state, formAction, pending] = useActionState(
    async (
      prev: SetUserRoleActionState,
      formData: FormData,
    ): Promise<SetUserRoleActionState> => {
      const result = await setUserRoleAction(prev, formData);
      if (result.success) {
        setDraftRole(null);
        router.refresh();
      } else {
        setDraftRole(null);
      }
      return result;
    },
    {} as SetUserRoleActionState,
  );

  if (disabled) {
    return (
      <span className="text-muted-foreground">{roleLabel(user.roleSlugs)}</span>
    );
  }

  const role = draftRole ?? serverRole;

  function handleRoleChange(value: string) {
    const next = value as AssignableTenantRole;
    if (next === serverRole) {
      setDraftRole(null);
      return;
    }

    setDraftRole(next);
    const formData = new FormData();
    formData.set("userId", user.id);
    formData.set("role", next);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <div className="flex min-w-[9.5rem] flex-col gap-1">
      <Select value={role} onValueChange={handleRoleChange} disabled={pending}>
        <SelectTrigger
          id={`role-trigger-${user.id}`}
          className={settingsSelectTriggerClassName}
          aria-label={`Role for ${user.email}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNABLE_TENANT_ROLES.map((slug) => (
            <SelectItem key={slug} value={slug}>
              {ASSIGNABLE_TENANT_ROLE_LABELS[slug]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Saving…
        </span>
      ) : null}
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

function DeactivateUserButton({
  user,
  isSelf,
}: {
  user: UsersTableRow;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (
      prev: DeactivateUserActionState,
      formData: FormData,
    ): Promise<DeactivateUserActionState> => {
      const result = await deactivateUserAction(prev, formData);
      if (result.success) {
        setConfirming(false);
        router.refresh();
      }
      return result;
    },
    {} as DeactivateUserActionState,
  );

  if (isSelf) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title="You cannot deactivate yourself"
      >
        —
      </span>
    );
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-destructive hover:bg-destructive/5 hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        Deactivate
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={user.id} />
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
        <ActionButton
          type="submit"
          variant="outline"
          size="sm"
          loading={pending}
          loadingText="Deactivating…"
          className="h-8 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          Confirm
        </ActionButton>
      </div>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border-transparent bg-card shadow-[0_6px_22px_rgba(15,23,42,0.07)]">
      <table className="w-full text-sm">
        <thead className="border-b border-border/60 bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                No users found in this organization.
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const platformOp = isPlatformOperator(user.roleSlugs);
              const isSelf = user.id === currentUserId;

              return (
                <tr
                  key={user.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span>{user.name || "—"}</span>
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">
                          You
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <UserRoleSelect
                      key={`${user.id}:${user.roleSlugs.join(",")}`}
                      user={user}
                      disabled={platformOp}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {platformOp ? (
                      <span className="text-xs text-muted-foreground">
                        Protected
                      </span>
                    ) : (
                      <DeactivateUserButton user={user} isSelf={isSelf} />
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
