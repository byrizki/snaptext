/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getDb, jobResults, jobs, jobPages, ocrModels, user } from "@/db";
import { eq, ne, sql } from "drizzle-orm";

import { OCR_TEXT_MODEL, OCR_VISION_MODEL } from "@/app/workflows/ocr/models";

export async function GET() {
  try {
    const db = getDb();

    const statsQuery = await db
      .select({
        jobId: jobs.id,
        modelId: ocrModels.modelId,
        provider: ocrModels.provider,

        // Final merged token counts from jobResults
        resultPromptTokens: jobResults.promptTokens,
        resultCompletionTokens: jobResults.completionTokens,
        resultSecondModelInput: jobResults.secondModelInput,
        resultSecondModelOutput: jobResults.secondModelOutput,

        // Sum of all pages' token counts from jobPages
        pagesPromptTokens: sql<number>`SUM(${jobPages.promptTokens})`,
        pagesCompletionTokens: sql<number>`SUM(${jobPages.completionTokens})`,
        pagesSecondModelInput: sql<number>`SUM(${jobPages.secondModelInput})`,
        pagesSecondModelOutput: sql<number>`SUM(${jobPages.secondModelOutput})`,
      })
      .from(jobs)
      .leftJoin(ocrModels, eq(jobs.ocrModelId, ocrModels.id))
      .leftJoin(jobResults, eq(jobs.id, jobResults.jobId))
      .leftJoin(jobPages, eq(jobs.id, jobPages.jobId))
      .groupBy(
        jobs.id,
        ocrModels.modelId,
        ocrModels.provider,
        jobResults.promptTokens,
        jobResults.completionTokens,
        jobResults.secondModelInput,
        jobResults.secondModelOutput
      );


    const allModels = await db.select({ modelId: ocrModels.modelId, provider: ocrModels.provider, inputPrice: ocrModels.inputPrice, outputPrice: ocrModels.outputPrice }).from(ocrModels);
    const pricingMap = allModels.reduce((acc, model) => {
      // Map based on how modelId is stored or queried. We'll use getProviderPrefixedModelId logic if needed, but here we can just store by modelId.
      // The models in DB have modelId. Sometimes we query by a prefixed one. Let's just index by raw modelId and prefixed modelId to be safe.
      acc[model.modelId] = { input: model.inputPrice || 0, output: model.outputPrice || 0 };
      if (model.provider === "vercel") acc[`@vercel/${model.modelId}`] = { input: model.inputPrice || 0, output: model.outputPrice || 0 };
      if (model.provider === "cloudflare") acc[`@cf/${model.modelId}`] = { input: model.inputPrice || 0, output: model.outputPrice || 0 };
      return acc;
    }, {} as Record<string, { input: number; output: number }>);

    const [{ count: userCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(ne(user.role, "admin"));

    let totalTokensAll = 0;
    let totalCostAll = 0;

    for (const stat of statsQuery) {
        const pagesPromptTokens = Number(stat.pagesPromptTokens || 0);
        const resultPromptTokens = Number(stat.resultPromptTokens || 0);

        const pagesCompletionTokens = Number(stat.pagesCompletionTokens || 0);
        const resultCompletionTokens = Number(stat.resultCompletionTokens || 0);

        const pagesSecondModelInput = Number(stat.pagesSecondModelInput || 0);
        const resultSecondModelInput = Number(stat.resultSecondModelInput || 0);

        const pagesSecondModelOutput = Number(stat.pagesSecondModelOutput || 0);
        const resultSecondModelOutput = Number(stat.resultSecondModelOutput || 0);

        totalTokensAll += pagesPromptTokens + resultPromptTokens + pagesCompletionTokens + resultCompletionTokens + pagesSecondModelInput + resultSecondModelInput + pagesSecondModelOutput + resultSecondModelOutput;

        // 1. Primary Model (Vision) Token Cost
        const visionModelId = stat.modelId || OCR_VISION_MODEL;

        const visionPricing = pricingMap[visionModelId as string] || { input: 0, output: 0 };

        totalCostAll += (pagesPromptTokens / 1_000_000) * visionPricing.input;
        totalCostAll += (pagesCompletionTokens / 1_000_000) * visionPricing.output;

        // 2. Second Model (Text) Token Cost
        const textPricing = pricingMap[OCR_TEXT_MODEL as string] || { input: 0, output: 0 };

        totalCostAll += ((pagesSecondModelInput + resultSecondModelInput) / 1_000_000) * textPricing.input;
        totalCostAll += ((pagesSecondModelOutput + resultSecondModelOutput) / 1_000_000) * textPricing.output;
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
