"use client";

import { DashboardCard } from "@/components/dashboard/dashboard-card";

interface ApiKeyRevealProps {
  apiKey: string;
  copied: boolean;
  onCopy: (value: string) => void;
  onDismiss: () => void;
}

export function ApiKeyReveal({ apiKey, copied, onCopy, onDismiss }: ApiKeyRevealProps) {
  return (
    <DashboardCard className="border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Copy this key now</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">It is shown once. Store it in a password manager before leaving this page.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-2xl border bg-background px-4 py-3 font-mono text-sm text-foreground">{apiKey}</code>
            <button
              onClick={() => onCopy(apiKey)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button onClick={onDismiss} className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            I saved it
          </button>
        </div>
      </div>
    </DashboardCard>
  );
}
