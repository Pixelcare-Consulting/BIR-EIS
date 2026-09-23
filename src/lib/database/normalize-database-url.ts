/**
 * pg currently treats sslmode=prefer|require|verify-ca as verify-full and warns.
 * Prefer verify-full explicitly so local/Neon URLs stay secure and quiet.
 * Opt into future libpq semantics with uselibpqcompat=true instead.
 */
export function normalizeDatabaseUrl(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }

  if (url.searchParams.get("uselibpqcompat") === "true") {
    return connectionString;
  }

  const sslmode = url.searchParams.get("sslmode");
  if (
    sslmode === "prefer" ||
    sslmode === "require" ||
    sslmode === "verify-ca"
  ) {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}
