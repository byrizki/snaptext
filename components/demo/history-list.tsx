"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, ViewIcon, StopIcon, RefreshIcon } from "@hugeicons/core-free-icons";

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

const STATUS_CONFIG = {
  completed: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Completed" },
  failed: { dot: "bg-red-500", text: "text-red-500 dark:text-red-400", label: "Failed" },
  running: { dot: "bg-blue-500 animate-pulse", text: "text-blue-600 dark:text-blue-400", label: "Running" },
  pending: { dot: "bg-amber-400 animate-pulse", text: "text-amber-600 dark:text-amber-400", label: "Pending" },
};

function JobRow({
  job,
  onView,
  onRerun,
  onStop,
}: {
  job: HistoryJob;
  onView: (id: string, name: string) => void;
  onRerun: (id: string, name: string) => void;
  onStop: (job: HistoryJob) => Promise<void>;
}) {
  const [isStopping, setIsStopping] = useState(false);
  const isActive = ACTIVE_STATUSES.has(job.status);
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.failed;

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await onStop(job);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 size-2 rounded-full ${cfg.dot}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{job.filename}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <span className={`text-xs font-semibold hidden sm:inline ${cfg.text}`}>{cfg.label}</span>
        <button
          onClick={() => onView(job.id, job.filename)}
          className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all"
          aria-label={`View ${job.filename}`}
        >
          <HugeiconsIcon icon={ViewIcon} size={14} />
        </button>
        {isActive ? (
          <button
            onClick={handleStop}
            disabled={isStopping}
            className="h-8 w-8 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label={`Stop ${job.filename}`}
          >
            {isStopping ? (
              <span className="size-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
            ) : (
              <HugeiconsIcon icon={StopIcon} size={14} />
            )}
          </button>
        ) : (
          <button
            onClick={() => onRerun(job.id, job.filename)}
            className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:text-blue-700 dark:hover:text-blue-300 transition-all"
            aria-label={`Rerun ${job.filename}`}
          >
            <HugeiconsIcon icon={RefreshIcon} size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function HistoryList({ onRerun, onView, onStop }: HistoryListProps) {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/demo/ocr/history")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setJobs(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load history:", err);
        setIsLoading(false);
      });
  }, []);

  const handleStop = async (job: HistoryJob) => {
    await onStop(job.id);
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: "failed" } : j))
    );
  };

  if (isLoading) {
    return (
      <div className="w-full animate-pulse space-y-3">
        <div className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-4">
        <HugeiconsIcon icon={Clock01Icon} size={14} className="text-blue-500" />
        Recent Scans
      </h3>
      <div className="grid gap-2">
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            onView={onView}
            onRerun={onRerun}
            onStop={handleStop}
          />
        ))}
      </div>
    </div>
  );
}
