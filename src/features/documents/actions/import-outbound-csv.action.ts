"use server";

import { revalidatePath } from "next/cache";

import { createOutboundDrafts } from "@/features/documents/lib/create-outbound-drafts";
import { parseOutboundCsv } from "@/features/documents/lib/parse-outbound-csv";
import { requirePermission } from "@/lib/auth/permissions";
import { logPerfTotal, measureStage } from "@/lib/perf/measure";

export type ImportOutboundCsvState = {
  error?: string;
  success?: boolean;
  message?: string;
  created?: number;
  skipped?: number;
  errors?: Array<{ row: number; message: string }>;
};

export async function importOutboundCsvAction(
  _prev: ImportOutboundCsvState,
  formData: FormData,
): Promise<ImportOutboundCsvState> {
  const perfStart = performance.now();

  const session = await measureStage("auth", () =>
    requirePermission("documents.manage"),
  );
  const tenantId = session.user.tenantId;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    logPerfTotal("importOutboundCsv", perfStart);
    return { error: "Choose a CSV file to import." };
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv") && file.type && !file.type.includes("csv")) {
    logPerfTotal("importOutboundCsv", perfStart);
    return { error: "Only CSV files are supported in this release." };
  }

  let text: string;
  try {
    text = await measureStage("read file", () => file.text());
  } catch {
    logPerfTotal("importOutboundCsv", perfStart);
    return { error: "Could not read the uploaded file." };
  }

  const parsed = parseOutboundCsv(text);
  if (parsed.errors.length > 0 && parsed.rows.length === 0) {
    logPerfTotal("importOutboundCsv", perfStart);
    return {
      error: parsed.errors[0]?.message ?? "Could not parse CSV",
      errors: parsed.errors,
    };
  }

  try {
    const result = await measureStage("createOutboundDrafts", () =>
      createOutboundDrafts({
        tenantId,
        userId: session.user.id,
        rows: parsed.rows,
        source: "import",
      }),
    );

    await measureStage("revalidate", async () => {
      revalidatePath("/outbound");
    });

    const parts = [
      result.created === 1
        ? "Created 1 draft"
        : `Created ${result.created} drafts`,
    ];
    if (result.skipped > 0) {
      parts.push(
        result.skipped === 1
          ? "skipped 1 duplicate"
          : `skipped ${result.skipped} duplicates`,
      );
    }

    logPerfTotal("importOutboundCsv", perfStart);
    return {
      success: true,
      created: result.created,
      skipped: result.skipped,
      errors: [...parsed.errors, ...result.errors],
      message: `${parts.join(", ")}.`,
    };
  } catch {
    logPerfTotal("importOutboundCsv", perfStart);
    return { error: "Could not import CSV. Please try again." };
  }
}
