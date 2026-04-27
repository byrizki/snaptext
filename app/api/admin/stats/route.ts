/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getDb, llmLogs, jobs, ocrModels, user } from "@/db";
import { eq, ne, sql } from "drizzle-orm";
import { VERCEL_AI_GATEWAY_PRICING } from "@/lib/constants";

export async function GET() {
  try {
    const db = getDb();

    // Aggregate token usage per job + model from llm_logs
    const tokenStats = await db
      .select({
        jobId: llmLogs.jobId,
        model: llmLogs.model,
        promptTokens: sql<number>`SUM(${llmLogs.promptTokens})`,
        completionTokens: sql<number>`SUM(${llmLogs.completionTokens})`,
      })
      .from(llmLogs)
      .groupBy(llmLogs.jobId, llmLogs.model);

    const [{ count: userCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(ne(user.role, "admin"));

    let totalTokensAll = 0;
    let totalCostAll = 0;

    for (const row of tokenStats) {
      const promptTokens = Number(row.promptTokens || 0);
      const completionTokens = Number(row.completionTokens || 0);

      totalTokensAll += promptTokens + completionTokens;

      const pricing = VERCEL_AI_GATEWAY_PRICING[row.model as keyof typeof VERCEL_AI_GATEWAY_PRICING] ?? { input: 0, output: 0 };
      totalCostAll += (promptTokens / 1_000_000) * pricing.input;
      totalCostAll += (completionTokens / 1_000_000) * pricing.output;
    }

    return NextResponse.json({
      totalTokens: totalTokensAll,
      totalCost: totalCostAll.toFixed(4),
      totalUsers: Number(userCount),
    });
  } catch (error: any) {
    console.error("Failed to fetch stats", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
