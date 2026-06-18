"use client";

import { DashboardCard } from "@/components/dashboard/dashboard-card";

export interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

interface ApiKeysPanelProps {
  apiKeys: ApiKey[];
  loading: boolean;
  onCreate: () => void;
  onRevoke: (id: string) => void;
}

export function ApiKeysPanel({ apiKeys, loading, onCreate, onRevoke }: ApiKeysPanelProps) {
  return (
    <DashboardCard className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">API keys</h2>
          <p className="mt-1 text-sm text-muted-foreground">Authenticate OCR requests from servers and scripts.</p>
        </div>
        <button onClick={onCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
          <span aria-hidden>+</span>
          New key
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="p-8 text-center sm:p-12">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.03 5.91c-.56-.1-1.15.03-1.56.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.82c0-.6.24-1.17.66-1.59l6.5-6.5c.4-.4.53-1 .43-1.56A6 6 0 1 1 21.75 8.25z" />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">No keys yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create a key when you are ready to call the API from your app.</p>
        </div>
      ) : (
        <div className="divide-y">
          {apiKeys.map((key) => (
            <div key={key.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{key.name}</p>
                  <code className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground">{key.maskedKey}</code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(key.createdAt).toLocaleDateString()} · Expires {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "never"} · Last used {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "never"}
                </p>
              </div>
              <button onClick={() => onRevoke(key.id)} className="h-9 rounded-2xl border px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/10 sm:justify-self-end">
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
