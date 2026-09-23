"use client";

import Link from "next/link";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  importOutboundCsvAction,
  type ImportOutboundCsvState,
} from "@/features/documents/actions/import-outbound-csv.action";
import { OUTBOUND_CSV_MAX_ROWS } from "@/features/documents/lib/bir-portal-field-map";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

function isDuplicateMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("already exists") ||
    lower.includes("duplicate") ||
    lower.includes("skipped")
  );
}

export function ExcelImportPanel({
  onDone,
  variant = "page",
}: {
  /** When set (e.g. modal), success CTA closes instead of navigating. */
  onDone?: () => void;
  /** `dialog` fills modal height with a frozen footer; `page` fits card layouts. */
  variant?: "page" | "dialog";
}) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastedKeyRef = useRef<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    importOutboundCsvAction,
    {} as ImportOutboundCsvState,
  );
  const isDialog = variant === "dialog";

  function clearSelectedFile() {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  useEffect(() => {
    const key = [
      state.success ? "ok" : "",
      state.error ?? "",
      state.message ?? "",
      state.created ?? "",
      state.skipped ?? "",
      state.errors?.length ?? 0,
    ].join("|");

    if (!state.success && !state.error && !(state.errors?.length)) return;
    if (toastedKeyRef.current === key) return;
    toastedKeyRef.current = key;

    if (state.error) {
      toast.error(state.error);
    }

    if (state.success && state.message) {
      const created = state.created ?? 0;
      // Green only when at least one draft was created.
      // All-duplicate / no-op imports use warning so they don't look successful.
      if (created > 0) {
        toast.success(state.message);
      } else {
        toast.warning(state.message);
      }
    }

    const duplicateMessages =
      state.errors
        ?.filter((item) => isDuplicateMessage(item.message))
        .map((item) =>
          item.row > 0 ? `Row ${item.row}: ${item.message}` : item.message,
        ) ?? [];

    // Summary toast already covers skips when import succeeds.
    if (duplicateMessages.length > 0 && !state.success) {
      const preview = duplicateMessages.slice(0, 3).join(" · ");
      const more =
        duplicateMessages.length > 3
          ? ` (+${duplicateMessages.length - 3} more)`
          : "";
      toast.warning(`${preview}${more}`);
    }

    // Reset file picker after any finished import result (success, warning, or error).
    clearSelectedFile();

    // Close host modal after a finished import result toast (success / warning / error).
    // Keep open when there are hard row-validation issues so the user can fix and re-upload.
    const hardValidationErrors =
      state.errors?.filter((item) => !isDuplicateMessage(item.message)) ?? [];
    if (
      onDone &&
      (state.success || state.error) &&
      hardValidationErrors.length === 0
    ) {
      onDone();
    }
  }, [state, onDone]);

  const validationErrors =
    state.errors?.filter((item) => !isDuplicateMessage(item.message)) ?? [];

  return (
    <form
      action={formAction}
      className={cn("flex flex-col", isDialog && "min-h-0 flex-1")}
    >
      <div
        className={cn(
          "space-y-5",
          isDialog && "min-h-0 flex-1 overflow-y-auto px-6 pb-4",
        )}
      >
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Start with the template
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
              CSV only · up to {OUTBOUND_CSV_MAX_ROWS} rows per upload
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="h-10 shrink-0 cursor-pointer"
          >
            <Link href="/outbound/import/template" prefetch={false}>
              <Download className="size-4" />
              Download CSV template
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor={fileInputId}>Upload filled CSV</Label>
          <label
            htmlFor={fileInputId}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-card px-4 py-8 text-center transition-colors",
              "hover:border-primary/40 hover:bg-muted/30",
              pending && "pointer-events-none opacity-60",
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted/40 text-muted-foreground">
              <FileSpreadsheet className="size-5" aria-hidden />
            </span>
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-foreground">
                {fileName ? fileName : "Choose a CSV file"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {fileName
                  ? "Click to choose a different file"
                  : "Click to browse · .csv"}
              </span>
            </span>
            <input
              ref={fileInputRef}
              id={fileInputId}
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              disabled={pending}
              className="sr-only"
              onChange={(event) => {
                const next = event.target.files?.[0]?.name ?? null;
                setFileName(next);
              }}
            />
          </label>
        </div>

        {state.error ? (
          <div
            className="rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
            role="alert"
          >
            {state.error}
          </div>
        ) : null}

        {validationErrors.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border/70">
            <div className="border-b border-border/60 bg-muted/40 px-3 py-2">
              <p className="text-sm font-medium text-foreground">
                Row issues ({validationErrors.length})
              </p>
            </div>
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-card text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {validationErrors.map((item, index) => (
                    <tr
                      key={`${item.row}-${index}`}
                      className="border-t border-border/50"
                    >
                      <td className="px-3 py-2 align-top tabular-nums text-muted-foreground">
                        {item.row || "—"}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {item.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-border/70 bg-card",
          isDialog ? "px-6 py-4" : "mt-5 pt-4",
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {state.success && onDone ? (
            <button
              type="button"
              onClick={onDone}
              className="cursor-pointer text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Done
            </button>
          ) : state.success ? (
            <Link
              href="/outbound"
              className="cursor-pointer text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              View Outbound
            </Link>
          ) : (
            <span className="hidden text-sm text-muted-foreground sm:inline" />
          )}
          <ActionButton
            type="submit"
            loading={pending}
            loadingText="Importing…"
            className="h-10 w-full cursor-pointer sm:ml-auto sm:w-auto"
          >
            <Upload className="size-4" />
            Import drafts
          </ActionButton>
        </div>
      </div>
    </form>
  );
}
