"use server";

import { revalidatePath } from "next/cache";

import {
  readDocumentFormFields,
  toNullableNotes,
  toNullableTin,
} from "@/features/documents/lib/document-form-data";
import { documentNumberExists } from "@/features/documents/lib/document-queries";
import type { CasEisLineItemInput } from "@/features/documents/lib/build-cas-eis-draft-json";
import {
  buildEisJsonPersistFields,
  loadEisSellerForTenant,
} from "@/features/documents/lib/eis-json-persist";
import { updateOutboundDocumentSchema } from "@/features/documents/schemas/document.schema";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/database/client";

import type { DocumentActionState } from "./create-outbound-document.action";

export async function updateOutboundDocumentAction(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const session = await requirePermission("documents.manage");
  const tenantId = session.user.tenantId;

  const parsed = updateOutboundDocumentSchema.safeParse({
    id: formData.get("id"),
    ...readDocumentFormFields(formData),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;

  const existing = await prisma.invoiceDocument.findFirst({
    where: {
      id: data.id,
      tenantId,
      direction: "outbound",
      deletedAt: null,
    },
    select: { id: true, status: true, documentNumber: true, lineItems: true },
  });

  if (!existing) {
    return { error: "Document not found." };
  }

  if (existing.status !== "draft") {
    return { error: "Only draft documents can be edited." };
  }

  const duplicate = await documentNumberExists({
    tenantId,
    direction: "outbound",
    documentNumber: data.documentNumber,
    excludeId: existing.id,
  });
  if (duplicate) {
    return {
      error: "An outbound document with this number already exists.",
    };
  }

  try {
    const seller = await loadEisSellerForTenant(tenantId);
    const issueDate = new Date(data.issueDate);
    const counterpartTin = toNullableTin(data.counterpartTin);
    const notes = toNullableNotes(data.notes);
    const lineItems = Array.isArray(existing.lineItems)
      ? (existing.lineItems as CasEisLineItemInput[])
      : null;
    const eisJson = buildEisJsonPersistFields(
      {
        id: existing.id,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        issueDate,
        currency: data.currency.toUpperCase(),
        counterpartName: data.counterpartName,
        counterpartTin,
        lineExtensionAmount: data.lineExtensionAmount,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        notes,
        lineItems,
      },
      seller,
    );

    const updated = await prisma.invoiceDocument.update({
      where: { id: existing.id },
      data: {
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        issueDate,
        currency: data.currency.toUpperCase(),
        counterpartName: data.counterpartName,
        counterpartTin,
        lineExtensionAmount: data.lineExtensionAmount,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        notes,
        ...eisJson,
      },
      select: { id: true, documentNumber: true },
    });

    await writeAuditLog({
      tenantId,
      userId: session.user.id,
      action: "document.updated",
      entityType: "invoice_document",
      entityId: updated.id,
      metadata: {
        direction: "outbound",
        documentNumber: updated.documentNumber,
      },
    });

    revalidatePath("/outbound");
    revalidatePath(`/outbound/${updated.id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Could not update the document. Please try again." };
  }
}

