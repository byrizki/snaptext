"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon, Upload03Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  quota?: { limit: number; used: number; remaining: number; isAnonymous: boolean } | null;
  isLoadingQuota?: boolean;
}

export function UploadZone({ onFileSelect, quota, isLoadingQuota }: UploadZoneProps) {
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
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group/upload relative w-full cursor-pointer overflow-hidden rounded-[1.75rem] border border-dashed p-4 transition-all duration-300 focus-within:ring-[3px] focus-within:ring-ring/50",
        isDragging ? "border-primary bg-primary/10 shadow-[0_0_48px_rgba(59,130,246,0.14)]" : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
      aria-label="Upload document file"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
        id="document-file-input"
      />

      <div className="relative flex min-h-[22rem] flex-col items-center justify-center rounded-[1.35rem] bg-card/55 px-5 py-12 text-center sm:px-8">
        {isLoadingQuota ? (
          <Skeleton className="absolute top-5 h-8 w-52 rounded-full" />
        ) : quota ? (
          <div className="absolute top-5 max-w-[calc(100%-2rem)] rounded-full border bg-background/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
            {quota.limit > 1000000 ? (
              <span className="text-primary">Unlimited scans available</span>
            ) : (
              <span>
                <span className={quota.remaining > 0 ? "text-primary" : "text-destructive"}>{quota.remaining}</span> / {quota.limit} scans left today
                {quota.isAnonymous && (
                  <Link href="/signup" className="ml-1.5 text-primary hover:underline">
                    Get more
                  </Link>
                )}
              </span>
            )}
          </div>
        ) : null}

        <div className="relative mb-6 mt-8">
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 rounded-full bg-primary/40 blur-2xl"
              />
            )}
          </AnimatePresence>
          <div
            className={cn(
              "relative flex size-20 items-center justify-center rounded-3xl border bg-background text-muted-foreground shadow-sm transition-all duration-300",
              isDragging ? "rotate-3 scale-105 border-primary bg-primary text-primary-foreground" : "group-hover/upload:-translate-y-1 group-hover/upload:border-primary/30 group-hover/upload:text-primary"
            )}
          >
            <HugeiconsIcon icon={isDragging ? Upload03Icon : File01Icon} size={36} />
          </div>
        </div>

        <h3 className="mb-2 text-balance text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {isDragging ? "Drop to scan" : "Drop a document here"}
        </h3>
        <p className="mb-8 max-w-sm text-sm leading-6 text-muted-foreground">
          Upload a PDF or image up to 20MB. SnapText extracts text and structured fields from the file.
        </p>
        <Button type="button" size="lg" className="h-12 px-7">
          <HugeiconsIcon icon={Upload03Icon} size={18} />
          Browse files
        </Button>
      </div>
    </div>
  );
}
