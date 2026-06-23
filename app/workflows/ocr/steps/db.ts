/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, jobPages, jobResults, jobs, ocrModels, llmLogs, systemSettings, type OcrModel } from "@/db";
import { OCR_TEXT_MODEL, OCR_VISION_MODEL } from "../models";

export async function dbGetOcrModel(modelId: string): Promise<OcrModel | undefined> {
  "use step";
  const db = getDb();
  return await db.query.ocrModels.findFirst({
    where: eq(ocrModels.id, modelId),
  });
}

export async function dbGetOcrModelsByName(name: string): Promise<OcrModel[]> {
  "use step";
  const db = getDb();
  return await db.query.ocrModels.findMany({
    where: and(eq(ocrModels.name, name), eq(ocrModels.isEnabled, true)),
  });
}

export async function dbGetDefaultActiveModel(): Promise<OcrModel | undefined> {
  "use step";
  const db = getDb();
  return await db.query.ocrModels.findFirst({
    where: eq(ocrModels.isEnabled, true),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });
}

export async function dbGetSystemSettings() {
  "use step";
  const db = getDb();
  const [row] = await db.select().from(systemSettings).limit(1);
  return row ?? { concurrencyLength: 5, rotationMode: "round-robin", repairModelId: null };
}

export async function dbSaveLlmLogsBatch(
  jobId: string,
  logs: Array<{
    stepName: string;
    model: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
    pageNumber?: number;
    rawResponse?: string;
  }>
) {
  "use step";
  if (logs.length === 0) return;
  console.log(`[Step] dbSaveLlmLogsBatch started for jobId: ${jobId}, ${logs.length} logs`);
  const db = getDb();
  
  const pageNumbers = [...new Set(logs.map(l => l.pageNumber).filter(n => n !== undefined))] as number[];
  const pageIdMap = new Map<number, string>();
  
  if (pageNumbers.length > 0) {
    const existingPages = await db.query.jobPages.findMany({
      where: and(eq(jobPages.jobId, jobId), inArray(jobPages.pageNumber, pageNumbers)),
      columns: { id: true, pageNumber: true },
    });
    for (const p of existingPages) {
      pageIdMap.set(p.pageNumber, p.id);
    }
  }

  const values = logs.map(l => ({
    jobId,
    jobPageId: l.pageNumber !== undefined ? pageIdMap.get(l.pageNumber) : undefined,
    stepName: l.stepName,
    model: l.model,
    promptTokens: l.usage.promptTokens,
    completionTokens: l.usage.completionTokens,
    totalTokens: l.usage.totalTokens,
    rawResponse: l.rawResponse,
  }));

  await db.insert(llmLogs).values(values);
  console.log(`[Step] dbSaveLlmLogsBatch completed for jobId: ${jobId}`);
}

export async function initializeJob(jobId: string): Promise<void> {
  "use step";
  try {
    console.log(`[Step] initializeJob started for jobId: ${jobId}`);
    const db = getDb();
    // Only transition to 'running' if not already there (idempotent on replay)
    await db
      .update(jobs)
      .set({ status: "running", updatedAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.status, "pending")));
    console.log(`[Step] initializeJob completed for jobId: ${jobId}`);
  } catch (error) {
    console.error(`🔥 Error in initializeJob step for jobId: ${jobId}`, error);
    throw error;
  }
}

export async function dbGetJob(jobId: string) {
  "use step";
  console.log(`[Step] dbGetJob started for jobId: ${jobId}`);
  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return job;
}

export async function dbGetExistingPages(jobId: string) {
  "use step";
  console.log(`[Step] dbGetExistingPages started for jobId: ${jobId}`);
  const db = getDb();
  const existingPages = await db.query.jobPages.findMany({
    where: eq(jobPages.jobId, jobId),
    orderBy: [asc(jobPages.pageNumber)],
  });
  console.log(`[Step] dbGetExistingPages found ${existingPages.length} existing pages for jobId: ${jobId}`);
  return existingPages;
}

export async function dbFindReusablePages(jobId: string, fileHash: string | null) {
  "use step";
  if (!fileHash) {
    console.log(`[Step] dbFindReusablePages skipped (no fileHash) for jobId: ${jobId}`);
    return [];
  }
  console.log(`[Step] dbFindReusablePages started for jobId: ${jobId}, hash: ${fileHash}`);
  const db = getDb();
  const allSimilarPages = await db
    .select({
      jobId: jobs.id,
      pageNumber: jobPages.pageNumber,
      pageBlobUrl: jobPages.pageBlobUrl,
    })
    .from(jobPages)
    .innerJoin(jobs, eq(jobs.id, jobPages.jobId))
    .where(eq(jobs.fileHash, fileHash))
    .orderBy(asc(jobPages.pageNumber));

  const pagesByJob: Record<string, Array<{ pageNumber: number; pageBlobUrl: string }>> = {};
  for (const p of allSimilarPages) {
    if (p.pageBlobUrl && p.jobId !== jobId) {
      if (!pagesByJob[p.jobId]) pagesByJob[p.jobId] = [];
      pagesByJob[p.jobId].push({ pageNumber: p.pageNumber, pageBlobUrl: p.pageBlobUrl });
    }
  }

  let reusablePages: Array<{ pageNumber: number; pageBlobUrl: string }> = [];
  for (const jId in pagesByJob) {
    if (pagesByJob[jId].length > 0) {
      reusablePages = pagesByJob[jId];
      break;
    }
  }
  console.log(`[Step] dbFindReusablePages found ${reusablePages.length} reusable pages for jobId: ${jobId}`);
  return reusablePages;
}

