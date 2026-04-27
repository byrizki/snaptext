/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getDb, jobResults, jobs, jobPages, ocrModels, user } from "@/db";
import { desc, eq, sql } from "drizzle-orm";

import { OCR_TEXT_MODEL, OCR_VISION_MODEL } from "@/app/workflows/ocr/models";

export async function GET() {
  try {
    const db = getDb();

    const jobsWithMetrics = await db
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
        
        // User Details
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,

        // Final merged token counts from jobResults
        resultPromptTokens: jobResults.promptTokens,
        resultCompletionTokens: jobResults.completionTokens,
        resultTotalTokens: jobResults.totalTokens,
        resultSecondModelInput: jobResults.secondModelInput,
        resultSecondModelOutput: jobResults.secondModelOutput,

        // Sum of all pages' token counts from jobPages
        pagesPromptTokens: sql<number>`SUM(${jobPages.promptTokens})`,
        pagesCompletionTokens: sql<number>`SUM(${jobPages.completionTokens})`,
        pagesTotalTokens: sql<number>`SUM(${jobPages.totalTokens})`,
        pagesSecondModelInput: sql<number>`SUM(${jobPages.secondModelInput})`,
        pagesSecondModelOutput: sql<number>`SUM(${jobPages.secondModelOutput})`,
      })
      .from(jobs)
      .leftJoin(ocrModels, eq(jobs.ocrModelId, ocrModels.id))
      .leftJoin(jobResults, eq(jobs.id, jobResults.jobId))
      .leftJoin(jobPages, eq(jobs.id, jobPages.jobId))
      .leftJoin(user, eq(jobs.userId, user.id))
      .groupBy(
        jobs.id,
        jobs.filename,
        ocrModels.name,
        ocrModels.modelId,
        ocrModels.provider,
        user.name,
        user.email,
        user.image,
        jobResults.promptTokens,
        jobResults.completionTokens,
        jobResults.totalTokens,
        jobResults.secondModelInput,
        jobResults.secondModelOutput
      )
      .orderBy(desc(jobs.createdAt))
      .limit(100);


    const allModels = await db.select({ modelId: ocrModels.modelId, provider: ocrModels.provider, inputPrice: ocrModels.inputPrice, outputPrice: ocrModels.outputPrice }).from(ocrModels);
    const pricingMap = allModels.reduce((acc, model) => {
      acc[model.modelId] = { input: model.inputPrice || 0, output: model.outputPrice || 0 };
      if (model.provider === "vercel") acc[`@vercel/${model.modelId}`] = { input: model.inputPrice || 0, output: model.outputPrice || 0 };
      if (model.provider === "cloudflare") acc[`@cf/${model.modelId}`] = { input: model.inputPrice || 0, output: model.outputPrice || 0 };
      return acc;
    }, {} as Record<string, { input: number; output: number }>);

    const jobsWithCosts = jobsWithMetrics.map((job) => {
        const pagesTotalTokens = Number(job.pagesTotalTokens || 0);
        const resultTotalTokens = Number(job.resultTotalTokens || 0);
        const totalTokens = pagesTotalTokens + resultTotalTokens;

        const pagesPromptTokens = Number(job.pagesPromptTokens || 0);
        const resultPromptTokens = Number(job.resultPromptTokens || 0);
        const promptTokens = pagesPromptTokens + resultPromptTokens;

        const pagesCompletionTokens = Number(job.pagesCompletionTokens || 0);
        const resultCompletionTokens = Number(job.resultCompletionTokens || 0);
        const completionTokens = pagesCompletionTokens + resultCompletionTokens;

        const pagesSecondModelInput = Number(job.pagesSecondModelInput || 0);
        const resultSecondModelInput = Number(job.resultSecondModelInput || 0);
        const secondModelInput = pagesSecondModelInput + resultSecondModelInput;

        const pagesSecondModelOutput = Number(job.pagesSecondModelOutput || 0);
        const resultSecondModelOutput = Number(job.resultSecondModelOutput || 0);
        const secondModelOutput = pagesSecondModelOutput + resultSecondModelOutput;

        // Calculate Cost using primary config's model pricing AND the text_model pricing
        let cost = 0;

        // 1. Primary Model (Vision) Token Cost (defaults to OCR_VISION_MODEL if ocrModels lookup fails)
        // If ocrModels exists, modelId is likely saved as "google/gemini-2.5-flash" (the provider prefix is added or handled differently sometimes, wait in route we do `getProviderPrefixedModelId` when saving model which prepends @vercel/?)
        // Let's just use job.modelId if present since we saved it as providerPrefixed in ocrModels
        // Wait, let's look at app/api/admin/models/route.ts
        //   modelId: getProviderPrefixedModelId(data.provider, data.modelId)
        // So job.modelId IS ALREADY provider prefixed! like "@vercel/google/gemini-1.5-flash"
        const visionModelId = job.modelId || OCR_VISION_MODEL;

        const visionPricing = pricingMap[visionModelId as string] || { input: 0, output: 0 };

        cost += (pagesPromptTokens / 1_000_000) * visionPricing.input;
        cost += (pagesCompletionTokens / 1_000_000) * visionPricing.output;

        // 2. Second Model (Text) Token Cost
        const textPricing = pricingMap[OCR_TEXT_MODEL as string] || { input: 0, output: 0 };

        cost += (secondModelInput / 1_000_000) * textPricing.input;
        cost += (secondModelOutput / 1_000_000) * textPricing.output;

        return {
            id: job.id,
            filename: job.filename,
            status: job.status,
            error: job.error,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            totalPages: job.totalPages,
            user: {
                name: job.userName,
                email: job.userEmail,
                image: job.userImage
            },
            model: job.modelName ? { name: job.modelName } : null,
            promptTokens,
            completionTokens,
            totalTokens,
            secondModelInput,
            secondModelOutput,
            cost: cost.toFixed(4)
        };
    });

    return NextResponse.json(jobsWithCosts);
  } catch (error: any) {
    console.error("Failed to fetch jobs", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
