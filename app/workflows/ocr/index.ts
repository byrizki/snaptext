import pMap from "p-map";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FatalError, getWorkflowMetadata } from "workflow";
import { stopHook } from "./hooks";

import {
  extractPdfPageImages,
  finalizeJob,
  initializeJob,
  mergePageData,
  runOcrOnPage,
  repairOcrPageData,
  dbGetJob,
  dbGetExistingPages,
  dbFindReusablePages,
  dbSaveReusablePages,
  dbSaveNewPages,
  dbSaveOcrPageResult,
  dbSaveRepairPageResult,
  dbSaveJobResult,
  dbGetOcrModel
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

    // Dynamically import jsonSchemaToToon to avoid workflow serialization issues if needed
    // or we can import it statically. We'll import it statically at the top.
    const schemaToToonModule = await import("@/lib/schema-to-toon");
    const toonSchemaTemplate = job.jsonSchema ? schemaToToonModule.jsonSchemaToToon(JSON.parse(job.jsonSchema)) : undefined;

    let pageImages = await dbGetExistingPages(jobId);

    if (pageImages.length === 0 || !pageImages.every(p => p.pageBlobUrl)) {
      const reusablePages = await dbFindReusablePages(jobId, job.fileHash);
      if (reusablePages.length > 0) {
        await dbSaveReusablePages(jobId, reusablePages);
        pageImages = reusablePages as any;
      } else {
        const extracted = await extractPdfPageImages(pdfUrl, jobId, job.fileHash);
        await dbSaveNewPages(jobId, extracted);
        pageImages = extracted as any;
      }
    }

    const processPage = async (p: any): Promise<OcrPageResult | null> => {
      const { pageNumber, pageBlobUrl } = p as any;
      if (!pageBlobUrl) return null;

      // If this page was already successfully OCR'd (e.g. from a previous run attempt),
      // skip reprocessing and reconstruct the result from the DB record.
      if ((p as any).parsedData) {
        return {
          pageNumber,
          pageBlobUrl,
          rawToon: (p as any).toonOutput ?? "",
          data: (p as any).parsedData,
          model: (p as any).model ?? "",
          usage: {
            promptTokens: (p as any).promptTokens ?? 0,
            completionTokens: (p as any).completionTokens ?? 0,
            totalTokens: (p as any).totalTokens ?? 0,
          },
          finishReason: (p as any).finishReason ?? "",
        };
      }

      if (stopState.current) {
        throw new FatalError("Workflow stopped by user");
      }

      let result = await runOcrOnPage(pageBlobUrl, pageNumber, jobId, job.fileHash, ocrModelConfig, stopState, toonSchemaTemplate);
      await dbSaveOcrPageResult(jobId, pageNumber, result);

      if (stopState.current) {
        throw new FatalError("Workflow stopped by user");
      }

      if (result.data.parse_error) {
        result = await repairOcrPageData(result, jobId, job.fileHash, ocrModelConfig, stopState, toonSchemaTemplate);
        await dbSaveRepairPageResult(jobId, pageNumber, result);
      }
      return result;
    };

    const pagesResults = await pMap(pageImages, processPage, { concurrency: 5 });
    const pages = pagesResults.filter((p): p is OcrPageResult => p !== null);

    // Sort pages by pageNumber to maintain original order since pMap might process out of order
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    if (stopState.current) {
      throw new FatalError("Workflow stopped by user");
    }

    let merged: Record<string, unknown>;
    if (pages.length === 1) {
      merged = pages[0].data;
      await dbSaveJobResult(
        jobId, 
        merged, 
        `[${new Date().toISOString()}] Single-page document — merge step skipped`
      );
    } else {
      const mergeRes = await mergePageData(pages, jobId, job.fileHash, ocrModelConfig, stopState, toonSchemaTemplate);
      merged = mergeRes.merged;
      await dbSaveJobResult(jobId, merged, mergeRes.log, mergeRes.usage);
    }

    await finalizeJob(jobId, "completed");

    return {
      jobId,
      runId: "",
      pdfUrl,
      totalPages: pageImages.length,
      pages,
      merged,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "OCR workflow failed unexpectedly";
    await finalizeJob(jobId, "failed", errorMessage);
    throw new FatalError(errorMessage);
  }
}
