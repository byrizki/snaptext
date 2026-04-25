"use client";

interface ErrorViewProps {
  message: string;
  onReset: () => void;
}

export function ErrorView({ message, onReset }: ErrorViewProps) {
  return (
    <div className="w-full max-w-md text-center animate-fade-in">
      <div className="size-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-10 text-red-400"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-red-400 mb-2">Extraction Failed</h3>
      <p className="text-zinc-400 text-sm mb-8 leading-relaxed">{message}</p>
      <button
        onClick={onReset}
        className="h-12 px-8 rounded-2xl bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-100 text-white dark:text-white light:text-zinc-900 font-bold hover:bg-zinc-700 dark:hover:bg-zinc-700 light:hover:bg-zinc-200 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
