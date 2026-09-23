"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} from "@/features/documents/schemas/document.schema";
import type { DocumentDirection } from "@/features/documents/lib/document-list-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { settingsFieldClassName } from "@/features/settings/lib/field-styles";
import { cn } from "@/utils/cn";

const SEARCH_DEBOUNCE_MS = 350;

function buildListHref(
  direction: DocumentDirection,
  next: { q?: string; documentType?: string; status?: string },
) {
  const base = direction === "outbound" ? "/outbound" : "/inbound";
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.q) params.set("q", next.q);
  if (next.documentType) params.set("documentType", next.documentType);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function DocumentSearchFilters({
  direction,
  q,
  documentType,
  status,
}: {
  direction: DocumentDirection;
  q?: string;
  documentType?: string;
  status?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(q ?? "");
  const [prevQ, setPrevQ] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const action = direction === "outbound" ? "/outbound" : "/inbound";

  // Sync local search field when the URL `q` changes (filters, back/forward).
  if (q !== prevQ) {
    setPrevQ(q);
    setSearchValue(q ?? "");
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function navigateWithSearch(nextQ: string) {
    const trimmed = nextQ.trim();
    const href = buildListHref(direction, {
      ...(status ? { status } : {}),
      ...(documentType ? { documentType } : {}),
      ...(trimmed ? { q: trimmed } : {}),
    });
    startTransition(() => {
      router.push(href);
    });
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const current = (q ?? "").trim();
      const next = value.trim();
      if (current === next) return;
      navigateWithSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <form
      action={action}
      method="get"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={() => {
        // Debounced search already navigates; Apply still submits for document type.
        if (debounceRef.current) clearTimeout(debounceRef.current);
      }}
    >
      {status ? <input type="hidden" name="status" value={status} /> : null}

      <div className="min-w-48 flex-1 space-y-1">
        <label
          htmlFor="document-q"
          className="text-xs font-medium text-muted-foreground"
        >
          Search
        </label>
        <Input
          id="document-q"
          name="q"
          value={searchValue}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Document number or counterpart"
          className="rounded-lg"
        />
      </div>

      <div className="w-full space-y-1 sm:w-56">
        <label
          htmlFor="document-type"
          className="text-xs font-medium text-muted-foreground"
        >
          Document type
        </label>
        <select
          id="document-type"
          name="documentType"
          defaultValue={documentType ?? ""}
          className={cn(settingsFieldClassName, "h-9 rounded-lg")}
        >
          <option value="">All types</option>
          {DOCUMENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}
