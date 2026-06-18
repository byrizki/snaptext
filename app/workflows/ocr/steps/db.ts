/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlobNotFoundError, head } from "@vercel/blob";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, jobPages, jobResults, jobs, ocrModels, llmLogs, systemSettings, type OcrModel } from "@/db";
import { OCR_TEXT_MODEL, OCR_VISION_MODEL } from "../models";

export async function dbGetOcrModel(modelId: string): Promise<OcrModel | undefined> {
  "use step";
  const db = getDb();
  return await db.query.ocrModels.findFirst({
    where: eq(ocrModels.id, modelId),
  });
}

export async function dbGetSystemSettings() {
  "use step";
  const db = getDb();
  const [row] = await db.select().from(systemSettings).limit(1);
  return row ?? { concurrencyLength: 5 };
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

  const staleUrls = await findStalePageBlobUrls(
    existingPages
      .map((page) => page.pageBlobUrl)
      .filter((url): url is string => Boolean(url)),
  );

  if (staleUrls.length > 0) {
    await db
      .update(jobPages)
      .set({ pageBlobUrl: null })
      .where(inArray(jobPages.pageBlobUrl, staleUrls));
    console.log(
      `[Step] dbGetExistingPages ignored ${existingPages.length} pages for jobId: ${jobId}; ${staleUrls.length} blob URLs are stale`,
    );
    return [];
  }

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
      totalPages: jobs.totalPages,
    })
    .from(jobPages)
    .innerJoin(jobs, eq(jobs.id, jobPages.jobId))
    .where(and(eq(jobs.fileHash, fileHash), isNotNull(jobs.pdfBlobUrl), isNotNull(jobPages.pageBlobUrl)))
    .orderBy(asc(jobPages.createdAt), asc(jobPages.pageNumber));

  const pagesByJob: Record<string, Array<{ pageNumber: number; pageBlobUrl: string }>> = {};
  const expectedPageCountByJob: Record<string, number | null> = {};
  for (const p of allSimilarPages) {
    if (p.pageBlobUrl && p.jobId !== jobId) {
      if (!pagesByJob[p.jobId]) pagesByJob[p.jobId] = [];
      pagesByJob[p.jobId].push({ pageNumber: p.pageNumber, pageBlobUrl: p.pageBlobUrl });
      expectedPageCountByJob[p.jobId] = p.totalPages;
    }
  }

  let reusablePages: Array<{ pageNumber: number; pageBlobUrl: string }> = [];
  for (const jId in pagesByJob) {
    const pages = pagesByJob[jId].sort((a, b) => a.pageNumber - b.pageNumber);
    const expectedPageCount = expectedPageCountByJob[jId];
    const hasCompletePageSet =
      expectedPageCount !== null &&
      pages.length === expectedPageCount &&
      pages.every((page, index) => page.pageNumber === index + 1);

    if (!hasCompletePageSet) continue;

    const staleUrls = await findStalePageBlobUrls(pages.map((page) => page.pageBlobUrl));
    if (staleUrls.length > 0) {
      await db
        .update(jobPages)
        .set({ pageBlobUrl: null })
        .where(inArray(jobPages.pageBlobUrl, staleUrls));
      console.log(
        `[Step] dbFindReusablePages skipped reusable pages from jobId: ${jId}; ${staleUrls.length} blob URLs are stale`,
      );
      continue;
    }

    reusablePages = pages;
    break;
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

async function findStalePageBlobUrls(urls: string[]): Promise<string[]> {
  const uniqueUrls = Array.from(new Set(urls));
  const staleUrls: string[] = [];

  await Promise.all(
    uniqueUrls.map(async (url) => {
      try {
        await head(url);
      } catch (error) {
        if (error instanceof BlobNotFoundError) {
          staleUrls.push(url);
          return;
        }

        console.error(`[Step] Failed to verify page blob URL ${url}`, error);
        staleUrls.push(url);
      }
    }),
  );

  return staleUrls;
}
