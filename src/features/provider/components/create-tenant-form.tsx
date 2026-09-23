"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";

import {
  createTenantAction,
  type CreateTenantActionState,
} from "@/features/provider/actions/create-tenant.action";
import { settingsFieldClassName } from "@/features/settings/lib/field-styles";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const picks = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  for (let i = picks.length; i < 14; i += 1) {
    picks.push(all[Math.floor(Math.random() * all.length)]);
  }
  for (let i = picks.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.join("");
}

export function CreateTenantForm() {
  // Empty on SSR; fill after mount to avoid hydration mismatch from Math.random.
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState<"password" | "link" | null>(null);
  const [state, formAction, pending] = useActionState(
    createTenantAction,
    {} as CreateTenantActionState,
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPassword((current) => current || generateTempPassword());
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copyText(value: string, kind: "password" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  }

  if (state.success && state.oneTimePassword && state.loginPath) {
    const absoluteLogin =
      typeof window !== "undefined"
        ? `${window.location.origin}${state.loginPath}`
        : state.loginPath;

    return (
      <div className="space-y-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Workspace created
          </h2>
          <p className="text-sm text-muted-foreground">
            Share these credentials once. The password will not be shown again.
          </p>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="space-y-1">
            <dt className="text-muted-foreground">Organization</dt>
            <dd className="font-medium">{state.tenantName}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Admin email</dt>
            <dd className="font-medium">{state.adminEmail}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">One-time password</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-background px-2.5 py-1.5 font-mono text-sm">
                {state.oneTimePassword}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  void copyText(state.oneTimePassword!, "password")
                }
              >
                {copied === "password" ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                Copy
              </Button>
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Sign-in link</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded-md bg-background px-2.5 py-1.5 font-mono text-xs">
                {absoluteLogin}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyText(absoluteLogin, "link")}
              >
                {copied === "link" ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                Copy
              </Button>
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {state.tenantId ? (
            <Button asChild>
              <Link href={`/provider/tenants/${state.tenantId}`}>
                View workspace
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/provider/tenants">Back to tenants</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="organizationName">Organization name</Label>
        <Input
          id="organizationName"
          name="organizationName"
          className={settingsFieldClassName}
          required
          minLength={2}
          disabled={pending}
          placeholder="Acme Trading Corp"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="tagline">Tagline (optional)</Label>
        <Input
          id="tagline"
          name="tagline"
          className={settingsFieldClassName}
          disabled={pending}
          placeholder="Short workspace description"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="adminName">First admin name</Label>
          <Input
            id="adminName"
            name="adminName"
            className={settingsFieldClassName}
            required
            minLength={2}
            disabled={pending}
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adminEmail">First admin email</Label>
          <Input
            id="adminEmail"
            name="adminEmail"
            type="email"
            className={settingsFieldClassName}
            required
            disabled={pending}
            placeholder="admin@company.com"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Temporary password</Label>
        <div className="flex gap-2">
          <Input
            id="password"
            name="password"
            type="text"
            autoComplete="new-password"
            className={settingsFieldClassName}
            required
            minLength={8}
            disabled={pending}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={pending}
            onClick={() => setPassword(generateTempPassword())}
            title="Generate a strong password"
          >
            <RefreshCw className="size-4" />
            Generate
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Must include upper, lower, number, and special character (8+ chars).
        </p>
      </div>

      {state.error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <ActionButton
          type="submit"
          disabled={!password}
          loading={pending}
          loadingText="Creating…"
        >
          Create workspace
        </ActionButton>
        <Button asChild variant="ghost" disabled={pending}>
          <Link href="/provider/tenants">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
