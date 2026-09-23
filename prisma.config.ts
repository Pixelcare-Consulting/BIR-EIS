import { existsSync } from "node:fs";

import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

import { normalizeDatabaseUrl } from "./src/lib/database/normalize-database-url";

// Local dev uses .env.local; Vercel/CI inject env vars into the process.
if (existsSync(".env.local")) {
  config({ path: ".env.local" });
}

function resolveDatasourceUrl(): string {
  const fromEnv = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (fromEnv) {
    return normalizeDatabaseUrl(fromEnv);
  }

  // `prisma generate` does not open a DB connection. Allow install/build without .env.local.
  const isGenerate =
    process.argv.includes("generate") ||
    process.env.npm_lifecycle_event === "postinstall";

  if (isGenerate) {
    return "postgresql://prisma:prisma@127.0.0.1:5432/prisma";
  }

  return env("DIRECT_URL");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI migrations use direct connection (app runtime uses DATABASE_URL via adapter).
    url: resolveDatasourceUrl(),
  },
});
