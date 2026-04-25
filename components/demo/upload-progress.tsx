"use client";

interface UploadProgressProps {
  progress: number;
  filename: string;
}

export function UploadProgress({ progress, filename }: UploadProgressProps) {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="relative size-20 mx-auto mb-7">
        <svg className="size-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" className="stroke-zinc-100 dark:stroke-zinc-800" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
            className="stroke-blue-500 transition-all duration-300"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
          {progress}%
        </span>
      </div>

      <h3 className="text-xl font-bold mb-1 text-zinc-900 dark:text-white">Uploading…</h3>
      <p className="text-zinc-400 dark:text-zinc-500 text-sm truncate max-w-xs mx-auto">{filename}</p>

      <div className="mt-6 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
