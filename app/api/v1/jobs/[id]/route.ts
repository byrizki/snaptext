/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb, jobPages, jobs, ocrModels } from "@/db";
import { validateApiKey } from "@/lib/api-key";
import { reconcileOcrJobStatus } from "@/lib/ocr-job-status";
import { decodeToon } from "@/lib/toon-parser";

export const JobIdParam = z.object({
  id: z.string().describe("UUID of the job or wrun_ workflow execution run ID")
});

export const JobDetailsResponse = z.object({
  id: z.uuid(),
  runId: z.string().nullable(),
  status: z.string(),
  filename: z.string(),
  metadata: z.object({
    totalPages: z.number(),
    completedPages: z.number(),
    pdfUrl: z.url(),
    createdAt: z.date(),
    updatedAt: z.date(),
    hasSchema: z.boolean(),
    schema: z.string().nullable(),
    modelName: z.string().nullable(),
    metrics: z.object({
      extractedPages: z.number(),
      emptyPages: z.number(),
      failedPages: z.number(),
      mergeablePages: z.number()
    })
  }),
  data: z.any().nullable().describe("Merged layout extraction structure of the document (JSON shape)"),
  pagesData: z.array(z.any()).describe("Individual extracted layout page outputs"),
  error: z.string().nullable()
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get Job Status & Results
 * @description Retrieves real-time processing status, metadata metrics, and final merged schema layouts for a specific job.
 * @pathParams JobIdParam
 * @response JobDetailsResponse
 * @auth ApiKeyAuth
 * @openapi
 */
export async function GET(

  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const authContext = await validateApiKey(request);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = authContext;
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const db = getDb();
    const isWorkflowRunId = id.startsWith("wrun_");

    // Fetch the job ensuring tenant isolation (matching userId)
    const [data] = await db
      .select({
        job: jobs,
        ocrModelName: ocrModels.name,
      })
      .from(jobs)
      .leftJoin(ocrModels, eq(jobs.ocrModelId, ocrModels.id))
      .where(
        and(
          isWorkflowRunId ? eq(jobs.workflowRunId, id) : eq(jobs.id, id),
          eq(jobs.userId, userId)
        )
      )
      .limit(1);

    if (!data || !data.job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { job, ocrModelName } = data;
    const status = await reconcileOcrJobStatus(job);

    const pages = await db
      .select()
      .from(jobPages)
      .where(eq(jobPages.jobId, job.id))
      .orderBy(jobPages.pageNumber);

    if (status === "failed" || status === "cancelled") {
      return NextResponse.json({
        id: job.id,
        runId: job.workflowRunId,
        status,
        filename: job.filename,
        error: job.error || "Workflow did not complete successfully.",
      });
    }

    // Merge pages parsed data
    let mergedData: any = null;
    const processedPages = pages.map((p) => {
      if (p.parsedData && (p.parsedData as any).parse_error && p.toonOutput) {
        try {
          const reparsed = decodeToon(p.toonOutput);
          return { ...p, parsedData: reparsed };
        } catch (err) {
          // Keep as is
        }
      }
      return p;
    });

    const pagesWithData = processedPages.filter((p) => p.parsedData !== null);
    const completedPages = job.progress ?? pagesWithData.length;

    const isEmptyPage = (p: any) => {
      const pageData = p.parsedData as any;
      if (!pageData.empty) return false;
      const keys = Object.keys(pageData).filter(
        (k) => k !== "empty" && k !== "document_metadata"
      );
      return keys.length === 0;
    };

    const emptyPages = pagesWithData.filter(isEmptyPage);
    const extractedPages = pagesWithData.filter((p) => !isEmptyPage(p));
    const failedPages = extractedPages.filter(
      (p) => !!(p.parsedData as any).parse_error
    );
    const mergeablePages = extractedPages.filter(
      (p) => !(p.parsedData as any).parse_error
    );

    if (mergeablePages.length > 0) {
      try {
        if (mergeablePages.length === 1) {
          mergedData = { ...(mergeablePages[0].parsedData as any) };
        } else {
          mergedData = mergeablePages.reduce((acc, curr) => {
            return deepMergeWithArrayConcat(acc, curr.parsedData);
          }, {} as any);

          // Compute average scores
          if (
            mergedData.document_metadata &&
            typeof mergedData.document_metadata === "object"
          ) {
            let totalReadability = 0;
            let readabilityCount = 0;
            let totalUsability = 0;
            let usabilityCount = 0;

            for (const p of mergeablePages) {
              const md = p.parsedData as any;
              if (md?.document_metadata) {
                if (typeof md.document_metadata.readability_score === "number") {
                  totalReadability += md.document_metadata.readability_score;
                  readabilityCount++;
                }
                if (typeof md.document_metadata.data_usability_score === "number") {
                  totalUsability += md.document_metadata.data_usability_score;
                  usabilityCount++;
                }
              }
            }

            if (readabilityCount > 0) {
              mergedData.document_metadata.readability_score = Math.round(
                totalReadability / readabilityCount
              );
            }
            if (usabilityCount > 0) {
              mergedData.document_metadata.data_usability_score = Math.round(
                totalUsability / usabilityCount
              );
            }
          }
        }

        if (mergedData) {
          delete mergedData.empty;
        }
      } catch (err) {
        console.error("[jobs v1 id] Error merging pages:", err);
      }
    }

    return NextResponse.json({
      id: job.id,
      runId: job.workflowRunId,
      status,
      filename: job.filename,
      metadata: {
        totalPages: job.totalPages ?? 0,
        completedPages,
        pdfUrl: job.pdfBlobUrl,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        hasSchema: !!job.jsonSchema,
        schema: job.jsonSchema,
        modelName: ocrModelName ?? processedPages[0]?.model ?? null,
        metrics: {
          extractedPages: extractedPages.length,
          emptyPages: emptyPages.length,
          failedPages: failedPages.length,
          mergeablePages: mergeablePages.length,
        },
      },
      data: mergedData,
      pagesData: processedPages
        .filter(
          (x) =>
            x &&
            !(
              process.env.NODE_ENV === "production" &&
              (x.parsedData as any)?.parse_error
            )
        )
        .map((p) => {
          const copy: any = { ...(p.parsedData || {}) };
          delete copy.empty;
          return copy;
        }),
      error: job.error ?? null,
    });
  } catch (err) {
    console.error("[jobs v1 id] GET Exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
