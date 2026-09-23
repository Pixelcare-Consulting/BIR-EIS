import { Gauge } from "lucide-react";

import { PageHeaderCard } from "@/app/(app)/_components/page-header-card";
import { BirEisSystemStatus } from "@/app/(app)/dashboard/_components/bir-eis-system-status";
import { DashboardKpiCards } from "@/app/(app)/dashboard/_components/dashboard-kpi-cards";
import { StatusDistributionCard } from "@/app/(app)/dashboard/_components/status-distribution-card";
import { TopCustomersCard } from "@/app/(app)/dashboard/_components/top-customers-card";
import type { DemoTopCustomer } from "@/app/(app)/dashboard/_data/demo-invoices";
import {
  counterpartInitials,
  formatMoney,
} from "@/features/documents/lib/document-format";
import { getDocumentDashboardStats } from "@/features/documents/lib/document-queries";
import { requireAuth } from "@/lib/auth/permissions";
import { prisma } from "@/lib/database/client";

export const metadata = {
  title: "Dashboard · BIR EIS",
};

function buildStatusDistribution(
  statusGroups: { status: string; _count: { _all: number } }[],
  cancellationPendingCount: number,
  cancelledCount: number,
) {
  const counts = {
    accepted: 0,
    rejected: 0,
    pending: 0,
  };

  for (const group of statusGroups) {
    const n = group._count._all;
    if (group.status === "accepted") counts.accepted += n;
    else if (group.status === "rejected") counts.rejected += n;
    else counts.pending += n;
  }

  counts.accepted = Math.max(
    0,
    counts.accepted - cancellationPendingCount - cancelledCount,
  );
  counts.pending += cancellationPendingCount + cancelledCount;

  const total = counts.accepted + counts.rejected + counts.pending;
  if (total === 0) return null;

  const accepted = Math.round((counts.accepted / total) * 100);
  const rejected = Math.round((counts.rejected / total) * 100);
  const pending = Math.max(0, 100 - accepted - rejected);

  return { accepted, rejected, pending };
}

function buildTopCustomers(
  counterparts: {
    counterpartName: string;
    _count: { _all: number };
    _sum: { totalAmount: { toString(): string } | null };
  }[],
): DemoTopCustomer[] {
  return counterparts.map((row) => {
    const amountValue = row._sum.totalAmount
      ? Number(row._sum.totalAmount.toString())
      : 0;
    return {
      name: row.counterpartName,
      initials: counterpartInitials(row.counterpartName),
      invoiceCount: row._count._all,
      amount: formatMoney(amountValue, "PHP"),
    };
  });
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const tenantId = session.user.tenantId;

  const [userCount, stats] = await Promise.all([
    prisma.user.count({
      where: { tenantId, deletedAt: null },
    }),
    getDocumentDashboardStats(tenantId),
  ]);

  const statusDistribution = buildStatusDistribution(
    stats.statusGroups,
    stats.cancellationPendingCount,
    stats.cancelledCount,
  );
  const topCustomers = buildTopCustomers(stats.counterparts);

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHeaderCard
        icon={<Gauge className="size-5" />}
        title="Dashboard Overview"
        description="Monitor your e-invoice activities and manage your transactions efficiently."
        showLiveClock
      />
      <DashboardKpiCards
        values={{
          outbound: stats.outboundCount,
          inbound: stats.inboundCount,
          companies: 1,
          cancellationPending: stats.cancellationPendingCount,
          cancelled: stats.cancelledCount,
        }}
      />
      <div className="grid gap-5 xl:grid-cols-3">
        <StatusDistributionCard values={statusDistribution} />
        <TopCustomersCard customers={topCustomers} />
        <BirEisSystemStatus registeredUsers={userCount} />
      </div>
    </div>
  );
}
