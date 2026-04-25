"use client";

import { useState } from "react";

interface ScanningViewProps {
  filename: string;
  runId: string | null;
  pagesProcessed?: number;
  totalPages?: number;
  onStop?: () => void;
}

export function ScanningView({
  filename,
  runId,
  pagesProcessed = 0,
  totalPages = 0,
  onStop,
}: ScanningViewProps) {
  const [isStopping, setIsStopping] = useState(false);

  const handleStop = async () => {
    if (!onStop) return;
    setIsStopping(true);
    try {
      await onStop();
    } finally {
      setIsStopping(false);
    }
  };

  const progressPercent =
    totalPages > 0 ? Math.round((pagesProcessed / totalPages) * 100) : null;

  return (
    <div className="relative w-full flex flex-col items-center gap-6">
      <div className="relative w-48 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-lg">
        <div className="p-4 space-y-2.5">
          <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <div className="w-3/4 h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <div className="w-1/2 h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <div className="w-full h-12 bg-zinc-50 dark:bg-zinc-900 rounded-lg" />
          <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <div className="w-2/3 h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
        </div>
        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_18px_rgba(59,130,246,0.9)] animate-scan-laser" />
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Extracting data…</h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate max-w-xs">{filename}</p>
        {runId && (
          <p className="text-zinc-300 dark:text-zinc-600 text-xs font-mono">Run: {runId}</p>
        )}
      </div>

      {progressPercent !== null ? (
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Page {pagesProcessed} of {totalPages}
            </span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-blue-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}

      {onStop && runId && (
        <button
          onClick={handleStop}
          disabled={isStopping}
          className="h-9 px-5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 min-w-[120px]"
          aria-label="Stop current OCR job"
        >
          {isStopping ? (
            <svg
              className="animate-spin size-3"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          )}
          {isStopping ? "Stopping..." : "Stop Job"}
        </button>
      )}

    </div>
  );
}
