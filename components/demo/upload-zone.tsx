"use client";

import { useCallback, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon } from "@hugeicons/core-free-icons";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`w-full border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group/upload ${
        isDragging
          ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 scale-[1.01]"
          : "border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-blue-500/[0.02] dark:hover:bg-blue-500/[0.04]"
      }`}
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
      <div
        className={`size-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 ${
          isDragging
            ? "bg-blue-100 dark:bg-blue-500/20 scale-110"
            : "bg-zinc-100 dark:bg-zinc-800/80 group-hover/upload:bg-blue-100 dark:group-hover/upload:bg-blue-500/20 group-hover/upload:scale-105"
        }`}
      >
        <HugeiconsIcon
          icon={CloudUploadIcon}
          size={28}
          className={`transition-colors ${
            isDragging
              ? "text-blue-600 dark:text-blue-400"
              : "text-zinc-400 group-hover/upload:text-blue-500 dark:group-hover/upload:text-blue-400"
          }`}
        />
      </div>
      <p className="text-base font-bold text-zinc-700 dark:text-zinc-200 mb-1">
        {isDragging ? "Release to upload" : "Drop your PDF here"}
      </p>
      <p className="text-zinc-400 text-sm mb-6">or click to browse · PDF, max 20 MB</p>
      <button
        type="button"
        className="h-10 px-7 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:opacity-85 transition-opacity shadow-sm"
      >
        Select File
      </button>
    </div>
  );
}
