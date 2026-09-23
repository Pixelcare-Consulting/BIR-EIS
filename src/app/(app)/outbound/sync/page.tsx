import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { PageHeaderCard } from "@/app/(app)/_components/page-header-card";
import { DocumentContentCard } from "@/features/documents/components/document-content-card";
import { ErpSyncPanel } from "@/features/documents/components/erp-sync-panel";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/database/client";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "ERP Sync · Outbound · BIR EIS",
};

export default async function OutboundErpSyncPage() {
  const session = await requirePermission("documents.manage");

  const connections = await prisma.erpConnection.findMany({
    where: {
      tenantId: session.user.tenantId,
      deletedAt: null,
      enabled: true,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      provider: true,
      lastSyncAt: true,
    },
  });

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHeaderCard
        icon={<RefreshCw className="size-5" />}
        title="ERP Sync"
        description="Sync varied sandbox ERP sample invoices into Outbound drafts using a saved connection."
        aside={
          <Button asChild variant="onNavyOutline">
            <Link href="/outbound">
              <ArrowLeft className="size-4" />
              Back to Outbound
            </Link>
          </Button>
        }
      />

      <DocumentContentCard
        title="Sandbox sync"
        description="Choose an enabled ERP connection, then sync. Each run creates a small batch of varied sandbox samples mapped with your saved field map."
      >
        <ErpSyncPanel
          connections={connections.map((connection) => ({
            id: connection.id,
            name: connection.name,
            provider: connection.provider,
            lastSyncAt: connection.lastSyncAt
              ? connection.lastSyncAt.toISOString()
              : null,
          }))}
        />
      </DocumentContentCard>
    </div>
  );
}
