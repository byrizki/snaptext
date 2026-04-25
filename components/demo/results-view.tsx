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
    <div className="flex flex-col items-center gap-0.5 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
      <span className="text-lg font-bold text-zinc-900 dark:text-white">{value}</span>
      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">{label}</span>
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
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{key.replace(/_/g, " ")}</span>
            <div className="text-sm text-zinc-800 dark:text-zinc-200">
              {typeof value === "object" && value !== null ? (
                <div className="mt-2"><StructuredViewer data={value} /></div>
              ) : (
                <span className="font-medium bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 inline-block">
                  {String(value)}
                </span>
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
    <div className="w-full animate-fade-in flex flex-col gap-5 h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
          <div className="size-7 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-bold text-lg text-zinc-900 dark:text-white">Extraction Complete</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRerun}
            className="h-8 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Rerun
          </button>
          <button
            onClick={onReset}
            className="h-8 px-4 rounded-lg bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 hover:opacity-85 transition-opacity"
          >
            Scan Another
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 shrink-0">
        <StatBadge label="Pages" value={result.totalPages} />
        <StatBadge label="Extracted" value={nonEmptyPages.length} />
        <StatBadge label="Fields" value={Object.keys(result.merged).length} />
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
            <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
              Extracted Data
            </h4>
          </div>
          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {(["structured", "json"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                  activeTab === tab
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {tab === "json" ? "Raw JSON" : tab}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "structured" ? (
            <StructuredViewer data={result.merged} />
          ) : (
            <JsonViewer data={result.merged} />
          )}
        </div>
      </div>

      {result.pages.length > 1 && (
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shrink-0">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/70">
            <div className="size-2 rounded-full bg-violet-500" />
            <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
              Extraction Logs
            </h4>
          </div>
          <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
            {result.pages.map((page) => (
              <details key={page.pageNumber} className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none select-none py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Page {page.pageNumber}
                    {Boolean(page.data.empty) && (
                      <span className="ml-2 text-xs text-zinc-400">(empty)</span>
                    )}
                    {Boolean(page.data.parse_error) && (
                      <span className="ml-2 text-xs text-amber-500">(parse error)</span>
                    )}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-3.5 text-zinc-400 group-open:rotate-180 transition-transform"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-1.5 px-3 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/30">
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
