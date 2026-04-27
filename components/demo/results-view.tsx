"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Share08Icon, Tick01Icon } from "@hugeicons/core-free-icons";

import type { OcrResult } from "@/hooks/use-ocr-pipeline";

interface ResultsViewProps {
  result: OcrResult;
  onReset: () => void;
}

function formatDuration(start?: string, end?: string) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0 || isNaN(ms)) return null;
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  return `${minutes}m ${remSeconds}s`;
}

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="font-mono text-sm text-blue-600 dark:text-blue-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
      <span className="text-lg font-bold text-zinc-900 dark:text-white">{value}</span>
      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">{label}</span>
    </div>
  );
}

function LiquidScoreBadge({ label, value, colorClass }: { label: string; value: string | number; colorClass: string }) {
  const numValue = typeof value === "string" ? parseInt(value.replace("%", ""), 10) : Number(value);
  const isValid = !isNaN(numValue);
  const percent = isValid ? numValue : 0;

  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center gap-0.5 px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 isolate">
      {isValid && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 w-full overflow-hidden"
          initial={{ height: "0%" }}
          animate={{ height: `${percent}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          {/* Base liquid body */}
          <div className={`absolute inset-0 ${colorClass} opacity-30 dark:opacity-20`} />
          
          {/* Wave cutouts placed at the very top of the liquid body */}
          <div className="absolute top-0 left-1/2 w-75 h-75 -translate-x-1/2 -translate-y-71.25 pointer-events-none">
            <motion.div
              className="absolute inset-0 rounded-[40%] bg-white dark:bg-zinc-900"
              animate={{ rotate: 360 }}
              transition={{ duration: 5, ease: "linear", repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-[45%] bg-white/60 dark:bg-zinc-900/60"
              animate={{ rotate: -360 }}
              transition={{ duration: 8, ease: "linear", repeat: Infinity }}
            />
          </div>
        </motion.div>
      )}
      <span className="text-lg font-bold text-zinc-900 dark:text-white z-10 drop-shadow-sm">{value}</span>
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold z-10 drop-shadow-sm">{label}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StructuredViewer({ data, depth = 0 }: { data: any; depth?: number }) {
  if (Array.isArray(data)) {
    const isArrayOfObjects = data.length > 0 && data.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
    
    if (isArrayOfObjects) {
      const allKeys = Array.from(new Set(data.flatMap((item: Record<string, unknown>) => Object.keys(item))));
      const hasComplexValues = data.some((item: Record<string, unknown>) =>
        allKeys.some(key => typeof item[key] === 'object' && item[key] !== null)
      );
      const isTableSuitable = !hasComplexValues;

      if (isTableSuitable) {
        return (
          <div className={`w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800/80 ${depth > 0 ? 'ml-1 my-2' : ''}`}>
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {allKeys.map(key => (
                    <th key={key} className="p-3 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900/40 first:rounded-tl-lg last:rounded-tr-lg">
                      {key.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-white dark:bg-zinc-950/20">
                {data.map((item: Record<string, unknown>, i: number) => (
                  <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                    {allKeys.map(key => (
                      <td key={key} className="p-3 text-sm text-zinc-800 dark:text-zinc-200 align-top">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 break-all">
                          {item[key] !== undefined && item[key] !== null ? String(item[key]) : ''}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    return (
      <div className="flex flex-col gap-3 w-full">
        {data.map((item, i) => (
          <div 
            key={i} 
            className={`p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800/80 shadow-sm ${depth > 0 ? 'ml-2' : ''}`}
          >
            <div className="text-[10px] text-zinc-400 font-bold uppercase mb-2 tracking-wider">Item {i + 1}</div>
            <StructuredViewer data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object" && data !== null) {
    return (
      <div className={`grid grid-cols-1 gap-y-3 w-full ${depth > 0 ? 'border-l-2 border-zinc-200 dark:border-zinc-800 pl-4 ml-1 my-1' : ''}`}>
        {Object.entries(data).map(([key, value]) => {
          const isComplex = typeof value === 'object' && value !== null;
          return (
            <div key={key} className={`flex ${isComplex ? 'flex-col gap-2' : 'flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4 border-b border-zinc-100 dark:border-zinc-800/50 pb-2 last:border-0 last:pb-0'}`}>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider shrink-0">
                {key.replace(/_/g, " ")}
              </span>
              <div className="text-sm text-zinc-800 dark:text-zinc-200">
                {isComplex ? (
                  <StructuredViewer data={value} depth={depth + 1} />
                ) : (
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 break-all sm:text-right">
                    {String(value)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <span className="font-medium">{String(data)}</span>;
}

export function ResultsView({ result, onReset }: ResultsViewProps) {
  const [activeTab, setActiveTab] = useState<"structured" | "json">("structured");
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL", err);
    }
  };
  
  const docMetadata = (result.merged.document_metadata || {}) as Record<string, unknown>;
  const readability = docMetadata.readability_score !== undefined ? `${docMetadata.readability_score}%` : "N/A";
  const usability = docMetadata.data_usability_score !== undefined ? `${docMetadata.data_usability_score}%` : "N/A";

  const { document_metadata: _document_metadata, ...displayData } = result.merged;
  const duration = formatDuration(result.createdAt, result.updatedAt);

  return (
    <div className="w-full animate-fade-in flex flex-col gap-5 h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-3">
            {duration && (
              <div className="px-2.5 py-1 rounded-full bg-linear-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-xs">
                <svg viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l3 3" />
                </svg>
                {duration}
              </div>
            )}
            {result.modelName && (
              <div className="px-2.5 py-1 rounded-full bg-linear-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-xs">
                <svg viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                {result.modelName}
              </div>
            )}
            {result.hasSchema && (
              <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 shadow-xs">
                <svg viewBox="0 0 24 24" fill="none" className="size-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                </svg>
                Schema
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <HugeiconsIcon icon={isCopied ? Tick01Icon : Share08Icon} size={14} className={isCopied ? "text-emerald-500" : ""} />
            {isCopied ? "Copied" : "Share"}
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
        <LiquidScoreBadge label="Readability" value={readability} colorClass="bg-blue-400" />
        <LiquidScoreBadge label="Usability" value={usability} colorClass="bg-violet-400" />
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
            <StructuredViewer data={displayData} />
          ) : (
            <JsonViewer data={displayData} />
          )}
        </div>
      </div>
    </div>
  );
}
