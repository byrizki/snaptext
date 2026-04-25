"use client";

interface UploadProgressProps {
  progress: number;
  filename: string;
}

export function UploadProgress({ progress, filename }: UploadProgressProps) {
  return (
    <div className="w-full max-w-md text-center">
      <div className="size-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-8 animate-pulse">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-10 text-blue-500"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold mb-1">Uploading Document...</h3>
      <p className="text-zinc-500 text-sm mb-6 truncate max-w-xs mx-auto">{filename}</p>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-zinc-500 text-xs mt-3">{progress}%</p>
    </div>
  );
}
