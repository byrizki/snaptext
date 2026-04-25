"use client";

import { useCallback, useRef } from "react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => inputRef.current?.click()}
      className="w-full max-w-md border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/[0.02] dark:hover:bg-blue-500/[0.05] transition-all group/upload"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      aria-label="Upload PDF file"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        id="pdf-file-input"
      />
      <div className="size-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mb-6 group-hover/upload:scale-110 group-hover/upload:bg-blue-100 dark:group-hover/upload:bg-blue-500/20 transition-all duration-300 shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-8 text-zinc-400 group-hover/upload:text-blue-600 dark:group-hover/upload:text-blue-400 transition-colors"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <p className="text-lg font-bold text-zinc-700 dark:text-zinc-200 mb-2">Drop your PDF here</p>
      <p className="text-zinc-500 text-sm mb-8 font-medium">PDF (Max 20MB)</p>
      <button
        type="button"
        className="h-11 px-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shadow-sm"
      >
        Select File
      </button>
    </div>
  );
}
