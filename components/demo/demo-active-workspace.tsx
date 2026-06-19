"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadProgress } from "@/components/demo/upload-progress";
import { ScanningView } from "@/components/demo/scanning-view";
import { ResultsView } from "@/components/demo/results-view";
import { ErrorView } from "@/components/demo/error-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OcrResult, OcrStatus, UploadPhase } from "@/hooks/use-ocr-pipeline";

interface DemoActiveWorkspaceProps {
  status: OcrStatus;
  uploadProgress: number;
  uploadPhase: UploadPhase;
  runId: string | null;
  result: OcrResult | null;
  error: string | null;
  currentFile: File | null;
  onReset: () => void;
  onStop?: () => void;
}

function PdfPane({ pdfUrl, filename }: { pdfUrl?: string; filename: string }) {
  const stableUrlRef = useRef<string | null>(null);
  if (pdfUrl) stableUrlRef.current = pdfUrl;
  const displayUrl = stableUrlRef.current;

  return (
    <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm lg:min-h-0">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
            <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          </div>
          <span className="truncate text-xs font-medium text-muted-foreground">{filename}</span>
        </div>
        <span className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          Document
        </span>
      </div>
      {displayUrl ? (
        <iframe src={`${displayUrl}#toolbar=0`} className="min-h-0 flex-1 bg-background" title="PDF preview" />
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-5">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-3 rounded-full"
              style={{ width: `${[100, 85, 92, 70, 88, 60, 95, 78, 84, 65, 90, 55][index]}%` }}
            />
          ))}
          <Skeleton className="mt-1 h-24 rounded-xl" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={`tail-${index}`}
              className="h-3 rounded-full"
              style={{ width: `${[88, 72, 95, 68, 80][index]}%` }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ResultPane({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex min-h-[560px] flex-col overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:min-h-0">
      {children}
    </section>
  );
}

function StatusContent({
  status,
  uploadProgress,
  uploadPhase,
  runId,
  result,
  error,
  filename,
  onReset,
  onStop,
}: DemoActiveWorkspaceProps & { filename: string }) {
  const transition = { duration: 0.3, ease: "easeInOut" } as const;

  return (
    <ResultPane>
      <AnimatePresence mode="wait">
        {status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={transition}
            className="flex h-full w-full items-center justify-center"
          >
            <UploadProgress progress={uploadProgress} filename={filename} phase={uploadPhase} />
          </motion.div>
        )}
        {status === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={transition}
            className="flex h-full w-full items-center justify-center"
          >
            <ScanningView
              filename={filename}
              runId={runId}
              pagesProcessed={result?.completedPages ?? 0}
              totalPages={result?.totalPages ?? 0}
              onStop={onStop}
            />
          </motion.div>
        )}
        {status === "completed" && result && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={transition}
            className="flex h-full min-h-0 w-full flex-col"
          >
            <ResultsView result={result} onReset={onReset} />
          </motion.div>
        )}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={transition}
            className="flex h-full w-full items-center justify-center"
          >
            <ErrorView message={error ?? "An unexpected error occurred."} onReset={onReset} />
          </motion.div>
        )}
      </AnimatePresence>
    </ResultPane>
  );
}

export function DemoActiveWorkspace({
  status,
  uploadProgress,
  uploadPhase,
  runId,
  result,
  error,
  currentFile,
  onReset,
  onStop,
}: DemoActiveWorkspaceProps) {
  const filename = result?.filename ?? currentFile?.name ?? "document.pdf";
  const [activeMobileTab, setActiveMobileTab] = useState<"result" | "document">("result");
  const resultPane = (
    <StatusContent
      status={status}
      uploadProgress={uploadProgress}
      uploadPhase={uploadPhase}
      runId={runId}
      result={result}
      error={error}
      currentFile={currentFile}
      filename={filename}
      onReset={onReset}
      onStop={onStop}
    />
  );
  const documentPane = <PdfPane pdfUrl={result?.pdfUrl} filename={filename} />;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden p-3 sm:p-4">
      <div className="flex shrink-0 lg:hidden flex-col gap-3 rounded-2xl border bg-card/80 px-4 py-3 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{filename}</p>
          <p className="text-xs text-muted-foreground">Switch between the extraction output and source document.</p>
        </div>
        <Tabs value={activeMobileTab} onValueChange={(value) => setActiveMobileTab(value as "result" | "document")} className="lg:hidden">
          <TabsList className="w-full">
            <TabsTrigger value="result">Result</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="hidden min-h-0 flex-1 gap-4 overflow-hidden lg:grid lg:grid-cols-2">
        {documentPane}
        {resultPane}
      </div>

      <Tabs value={activeMobileTab} onValueChange={(value) => setActiveMobileTab(value as "result" | "document")} className="min-h-0 flex-1 lg:hidden">
        <TabsContent value="result" className="mt-0 min-h-0 overflow-y-auto">
          {resultPane}
        </TabsContent>
        <TabsContent value="document" className="mt-0 min-h-0 overflow-y-auto">
          {documentPane}
        </TabsContent>
      </Tabs>
    </div>
  );
}
