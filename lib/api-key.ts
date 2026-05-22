import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb, apiKeys, user } from "@/db";

/**
 * Validates a request's API Key against the database.
 * Returns the userId and user role if valid, otherwise null.
 */
export async function validateApiKey(request: Request): Promise<{ userId: string; role: string } | null> {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key");
  if (!authHeader) return null;

  let rawKey = "";
  if (authHeader.startsWith("Bearer ")) {
    rawKey = authHeader.substring(7).trim();
  } else {
    rawKey = authHeader.trim();
  }

  if (!rawKey || !rawKey.startsWith("st-")) {
    return null;
  }

  // Hash the incoming key with SHA-256
  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

  const db = getDb();
  
  // Look up key in DB
  const [apiKeyRecord] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.hashedKey, hashedKey))
    .limit(1);

  if (!apiKeyRecord) return null;

  // Check expiration date
  if (apiKeyRecord.expiresAt && new Date() > new Date(apiKeyRecord.expiresAt)) {
    return null;
  }

  // Fetch user role
  const [userRecord] = await db
    .select()
    .from(user)
    .where(eq(user.id, apiKeyRecord.userId))
    .limit(1);

  const role = userRecord?.role ?? "user";

  // Async update lastUsedAt in the background
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyRecord.id))
    .catch((err) => console.error("[API_KEY] Failed to update lastUsedAt:", err));

  return {
    userId: apiKeyRecord.userId,
    role,
  };
}

/**
 * Generates a new cryptographically secure API key and persists its hash in the database.
 * Returns the raw key (should be displayed once to the user) and the database record.
 */
export async function generateApiKey(
  userId: string,
  name: string,
  expiresAt: Date | null
): Promise<{ rawKey: string; maskedKey: string }> {
  // Generate cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `st-${randomBytes}`;
  
  // Create a masked preview of the key, e.g. "st-***abcd"
  const maskedKey = `st-***${randomBytes.slice(-4)}`;
  
  // Hash the key using SHA-256
  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

  const db = getDb();

  await db.insert(apiKeys).values({
    userId,
    name,
    maskedKey,
    hashedKey,
    expiresAt,
  });

  return {
    rawKey,
    maskedKey,
  };
}
