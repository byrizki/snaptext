import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardPageShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardPageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: DashboardPageShellProps) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl space-y-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p> : null}
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
