/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getDb, llmLogs, jobs, ocrModels, user, jobPages, jobResults } from "@/db";
import { eq, desc } from "drizzle-orm";
import { VERCEL_AI_GATEWAY_PRICING } from "@/lib/constants";
import { decodeToon } from "@/lib/toon-parser";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const db = getDb();

    const [jobData] = await db
      .select({
        id: jobs.id,
        filename: jobs.filename,
        status: jobs.status,
        error: jobs.error,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        totalPages: jobs.totalPages,
        fileSize: jobs.fileSize,
        pdfBlobUrl: jobs.pdfBlobUrl,
        jsonSchema: jobs.jsonSchema,
        workflowRunId: jobs.workflowRunId,
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
      .where(eq(jobs.id, id))
      .limit(1);

    if (!jobData) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch Logs
    const logs = await db
      .select()
      .from(llmLogs)
      .where(eq(llmLogs.jobId, id))
      .orderBy(desc(llmLogs.createdAt));

    // Fetch OCR Pages
    const pages = await db
      .select()
      .from(jobPages)
      .where(eq(jobPages.jobId, id))
      .orderBy(jobPages.pageNumber);

    // Fetch Pre-merged Results if any
    const [result] = await db
      .select()
      .from(jobResults)
      .where(eq(jobResults.jobId, id))
      .limit(1);

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

    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let cost = 0;

    const pageMetrics = new Map<string, { promptTokens: number, completionTokens: number, totalTokens: number, cost: number }>();

    for (const log of logs) {
      promptTokens += log.promptTokens;
      completionTokens += log.completionTokens;
      totalTokens += log.totalTokens;

      const pricing = pricingMap.get(log.model)
        ?? pricingMap.get(jobData.modelId || "")
        ?? { input: 0, output: 0 };
      
      const logCost = (log.promptTokens * (pricing.input / 1_000_000)) + (log.completionTokens * (pricing.output / 1_000_000));
      cost += logCost;

      if (log.jobPageId) {
        const existing = pageMetrics.get(log.jobPageId) || { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 };
        pageMetrics.set(log.jobPageId, {
          promptTokens: existing.promptTokens + log.promptTokens,
          completionTokens: existing.completionTokens + log.completionTokens,
          totalTokens: existing.totalTokens + log.totalTokens,
          cost: existing.cost + logCost,
        });
      }
    }

    // Logic from app/api/ocr/[id]/route.ts
    const processedPages = pages.map((p) => {
      if (p.parsedData && (p.parsedData as any).parse_error && p.toonOutput) {
        try {
          const reparsed = decodeToon(p.toonOutput);
          return { ...p, parsedData: reparsed };
        } catch (err) {
          // Still failed
        }
      }
      return p;
    });

    const pagesWithData = processedPages.filter((p) => p.parsedData !== null);
    
    const isEmptyPage = (p: any) => {
      const data = p.parsedData as any;
      if (!data.empty) return false;
      const keys = Object.keys(data).filter(
        (k) => k !== "empty" && k !== "document_metadata",
      );
      return keys.length === 0;
    };

    const extractedPages = pagesWithData.filter((p) => !isEmptyPage(p));
    const mergeablePages = extractedPages.filter(
      (p) => !(p.parsedData as any).parse_error,
    );

    let mergedData: any = result?.mergedData || null;

    // Merge on the fly if needed (fallback or for running jobs)
    if (!mergedData && mergeablePages.length > 0) {
      try {
        if (mergeablePages.length === 1) {
          mergedData = { ...(mergeablePages[0].parsedData as any) };
        } else {
          mergedData = mergeablePages.reduce((acc, curr) => {
            return deepMergeWithArrayConcat(acc, curr.parsedData);
          }, {} as any);
        }
        if (mergedData) {
          delete mergedData.empty;
        }
      } catch (err) {
        console.error("[Admin API] Error merging pages on the fly:", err);
      }
    }

    return NextResponse.json({
      ...jobData,
      user: {
        name: jobData.userName,
        email: jobData.userEmail,
        image: jobData.userImage,
      },
      model: jobData.modelName ? { name: jobData.modelName, provider: jobData.provider } : null,
      telemetry: {
        promptTokens,
        completionTokens,
        totalTokens,
        cost: cost.toFixed(4),
        logs: logs.map(l => ({
          stepName: l.stepName,
          model: l.model,
          promptTokens: l.promptTokens,
          completionTokens: l.completionTokens,
          totalTokens: l.totalTokens,
          createdAt: l.createdAt,
        }))
      },
      ocr: {
        mergedData,
        pages: processedPages
          .filter(
            (x) =>
              x &&
              !(
                process.env.NODE_ENV === "production" && (x.parsedData as any)?.parse_error
              ),
          )
          .map((p) => {
            const metrics = pageMetrics.get(p.id) || { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 };
            const copy: any = { 
              id: p.id,
              pageNumber: p.pageNumber,
              pageBlobUrl: p.pageBlobUrl,
              model: p.model,
              createdAt: p.createdAt,
              usage: {
                promptTokens: metrics.promptTokens,
                completionTokens: metrics.completionTokens,
                totalTokens: metrics.totalTokens,
              },
              cost: metrics.cost,
              ...(p.parsedData || {}) 
            };
            delete copy.empty;
            return copy;
          }),
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch job detail", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

function deepMergeWithArrayConcat(target: any, source: any): any {
  if (Array.isArray(target) && Array.isArray(source)) {
    return target.concat(source);
  }
  if (
    target &&
    typeof target === "object" &&
    source &&
    typeof source === "object"
  ) {
    const merged = { ...target };
    for (const key of Object.keys(source)) {
      if (key in target) {
        merged[key] = deepMergeWithArrayConcat(target[key], source[key]);
      } else {
        merged[key] = source[key];
      }
    }
    return merged;
  }
  return target !== undefined && target !== null && target !== ""
    ? target
    : source;
}
