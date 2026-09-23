-- AlterTable: invoice cancellation workflow fields (separate from EIS transmission status)
ALTER TABLE "invoice_documents" ADD COLUMN "cancellation_status" TEXT,
ADD COLUMN "cancellation_reason" TEXT,
ADD COLUMN "cancellation_remarks" TEXT,
ADD COLUMN "cancellation_requested_at" TIMESTAMP(3),
ADD COLUMN "cancellation_requested_by_id" TEXT,
ADD COLUMN "cancelled_at" TIMESTAMP(3),
ADD COLUMN "cancellation_reference_id" TEXT,
ADD COLUMN "cancellation_ack_status" TEXT,
ADD COLUMN "cancellation_ack_message" TEXT,
ADD COLUMN "cancellation_ack_at" TIMESTAMP(3),
ADD COLUMN "original_document_id" TEXT;

-- CreateIndex
CREATE INDEX "invoice_documents_tenant_id_cancellation_status_idx" ON "invoice_documents"("tenant_id", "cancellation_status");

-- AddForeignKey
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_cancellation_requested_by_id_fkey" FOREIGN KEY ("cancellation_requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_original_document_id_fkey" FOREIGN KEY ("original_document_id") REFERENCES "invoice_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
