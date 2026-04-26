/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CancelCircleIcon, Time02Icon } from "@hugeicons/core-free-icons";

export default function JobHistoryPage() {
  const { data = [], isLoading } = useSWR(
    "/api/admin/jobs",
    (url: string) => fetch(url).then((r) => r.json())
  );
  const jobs = Array.isArray(data) ? data : [];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(jobs.length / itemsPerPage));
  const paginatedJobs = jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-emerald-500" />;
      case "failed": return <HugeiconsIcon icon={CancelCircleIcon} size={14} className="text-destructive" />;
      default: return <HugeiconsIcon icon={Time02Icon} size={14} className="text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job History</h1>
        <p className="text-muted-foreground mt-1">View all recent OCR extraction jobs across the platform.</p>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Job ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading jobs...</TableCell></TableRow>
            ) : paginatedJobs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No jobs found.</TableCell></TableRow>
            ) : (
              paginatedJobs.map((job: any) => (
                <TableRow key={job.id} className="group hover:bg-muted/10 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{job.id.substring(0, 8)}...</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="capitalize">{job.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {job.model ? (
                      <Badge variant="secondary" className="font-medium bg-primary/10 text-primary hover:bg-primary/20">
                        {job.model.name || job.model}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.cost ? `$${job.cost}` : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.processingDuration ? `${(job.processingDuration / 1000).toFixed(1)}s` : "-"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {new Date(job.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {!isLoading && jobs.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, jobs.length)}</span> of <span className="font-medium">{jobs.length}</span> jobs
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
