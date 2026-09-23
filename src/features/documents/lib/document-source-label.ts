import {
  ERP_PROVIDER_LABELS,
  ERP_PROVIDERS,
} from "@/features/settings/schemas/erp-connection.schema";

export type DocumentSourceFields = {
  source: string;
  sourceSystem?: string | null;
  sourceLabel?: string | null;
};

function erpProviderLabel(provider: string | null | undefined): string | null {
  if (!provider) return null;
  if ((ERP_PROVIDERS as readonly string[]).includes(provider)) {
    return ERP_PROVIDER_LABELS[provider as (typeof ERP_PROVIDERS)[number]];
  }
  return null;
}

/**
 * End-user label for where an outbound document was ingested from.
 * Examples: "Manual", "Excel import", "SAP Business One · Warehouse", "ERP sync".
 */
export function formatDocumentSourceLabel(
  doc: DocumentSourceFields,
): string {
  switch (doc.source) {
    case "manual":
      return "Manual";
    case "import":
      return "Excel import";
    case "erp_sync": {
      const providerName = erpProviderLabel(doc.sourceSystem) ?? "ERP sync";
      const connectionName = doc.sourceLabel?.trim();
      if (connectionName) {
        return `${providerName} · ${connectionName}`;
      }
      return providerName;
    }
    default:
      return "Manual";
  }
}
