-- AlterTable: ingest source on invoice documents
ALTER TABLE "invoice_documents" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "source_system" TEXT,
ADD COLUMN "source_label" TEXT;

-- Optional backfill: sandbox ERP-synced docs (provider unknown → UI shows "ERP sync")
UPDATE "invoice_documents"
SET "source" = 'erp_sync'
WHERE "document_number" LIKE 'ERP-%'
  AND "source" = 'manual'
  AND "deleted_at" IS NULL;
