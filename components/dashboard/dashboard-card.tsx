import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
}

export function DashboardCard({ children, className }: DashboardCardProps) {
  return (
    <div className={cn("rounded-3xl border bg-card text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  );
}
