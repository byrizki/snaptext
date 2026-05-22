import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDb, apiKeys } from "@/db";
import { generateApiKey } from "@/lib/api-key";

/**
 * GET: List all active API keys for the currently authenticated user
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      maskedKey: apiKeys.maskedKey,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, session.user.id))
    .orderBy(apiKeys.createdAt);

  return NextResponse.json(keys);
}

/**
 * POST: Create a new API key for the authenticated user
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, expiresIn } = body as {
      name?: string;
      expiresIn?: "never" | "30d" | "90d" | "1y";
    };

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let expiresAt: Date | null = null;
    const now = Date.now();

    if (expiresIn === "30d") {
      expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000);
    } else if (expiresIn === "90d") {
      expiresAt = new Date(now + 90 * 24 * 60 * 60 * 1000);
    } else if (expiresIn === "1y") {
      expiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000);
    }

    const { rawKey, maskedKey } = await generateApiKey(
      session.user.id,
      name.trim(),
      expiresAt
    );

    return NextResponse.json({
      rawKey,
      maskedKey,
      name: name.trim(),
      expiresAt,
    });
  } catch (err) {
    console.error("[DASHBOARD_API_KEY] Failed to generate key:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Revoke/delete a specific API key
 */
export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 });
    }

    const db = getDb();
    const result = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, session.user.id)))
      .returning({ id: apiKeys.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "API Key not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, revokedId: keyId });
  } catch (err) {
    console.error("[DASHBOARD_API_KEY] Failed to revoke key:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
