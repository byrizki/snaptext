"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  CheckmarkCircle02Icon, 
  CancelCircleIcon, 
  Time02Icon, 
  DocumentCodeIcon,
  Coins01Icon,
  FlashIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ReloadIcon,
} from "@hugeicons/core-free-icons";

export default function JobHistoryPage() {
  const { data = [], isLoading } = useSWR(
    "/api/admin/jobs",
    (url: string) => fetch(url).then((r) => r.json())
  );
  const jobs = Array.isArray(data) ? data : [];

  const [currentPage, setCurrentPage] = useState(1);
  const [rerunningIds, setRerunningIds] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(jobs.length / itemsPerPage));
  const paginatedJobs = jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusProps = (status: string) => {
    switch (status) {
      case "completed": 
        return { icon: CheckmarkCircle02Icon, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
      case "failed": 
        return { icon: CancelCircleIcon, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
      default: 
        return { icon: Time02Icon, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    }
  };

  const handleRerun = async (jobId: string) => {
    try {
      setRerunningIds((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      
      const res = await fetch(`/api/ocr/${jobId}/rerun`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to rerun job");
      }
      
      toast.success("Job restarted successfully");
      await mutate("/api/admin/jobs");
    } catch (err: any) {
      toast.error(err.message || "Failed to restart job");
    } finally {
      setRerunningIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Job History</h1>
        <p className="text-muted-foreground mt-1 text-sm">Detailed telemetry and cost breakdown for all OCR extractions.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-[1fr_1.25fr_1.5fr_1.5fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          <span>File Name</span>
          <span>User</span>
          <span>Status & Pages</span>
          <span>Pipeline Details</span>
          <span>Tokens</span>
          <span>Cost</span>
          <span className="text-right">Timestamp</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <div className="size-6 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading history...</span>
            </div>
          ) : paginatedJobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">No jobs processed yet.</div>
          ) : (
            paginatedJobs.map((job: any) => {
              const status = getStatusProps(job.status);
              
              return (
                <div key={job.id} className="p-4 lg:px-6 lg:py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr_1.5fr_1.5fr_1fr_1fr_1fr] gap-4 lg:items-center">
                    
                    {/* File Name */}
                    <div className="flex items-center min-w-0 pr-2">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate" title={job.filename}>
                        {job.filename || "Unknown file"}
                      </span>
                    </div>

                    {/* User */}
                    <div className="flex items-center min-w-0 pr-2">
                      {job.user?.name ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="size-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-300 dark:border-zinc-600">
                            {job.user.image ? (
                              <img src={job.user.image} alt={job.user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-500 uppercase">{job.user.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate" title={job.user.email || job.user.name}>
                            {job.user.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic flex items-center gap-1.5">
                          <div className="size-6 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                            <span className="text-[10px] text-zinc-400">?</span>
                          </div>
                          Anonymous
                        </span>
                      )}
                    </div>

                    {/* Status & Pages */}
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${status.bg} ${status.border} ${status.color}`}>
                        <HugeiconsIcon icon={status.icon} size={14} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">{job.status}</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-500" title="Pages Processed">
                        <HugeiconsIcon icon={DocumentCodeIcon} size={14} />
                        <span className="text-xs font-medium">{job.totalPages || 0}</span>
                      </div>
                    </div>

                    {/* Pipeline / Models */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      {job.model ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                            {job.model.name || job.model}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Unknown Model</span>
                      )}
                      {job.duration && (
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <HugeiconsIcon icon={FlashIcon} size={12} />
                          {(job.duration / 1000).toFixed(1)}s processing
                        </div>
                      )}
                      {job.error && (
                        <div className="text-[10px] text-red-500/90 font-medium truncate mt-0.5" title={job.error}>
                          {job.error}
                        </div>
                      )}
                    </div>

                    {/* Tokens */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {job.totalTokens?.toLocaleString() || 0}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">TOTAL TOKENS</span>
                    </div>

                    {/* Cost */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <HugeiconsIcon icon={Coins01Icon} size={14} />
                        <span className="text-sm font-bold tabular-nums">
                          ${job.cost || "0.0000"}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">TOTAL COST</span>
                    </div>

                    {/* Date and Actions */}
                    <div className="flex items-center justify-end gap-3 lg:text-right text-xs text-zinc-500 font-medium">
                      <span>
                        {new Date(job.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                      
                      {job.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] uppercase tracking-wider font-bold shrink-0"
                          onClick={() => handleRerun(job.id)}
                          disabled={rerunningIds.has(job.id)}
                        >
                          {rerunningIds.has(job.id) ? (
                            <div className="size-3.5 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-700 dark:border-t-zinc-300 rounded-full animate-spin" />
                          ) : (
                            <>
                              <HugeiconsIcon icon={ReloadIcon} size={12} className="mr-1.5" />
                              Rerun
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Pagination */}
        {!isLoading && jobs.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 flex items-center justify-between gap-4">
            <div className="text-xs text-zinc-500 font-medium tabular-nums">
              Showing {(currentPage - 1) * itemsPerPage + 1} – {Math.min(currentPage * itemsPerPage, jobs.length)} of {jobs.length}
            </div>
            
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="icon"
                className="size-8 rounded-lg"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              </Button>
              <div className="px-2 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                {currentPage} / {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className="size-8 rounded-lg"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
