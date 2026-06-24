/* eslint-disable @typescript-eslint/no-explicit-any */
import { FatalError } from "workflow";
import { stopHook } from "./hooks";
import pMap from "p-map";

import {
  extractPdfPageImages,
  finalizeJob,
  initializeJob,
  processOcrPage,
  dbGetJob,
  dbGetExistingPages,
  dbFindReusablePages,
  dbGetOcrModel,
  dbGetSystemSettings,
  dbGetOcrModelsByName,
  dbGetDefaultActiveModel,
  dbUpdateJobProgress,
  dbSaveNewPages,
  dbSaveReusablePages,
} from "./steps";
import type { OcrPageResult, OcrWorkflowResult } from "./types";
import type { OcrModel } from "@/db";

export async function ocrWorkflow(
  jobId: string,
  pdfUrl: string,
  userId?: string | null,
): Promise<OcrWorkflowResult> {
  "use workflow";

  const pages: OcrPageResult[] = [];
  let pagesToProcess: any[] = [];
  const stopSignal = stopHook.create({ token: `ocr-stop:${jobId}` });

  try {
    await initializeJob(jobId);

    const job = await dbGetJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    let ocrModelConfig: OcrModel | undefined = undefined;
    let ocrModelsList: OcrModel[] = [];
    if (job.ocrModelId) {
      const modelRow = await dbGetOcrModel(job.ocrModelId);
      if (modelRow && modelRow.isEnabled) {
        ocrModelConfig = modelRow;
      }
    }

    if (ocrModelConfig) {
      ocrModelsList = await dbGetOcrModelsByName(ocrModelConfig.name);
      if (!ocrModelsList.find(m => m.id === ocrModelConfig!.id)) {
        ocrModelsList.push(ocrModelConfig);
      }
    } else {
      // Fallback to default active model if primary model is disabled/missing
      const defaultActiveModel = await dbGetDefaultActiveModel();
      if (defaultActiveModel) {
        ocrModelConfig = defaultActiveModel;
        ocrModelsList = await dbGetOcrModelsByName(defaultActiveModel.name);
        if (!ocrModelsList.find(m => m.id === defaultActiveModel.id)) {
          ocrModelsList.push(defaultActiveModel);
        }
      }
    }

    const schemaToToonModule = await import("@/lib/schema-to-toon");
    const parsedJsonSchema = job.jsonSchema ? JSON.parse(job.jsonSchema) : undefined;
    const toonSchemaTemplate = parsedJsonSchema
      ? schemaToToonModule.jsonSchemaToToon(parsedJsonSchema)
      : undefined;

    if (parsedJsonSchema) {
      console.log(`[OCR Debug] JSON schema for jobId=${jobId}`);
      console.log(JSON.stringify(parsedJsonSchema, null, 2));
      console.log(`[OCR Debug] Converted TOON schema template for jobId=${jobId}`);
      console.log(toonSchemaTemplate);
    }

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
    pagesToProcess = pageImages;

    const systemSettings = await dbGetSystemSettings();

    // Fetch custom repair model configuration if set
    let repairModelConfig: OcrModel | undefined = undefined;
    if (systemSettings.repairModelId) {
      repairModelConfig = await dbGetOcrModel(systemSettings.repairModelId);
    }

    const pagesResults = await Promise.race([
      pMap(
        pagesToProcess,
        async (p: any): Promise<OcrPageResult | null> => {
          const result = await processOcrPage(
            p,
            jobId,
            job.fileHash,
            ocrModelsList,
            systemSettings.rotationMode ?? "round-robin",
            repairModelConfig,
            toonSchemaTemplate,
            userId,
          );
          if (result) {
            pages.push(result);
            const completedPages = pages.length;
            const progressUpdateInterval = Math.max(1, Math.ceil(pagesToProcess.length / 20));
            if (completedPages === 1 || completedPages === pagesToProcess.length || completedPages % progressUpdateInterval === 0) {
              await dbUpdateJobProgress(jobId, completedPages, pagesToProcess.length);
            }
          }
          return result;
        },
        { concurrency: systemSettings.concurrencyLength },
      ),
      stopSignal.then(({ reason }) => {
        throw new Error(reason || "OCR workflow cancelled by user");
      }),
    ]);

    pages.push(
      ...pagesResults.filter(
        (p): p is OcrPageResult => p !== null && !pages.some((saved) => saved.pageNumber === p.pageNumber),
      ),
    );

    // Sort pages by pageNumber to maintain original order since pMap might process out of order
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    await finalizeJob(jobId, "completed", undefined, pages, pagesToProcess.length);

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
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    await finalizeJob(jobId, "failed", errorMessage, pages, pagesToProcess.length || pages.length);
    throw new FatalError(errorMessage);
  } finally {
    stopSignal.dispose();
  }
}


