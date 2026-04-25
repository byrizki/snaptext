import { del } from "@vercel/blob";
import { getDb, jobs, jobPages } from "../db";
import { inArray } from "drizzle-orm";
import { loadEnvConfig } from "@next/env";

// Load environment variables from .env.local
loadEnvConfig(process.cwd());

async function main() {
  console.log("Starting OCR cleanup script...");

  const db = getDb();

  // 1. Fetch all jobs to get PDF blob URLs
  const allJobs = await db.select({ id: jobs.id, pdfBlobUrl: jobs.pdfBlobUrl }).from(jobs);
  
  if (allJobs.length === 0) {
    console.log("No jobs found to clean up.");
    process.exit(0);
  }

  const jobIds = allJobs.map(j => j.id);
  const pdfBlobUrls = allJobs.map(j => j.pdfBlobUrl).filter(Boolean);

  // 2. Fetch all page blob URLs for these jobs
  const allPages = await db.select({ pageBlobUrl: jobPages.pageBlobUrl })
    .from(jobPages)
    .where(inArray(jobPages.jobId, jobIds));
  
  const pageBlobUrls = allPages.map(p => p.pageBlobUrl).filter((url): url is string => Boolean(url));

  const allBlobUrls = Array.from(new Set([...pdfBlobUrls, ...pageBlobUrls]));

  // 3. Delete from Vercel Blob in chunks
  console.log(`Found ${allJobs.length} jobs and ${allBlobUrls.length} associated blobs to delete.`);
  
  const chunkSize = 100;
  let deletedBlobsCount = 0;
  
  for (let i = 0; i < allBlobUrls.length; i += chunkSize) {
    const chunk = allBlobUrls.slice(i, i + chunkSize);
    try {
      await del(chunk);
      deletedBlobsCount += chunk.length;
      console.log(`Deleted ${deletedBlobsCount}/${allBlobUrls.length} blobs...`);
    } catch (error) {
      console.error("Error deleting blobs:", error);
    }
  }

  // 4. Delete jobs from Database (cascades to job_pages and job_results)
  console.log("Deleting records from database...");
  try {
    await db.delete(jobs).where(inArray(jobs.id, jobIds));
    console.log("Database cleanup complete.");
  } catch (error) {
    console.error("Error deleting from database:", error);
  }

  console.log("Cleanup script finished successfully.");
  process.exit(0);
}

main().catch(error => {
  console.error("Fatal error during cleanup:", error);
  process.exit(1);
});
