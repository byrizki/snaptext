/* eslint-disable @typescript-eslint/no-explicit-any */
import { FatalError, getWorkflowMetadata } from "workflow";
import pMap from "p-map";
import { stopHook } from "./hooks";

import {
  extractPdfPageImages,
  finalizeJob,
  initializeJob,
  processOcrPage,
  dbGetJob,
  dbGetExistingPages,
  dbFindReusablePages,
  dbSaveReusablePages,
  dbSaveNewPages,
  dbSaveJobResult,
  dbGetOcrModel,
} from "./steps";
import type { OcrPageResult, OcrWorkflowResult } from "./types";
import type { OcrModel } from "@/db";

export async function ocrWorkflow(
  jobId: string,
  pdfUrl: string,
): Promise<OcrWorkflowResult> {
  "use workflow";
  const { workflowRunId } = getWorkflowMetadata();
  const stopState = { current: false };
  const hook = stopHook.create({ token: `stop:${workflowRunId}` });
  hook.then(() => {
    stopState.current = true;
  });

  try {
    await initializeJob(jobId);

    const job = await dbGetJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    let ocrModelConfig: OcrModel | undefined = undefined;
    if (job.ocrModelId) {
      ocrModelConfig = await dbGetOcrModel(job.ocrModelId);
    }

    const schemaToToonModule = await import("@/lib/schema-to-toon");
    const toonSchemaTemplate = job.jsonSchema
      ? schemaToToonModule.jsonSchemaToToon(JSON.parse(job.jsonSchema))
      : undefined;

    let pageImages = await dbGetExistingPages(jobId);

    if (
      pageImages.length === 0 || !pageImages.every((p) => p.pageBlobUrl)
    ) {
      const reusablePages = await dbFindReusablePages(jobId, job.fileHash);
      if (reusablePages.length > 0) {
        await dbSaveReusablePages(jobId, reusablePages);
        pageImages = reusablePages as any;
      } else {
        const extracted = await extractPdfPageImages(
          pdfUrl,
          jobId,
          job.fileHash,
        );
        await dbSaveNewPages(jobId, extracted);
        pageImages = extracted as any;
      }
    }

    console.log(`[Workflow] Image-based PDF — all ${pageImages.length} pages will run vision OCR`);
    const pagesToProcess = pageImages;

    if (stopState.current) {
      throw new FatalError("Workflow stopped by user");
    }

    const pagesResults = await pMap(
      pagesToProcess,
      async (p: any): Promise<OcrPageResult | null> =>
        processOcrPage(
          p,
          jobId,
          job.fileHash,
          ocrModelConfig,
          stopState,
          toonSchemaTemplate,
        ),
      { concurrency: 5 },
    );
    const pages = pagesResults.filter((p): p is OcrPageResult => p !== null);

    // Sort pages by pageNumber to maintain original order since pMap might process out of order
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    const extractedPages = pages.filter((p) => !p.data.empty);
    const emptyPages = pages.filter((p) => !!p.data.empty);
    const failedPages = extractedPages.filter((p) => !!p.data.parse_error);
    const mergeablePages = extractedPages.filter((p) => !p.data.parse_error);
    console.log(
      `[Workflow] Page results for jobId: ${jobId} — total: ${pages.length}, extracted: ${extractedPages.length}, empty: ${emptyPages.length}, failed: ${failedPages.length}, mergeable: ${mergeablePages.length}`,
    );

    if (stopState.current) {
      throw new FatalError("Workflow stopped by user");
    }

    let merged: Record<string, unknown> = {};
    if (mergeablePages.length === 0) {
      console.log(`[Workflow] No mergeable pages — all pages failed or were empty for jobId: ${jobId}`);
      await dbSaveJobResult(jobId, {}, `[${new Date().toISOString()}] No mergeable pages`);
    } else if (mergeablePages.length === 1) {
      console.log(`[Workflow] Single mergeable page — skipping merge for jobId: ${jobId}`);
      merged = mergeablePages[0].data;
      await dbSaveJobResult(
        jobId,
        merged,
        `[${new Date().toISOString()}] Single-page document`,
        mergeablePages[0].model,
      );
    } else {
      console.log(`[Workflow] Running programmatic blind merge for jobId: ${jobId}`);
      merged = mergeablePages.reduce((acc, curr) => {
        return deepMergeWithArrayConcat(acc, curr.data);
      }, {} as Record<string, unknown>);

      // Compute average metadata scores if possible
      if (merged.document_metadata && typeof merged.document_metadata === "object") {
        let totalReadability = 0;
        let readabilityCount = 0;
        let totalUsability = 0;
        let usabilityCount = 0;

        for (const p of mergeablePages) {
          const md = p.data.document_metadata as any;
          if (md) {
            if (typeof md.readability_score === "number") {
              totalReadability += md.readability_score;
              readabilityCount++;
            }
            if (typeof md.data_usability_score === "number") {
              totalUsability += md.data_usability_score;
              usabilityCount++;
            }
          }
        }

        if (readabilityCount > 0) {
          (merged.document_metadata as any).readability_score = Math.round(totalReadability / readabilityCount);
        }
        if (usabilityCount > 0) {
          (merged.document_metadata as any).data_usability_score = Math.round(totalUsability / usabilityCount);
        }
      }

      await dbSaveJobResult(jobId, merged, "Programmatic blind merge completed", mergeablePages[0].model);
    }

    await finalizeJob(jobId, "completed");

    return {
      jobId,
      runId: "",
      pdfUrl,
      totalPages: pagesToProcess.length,
      pages,
      merged,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "OCR workflow failed unexpectedly";
    await finalizeJob(jobId, "failed", errorMessage);
    throw new FatalError(errorMessage);
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
  return target !== undefined && target !== null && target !== "" ? target : source;
}
