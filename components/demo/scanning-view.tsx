"use client";

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
  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="relative w-56 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl mb-8">
        <div className="p-5 space-y-3">
          <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="w-3/4 h-3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="w-1/2 h-3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="w-full h-16 bg-zinc-100 dark:bg-zinc-900 rounded-lg" />
          <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="w-2/3 h-3 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-scan-laser" />
      </div>

      <h3 className="text-2xl font-bold mb-2 animate-pulse text-zinc-900 dark:text-white">
        Extracting data...
      </h3>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-1 truncate max-w-xs">{filename}</p>
      {runId && (
        <p className="text-zinc-400 dark:text-zinc-600 text-xs font-mono">Run: {runId}</p>
      )}

      <div className="mt-6 flex gap-2 items-center text-zinc-500 text-sm">
        <div className="flex flex-col gap-1 items-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-blue-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span>
            {totalPages > 0
              ? `Analyzing page ${pagesProcessed} of ${totalPages}...`
              : "Analyzing the document"}
          </span>
        </div>
      </div>

      {onStop && runId && (
        <button
          onClick={onStop}
          className="mt-8 h-9 px-5 rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 hover:border-red-300 dark:hover:bg-red-500/20 dark:hover:border-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          aria-label="Stop current OCR job"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          Stop Job
        </button>
      )}
    </div>
  );
}
