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
  dbGetOcrModel,
  dbGetSystemSettings,
} from "./steps";
import type { OcrPageResult, OcrWorkflowResult } from "./types";
import type { OcrModel } from "@/db";

export async function ocrWorkflow(
  jobId: string,
  pdfUrl: string,
  userId?: string | null,
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

    console.log("================== toon schema template ==================")
    console.log(toonSchemaTemplate)
    console.log("================== toon schema template ==================")

    let pageImages = await dbGetExistingPages(jobId);

    if (pageImages.length === 0 || !pageImages.every((p) => p.pageBlobUrl)) {
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

    console.log(
      `[Workflow] Image-based PDF — all ${pageImages.length} pages will run vision OCR`,
    );
    const pagesToProcess = pageImages;

    if (stopState.current) {
      throw new FatalError("Workflow stopped by user");
    }

    const systemSettings = await dbGetSystemSettings();

    const pagesResults = await pMap(
      pagesToProcess,
      async (p: any): Promise<OcrPageResult | null> => {
        if (stopState.current) return null;

        return processOcrPage(
          p,
          jobId,
          job.fileHash,
          ocrModelConfig,
          stopState,
          toonSchemaTemplate,
          userId,
        );
      },
      { concurrency: systemSettings.concurrencyLength },
    );
    const pages = pagesResults.filter((p): p is OcrPageResult => p !== null);

    // Sort pages by pageNumber to maintain original order since pMap might process out of order
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    await finalizeJob(jobId, "completed");

    return {
      jobId,
      runId: "",
      pdfUrl,
      totalPages: pagesToProcess.length,
      pages,
      merged: {},
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "OCR workflow failed unexpectedly";
    await finalizeJob(jobId, "failed", errorMessage);
    throw new FatalError(errorMessage);
  }
}


