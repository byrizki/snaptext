/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, eq } from "drizzle-orm";
import { getDb, jobPages, jobResults, jobs, ocrModels, type OcrModel } from "@/db";
import { OCR_TEXT_MODEL, OCR_VISION_MODEL } from "../models";

export async function dbGetOcrModel(modelId: string): Promise<OcrModel | undefined> {
  "use step";
  const db = getDb();
  return await db.query.ocrModels.findFirst({
    where: eq(ocrModels.id, modelId),
  });
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
  result: { rawToon: string; data: any; usage: any; finishReason: string; log: string }
) {
  "use step";
  console.log(`[Step] dbSaveOcrPageResult started for jobId: ${jobId}, page: ${pageNumber}`);
  const db = getDb();
  await db
    .update(jobPages)
    .set({
      toonOutput: result.rawToon,
      parsedData: result.data,
      model: OCR_VISION_MODEL,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      finishReason: result.finishReason,
      log: result.log,
    })
    .where(and(eq(jobPages.jobId, jobId), eq(jobPages.pageNumber, pageNumber)));
  console.log(`[Step] dbSaveOcrPageResult completed for jobId: ${jobId}, page: ${pageNumber}`);
}

export async function dbSaveRepairPageResult(
  jobId: string,
  pageNumber: number,
  result: { data: any; usage: any; finishReason: string; log: string }
) {
  "use step";
  console.log(`[Step] dbSaveRepairPageResult started for jobId: ${jobId}, page: ${pageNumber}`);
  const db = getDb();
  const existingPage = await db.query.jobPages.findFirst({
    where: and(eq(jobPages.jobId, jobId), eq(jobPages.pageNumber, pageNumber)),
  });

  const prevLog = existingPage?.log ? existingPage.log + "\n" : "";

  await db
    .update(jobPages)
    .set({
      parsedData: result.data,
      secondModelInput: (existingPage?.secondModelInput ?? 0) + result.usage.promptTokens,
      secondModelOutput: (existingPage?.secondModelOutput ?? 0) + result.usage.completionTokens,
      log: prevLog + result.log,
    })
    .where(and(eq(jobPages.jobId, jobId), eq(jobPages.pageNumber, pageNumber)));
  console.log(`[Step] dbSaveRepairPageResult completed for jobId: ${jobId}, page: ${pageNumber}`);
}

export async function dbSaveJobResult(
  jobId: string,
  mergedData: Record<string, unknown>,
  log: string,
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number; finishReason: string; rawResponse: string }
) {
  "use step";
  console.log(`[Step] dbSaveJobResult started for jobId: ${jobId}`);
  const db = getDb();
  // Upsert: safe to replay — overwrites the result if it already exists.
  await db
    .insert(jobResults)
    .values({
      jobId,
      mergedData,
      model: OCR_TEXT_MODEL,
      secondModelInput: usage?.promptTokens ?? 0,
      secondModelOutput: usage?.completionTokens ?? 0,
      finishReason: usage?.finishReason ?? "",
      rawResponse: usage?.rawResponse ?? "",
      log,
    })
    .onConflictDoUpdate({
      target: jobResults.jobId,
      set: {
        mergedData,
        model: OCR_TEXT_MODEL,
        secondModelInput: usage?.promptTokens ?? 0,
        secondModelOutput: usage?.completionTokens ?? 0,
        finishReason: usage?.finishReason ?? "",
        rawResponse: usage?.rawResponse ?? "",
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
