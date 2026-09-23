-- Composite index for sync pending queries and dashboard inbound KPI filters
CREATE INDEX "invoice_documents_tenant_id_status_eis_ack_status_idx" ON "invoice_documents"("tenant_id", "status", "eis_ack_status");
