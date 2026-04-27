import { getDb, jobs, scanQuotas } from "@/db";
import { and, count, eq, gte, isNull, ne } from "drizzle-orm";

export class QuotaExceededError extends Error {
  constructor(public limit: number, public used: number) {
    super(`Daily scan limit of ${limit} reached. Please try again tomorrow.`);
    this.name = "QuotaExceededError";
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Resolves the effective quota for a session.
 *
 * - If role is 'admin', returns unlimited quota immediately.
 * - If userId is provided, look for a user-specific quota first.
 * - Fall back to the global quota (anonymous / site-wide ceiling).
 */
export async function getEffectiveQuota(
  userId?: string | null,
  modelId?: string | null,
  role?: string | null
): Promise<{ limit: number; quotaId: string | null }> {
  const { limit, quotaId } = await getEffectiveQuotaWithMeta(userId, modelId, role);
  return { limit, quotaId };
}

/**
 * Like getEffectiveQuota but also returns the resetPeriod from the resolved row.
 */
export async function getEffectiveQuotaWithMeta(
  userId?: string | null,
  modelId?: string | null,
  role?: string | null
): Promise<{ limit: number; quotaId: string | null; resetPeriod: "daily" | "monthly" }> {
  if (role === "admin") {
    return { limit: Number.MAX_SAFE_INTEGER, quotaId: null, resetPeriod: "daily" };
  }

  const db = getDb();

  let quotaRow = null;

  if (userId) {
    [quotaRow] = await db
      .select()
      .from(scanQuotas)
      .where(and(eq(scanQuotas.type, "user"), eq(scanQuotas.userId, userId)))
      .limit(1);

    if (!quotaRow) {
      [quotaRow] = await db
        .select()
        .from(scanQuotas)
        .where(eq(scanQuotas.type, "registered"))
        .limit(1);
    }
  }

  if (!quotaRow) {
    [quotaRow] = await db
      .select()
      .from(scanQuotas)
      .where(and(eq(scanQuotas.type, "global"), isNull(scanQuotas.userId)))
      .limit(1);
  }

  if (!quotaRow) {
    return { limit: 20, quotaId: null, resetPeriod: "daily" };
  }

  return { limit: quotaRow.count, quotaId: quotaRow.id, resetPeriod: quotaRow.resetPeriod };
}

/**
 * Returns the number of scans consumed today by userId (or globally if null).
 * Excludes failed jobs from the count.
 */
export async function getUsedToday(userId?: string | null): Promise<number> {
  const db = getDb();
  const today = startOfToday();

  const [result] = await db
    .select({ value: count() })
    .from(jobs)
    .where(
      and(
        userId ? eq(jobs.userId, userId) : isNull(jobs.userId),
        gte(jobs.createdAt, today),
        ne(jobs.status, "failed")
      )
    );

  return result ? Number(result.value) : 0;
}

/**
 * Checks whether the current session can start another scan.
 * Throws QuotaExceededError if the limit is reached.
 */
export async function checkQuota(
  userId?: string | null,
  modelId?: string | null,
  role?: string | null
): Promise<{ limit: number; used: number; remaining: number }> {
  const { limit } = await getEffectiveQuota(userId, modelId, role);
  const used = await getUsedToday(userId);
  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    throw new QuotaExceededError(limit, used);
  }

  return { limit, used, remaining };
}

/**
 * Returns quota info without throwing — useful for displaying remaining scans.
 */
export async function getQuotaInfo(
  userId?: string | null,
  modelId?: string | null,
  role?: string | null
): Promise<{ limit: number; used: number; remaining: number }> {
  const { limit } = await getEffectiveQuota(userId, modelId, role);
  const used = await getUsedToday(userId);
  const remaining = Math.max(0, limit - used);
  return { limit, used, remaining };
}
