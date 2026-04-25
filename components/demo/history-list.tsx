"use client";

import { useEffect, useState } from "react";

export interface HistoryJob {
  id: string;
  filename: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
}

interface HistoryListProps {
  onRerun: (jobId: string, filename: string) => void;
  onView: (jobId: string, filename: string) => void;
  onStop: (jobId: string) => Promise<void>;
}

const ACTIVE_STATUSES = new Set(["pending", "running"]);

export function HistoryList({ onRerun, onView, onStop }: HistoryListProps) {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/demo/ocr/history")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setJobs(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load history:", err);
        setIsLoading(false);
      });
  }, []);

  const handleStop = async (job: HistoryJob) => {
    setStoppingIds((prev) => new Set(prev).add(job.id));
    try {
      await onStop(job.id);
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "failed" } : j)),
      );
    } finally {
      setStoppingIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full mt-12 mb-8 animate-pulse">
        <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-16">
      <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" className="size-5 text-blue-600 dark:text-blue-400" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Recent Scans
      </h3>

      <div className="grid gap-3">
        {jobs.map((job) => {
          const isActive = ACTIVE_STATUSES.has(job.status);
          const isStopping = stoppingIds.has(job.id);

          return (
            <div
              key={job.id}
              className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all shadow-sm hover:shadow group"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {job.filename}
                </span>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`size-1.5 rounded-full ${
                      job.status === "completed" ? "bg-emerald-500" :
                      job.status === "failed" ? "bg-red-500" :
                      "bg-blue-500 animate-pulse"
                    }`} />
                    <span className="capitalize font-medium">{job.status}</span>
                  </span>
                </div>
              </div>

              <div className="ml-4 shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {isActive ? (
                  <>
                    <button
                      onClick={() => onView(job.id, job.filename)}
                      className="h-9 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-600 dark:hover:text-white transition-all flex items-center gap-2"
                      aria-label={`View OCR job for ${job.filename}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button
                      onClick={() => handleStop(job)}
                      disabled={isStopping}
                      className="h-9 px-4 rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 hover:border-red-300 dark:hover:bg-red-500/20 dark:hover:border-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      aria-label={`Stop OCR job for ${job.filename}`}
                    >
                      {isStopping ? (
                        <span className="size-3 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      )}
                      {isStopping ? "Stopping…" : "Stop"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onView(job.id, job.filename)}
                      className="h-9 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-600 dark:hover:text-white transition-all flex items-center gap-2"
                      aria-label={`View OCR results for ${job.filename}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button
                      onClick={() => onRerun(job.id, job.filename)}
                      className="h-9 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-600 dark:hover:text-white transition-all flex items-center gap-2"
                      aria-label={`Rerun OCR for ${job.filename}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Rerun
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
