"use client";

import {
  Cloud,
  Clock3,
  ListOrdered,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DashboardNavySurface } from "@/app/(app)/dashboard/_components/dashboard-navy-surface";
import { DEMO_SYSTEM_STATUS } from "@/app/(app)/dashboard/_data/demo-invoices";
import { ActionButton } from "@/components/ui/action-button";
import { Card, CardContent } from "@/components/ui/card";

interface BirEisSystemStatusProps {
  registeredUsers: number;
}

function formatCheckedAt(date: Date): string {
  return date.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function BirEisSystemStatus({
  registeredUsers,
}: BirEisSystemStatusProps) {
  const router = useRouter();
  const [checkedAt, setCheckedAt] = useState(() => new Date());
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(() => {
      setCheckedAt(new Date());
      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden border-transparent shadow-[0_6px_24px_rgba(15,23,42,0.07)]">
      <DashboardNavySurface className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-teal-300"
              aria-hidden
            />
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">
                BIR EIS System Status
              </h2>
              <p className="text-xs text-sidebar-muted">Real-time monitoring.</p>
            </div>
          </div>
          <ActionButton
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 gap-1.5 border border-white/25 bg-white/10 text-sidebar-foreground hover:bg-white/15 hover:text-sidebar-foreground"
            onClick={handleRefresh}
            loading={isPending}
            loadingText="Refreshing…"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Refresh
          </ActionButton>
        </div>
      </DashboardNavySurface>
      <CardContent className="space-y-4 px-5 py-5">
        <div className="rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"
                aria-hidden
              >
                <Cloud className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  API Connection
                </p>
                <p className="text-xs text-muted-foreground">
                  Last checked: {formatCheckedAt(checkedAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Environment: {DEMO_SYSTEM_STATUS.environment}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Online
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-sm">
            <div className="flex items-start gap-3">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"
                aria-hidden
              >
                <ListOrdered className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Queue</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {DEMO_SYSTEM_STATUS.queueDocuments} documents
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600"
                  aria-hidden
                >
                  <Clock3 className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Last Sync
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {DEMO_SYSTEM_STATUS.lastSyncLabel}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                Recent
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-sm">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--dashboard-navy-to))] text-sidebar-foreground"
            aria-hidden
          >
            <Users className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {registeredUsers} user{registeredUsers === 1 ? "" : "s"} registered
            </p>
            <p className="text-xs text-muted-foreground">
              {DEMO_SYSTEM_STATUS.activeInLastHour} active in last hour
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
