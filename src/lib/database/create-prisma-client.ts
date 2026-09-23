import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/database/generated/prisma/client";
import { normalizeDatabaseUrl } from "@/lib/database/normalize-database-url";

const prismaLogLevels =
  process.env.NODE_ENV === "development"
    ? process.env.PRISMA_LOG_QUERIES === "1"
      ? (["query", "error", "warn"] as const)
      : (["error", "warn"] as const)
    : (["error"] as const);

function createDatabaseAdapter(): PrismaPg {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for Prisma Client");
  }

  return new PrismaPg({
    connectionString: normalizeDatabaseUrl(connectionString),
  });
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: createDatabaseAdapter(),
    log: [...prismaLogLevels],
  });
}
