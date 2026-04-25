"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BackgroundGrid } from "@/components/landing/background-grid";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { ErrorView } from "@/components/demo/error-view";
import { ResultsView } from "@/components/demo/results-view";
import { ScanningView } from "@/components/demo/scanning-view";
import { UploadProgress } from "@/components/demo/upload-progress";
import { UploadZone } from "@/components/demo/upload-zone";
import { HistoryList } from "@/components/demo/history-list";
import { useOcrPipeline } from "@/hooks/use-ocr-pipeline";

export default function DemoPage() {
  const {
    status,
    uploadProgress,
    runId,
    result,
    error,
    currentFile,
    startOcr,
    rerunOcr,
    viewJob,
    stopJob,
    reset,
  } = useOcrPipeline();

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-background text-foreground selection:bg-blue-500/30 transition-colors flex flex-col">
      <BackgroundGrid />
      <Header />

      <main className={`relative z-10 flex-1 flex flex-col pt-32 pb-20 px-6 mx-auto transition-all duration-700 w-full ${
        status !== "idle" ? "max-w-[1600px]" : "max-w-4xl"
      }`}>
        
        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div
              key="hero-header"
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0, margin: 0, overflow: "hidden" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 animate-gradient-x drop-shadow-sm">
                  Experience the Magic.
                </span>
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-lg font-medium">
                Upload a PDF to see SnapText extract structured data in real-time.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {status !== "idle" && (
            <motion.div 
              key="app-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full flex-1"
            >
              {/* Left Pane: PDF Preview or Placeholder */}
              <div
                className="rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/60 backdrop-blur-xl overflow-hidden shadow-xl dark:shadow-2xl h-[80vh] sticky top-32 flex flex-col items-center justify-center"
              >
                {(status === "scanning" || status === "completed") && result?.pdfUrl ? (
                  <iframe
                    src={`${result.pdfUrl}`}
                    className="w-full h-full bg-white dark:bg-zinc-100"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500">
                    <svg viewBox="0 0 24 24" fill="none" className="size-20 mb-6 opacity-30" stroke="currentColor" strokeWidth="1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium animate-pulse">Preparing Document Preview...</p>
                  </div>
                )}
              </div>

              {/* Right Pane: Action/Result Pane */}
              <div className="relative group w-full h-[80vh] flex flex-col">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 rounded-[2.5rem] blur opacity-15 dark:opacity-25 group-hover:opacity-30 dark:group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className={`relative rounded-[2.5rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-8 md:p-12 shadow-xl dark:shadow-2xl overflow-hidden flex-1 flex flex-col transition-all duration-500 ${
                  status === "completed" ? "justify-start" : "items-center justify-center"
                }`}>
                  {status === "uploading" && (
                    <UploadProgress
                      progress={uploadProgress}
                      filename={currentFile?.name ?? "document.pdf"}
                    />
                  )}

                  {status === "scanning" && (
                    <ScanningView
                      filename={currentFile?.name ?? "document.pdf"}
                      runId={runId}
                      pagesProcessed={result?.pages?.length ?? 0}
                      totalPages={result?.totalPages ?? 0}
                      onStop={runId ? () => stopJob(runId) : undefined}
                    />
                  )}

                  {status === "completed" && result && (
                    <ResultsView 
                      result={result} 
                      onReset={reset} 
                      onRerun={() => rerunOcr(result.runId, currentFile?.name ?? "document.pdf")}
                    />
                  )}

                  {status === "error" && (
                    <ErrorView
                      message={error ?? "An unexpected error occurred."}
                      onReset={reset}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div 
              key="idle-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center max-w-3xl mx-auto space-y-12 w-full"
            >
              <div className="relative group w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 rounded-[2.5rem] blur opacity-15 dark:opacity-25 group-hover:opacity-30 dark:group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative rounded-[2.5rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-8 md:p-16 shadow-xl dark:shadow-2xl overflow-hidden flex flex-col items-center justify-center transition-all duration-500">
                  <UploadZone onFileSelect={startOcr} />
                </div>
              </div>

              <div className="w-full">
                <HistoryList onRerun={rerunOcr} onView={viewJob} onStop={stopJob} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scan-laser {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-laser {
          animation: scan-laser 1.8s ease-in-out infinite alternate;
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 6s ease infinite;
        }
      `,
        }}
      />
      {status === "idle" && <Footer />}
    </div>
  );
}
