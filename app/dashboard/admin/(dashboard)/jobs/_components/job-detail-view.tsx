"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWR from "swr";
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
  FileAttachmentIcon,
  UserIcon,
  Activity01Icon,
  Database01Icon,
  Copy01Icon,
  ArrowLeft01Icon,
  ViewIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ImageDeleteIcon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface JobDetailViewProps {
  jobId: string;
}

// GUI Visualizer Components
function DataVisualizer({ data, depth = 0 }: { data: any; depth?: number }) {
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
          <div className={`w-full overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800/80 ${depth > 0 ? 'ml-1 my-2' : ''}`}>
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {allKeys.map(key => (
                    <th key={key} className="p-3 text-[10px] text-zinc-400 font-bold uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900/40 first:rounded-tl-xl last:rounded-tr-xl">
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
            className={`p-4 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm ${depth > 0 ? 'ml-2' : ''}`}
          >
            <div className="text-[10px] text-zinc-400 font-black uppercase mb-3 tracking-widest flex items-center gap-2">
              <div className="size-1 bg-zinc-300 rounded-full" />
              Item {i + 1}
            </div>
            <DataVisualizer data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object" && data !== null) {
    return (
      <div className={`grid grid-cols-1 gap-y-3 w-full ${depth > 0 ? 'border-l-2 border-zinc-200 dark:border-zinc-800/50 pl-4 ml-1 my-1' : ''}`}>
        {Object.entries(data).map(([key, value]) => {
          const isComplex = typeof value === 'object' && value !== null;
          return (
            <div key={key} className={`flex ${isComplex ? 'flex-col gap-2.5' : 'flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5 sm:gap-6 border-b border-zinc-100/50 dark:border-zinc-800/30 pb-2.5 last:border-0 last:pb-0'}`}>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest shrink-0">
                {key.replace(/_/g, " ")}
              </span>
              <div className="text-sm text-zinc-800 dark:text-zinc-200 min-w-0">
                {isComplex ? (
                  <DataVisualizer data={value} depth={depth + 1} />
                ) : (
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 break-words sm:text-right block">
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

  return <span className="font-semibold text-zinc-900 dark:text-zinc-100">{String(data)}</span>;
}

function PageCollapsible({
  page,
}: {
  page: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"gui" | "raw">("gui");

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/30 dark:bg-zinc-900/30 transition-all duration-300"
    >
      <div className="bg-zinc-50/80 dark:bg-zinc-800/50 px-5 py-3 border-b dark:border-zinc-800 flex items-center justify-between group">
        <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="text-zinc-400" />
          </div>
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Page {page.pageNumber}</span>
          <Badge variant="secondary" className="text-[9px] font-mono py-0 h-5 opacity-70">{page.model}</Badge>
          <Badge variant={page.pageBlobUrl ? "outline" : "secondary"} className="text-[9px] font-mono py-0 h-5 opacity-70">
            {page.pageBlobUrl ? "Image saved" : "No image"}
          </Badge>

          <div className="hidden sm:flex items-center gap-6 ml-auto mr-4">
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-zinc-400 font-bold uppercase leading-none mb-1">In / Out Tokens</span>
              <span className="text-[10px] font-mono font-bold text-zinc-500">
                {(page.usage?.promptTokens || 0).toLocaleString()} <span className="text-zinc-300 dark:text-zinc-700">/</span> {(page.usage?.completionTokens || 0).toLocaleString()}
              </span>
            </div>
            {page.cost !== undefined && (
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-zinc-400 font-bold uppercase leading-none mb-1">Cost</span>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ${page.cost.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </CollapsibleTrigger>
        
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-xl shrink-0"
                onClick={(event) => event.stopPropagation()}
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
              </Button>
            }
          />
          <PopoverContent align="end" className="w-56 gap-2 p-2">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Page Actions
            </div>
            {page.pageBlobUrl ? (
              <>
                <a
                  href={page.pageBlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9 justify-start rounded-xl px-2 text-xs font-bold")}
                >
                  <HugeiconsIcon icon={ViewIcon} size={15} />
                  Open image
                </a>

              </>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-400 dark:border-zinc-800">
                No saved image for this page.
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <CollapsibleContent>
        <div className="p-5 animate-in fade-in slide-in-from-top-1 duration-200 space-y-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              {(["gui", "raw"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setView(tab)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider ${
                    view === tab
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {view === "gui" ? (
            <DataVisualizer data={page} />
          ) : (
            <pre className="text-[11px] font-mono overflow-x-auto max-h-100 text-zinc-600 dark:text-zinc-500 bg-zinc-950/5 dark:bg-zinc-950/20 p-4 rounded-xl">
              {JSON.stringify(page, null, 2)}
            </pre>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function JobDetailView({ jobId }: JobDetailViewProps) {
  const { data: job, isLoading: isJobLoading, mutate } = useSWR(
    jobId ? `/api/admin/jobs/${jobId}` : null,
    (url: string) => fetch(url).then((r) => r.json())
  );

  const ocr = job?.ocr;
  const [mergedView, setMergedView] = useState<"gui" | "raw">("gui");

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

  const [isDeletingStoredFiles, setIsDeletingStoredFiles] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const hasStoredFiles = Boolean(job?.pdfBlobUrl) || Boolean(ocr?.pages?.some((page: any) => page.pageBlobUrl));

  const deleteStoredFiles = async () => {
    if (!hasStoredFiles) {
      toast.info("No stored files to delete");
      return;
    }

    setIsDeletingStoredFiles(true);
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/files/blob`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete stored files");
      }

      toast.success(result.deleted > 0 ? `Deleted ${result.deleted} stored files` : "No stored files to delete");
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete stored files");
    } finally {
      setIsDeletingStoredFiles(false);
    }
  };

  if (isJobLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-60 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!job || job.error) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="size-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mx-auto text-red-500">
          <HugeiconsIcon icon={CancelCircleIcon} size={32} />
        </div>
        <h2 className="text-xl font-bold">Job Not Found</h2>
        <p className="text-zinc-500 max-w-xs mx-auto">The job you are looking for does not exist or has been deleted.</p>
        <Link 
          href="/dashboard/admin/jobs" 
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="mr-2" />
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/admin/jobs" 
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-xl size-10 shrink-0")}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate" title={job.filename}>
                {job.filename}
              </h1>
              <Badge variant="outline" className={`h-6 px-2 text-[10px] uppercase font-bold shrink-0 ${getStatusProps(job.status).bg} ${getStatusProps(job.status).color} ${getStatusProps(job.status).border}`}>
                {job.status}
              </Badge>
            </div>
            <p className="text-xs font-mono text-zinc-500 truncate">ID: {jobId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="icon" className="size-9 rounded-xl shrink-0">
                  <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                </Button>
              }
            />
            <PopoverContent align="end" className="w-64 gap-2 p-2">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Job Actions
              </div>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full justify-start rounded-xl px-2 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20"
                      disabled={isDeletingStoredFiles || !hasStoredFiles}
                    >
                      <HugeiconsIcon icon={ImageDeleteIcon} size={15} />
                      {isDeletingStoredFiles ? "Deleting files" : "Delete stored files"}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogMedia className="bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                      <HugeiconsIcon icon={ImageDeleteIcon} size={30} />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Delete stored files?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the stored PDF and every saved page image for this job from blob storage. Matching records that reference the same file URLs are cleared. OCR data remains available.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingStoredFiles}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={deleteStoredFiles}
                      disabled={isDeletingStoredFiles}
                    >
                      {isDeletingStoredFiles ? "Deleting..." : "Delete files"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="px-2 pb-1 text-[10px] leading-relaxed text-zinc-400">
                Removes stored files only. OCR data remains available.
              </div>
            </PopoverContent>
          </Popover>

          {job.pdfBlobUrl && (
            <a 
              href={job.pdfBlobUrl} 
              target="_blank" 
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 px-4 rounded-xl text-xs font-bold gap-2")}
            >
              <HugeiconsIcon icon={ViewIcon} size={16} />
              VIEW PDF
            </a>
          )}
          <Button 
            variant="default" 
            size="sm" 
            className="h-9 px-4 rounded-xl text-xs font-bold gap-2"
            onClick={() => ocr && copyToClipboard(JSON.stringify(ocr.mergedData, null, 2))}
            disabled={!ocr?.mergedData}
          >
            <HugeiconsIcon icon={Copy01Icon} size={16} />
            EXPORT JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Document & Extraction Stats */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <HugeiconsIcon icon={Database01Icon} size={14} />
              Extraction Results
            </h3>
            
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
              <Tabs defaultValue="merged" className="w-full">
                <div className="px-6 pt-4 border-b dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
                  <TabsList className="h-10 p-1 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl -mb-px">
                    <TabsTrigger value="merged" className="text-[10px] font-bold uppercase tracking-wider px-4">Merged Data</TabsTrigger>
                    <TabsTrigger value="pages" className="text-[10px] font-bold uppercase tracking-wider px-4">Individual Pages</TabsTrigger>
                  </TabsList>

                  <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    {(["gui", "raw"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setMergedView(tab)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider ${
                          mergedView === tab
                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                            : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                
                <TabsContent value="merged" className="p-0 m-0">
                  {ocr?.mergedData ? (
                    <div className="p-6">
                      {mergedView === "gui" ? (
                        <DataVisualizer data={ocr.mergedData} />
                      ) : (
                        <div className="relative">
                          <pre className="p-6 text-[12px] font-mono leading-relaxed overflow-x-auto max-h-200 text-zinc-700 dark:text-zinc-400 bg-zinc-50/30 dark:bg-zinc-950/30 rounded-xl">
                            {JSON.stringify(ocr.mergedData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-20 text-center text-zinc-400 flex flex-col items-center gap-3">
                      <div className="size-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                        <HugeiconsIcon icon={DocumentCodeIcon} size={24} className="text-zinc-300" />
                      </div>
                      <span className="text-sm font-medium">No extraction data available for this job.</span>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pages" className="p-6 m-0 space-y-4">
                  {ocr?.pages?.length > 0 ? (
                    ocr.pages.map((p: any) => (
                      <PageCollapsible key={p.id || p.pageNumber} page={p} />
                    ))
                  ) : (
                    <div className="p-20 text-center text-zinc-400">No individual page data.</div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {job.error && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
                <HugeiconsIcon icon={CancelCircleIcon} size={14} />
                System Error Trace
              </h3>
              <div className="p-6 rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400 font-medium leading-relaxed font-mono">
                {job.error}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          {/* Metadata Card */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <HugeiconsIcon icon={FileAttachmentIcon} size={14} />
              Metadata
            </h3>
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Created At</span>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {new Date(job.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Size</span>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {(job.fileSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Pages</span>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{job.totalPages}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Model</span>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{job.model?.name || "Standard"}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-3">User Info</span>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                  <div className="size-9 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden border border-zinc-300 dark:border-zinc-600">
                    {job.user?.image ? (
                      <img src={job.user.image} alt={job.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-zinc-500">{job.user?.name?.charAt(0) || "?"}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{job.user?.name || "Anonymous"}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{job.user?.email || "No email"}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Telemetry Card */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <HugeiconsIcon icon={Activity01Icon} size={14} />
              Telemetry
            </h3>
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase block">Total Cost</span>
                  <div className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">${job.telemetry?.cost}</div>
                </div>
                <HugeiconsIcon icon={Coins01Icon} size={32} className="text-emerald-500/20" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Total Tokens</span>
                  <span className="font-bold tabular-nums">{job.telemetry?.totalTokens?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">Prompt</span>
                  <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{job.telemetry?.promptTokens?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-400 uppercase font-bold">Completion</span>
                  <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{job.telemetry?.completionTokens?.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-2">Step History</span>
                <div className="space-y-2">
                  {job.telemetry?.logs?.map((log: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate">{log.stepName}</div>
                        <div className="text-[9px] text-zinc-400 truncate">{log.model}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 tabular-nums mb-0.5">
                          {log.totalTokens?.toLocaleString()}
                        </div>
                        <div className="text-[8px] text-zinc-400 font-mono">
                          {log.promptTokens?.toLocaleString()} / {log.completionTokens?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
