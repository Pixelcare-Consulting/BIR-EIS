"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { registerAction } from "@/features/auth/actions/register.action";
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

type RegisterState = {
  error?: string;
  success?: boolean;
};

export function RegisterForm() {
  const router = useRouter();
  const signInStarted = useRef(false);
  const [state, formAction, pending] = useActionState(
    registerAction,
    {} as RegisterState,
  );

  const isBusy = pending || Boolean(state?.success);

  useEffect(() => {
    if (!state?.success || signInStarted.current) return;
    signInStarted.current = true;

    const form = document.getElementById("register-form") as HTMLFormElement | null;
    if (!form) return;

    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    void authClient.signIn
      .email({
        email,
        password,
      })
      .then((result) => {
        if (result.error) {
          signInStarted.current = false;
          return;
        }
        router.push("/dashboard");
        router.refresh();
      })
      .catch(() => {
        signInStarted.current = false;
      });
  }, [state, router]);

  return (
    <form id="register-form" action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="organizationName" className="text-sm font-medium">
          Organization name
        </Label>
        <Input
          id="organizationName"
          name="organizationName"
          placeholder="Acme Corp"
          className={inputClassName}
          required
          disabled={isBusy}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Your name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Jane Doe"
          className={inputClassName}
          required
          disabled={isBusy}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
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
          placeholder="••••••••"
          className={inputClassName}
          required
          minLength={10}
          disabled={isBusy}
        />
      </div>
      {state?.error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}
      <ActionButton
        type="submit"
        className="h-11 w-full rounded-lg text-sm font-semibold shadow-sm"
        loading={isBusy}
        loadingText={state?.success ? "Signing in…" : "Creating…"}
      >
        Create organization
      </ActionButton>
    </form>
  );
}
