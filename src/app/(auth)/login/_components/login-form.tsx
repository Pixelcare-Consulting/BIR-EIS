"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AppVersion } from "@/app/(auth)/_components/app-version";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/utils/cn";

const inputClassName = cn(
  "h-11 rounded-lg border-border/80 bg-muted/40 px-3.5 shadow-none",
  "placeholder:text-muted-foreground/70",
  "focus-visible:bg-background focus-visible:ring-primary/30",
);

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("error") === "session-expired";
  const [error, setError] = useState<string | null>(
    sessionExpired
      ? "Your session is no longer valid. Sign in again."
      : null,
  );
  const [isBusy, setIsBusy] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsBusy(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setIsBusy(false);
        setError("Invalid email or password. Please try again.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setIsBusy(false);
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className={inputClassName}
          required
          disabled={isBusy}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClassName}
          required
          minLength={8}
          disabled={isBusy}
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <ActionButton
        type="submit"
        className="h-11 w-full rounded-lg text-sm font-semibold shadow-sm"
        loading={isBusy}
        loadingText="Signing in…"
      >
        Sign in
      </ActionButton>

      <AppVersion className="w-full pt-1" />
    </form>
  );
}
