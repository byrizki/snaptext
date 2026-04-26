import { FatalError, getWorkflowMetadata } from "workflow";
import { stopHook } from "../ocr/hooks";
import { initializeJob, finalizeJob } from "../ocr/steps/db";
import { extractPdfPageImages, dbGetExistingPages, dbFindReusablePages, dbSaveReusablePages, dbSaveNewPages, dbGetJob } from "../ocr/steps";
import { runSchemaGenerationAgent } from "./steps/ai";
import type { SchemaGenWorkflowResult } from "./types";

export async function schemaGenWorkflow(
  jobId: string,
  pdfUrl: string,
): Promise<SchemaGenWorkflowResult> {
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

    let pageImages = await dbGetExistingPages(jobId);

    if (pageImages.length === 0 || !pageImages.every(p => p.pageBlobUrl)) {
      const reusablePages = await dbFindReusablePages(jobId, job.fileHash);
      if (reusablePages.length > 0) {
        await dbSaveReusablePages(jobId, reusablePages);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pageImages = reusablePages as any;
      } else {
        const extracted = await extractPdfPageImages(pdfUrl, jobId, job.fileHash);
        await dbSaveNewPages(jobId, extracted);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pageImages = extracted as any;
      }
    }

    if (stopState.current) throw new FatalError("Workflow stopped by user");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = await runSchemaGenerationAgent(jobId, pageImages as any, job.fileHash);

    await finalizeJob(jobId, "completed");

    return {
      jobId,
      runId: workflowRunId,
      pdfUrl,
      schema,
    };
  } catch (err) {
    await finalizeJob(jobId, "failed");
    throw new FatalError(
      err instanceof Error ? err.message : "Schema Gen workflow failed unexpectedly"
    );
  }
}
