"use client";

import { useState } from "react";
import Link from "next/link";

import { DocumentRowActions } from "@/features/documents/components/document-row-actions";
import {
  BusinessStatusBadge,
  EisAckStatusBadge,
} from "@/features/documents/components/document-status-badge";
import {
  formatDocumentType,
  formatIssueDate,
  formatMoney,
} from "@/features/documents/lib/document-format";
import {
  DOCUMENT_PAGE_SIZE,
  type DocumentDirection,
} from "@/features/documents/lib/document-list-shared";
import { formatDocumentSourceLabel } from "@/features/documents/lib/document-source-label";
import { Checkbox } from "@/components/ui/checkbox";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  tableCardClassName,
} from "@/components/ui/table";
import { cn } from "@/utils/cn";

export interface DocumentListRow {
  id: string;
  documentType: string;
  status: string;
  documentNumber: string;
  /** ISO date string from the list DTO (or Date for convenience). */
  issueDate: string | Date;
  currency: string;
  counterpartName: string;
  /** Plain string amount (Prisma Decimal serialized via `.toString()`). */
  totalAmount: string | number;
  eisAckStatus?: string | null;
  cancellationStatus?: string | null;
  eisReferenceId?: string | null;
  source?: string;
  sourceSystem?: string | null;
  sourceLabel?: string | null;
}

export interface DocumentListFiltersState {
  status?: string;
  q?: string;
  documentType?: string;
}

export interface DocumentListTableProps {
  direction: DocumentDirection;
  documents: DocumentListRow[];
  total: number;
  page: number;
  totalPages: number;
  filters?: DocumentListFiltersState;
  emptyTitle: string;
  emptyDescription: string;
  canManage?: boolean;
}

function buildListHref(
  direction: DocumentDirection,
  page: number,
  filters?: DocumentListFiltersState,
) {
  const base = direction === "outbound" ? "/outbound" : "/inbound";
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (filters?.status) params.set("status", filters.status);
  if (filters?.q) params.set("q", filters.q);
  if (filters?.documentType) params.set("documentType", filters.documentType);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function DocumentListTable({
  direction,
  documents,
  total,
  page,
  totalPages,
  filters,
  emptyTitle,
  emptyDescription,
  canManage = false,
}: DocumentListTableProps) {
  const detailBase = direction === "outbound" ? "/outbound" : "/inbound";
  const isOutbound = direction === "outbound";
  const rangeStart = total === 0 ? 0 : (page - 1) * DOCUMENT_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * DOCUMENT_PAGE_SIZE, total);
  const pageIds = documents.map((doc) => doc.id);
  const selectionKey = `${direction}:${page}:${pageIds.join(",")}`;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [activeSelectionKey, setActiveSelectionKey] = useState(selectionKey);

  // Reset selection when the page, direction, or row set changes (React render-time adjust).
  if (activeSelectionKey !== selectionKey) {
    setActiveSelectionKey(selectionKey);
    setSelectedIds(new Set());
  }

  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;
  const someSelected = selectedOnPage > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(pageIds) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  if (total === 0) {
    return (
      <div
        className={cn(
          tableCardClassName,
          "px-6 py-14 text-center",
        )}
      >
        <p className="text-base font-medium text-foreground">{emptyTitle}</p>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table className="min-w-[880px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 px-3 pr-0">
              <Checkbox
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={(value) => toggleAll(value === true)}
                aria-label="Select all documents on this page"
              />
            </TableHead>
            <TableHead className="w-12 px-2 text-center tabular-nums">
              #
            </TableHead>
            <TableHead>Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Counterpart</TableHead>
            <TableHead>Issue date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            {isOutbound ? (
              <TableHead>Source</TableHead>
            ) : (
              <TableHead>EIS response</TableHead>
            )}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc, index) => {
            const rowIndex = (page - 1) * DOCUMENT_PAGE_SIZE + index + 1;
            const isSelected = selectedIds.has(doc.id);

            return (
              <TableRow
                key={doc.id}
                data-state={isSelected ? "selected" : undefined}
                className={cn(isSelected && "bg-muted/40")}
              >
                <TableCell className="px-3 pr-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(value) =>
                      toggleOne(doc.id, value === true)
                    }
                    aria-label={`Select document ${doc.documentNumber}`}
                  />
                </TableCell>
                <TableCell className="px-2 text-center tabular-nums text-muted-foreground">
                  {rowIndex}
                </TableCell>
                <TableCell>
                  <Link
                    href={`${detailBase}/${doc.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {doc.documentNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDocumentType(doc.documentType)}
                </TableCell>
                <TableCell>{doc.counterpartName}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatIssueDate(doc.issueDate)}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatMoney(doc.totalAmount, doc.currency)}
                </TableCell>
                <TableCell>
                  <BusinessStatusBadge
                    direction={direction}
                    document={{
                      status: doc.status,
                      cancellationStatus: doc.cancellationStatus,
                    }}
                  />
                </TableCell>
                <TableCell>
                  {isOutbound ? (
                    <span className="text-muted-foreground">
                      {formatDocumentSourceLabel({
                        source: doc.source ?? "manual",
                        sourceSystem: doc.sourceSystem,
                        sourceLabel: doc.sourceLabel,
                      })}
                    </span>
                  ) : (
                    <EisAckStatusBadge status={doc.eisAckStatus} />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DocumentRowActions
                    detailHref={`${detailBase}/${doc.id}`}
                    canManage={canManage}
                    document={{
                      id: doc.id,
                      documentNumber: doc.documentNumber,
                      documentType: doc.documentType,
                      counterpartName: doc.counterpartName,
                      issueDate: doc.issueDate,
                      currency: doc.currency,
                      totalAmount: doc.totalAmount,
                      status: doc.status,
                      eisReferenceId: doc.eisReferenceId ?? null,
                      cancellationStatus: doc.cancellationStatus,
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <TablePagination
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={total}
        prevHref={
          page > 1 ? buildListHref(direction, page - 1, filters) : undefined
        }
        nextHref={
          page < totalPages
            ? buildListHref(direction, page + 1, filters)
            : undefined
        }
      />
    </div>
  );
}