export async function dbSaveReusablePages(jobId: string, reusablePages: Array<{ pageNumber: number; pageBlobUrl: string }>) {
  "use step";
  console.log(`[Step] dbSaveReusablePages saving ${reusablePages.length} pages for jobId: ${jobId}`);
  const db = getDb();
  
  // Idempotent: clear any existing pages for this job before inserting to prevent duplicates on replay
  await db.delete(jobPages).where(eq(jobPages.jobId, jobId));

  if (reusablePages.length > 0) {
    await db.insert(jobPages).values(
      reusablePages.map((p) => ({
        jobId,
        pageNumber: p.pageNumber,
        pageBlobUrl: p.pageBlobUrl,
        log: `[${new Date().toISOString()}] Page ${p.pageNumber} image reused from existing hash blob`,
      }))
    );
  }
  await db
    .update(jobs)
    .set({ totalPages: reusablePages.length, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
  console.log(`[Step] dbSaveReusablePages completed for jobId: ${jobId}`);
}

export async function dbSaveNewPages(jobId: string, pages: Array<{ pageNumber: number; pageBlobUrl: string }>) {
  "use step";
  console.log(`[Step] dbSaveNewPages saving ${pages.length} newly extracted pages for jobId: ${jobId}`);
  const db = getDb();

  // Idempotent: clear any existing pages for this job before inserting to prevent duplicates on replay
  await db.delete(jobPages).where(eq(jobPages.jobId, jobId));

  if (pages.length > 0) {
    await db.insert(jobPages).values(
      pages.map((p) => ({
        jobId,
        pageNumber: p.pageNumber,
        pageBlobUrl: p.pageBlobUrl,
        log: `[${new Date().toISOString()}] Page ${p.pageNumber} image uploaded to Blob`,
      }))
    );
  }
  await db
    .update(jobs)
    .set({ totalPages: pages.length, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
  console.log(`[Step] dbSaveNewPages completed for jobId: ${jobId}`);
}

export async function dbSaveOcrPageResult(
  jobId: string,
  pageNumber: number,
  result: { rawToon: string; data: any; finishReason: string; log: string; model?: string }
) {
  "use step";
  console.log(`[Step] dbSaveOcrPageResult started for jobId: ${jobId}, page: ${pageNumber}`);
  const db = getDb();
  await db
    .update(jobPages)
    .set({
      toonOutput: result.rawToon,
      parsedData: result.data,
      model: result.model || OCR_VISION_MODEL,
      finishReason: result.finishReason,
      log: result.log,
    })
    .where(and(eq(jobPages.jobId, jobId), eq(jobPages.pageNumber, pageNumber)));
  console.log(`[Step] dbSaveOcrPageResult completed for jobId: ${jobId}, page: ${pageNumber}`);
}


export async function dbSaveJobResult(
  jobId: string,
  mergedData: Record<string, unknown>,
  log: string,
  model?: string
) {
  "use step";
  console.log(`[Step] dbSaveJobResult started for jobId: ${jobId}`);
  const db = getDb();
  await db
    .insert(jobResults)
    .values({
      jobId,
      mergedData,
      model: model || OCR_TEXT_MODEL,
      log,
    })
    .onConflictDoUpdate({
      target: jobResults.jobId,
      set: {
        mergedData,
        model: model || OCR_TEXT_MODEL,
        log,
      },
    });
  console.log(`[Step] dbSaveJobResult completed for jobId: ${jobId}`);
}

export async function finalizeJob(
  jobId: string,
  status: "completed" | "failed",
  error?: string
): Promise<void> {
  "use step";
  try {
    console.log(`[Step] finalizeJob setting status to '${status}' for jobId: ${jobId}`);
    const db = getDb();
    await db
      .update(jobs)
      .set({ status, error: error || null, updatedAt: new Date() })
      .where(eq(jobs.id, jobId));
    console.log(`[Step] finalizeJob completed for jobId: ${jobId}`);
  } catch (error) {
    console.error(`🔥 Error in finalizeJob step for jobId: ${jobId}`, error);
    throw error;
  }
}

export async function dbIsJobCancelled(jobId: string): Promise<boolean> {
  "use step";
  console.log(`[Step] dbIsJobCancelled check for jobId: ${jobId}`);
  const db = getDb();
  const [job] = await db.select({ status: jobs.status }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const isCancelled = job ? (job.status === "failed") : false;
  console.log(`[Step] dbIsJobCancelled check for jobId: ${jobId} resolved to ${isCancelled}`);
  return isCancelled;
}
