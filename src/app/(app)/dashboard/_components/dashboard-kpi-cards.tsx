import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Ban,
  Building2,
  Clock3,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export interface DashboardKpiValues {
  outbound: number;
  inbound: number;
  companies: number;
  cancellationPending: number;
  cancelled: number;
}

const SUMMARY_META: {
  key: keyof DashboardKpiValues;
  label: string;
  caption: string;
  icon: LucideIcon;
  accentClass: string;
}[] = [
  {
    key: "outbound",
    label: "OUTBOUND INVOICES",
    caption: "TOTAL",
    icon: ArrowUpFromLine,
    accentClass: "border-t-sky-500",
  },
  {
    key: "inbound",
    label: "EIS RESPONSES",
    caption: "RECEIVED",
    icon: ArrowDownToLine,
    accentClass: "border-t-teal-500",
  },
  {
    key: "cancellationPending",
    label: "CANCELLATION PENDING",
    caption: "AWAITING",
    icon: Clock3,
    accentClass: "border-t-amber-500",
  },
  {
    key: "cancelled",
    label: "CANCELLED",
    caption: "TOTAL",
    icon: Ban,
    accentClass: "border-t-rose-500",
  },
  {
    key: "companies",
    label: "COMPANIES REGISTERED",
    caption: "ACTIVE",
    icon: Building2,
    accentClass: "border-t-blue-600",
  },
];

export function DashboardKpiCards({ values }: { values: DashboardKpiValues }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:gap-5">
      {SUMMARY_META.map((item) => {
        const Icon = item.icon;
        const raw = values[item.key];
        const display =
          item.key === "companies"
            ? String(raw)
            : raw.toLocaleString("en-PH");

        return (
          <Card
            key={item.key}
            className={`border-transparent border-t-4 ${item.accentClass} shadow-[0_6px_24px_rgba(15,23,42,0.07)]`}
          >
            <CardContent className="flex items-center gap-4 px-5 py-5">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                aria-hidden
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-3xl font-bold leading-none tracking-tight tabular-nums text-foreground">
                  {display}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {item.caption}
                </p>
              </div>
              <p className="max-w-[7.5rem] text-right text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {item.label}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
