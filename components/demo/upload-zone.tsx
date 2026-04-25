"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon, Upload03Icon } from "@hugeicons/core-free-icons";

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
      className={`relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group/upload`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      aria-label="Upload PDF file"
    >
      {/* Animated Dash Border using SVG for precise control */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <rect
          width="100%"
          height="100%"
          rx="16"
          fill="none"
          stroke={isDragging ? "#3b82f6" : "currentColor"}
          strokeWidth="2"
          strokeDasharray="8 8"
          className={`transition-colors duration-300 ${
            isDragging 
              ? "text-blue-500 animate-[spin_4s_linear_infinite]" 
              : "text-zinc-300 dark:text-zinc-700 group-hover/upload:text-blue-400/50"
          }`}
          style={{ strokeDashoffset: isDragging ? 100 : 0, transition: 'stroke-dashoffset 2s linear' }}
        />
      </svg>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        id="pdf-file-input"
      />

      <div
        className={`relative z-10 w-full p-12 md:p-16 flex flex-col items-center justify-center transition-all duration-300 ${
          isDragging
            ? "bg-blue-500/5 dark:bg-blue-500/10 scale-[0.98]"
            : "bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        }`}
      >
        <div className="relative mb-6">
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 rounded-full bg-blue-500 blur-2xl opacity-20 dark:opacity-40"
              />
            )}
          </AnimatePresence>
          <div
            className={`relative size-20 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border ${
              isDragging
                ? "bg-blue-500 border-blue-400 text-white shadow-blue-500/25 scale-110 rotate-3"
                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 group-hover/upload:border-blue-200 dark:group-hover/upload:border-blue-900/50 group-hover/upload:-translate-y-1 group-hover/upload:shadow-lg"
            }`}
          >
            <HugeiconsIcon
              icon={isDragging ? Upload03Icon : File01Icon}
              size={36}
              className={`transition-colors duration-300 ${
                isDragging ? "text-white" : "group-hover/upload:text-blue-500 dark:group-hover/upload:text-blue-400"
              }`}
            />
          </div>
        </div>

        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-2 tracking-tight">
          {isDragging ? "Drop document to scan" : "Click or drag document here"}
        </h3>
        
        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm text-center mb-8">
          Upload any PDF up to 20MB. Our AI will analyze the content instantly and securely.
        </p>

        <button
          type="button"
          className="relative overflow-hidden group/btn h-12 px-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
        >
          <span className="relative z-10 flex items-center gap-2">
            <HugeiconsIcon icon={Upload03Icon} size={18} />
            Browse Files
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          {/* Re-render text on top of gradient */}
          <span className="absolute inset-0 flex items-center justify-center gap-2 text-white opacity-0 group-hover/btn:opacity-100 z-20">
            <HugeiconsIcon icon={Upload03Icon} size={18} />
            Browse Files
          </span>
        </button>
      </div>
    </div>
  );
}
