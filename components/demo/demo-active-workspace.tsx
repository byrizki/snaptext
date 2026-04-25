"use client";

import { UploadProgress } from "@/components/demo/upload-progress";
import { ScanningView } from "@/components/demo/scanning-view";
import { ResultsView } from "@/components/demo/results-view";
import { ErrorView } from "@/components/demo/error-view";
import type { OcrStatus, OcrResult } from "@/hooks/use-ocr-pipeline";

interface DemoActiveWorkspaceProps {
  status: OcrStatus;
  uploadProgress: number;
  runId: string | null;
  result: OcrResult | null;
  error: string | null;
  currentFile: File | null;
  onReset: () => void;
  onRerun: () => void;
  onStop: () => void;
}

import { useEffect, useState } from "react";

function PdfPane({ pdfUrl, filename, currentFile }: { pdfUrl?: string; filename: string, currentFile: File | null }) {
  const [localPdfUrl, setLocalPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentFile && currentFile.type === "application/pdf") {
      const url = URL.createObjectURL(currentFile);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setLocalPdfUrl(null);
  }, [currentFile]);

  const displayUrl = pdfUrl || localPdfUrl;
  return (
    <div className="h-full flex flex-col rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium truncate ml-1">
          {filename}
        </span>
      </div>
      {displayUrl ? (
        <iframe
          src={displayUrl}
          className="flex-1 w-full bg-white"
          title="PDF Preview"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-300 dark:text-zinc-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-14"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm font-medium text-zinc-400 dark:text-zinc-600 animate-pulse">
            Preparing preview…
          </p>
        </div>
      )}
    </div>
  );
}

function ResultPane({
  children,
  isCompleted,
}: {
  children: React.ReactNode;
  isCompleted: boolean;
}) {
  return (
    <div className="relative group h-full flex flex-col">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-emerald-500 blur-sm opacity-15 dark:opacity-20 group-hover:opacity-25 transition-opacity duration-700" />
      <div
        className={`relative h-full rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 ${
          isCompleted ? "p-5 justify-start" : "p-8 items-center justify-center"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function DemoActiveWorkspace({
  status,
  uploadProgress,
  runId,
  result,
  error,
  currentFile,
  onReset,
  onRerun,
  onStop,
}: DemoActiveWorkspaceProps) {
  const filename = currentFile?.name ?? "document.pdf";
  const isCompleted = status === "completed";

  return (
    <div className="flex-1 flex flex-col px-4 md:px-6 py-4">
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1"
        style={{ minHeight: "calc(100vh - 100px)" }}
      >
        <div className="lg:sticky lg:top-24 h-[calc(100vh-116px)]">
          <PdfPane pdfUrl={result?.pdfUrl} filename={filename} currentFile={currentFile} />
        </div>

        <div className="h-[calc(100vh-116px)]">
          <ResultPane isCompleted={isCompleted}>
            {status === "uploading" && (
              <UploadProgress progress={uploadProgress} filename={filename} />
            )}
            {status === "scanning" && (
              <ScanningView
                filename={filename}
                runId={runId}
                pagesProcessed={result?.pages?.length ?? 0}
                totalPages={result?.totalPages ?? 0}
                onStop={onStop}
              />
            )}
            {status === "completed" && result && (
              <ResultsView result={result} onReset={onReset} onRerun={onRerun} />
            )}
            {status === "error" && (
              <ErrorView
                message={error ?? "An unexpected error occurred."}
                onReset={onReset}
              />
            )}
          </ResultPane>
        </div>
      </div>
    </div>
  );
}
