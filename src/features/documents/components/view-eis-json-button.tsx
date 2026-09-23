"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ViewEisJsonButtonProps = {
  /** Stored CAS-shaped draft payload (Prisma Json / plain object). */
  payload: unknown;
};

function formatPrettyJson(payload: unknown): string | null {
  if (payload === null || payload === undefined) return null;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return null;
  }
}

export function ViewEisJsonButton({ payload }: ViewEisJsonButtonProps) {
  const [copied, setCopied] = useState(false);
  const pretty = formatPrettyJson(payload);
  const hasPayload = pretty !== null;

  async function handleCopy() {
    if (!pretty) return;
    try {
      await navigator.clipboard.writeText(pretty);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="sm" className="h-auto px-0">
          View JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,40rem)] w-full flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Draft EIS JSON</DialogTitle>
          <DialogDescription>
            Draft EIS JSON (CAS-shaped) — not yet JWS-signed.
          </DialogDescription>
        </DialogHeader>

        {hasPayload ? (
          <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
            {pretty}
          </pre>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">JSON not mapped yet</p>
            <p className="mt-1">
              This document was created before draft EIS JSON mapping. Edit and
              save the draft (or create a new document) to generate the payload.
            </p>
          </div>
        )}

        <DialogFooter>
          {hasPayload ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy
                </>
              )}
            </Button>
          ) : null}
          <DialogClose asChild>
            <Button type="button" variant="default">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
