"use client";

import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, PenLine, Plus, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExcelImportPanel } from "@/features/documents/components/excel-import-panel";
import {
  ErpSyncPanel,
  type ErpSyncConnectionOption,
} from "@/features/documents/components/erp-sync-panel";
import { cn } from "@/utils/cn";

type ChooserStep = "choose" | "erp" | "excel";

function AvailableNowBadge() {
  return (
    <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-[hsl(var(--dashboard-navy-from)/0.22)] bg-[hsl(var(--dashboard-navy-blob)/0.18)] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[hsl(var(--dashboard-navy-to))] uppercase">
      Available now
    </span>
  );
}

type OptionCardShellProps = {
  children: ReactNode;
  className?: string;
  animationDelayClass: string;
};

function OptionCardShell({
  children,
  className,
  animationDelayClass,
}: OptionCardShellProps) {
  return (
    <div
      className={cn(
        "h-full animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-300 motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:transform-none",
        animationDelayClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Soft navy accents reuse dashboard navy CSS vars (same as DashboardNavySurface). */
const optionCardClass = cn(
  "group relative flex h-full min-h-[11.5rem] cursor-pointer flex-col items-center gap-4 overflow-hidden rounded-2xl border border-[hsl(var(--dashboard-navy-to)/0.15)] bg-card p-5 pt-6 text-center shadow-[0_6px_24px_rgba(15,23,42,0.08)]",
  "transition-[transform,box-shadow,border-color] duration-200 ease-out motion-reduce:transition-none",
  "hover:-translate-y-0.5 hover:border-[hsl(var(--dashboard-navy-to)/0.32)] hover:shadow-[0_12px_30px_rgba(15,23,42,0.14)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "motion-reduce:hover:translate-y-0 sm:min-h-[12.5rem] sm:p-6",
);

function OptionCardIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center rounded-2xl text-sidebar-foreground",
        "bg-[linear-gradient(135deg,hsl(var(--dashboard-navy-from))_0%,hsl(var(--dashboard-navy-to))_100%)]",
        "shadow-[0_4px_12px_rgba(15,23,42,0.18),inset_0_0_0_1px_hsl(var(--dashboard-navy-blob)/0.28)]",
        "transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100",
      )}
    >
      {children}
    </span>
  );
}

function OptionCardContent({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <>
      <OptionCardIcon>{icon}</OptionCardIcon>
      <span className="relative flex min-w-0 flex-1 flex-col items-center gap-2">
        <span className="flex flex-col items-center gap-1.5">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </span>
          <AvailableNowBadge />
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
          {description}
        </span>
      </span>
    </>
  );
}

function BackToChooserButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 w-fit cursor-pointer gap-1.5 px-2 text-muted-foreground"
      onClick={onClick}
    >
      <ArrowLeft className="size-3.5" />
      Back to options
    </Button>
  );
}

export function NewDocumentChooser({
  erpConnections,
}: {
  erpConnections: ErpSyncConnectionOption[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ChooserStep>("choose");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setStep("choose");
  }

  function closeChooser() {
    setOpen(false);
    setStep("choose");
  }

  const isChoose = step === "choose";

  return (
    <div className="ml-auto flex justify-end">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button">
            <Plus className="size-4" />
            New document
          </Button>
        </DialogTrigger>
        <DialogContent
          className={cn(
            "max-h-[min(90vh,40rem)] bg-card",
            isChoose ? "gap-5 overflow-y-auto sm:max-w-2xl" : null,
            step === "erp" || step === "excel"
              ? "flex min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
              : null,
          )}
        >
          {isChoose ? (
            <>
              <DialogHeader>
                <DialogTitle>Create outbound document</DialogTitle>
                <DialogDescription>
                  Choose how you want to prepare a new invoice or receipt.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <OptionCardShell animationDelayClass="delay-75">
                  <Link
                    href="/outbound/new"
                    onClick={closeChooser}
                    className={optionCardClass}
                  >
                    <OptionCardContent
                      title="Manual"
                      description="Enter invoice or receipt details yourself in the draft form."
                      icon={
                        <PenLine className="size-5 sm:size-6" aria-hidden />
                      }
                    />
                  </Link>
                </OptionCardShell>

                <OptionCardShell animationDelayClass="delay-150">
                  <button
                    type="button"
                    onClick={() => setStep("erp")}
                    className={optionCardClass}
                  >
                    <OptionCardContent
                      title="ERP Sync"
                      description="Pull documents from SAP B1, Acumatica, ERPNext, and other ERPs."
                      icon={
                        <RefreshCw className="size-5 sm:size-6" aria-hidden />
                      }
                    />
                  </button>
                </OptionCardShell>

                <OptionCardShell animationDelayClass="delay-200">
                  <button
                    type="button"
                    onClick={() => setStep("excel")}
                    className={optionCardClass}
                  >
                    <OptionCardContent
                      title="Excel File"
                      description="Upload a spreadsheet template to create multiple drafts at once."
                      icon={
                        <FileSpreadsheet
                          className="size-5 sm:size-6"
                          aria-hidden
                        />
                      }
                    />
                  </button>
                </OptionCardShell>
              </div>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground/80 sm:text-xs">
                Configure ERP connections under Settings → Integrations when you
                use ERP Sync.
              </p>
            </>
          ) : null}

          {step === "erp" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 space-y-3 px-6 pt-6">
                <BackToChooserButton onClick={() => setStep("choose")} />
                <DialogHeader className="space-y-1.5">
                  <DialogTitle>ERP Sync</DialogTitle>
                  <DialogDescription>
                    Sync fresh sandbox sample invoices into Outbound drafts using
                    a saved connection.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="mt-4 flex min-h-0 flex-1 flex-col">
                <ErpSyncPanel
                  connections={erpConnections}
                  onDone={closeChooser}
                  variant="dialog"
                />
              </div>
            </div>
          ) : null}

          {step === "excel" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 space-y-3 px-6 pt-6">
                <BackToChooserButton onClick={() => setStep("choose")} />
                <DialogHeader className="space-y-1.5">
                  <DialogTitle>Import from Excel</DialogTitle>
                  <DialogDescription>
                    Download the CSV template, fill your rows, and create
                    outbound drafts in bulk.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="mt-4 flex min-h-0 flex-1 flex-col">
                <ExcelImportPanel variant="dialog" onDone={closeChooser} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
