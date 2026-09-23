"use server";

import { revalidatePath } from "next/cache";

import { createOutboundDrafts } from "@/features/documents/lib/create-outbound-drafts";
import { sandboxErpPull } from "@/features/documents/lib/sandbox-erp-pull";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/database/client";
import { logPerfTotal, measureStage } from "@/lib/perf/measure";

export type SyncErpDocumentsState = {
  error?: string;
  success?: boolean;
  message?: string;
  created?: number;
  skipped?: number;
  errors?: Array<{ row: number; message: string }>;
};

export async function syncErpDocumentsAction(
  _prev: SyncErpDocumentsState,
  formData: FormData,
): Promise<SyncErpDocumentsState> {
  const perfStart = performance.now();

  const session = await measureStage("auth", () =>
    requirePermission("documents.manage"),
  );
  const tenantId = session.user.tenantId;
  const connectionId = String(formData.get("connectionId") ?? "").trim();

  if (!connectionId) {
    logPerfTotal("syncErpDocuments", perfStart);
    return { error: "Choose an ERP connection to sync." };
  }

  const connection = await measureStage("fetch connection", () =>
    prisma.erpConnection.findFirst({
      where: {
        id: connectionId,
        tenantId,
        deletedAt: null,
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        provider: true,
        fieldMap: true,
      },
    }),
  );

  if (!connection) {
    logPerfTotal("syncErpDocuments", perfStart);
    return {
      error:
        "Enabled ERP connection not found. Add or enable one under Settings → Integrations.",
    };
  }

  try {
    const rows = await measureStage("sandbox erp pull", async () =>
      sandboxErpPull({
        connectionId: connection.id,
        fieldMap: connection.fieldMap,
      }),
    );

    const result = await measureStage("createOutboundDrafts", () =>
      createOutboundDrafts({
        tenantId,
        userId: session.user.id,
        rows,
        source: "erp_sync",
        sourceSystem: connection.provider,
        sourceLabel: connection.name,
      }),
    );

    await measureStage("db update lastSyncAt", () =>
      prisma.erpConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      }),
    );

    await measureStage("audit", () =>
      writeAuditLog({
        tenantId,
        userId: session.user.id,
        action: "erp_connection.synced",
        entityType: "erp_connection",
        entityId: connection.id,
        metadata: {
          name: connection.name,
          provider: connection.provider,
          created: result.created,
          skipped: result.skipped,
          errorCount: result.errors.length,
        },
      }),
    );

    await measureStage("revalidate", async () => {
      revalidatePath("/outbound");
      revalidatePath("/outbound/sync");
      revalidatePath("/settings/integrations/erp");
    });

    const parts = [
      result.created === 1
        ? "Created 1 draft from sandbox ERP"
        : `Created ${result.created} drafts from sandbox ERP`,
    ];
    if (result.skipped > 0) {
      parts.push(
        result.skipped === 1
          ? "skipped 1 duplicate"
          : `skipped ${result.skipped} duplicates`,
      );
    }

    logPerfTotal("syncErpDocuments", perfStart);
    return {
      success: true,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
      message: `${parts.join(", ")}.`,
    };
  } catch {
    logPerfTotal("syncErpDocuments", perfStart);
    return { error: "Could not sync ERP documents. Please try again." };
  }
}
