# Local Postgres setup

Do not store passwords or API keys in this repo. Use `.env.local` (gitignored).

## Quick start

```bash
# Start your own local Postgres (Docker Compose is optional and not run by the agent)
cp .env.example .env.local
# Edit AUTH_SECRET / BETTER_AUTH_SECRET and DATABASE_URL / DIRECT_URL if needed
pnpm install
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
```

Default connection strings in `.env.example` use:

- User / password / database: `bir_eis` / `bir_eis` / `bir_eis`
- Host: `localhost:5432`

Create that role and database in your local Postgres before migrating, or point `.env.local` at an existing instance.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | App + Prisma Client connection (`localhost:5432`) |
| `DIRECT_URL` | Migrations / Prisma CLI (same as `DATABASE_URL` without a pooler) |
| `AUTH_SECRET` / `BETTER_AUTH_SECRET` | Session signing |
| `BETTER_AUTH_URL` / `AUTH_URL` | App origin for Better Auth callbacks |
| `STORAGE_ROOT` | Local uploads root (default `.data/uploads`) |

Without a connection pooler, `DATABASE_URL` and `DIRECT_URL` can be identical.

## SSL / `sslmode` (Neon and node-pg)

Node `pg` currently treats `sslmode=prefer`, `require`, and `verify-ca` as **`verify-full`** and prints a security warning. Prefer:

- `sslmode=verify-full` — keeps today’s secure behavior (recommended for Neon / cloud)
- or `uselibpqcompat=true&sslmode=require` — if you want future libpq semantics now

The app and Prisma CLI also normalize `prefer|require|verify-ca` → `verify-full` at runtime so older `.env.local` URLs stay quiet. Still update your env strings when you can.

Local Postgres without TLS can omit `sslmode`.

## Stuck migrate locks

If `migrate dev` hits **P1002** advisory lock timeout after a crashed run, clear the lock in Postgres (or restart the database) and retry:

```bash
pnpm run db:migrate
```

Prefer `pnpm run db:deploy` in CI/production. Use `db:migrate` locally when creating new migration files.

## Object storage

Future attachments and signed payloads use the local filesystem under `STORAGE_ROOT` (default `.data/uploads`). Paths should stay `tenants/{tenantId}/…`.

## Migrations (Prisma)

1. `pnpm run db:migrate`
2. `pnpm run db:seed` — see [`seed-users.md`](./seed-users.md)
