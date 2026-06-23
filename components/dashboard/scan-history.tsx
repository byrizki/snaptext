"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/utils";

interface ScanJob {
  id: string;
  filename: string;
  fileSize: number;
  status: "pending" | "running" | "completed" | "failed";
  totalPages: number | null;
  pdfBlobUrl: string;
  ocrModelId: string | null;
  modelName: string | null;
  createdAt: string;
  duration: number | null;
}

interface ScanJobsResponse {
  jobs: ScanJob[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_CONFIG = {
  completed: { label: "Done", variant: "secondary" },
  running: { label: "Running", variant: "default" },
  pending: { label: "Pending", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
} as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentIcon() {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
}

export function ScanHistory() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [isRerunning, setIsRerunning] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState<string | null>(null);
  const { data, isLoading, mutate } = useSWR<ScanJobsResponse>(`/api/dashboard/jobs?page=${page}&limit=10`, fetcher);

  const handleRerun = async (event: React.MouseEvent, jobId: string) => {
    event.stopPropagation();
    try {
      setIsRerunning(jobId);
      const res = await fetch(`/api/ocr/${jobId}/rerun`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to rerun");
      const responseData = await res.json();
      router.push(`/dashboard/scan/${responseData.jobId || responseData.runId || jobId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to rerun job");
    } finally {
      setIsRerunning(null);
    }
  };

  const handleStop = async (event: React.MouseEvent, jobId: string) => {
    event.stopPropagation();
    try {
      setIsStopping(jobId);
      const res = await fetch(`/api/ocr/${jobId}/stop`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to stop");
      await mutate();
    } catch (error) {
      console.error(error);
      alert("Failed to stop job");
    } finally {
      setIsStopping(null);
    }
  };

  const jobs = data?.jobs ?? [];
  const pagination = data?.pagination;

  return (
    <DashboardCard className="overflow-hidden">
      <div className="p-6 pb-0 sm:p-8 sm:pb-0">
        <h3 className="text-base font-semibold text-foreground">Recent scans</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {pagination ? `${pagination.total} documents processed` : "Your last documents"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4 p-6 sm:p-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !jobs.length ? (
        <div className="flex flex-col items-center gap-3 p-12 text-center sm:p-16">
          <DocumentIcon />
          <p className="text-sm font-medium text-muted-foreground">No scans yet</p>
          <Link href="/dashboard/scan" className={buttonVariants({ variant: "link", className: "h-auto p-0" })}>
            Start your first scan
          </Link>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {jobs.map((job) => {
            const status = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
            return (
              <div
                key={job.id}
                onClick={() => job.status !== "failed" && router.push(`/dashboard/scan/${job.id}`)}
                className={`group flex flex-col gap-4 px-6 py-4 transition sm:flex-row sm:items-center sm:px-8 ${job.status !== "failed" ? "cursor-pointer hover:bg-accent/60" : "opacity-80"}`}
              >
                <DocumentIcon />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{job.filename}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatBytes(job.fileSize)}{job.totalPages ? ` · ${job.totalPages} pages` : ""}{job.modelName ? ` · ${job.modelName}` : ""}{job.duration != null ? ` · ${formatDuration(job.duration)}` : ""} · {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {job.status === "failed" ? (
                    <Button size="sm" variant="outline" onClick={(event) => handleRerun(event, job.id)} disabled={isRerunning === job.id}>Retry</Button>
                  ) : null}
                  {job.status === "running" || job.status === "pending" ? (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={(event) => handleStop(event, job.id)} 
                      disabled={isStopping === job.id}
                      className="flex items-center gap-1.5 min-w-[70px]"
                    >
                      {isStopping === job.id ? (
                        <>
                          <svg className="animate-spin size-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Stopping</span>
                        </>
                      ) : (
                        "Stop"
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between border-t bg-muted/30 p-4">
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>Previous</Button>
          <span className="text-xs font-medium text-muted-foreground">Page {page} of {pagination.totalPages}</span>
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages || isLoading}>Next</Button>
        </div>
      ) : null}
    </DashboardCard>
  );
}
