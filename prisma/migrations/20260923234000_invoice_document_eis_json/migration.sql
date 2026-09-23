-- AlterTable: CAS-shaped draft EIS JSON on invoice documents
ALTER TABLE "invoice_documents" ADD COLUMN "eis_json_payload" JSONB,
ADD COLUMN "eis_json_mapped_at" TIMESTAMP(3);
