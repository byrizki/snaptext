import { NextResponse } from "next/server";
import { getDb, scanQuotas, systemSettings } from "@/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getQuotaByType(type: "global" | "registered") {
  const db = getDb();
  const [row] = await db
    .select()
    .from(scanQuotas)
    .where(eq(scanQuotas.type, type))
    .limit(1);
  return row ?? null;
}

async function getSystemSettings() {
  const db = getDb();
  const [row] = await db.select().from(systemSettings).limit(1);
  return row ?? { concurrencyLength: 5, rotationMode: "round-robin", repairModelId: null };
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [guest, registered, system] = await Promise.all([
      getQuotaByType("global"),
      getQuotaByType("registered"),
      getSystemSettings(),
    ]);

    return NextResponse.json({
      guest: guest
        ? { count: guest.count, resetPeriod: guest.resetPeriod }
        : { count: 5, resetPeriod: "daily" },
      registered: registered
        ? { count: registered.count, resetPeriod: registered.resetPeriod }
        : { count: 50, resetPeriod: "daily" },
      system: {
        concurrencyLength: system.concurrencyLength,
        rotationMode: system.rotationMode ?? "round-robin",
        repairModelId: system.repairModelId ?? null,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch settings", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const db = getDb();

    const saveQuota = async (type: "global" | "registered", quotaData: { count: number | string; resetPeriod?: string }) => {
      const count = parseInt(String(quotaData.count), 10);
      if (isNaN(count)) throw new Error(`Invalid count for ${type}`);

      const resetPeriod = quotaData.resetPeriod === "monthly" ? "monthly" : "daily";
      const existing = await getQuotaByType(type);

      if (existing) {
        await db
          .update(scanQuotas)
          .set({ count, resetPeriod, updatedAt: new Date() })
          .where(eq(scanQuotas.id, existing.id));
      } else {
        await db.insert(scanQuotas).values({ type, userId: null, count, resetPeriod });
      }
    };

    if (data.guest) await saveQuota("global", data.guest);
    if (data.registered) await saveQuota("registered", data.registered);

    if (data.system) {
      const { concurrencyLength: rawConcurrency, rotationMode, repairModelId } = data.system;
      const updates: Record<string, any> = { updatedAt: new Date() };

      if (rawConcurrency !== undefined) {
        const concurrencyLength = parseInt(String(rawConcurrency), 10);
        if (isNaN(concurrencyLength) || concurrencyLength < 1) throw new Error("Invalid concurrency length");
        updates.concurrencyLength = concurrencyLength;
      }

      if (rotationMode !== undefined) {
        if (rotationMode !== "round-robin" && rotationMode !== "random" && rotationMode !== "priority-weighted") {
          throw new Error("Invalid rotation mode");
        }
        updates.rotationMode = rotationMode;
      }

      if (repairModelId !== undefined) {
        updates.repairModelId = repairModelId || null;
      }

      const [existing] = await db.select().from(systemSettings).limit(1);
      if (existing) {
        await db
          .update(systemSettings)
          .set(updates)
          .where(eq(systemSettings.id, existing.id));
      } else {
        await db.insert(systemSettings).values({
          id: "default",
          concurrencyLength: updates.concurrencyLength ?? 5,
          rotationMode: updates.rotationMode ?? "round-robin",
          repairModelId: updates.repairModelId ?? null,
        });
      }
    }

    if (!data.guest && !data.registered && !data.system && data.count !== undefined) {
      await saveQuota("global", data);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update settings", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

