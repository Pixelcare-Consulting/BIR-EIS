import type {
  Prisma,
  PrismaClient,
} from "../src/lib/database/generated/prisma/client";
import bcrypt from "bcryptjs";

import {
  DEMO_INVOICE_DOCUMENTS,
  DEMO_PASSWORD,
  DEMO_USERS,
  PERMISSIONS,
  ROLES,
} from "./seed-data";

/** Dev-only: lower bcrypt cost speeds re-seed (see database/seed-users.md). */
const BCRYPT_ROUNDS = Number(process.env.SEED_BCRYPT_ROUNDS ?? 8);

export interface CoreSeedResult {
  demoTenant: { id: string; slug: string };
  usersByEmail: Record<string, { id: string }>;
}

/**
 * Additive core seed — creates missing demo rows only.
 * Does not delete tenants/users/roles/data, and does not overwrite existing
 * passwords or custom role-permission grants already in the DB.
 */
export async function seedCore(prisma: PrismaClient): Promise<CoreSeedResult> {
  await prisma.platformSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      productName: "BIR EIS | Pixelcare",
      productTagline: "e-Invoice Middleware",
      logo: null,
    },
    update: {},
  });

  await Promise.all(
    PERMISSIONS.map((perm) =>
      prisma.permission.upsert({
        where: { slug: perm.slug },
        create: perm,
        update: { name: perm.name },
      }),
    ),
  );

  const permissionRecords = await prisma.permission.findMany({
    where: { slug: { in: PERMISSIONS.map((p) => p.slug) } },
  });
  const permissionBySlug = Object.fromEntries(
    permissionRecords.map((p) => [p.slug, p]),
  );

  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    create: {
      name: "BIR EIS Demo",
      slug: "demo",
      tagline: "Electronic invoicing middleware demo tenant",
    },
    update: {},
  });

  const rolesBySlug: Record<string, { id: string }> = {};
  await Promise.all(
    ROLES.map(async (roleDef) => {
      const role = await prisma.role.upsert({
        where: {
          tenantId_slug: { tenantId: demoTenant.id, slug: roleDef.slug },
        },
        create: {
          tenantId: demoTenant.id,
          slug: roleDef.slug,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
        },
        update: { name: roleDef.name, description: roleDef.description },
      });
      rolesBySlug[roleDef.slug] = role;

      const permissionIds = roleDef.permissions
        .map((slug) => permissionBySlug[slug]?.id)
        .filter((id): id is string => Boolean(id));

      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    }),
  );

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const usersByEmail: Record<string, { id: string }> = {};

  await Promise.all(
    DEMO_USERS.map(async (userDef) => {
      const user = await prisma.user.upsert({
        where: {
          tenantId_email: { tenantId: demoTenant.id, email: userDef.email },
        },
        create: {
          tenantId: demoTenant.id,
          email: userDef.email,
          name: userDef.name,
          passwordHash,
          emailVerified: true,
        },
        update: {},
      });
      usersByEmail[userDef.email] = user;

      const credentialAccount = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });
      if (!credentialAccount) {
        await prisma.account.create({
          data: {
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: user.passwordHash || passwordHash,
          },
        });
      }

      const role = rolesBySlug[userDef.roleSlug];
      if (!role) return;

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });
    }),
  );

  const adminUser = usersByEmail["admin@demo.local"];

  // Soft-delete legacy buyer-style inbound rows (Inbound is now the EIS response inbox).
  await prisma.invoiceDocument.updateMany({
    where: {
      tenantId: demoTenant.id,
      direction: "inbound",
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });

  for (const doc of DEMO_INVOICE_DOCUMENTS) {
    const existing = await prisma.invoiceDocument.findFirst({
      where: {
        tenantId: demoTenant.id,
        direction: doc.direction,
        documentNumber: doc.documentNumber,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.invoiceDocument.create({
      data: {
        tenantId: demoTenant.id,
        createdById: adminUser?.id ?? null,
        direction: doc.direction,
        documentType: doc.documentType,
        status: doc.status,
        source: "manual",
        documentNumber: doc.documentNumber,
        issueDate: new Date(doc.issueDate),
        currency: doc.currency,
        counterpartName: doc.counterpartName,
        counterpartTin: doc.counterpartTin ?? null,
        lineExtensionAmount: doc.lineExtensionAmount,
        taxAmount: doc.taxAmount,
        totalAmount: doc.totalAmount,
        lineItems: (doc.lineItems ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        eisReferenceId: doc.eisReferenceId ?? null,
        eisAckStatus: doc.eisAckStatus ?? null,
        eisAckMessage: doc.eisAckMessage ?? null,
        eisAckAt: doc.eisAckAt ? new Date(doc.eisAckAt) : null,
        submittedAt: doc.submittedAt ? new Date(doc.submittedAt) : null,
        notes: doc.notes ?? null,
        cancellationStatus: doc.cancellationStatus ?? null,
        cancellationReason: doc.cancellationReason ?? null,
        cancellationRemarks: doc.cancellationRemarks ?? null,
        cancellationRequestedAt: doc.cancellationRequestedAt
          ? new Date(doc.cancellationRequestedAt)
          : null,
        cancellationRequestedById: doc.cancellationStatus
          ? (adminUser?.id ?? null)
          : null,
        cancelledAt: doc.cancelledAt ? new Date(doc.cancelledAt) : null,
        cancellationReferenceId: doc.cancellationReferenceId ?? null,
        cancellationAckStatus: doc.cancellationAckStatus ?? null,
        cancellationAckMessage: doc.cancellationAckMessage ?? null,
        cancellationAckAt: doc.cancellationAckAt
          ? new Date(doc.cancellationAckAt)
          : null,
      },
    });
  }

  return { demoTenant, usersByEmail };
}
