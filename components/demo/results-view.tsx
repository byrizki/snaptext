"use client";

import { useState } from "react";

import type { OcrResult } from "@/hooks/use-ocr-pipeline";

interface ResultsViewProps {
  result: OcrResult;
  onReset: () => void;
  onRerun: () => void;
}

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="font-mono text-sm text-blue-600 dark:text-blue-300 leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800">
      <span className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-widest font-medium">{label}</span>
      <span className="text-lg font-bold text-zinc-900 dark:text-white">{value}</span>
    </div>
  );
}

function StructuredViewer({ data }: { data: any }) {
  if (Array.isArray(data)) {
    return (
      <div className="flex flex-col gap-3 w-full">
        {data.map((item, i) => (
          <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
            <StructuredViewer data={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object" && data !== null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 w-full">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className={`flex flex-col gap-1.5 ${typeof value === 'object' && value !== null ? 'md:col-span-2' : ''}`}>
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">{key.replace(/_/g, " ")}</span>
            <div className="text-sm text-zinc-800 dark:text-zinc-200">
              {typeof value === "object" && value !== null ? (
                <div className="mt-2"><StructuredViewer data={value} /></div>
              ) : (
                <span className="font-medium bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200">{String(value)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="font-medium">{String(data)}</span>;
}

export function ResultsView({ result, onReset, onRerun }: ResultsViewProps) {
  const [activeTab, setActiveTab] = useState<"structured" | "json">("structured");
  const nonEmptyPages = result.pages.filter(
    (p) => !p.data.empty && !p.data.parse_error
  );

  return (
    <div className="w-full animate-fade-in space-y-6">
      {/* Success header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
          <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-bold text-xl">Extraction Complete</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRerun}
            className="h-9 px-5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors text-blue-600 dark:text-blue-400 flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Rerun
          </button>
          <button
            onClick={onReset}
            className="h-9 px-5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-300"
          >
            Scan Another
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatBadge label="Pages" value={result.totalPages} />
        <StatBadge label="Extracted" value={nonEmptyPages.length} />
        <StatBadge label="Fields" value={Object.keys(result.merged).length} />
      </div>

      {/* Merged Data View */}
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-inner overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-300 uppercase tracking-widest">
              Extracted Data
            </h4>
          </div>
          
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={() => setActiveTab("structured")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "structured" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Structured
            </button>
            <button 
              onClick={() => setActiveTab("json")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "json" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Raw JSON
            </button>
          </div>
        </div>
        
        <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === "structured" ? (
            <StructuredViewer data={result.merged} />
          ) : (
            <JsonViewer data={result.merged} />
          )}
        </div>
      </div>

      {/* Per-page detailed extraction accordion */}
      {result.pages.length > 1 && (
        <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-inner">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-2 rounded-full bg-violet-500" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-400 uppercase tracking-widest">
              Detailed Extraction Logs
            </h4>
          </div>
          <div className="space-y-3">
            {result.pages.map((page) => (
              <details key={page.pageNumber} className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none select-none py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-300">
                    Page {page.pageNumber}
                    {Boolean(page.data.empty) && (
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-600">(empty)</span>
                    )}
                    {Boolean(page.data.parse_error) && (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-500">(parse error)</span>
                    )}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-4 text-zinc-500 group-open:rotate-180 transition-transform"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-2 px-3 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/20">
                  <pre className="font-mono text-xs text-violet-600 dark:text-violet-300 leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
                    {page.rawToon || "(no output)"}
                  </pre>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
