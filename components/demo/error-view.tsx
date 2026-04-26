"use client";

interface ErrorViewProps {
  message: string;
  onReset: () => void;
}

export function ErrorView({ message, onReset }: ErrorViewProps) {
  return (
    <div className="w-full flex flex-col items-center max-w-sm text-center">
      <div className="size-18 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center mx-auto mb-6">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-9 text-red-400 dark:text-red-400"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Extraction Failed</h3>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 leading-relaxed">{message}</p>
      <button
        onClick={onReset}
        className="h-11 px-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold hover:opacity-85 transition-opacity shadow-sm"
      >
        Try Again
      </button>
    </div>
  );
}
