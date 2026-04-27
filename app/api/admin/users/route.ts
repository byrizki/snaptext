import { NextResponse } from "next/server";
import { getDb, user, scanQuotas } from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, ilike, or, sql } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const q = searchParams.get("q") ?? "";
    const offset = (page - 1) * PAGE_SIZE;

    const db = getDb();

    const whereClause = q.length >= 2
      ? or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`))
      : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          createdAt: user.createdAt,
          overrideId: scanQuotas.id,
          overrideCount: scanQuotas.count,
          overrideResetPeriod: scanQuotas.resetPeriod,
        })
        .from(user)
        .leftJoin(
          scanQuotas,
          and(eq(scanQuotas.userId, user.id), eq(scanQuotas.type, "user"))
        )
        .where(whereClause)
        .orderBy(user.createdAt)
        .limit(PAGE_SIZE)
        .offset(offset),

      db
        .select({ total: sql<number>`count(*)` })
        .from(user)
        .where(whereClause),
    ]);

    return NextResponse.json({
      users: rows,
      total: Number(total),
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(Number(total) / PAGE_SIZE),
    });
  } catch (error: any) {
    console.error("Failed to list users", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}
