/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, count, eq, isNotNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

import { getDb, jobPages, jobResults, jobs, ocrModels } from "@/db";
import { decodeToon } from "@/lib/toon-parser";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view"); // e.g., 'demo'

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = getDb();

  // Determine whether the param is a Vercel workflow run ID or a DB job UUID.
  const isWorkflowRunId = id.startsWith("wrun_");

  const [data] = await db
    .select({
      job: jobs,
      ocrModelName: ocrModels.name,
    })
    .from(jobs)
    .leftJoin(ocrModels, eq(jobs.ocrModelId, ocrModels.id))
    .where(
      isWorkflowRunId
        ? eq(jobs.workflowRunId, id)
        : or(eq(jobs.id, id), eq(jobs.workflowRunId, id)),
    )
    .limit(1);

  const job = data?.job;
  const ocrModelName = data?.ocrModelName;

  let status = "unknown";

  try {
    // If we have a job, use its workflowRunId, otherwise assume the param itself is the runId.
    const run = getRun(job?.workflowRunId ?? id);
    status = await run.status;
  } catch (error: any) {
    // If the workflow run is not found (e.g., deleted or expired), fallback to the DB status
    if (
      error.name === "WorkflowRunNotFoundError" ||
      error.message?.includes("not found")
    ) {
      status = job?.status ?? "unknown";
    } else {
      console.error("Workflow status error:", error);
    }
  }

  // If the DB says completed, trust the DB (in case workflow status is purged)
  if (job?.status === "completed") {
    status = "completed";
  } else if (job?.status === "failed") {
    status = "failed";
  }

  const pages = job
    ? await db
        .select()
        .from(jobPages)
        .where(eq(jobPages.jobId, job.id))
        .orderBy(jobPages.pageNumber)
    : [];

  if (status === "failed" || status === "cancelled") {
    return NextResponse.json({
      id: job?.id || id,
      runId: job?.workflowRunId || id,
      status,
      filename: job?.filename ?? null,
      error: job?.error || "Workflow did not complete successfully.",
    });
  }

  // Merge data on the fly
  let mergedData: any = null;
  const processedPages = pages.map((p) => {
    if (p.parsedData && (p.parsedData as any).parse_error && p.toonOutput) {
      try {
        const reparsed = decodeToon(p.toonOutput);
        return { ...p, parsedData: reparsed };
      } catch (err) {
        // Still failed, keep as is
      }
    }
    return p;
  });

  const pagesWithData = processedPages.filter((p) => p.parsedData !== null);
  const completedPages = pagesWithData.length;

  const isEmptyPage = (p: any) => {
    const data = p.parsedData as any;
    if (!data.empty) return false;
    const keys = Object.keys(data).filter(
      (k) => k !== "empty" && k !== "document_metadata",
    );
    return keys.length === 0;
  };

  const emptyPages = pagesWithData.filter(isEmptyPage);
  const extractedPages = pagesWithData.filter((p) => !isEmptyPage(p));
  const failedPages = extractedPages.filter(
    (p) => !!(p.parsedData as any).parse_error,
  );
  const mergeablePages = extractedPages.filter(
    (p) => !(p.parsedData as any).parse_error,
  );

  if (mergeablePages.length > 0) {
    try {
      if (mergeablePages.length === 1) {
        mergedData = { ...(mergeablePages[0].parsedData as any) };
      } else {
        mergedData = mergeablePages.reduce((acc, curr) => {
          return deepMergeWithArrayConcat(acc, curr.parsedData);
        }, {} as any);

        // Compute average metadata scores if possible
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
              if (
                typeof md.document_metadata.data_usability_score === "number"
              ) {
                totalUsability += md.document_metadata.data_usability_score;
                usabilityCount++;
              }
            }
          }

          if (readabilityCount > 0) {
            mergedData.document_metadata.readability_score = Math.round(
              totalReadability / readabilityCount,
            );
          }
          if (usabilityCount > 0) {
            mergedData.document_metadata.data_usability_score = Math.round(
              totalUsability / usabilityCount,
            );
          }
        }
      }

      if (mergedData) {
        delete mergedData.empty;
      }
    } catch (err) {
      console.error("[API] Error merging pages on the fly:", err);
      // We'll return what we have or null if it completely failed
    }
  }

  return NextResponse.json({
    id: job?.id || id,
    runId: job?.workflowRunId || id,
    status,
    filename: job?.filename,
    metadata: {
      totalPages: job?.totalPages ?? 0,
      completedPages: completedPages,
      pdfUrl: job?.pdfBlobUrl,
      createdAt: job?.createdAt,
      updatedAt: job?.updatedAt,
      hasSchema: !!job?.jsonSchema,
      schema: job?.jsonSchema,
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
            process.env.NODE_ENV === "production" && (x.parsedData as any)?.parse_error
          ),
      )
      .map((p) => {
        const copy: any = { ...(p.parsedData || {}) };
        delete copy.empty;
        return copy;
      }),
    error: job?.error ?? null,
  });
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
