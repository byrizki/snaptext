/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getDb, llmLogs, jobs, jobPages, ocrModels, user } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { VERCEL_AI_GATEWAY_PRICING } from "@/lib/constants";
import { OCR_VISION_MODEL } from "@/app/workflows/ocr/models";

export async function GET() {
  try {
    const db = getDb();

    const jobsData = await db
      .select({
        id: jobs.id,
        filename: jobs.filename,
        status: jobs.status,
        error: jobs.error,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        totalPages: jobs.totalPages,
        modelName: ocrModels.name,
        modelId: ocrModels.modelId,
        provider: ocrModels.provider,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(jobs)
      .leftJoin(ocrModels, eq(jobs.ocrModelId, ocrModels.id))
      .leftJoin(user, eq(jobs.userId, user.id))
      .orderBy(desc(jobs.createdAt))
      .limit(100);

    // Fetch pricing configuration from DB models
    const allDbModels = await db
      .select({
        modelId: ocrModels.modelId,
        inputPrice: ocrModels.inputPrice,
        outputPrice: ocrModels.outputPrice,
      })
      .from(ocrModels);

    const pricingMap = new Map<string, { input: number; output: number }>();
    for (const [key, val] of Object.entries(VERCEL_AI_GATEWAY_PRICING)) {
      pricingMap.set(key, val);
    }
    for (const m of allDbModels) {
      if (m.inputPrice > 0 || m.outputPrice > 0) {
        pricingMap.set(m.modelId, { input: m.inputPrice, output: m.outputPrice });
      }
    }

    // Aggregate token usage per job from llm_logs
    const tokensByJob = await db
      .select({
        jobId: llmLogs.jobId,
        model: llmLogs.model,
        promptTokens: sql<number>`SUM(${llmLogs.promptTokens})`,
        completionTokens: sql<number>`SUM(${llmLogs.completionTokens})`,
        totalTokens: sql<number>`SUM(${llmLogs.totalTokens})`,
      })
      .from(llmLogs)
      .where(
        sql`${llmLogs.jobId} IN (${sql.join(jobsData.map(j => sql`${j.id}`), sql`, `)})`
      )
      .groupBy(llmLogs.jobId, llmLogs.model);

    // Group token rows by jobId
    const tokenMap = new Map<string, Array<{ model: string; promptTokens: number; completionTokens: number; totalTokens: number }>>();
    for (const row of tokensByJob) {
      if (!tokenMap.has(row.jobId)) tokenMap.set(row.jobId, []);
      tokenMap.get(row.jobId)!.push({
        model: row.model,
        promptTokens: Number(row.promptTokens || 0),
        completionTokens: Number(row.completionTokens || 0),
        totalTokens: Number(row.totalTokens || 0),
      });
    }

    const result = jobsData.map((job) => {
      const rows = tokenMap.get(job.id) ?? [];

      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let cost = 0;

      for (const row of rows) {
        promptTokens += row.promptTokens;
        completionTokens += row.completionTokens;
        totalTokens += row.totalTokens;

        const pricing = pricingMap.get(row.model)
          ?? pricingMap.get(job.modelId || "")
          ?? { input: 0, output: 0 };
        cost += row.promptTokens * (pricing.input / 1_000_000);
        cost += row.completionTokens * (pricing.output / 1_000_000);
      }

      const isTerminal = job.status === "completed" || job.status === "failed";
      const duration =
        isTerminal && job.updatedAt && job.createdAt
          ? new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime()
          : null;

      return {
        id: job.id,
        filename: job.filename,
        status: job.status,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        totalPages: job.totalPages,
        duration,
        user: {
          name: job.userName,
          email: job.userEmail,
          image: job.userImage,
        },
        model: job.modelName ? { name: job.modelName } : null,
        promptTokens,
        completionTokens,
        totalTokens,
        cost: cost.toFixed(4),
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to fetch jobs", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
