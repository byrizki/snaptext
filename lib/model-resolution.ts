import { getDb, ocrModels } from "@/db";
import { eq, ilike, or } from "drizzle-orm";

/**
 * Resolves a model identifier (UUID, name, or modelId with/without prefix) to its database row.
 * Returns the matching ocrModel row or undefined if not found.
 */
export async function resolveModel(
  identifier?: string | null
): Promise<typeof ocrModels.$inferSelect | undefined> {
  if (!identifier) return undefined;

  const db = getDb();

  // 1. If it's a valid UUID format, query by id first
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(identifier)) {
    const model = await db.query.ocrModels.findFirst({
      where: eq(ocrModels.id, identifier),
    });
    if (model) return model;
  }

  // 2. Query by name (case-insensitive) or exact modelId
  // Also check if they passed a stripped modelId (e.g. google/gemini-3.1-flash-lite-preview)
  // by checking with @vercel/ and @cf/ prefixes as well.
  const prefixedVercel = `@vercel/${identifier}`;
  const prefixedCf = `@cf/${identifier}`;

  const model = await db.query.ocrModels.findFirst({
    where: or(
      ilike(ocrModels.name, identifier),
      eq(ocrModels.modelId, identifier),
      eq(ocrModels.modelId, prefixedVercel),
      eq(ocrModels.modelId, prefixedCf)
    ),
  });

  return model;
}
