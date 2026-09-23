/**
 * Dev-only stage timing for hot document/EIS paths.
 * No-ops in production so logs never leak into prod noise.
 */

const ENABLED = process.env.NODE_ENV === "development";

export async function measureStage<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!ENABLED) {
    return fn();
  }
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const ms = performance.now() - start;
    console.info(`[PERF] ${label}: ${ms.toFixed(1)}ms`);
  }
}

export function logPerfTotal(op: string, start: number): void {
  if (!ENABLED) return;
  const ms = performance.now() - start;
  console.info(`[PERF] ${op} TOTAL: ${ms.toFixed(1)}ms`);
}
