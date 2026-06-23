import { Skeleton } from "@/components/ui/skeleton";

export function ScanLoadingSkeleton() {
  return (
    <div className="grid h-full min-h-[520px] w-full gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr] lg:p-5">
      <div className="rounded-[1.5rem] border bg-muted/25 p-4">
        <div className="mb-5 flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-9/12" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
      <div className="rounded-[1.5rem] border bg-card p-4">
        <div className="mb-5 flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-4 w-8/12" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
