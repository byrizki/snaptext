"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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

  const hasPageProgress = totalPages > 0 && pagesProcessed > 0;
  const progressPercent = hasPageProgress
    ? Math.round((pagesProcessed / totalPages) * 100)
    : null;

  return (
    <div className="relative flex flex-col w-full items-center gap-8">
      <div className="relative w-56 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
        <div className="p-5 space-y-3 relative z-10">
          <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1 }} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <motion.div initial={{ width: "0%" }} animate={{ width: "75%" }} transition={{ duration: 1.2 }} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 0.8 }} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <motion.div initial={{ width: "0%" }} animate={{ width: "50%" }} transition={{ duration: 1.5 }} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="w-full h-16 bg-zinc-50 dark:bg-zinc-900 rounded-xl" />
          <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.1 }} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <motion.div initial={{ width: "0%" }} animate={{ width: "66%" }} transition={{ duration: 0.9 }} className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
        </div>
        {/* Sophisticated Framer Motion Laser */}
        <motion.div 
          animate={{ y: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
          className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.9)] z-20"
        />
        <motion.div 
          animate={{ y: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
          className="absolute left-0 right-0 top-0 h-32 bg-gradient-to-b from-blue-500/0 via-blue-500/10 to-blue-500/30 z-0 pointer-events-none"
          style={{ transform: "translateY(-100%)" }}
        />
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Extracting data…</h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate max-w-xs">{filename}</p>
        {runId && (
          <p className="text-zinc-300 dark:text-zinc-600 text-xs font-mono">Run: {runId}</p>
        )}
      </div>

      <div className="w-full max-w-xs rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] p-3 text-center">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          Scan is running
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Page writes are batched at finalization, so detailed counts may appear near the end.
        </p>
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
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{totalPages > 0 ? `Preparing ${totalPages} pages` : "Preparing pages"}</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Working…</span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <motion.div
              className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
              animate={{ x: ["-120%", "220%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
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
