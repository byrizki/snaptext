import { NextResponse } from "next/server";
import { getDb, scanQuotas, user } from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const quotas = await db
      .select({
        id: scanQuotas.id,
        count: scanQuotas.count,
        resetPeriod: scanQuotas.resetPeriod,
        userId: scanQuotas.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(scanQuotas)
      .innerJoin(user, eq(scanQuotas.userId, user.id))
      .where(eq(scanQuotas.type, "user"));

    return NextResponse.json(quotas);
  } catch (error: any) {
    console.error("Failed to fetch user quotas", error);
    return NextResponse.json({ error: "Failed to fetch quotas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { userId, count, resetPeriod } = data;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const db = getDb();

    const existing = await db
      .select()
      .from(scanQuotas)
      .where(and(eq(scanQuotas.type, "user"), eq(scanQuotas.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(scanQuotas)
        .set({
          count: parseInt(count, 10),
          resetPeriod: resetPeriod || "daily",
          updatedAt: new Date(),
        })
        .where(eq(scanQuotas.id, existing[0].id));
    } else {
      await db.insert(scanQuotas).values({
        type: "user",
        userId,
        count: parseInt(count, 10),
        resetPeriod: resetPeriod || "daily",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save user quota", error);
    return NextResponse.json({ error: "Failed to save quota" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const db = getDb();
    await db.delete(scanQuotas).where(eq(scanQuotas.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete user quota", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
