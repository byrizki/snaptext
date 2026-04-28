"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface ScanJob {
  id: string;
  filename: string;
  fileSize: number;
  status: "pending" | "running" | "completed" | "failed";
  totalPages: number | null;
  pdfBlobUrl: string;
  ocrModelId: string | null;
  modelName: string | null;
  createdAt: string;
}

interface ScanJobsResponse {
  jobs: ScanJob[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_CONFIG = {
  completed: { label: "Done", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  running: { label: "Running", class: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  pending: { label: "Pending", class: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  failed: { label: "Failed", class: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ScanHistory() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [isRerunning, setIsRerunning] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState<string | null>(null);
  const { data, isLoading, mutate } = useSWR<ScanJobsResponse>(`/api/dashboard/jobs?page=${page}&limit=10`, fetcher);

  const handleRerun = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    try {
      setIsRerunning(jobId);
      const res = await fetch(`/api/ocr/${jobId}/rerun`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to rerun");
      const responseData = await res.json();
      const newJobId = responseData.jobId || responseData.runId || jobId;
      router.push(`/dashboard/scan/${newJobId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to rerun job");
    } finally {
      setIsRerunning(null);
    }
  };

  const handleStop = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    try {
      setIsStopping(jobId);
      const res = await fetch(`/api/ocr/${jobId}/stop`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to stop");
      await mutate();
    } catch (err) {
      console.error(err);
      alert("Failed to stop job");
    } finally {
      setIsStopping(null);
    }
  };

  const jobs = data?.jobs ?? [];
  const pagination = data?.pagination;

  return (
    <div className="rounded-[1.75rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg overflow-hidden">
      <div className="p-8 pb-0">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recent Scans</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          {pagination ? `Showing ${(page - 1) * 10 + 1} to ${Math.min(page * 10, pagination.total)} of ${pagination.total} documents` : "Your last documents"}
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse w-3/4" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !jobs?.length ? (
        <div className="p-16 flex flex-col items-center gap-3 text-center">
          <div className="size-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-7 text-zinc-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No scans yet</p>
          <Link
            href="/dashboard/scan"
            className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            Start your first scan →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 mt-4">
          {jobs.map((job, i) => {
            const status = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  if (job.status !== "failed") {
                    router.push(`/dashboard/scan/${job.id}`);
                  }
                }}
                className={`group flex items-center gap-4 px-8 py-4 transition-all ${
                  job.status !== "failed" 
                    ? "cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 active:scale-[0.99]" 
                    : "opacity-80"
                }`}
              >
                <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 text-zinc-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                    {job.filename}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatBytes(job.fileSize)}
                    {job.totalPages ? ` · ${job.totalPages} pages` : ""}
                    {job.modelName ? ` · ${job.modelName}` : ""}
                    {" · "}
                    {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </p>
                </div>

                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.class}`}>
                  {status.label}
                </span>

                {job.status === "failed" && (
                  <button
                    onClick={(e) => handleRerun(e, job.id)}
                    disabled={isRerunning === job.id}
                    className="size-8 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Rerun Scan"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`size-4 ${isRerunning === job.id ? 'animate-spin' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}

                {(job.status === "running" || job.status === "pending") && (
                  <button
                    onClick={(e) => handleStop(e, job.id)}
                    disabled={isStopping === job.id}
                    className="size-8 rounded-full flex items-center justify-center border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Stop Scan"
                  >
                    {isStopping === job.id ? (
                      <span className="size-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    )}
                  </button>
                )}

                {job.status !== "failed" && (
                  <div className="size-8 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/10 dark:group-hover:text-blue-400 transition-colors shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }).map((_, i) => {
              const p = i + 1;
              const isCurrent = p === page;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`size-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
