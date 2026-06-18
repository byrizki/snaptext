"use client";

import type { FormEvent } from "react";

interface CreateApiKeyModalProps {
  open: boolean;
  name: string;
  expires: "never" | "30d" | "90d" | "1y";
  creating: boolean;
  onNameChange: (value: string) => void;
  onExpiresChange: (value: "never" | "30d" | "90d" | "1y") => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}

export function CreateApiKeyModal({
  open,
  name,
  expires,
  creating,
  onNameChange,
  onExpiresChange,
  onSubmit,
  onClose,
}: CreateApiKeyModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close dialog" onClick={onClose} className="absolute inset-0 bg-foreground/45 backdrop-blur-sm" />
      <form onSubmit={onSubmit} className="relative z-10 w-full max-w-md rounded-3xl border bg-card p-5 shadow-2xl sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Create API key</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Name the key so it is easy to rotate later.</p>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Key name</span>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Production backend"
              maxLength={32}
              className="h-11 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Expiration</span>
            <select
              value={expires}
              onChange={(event) => onExpiresChange(event.target.value as "never" | "30d" | "90d" | "1y")}
              className="h-11 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
            >
              <option value="never">Never</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-2xl px-4 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground">
            Cancel
          </button>
          <button type="submit" disabled={creating} className="h-10 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
            {creating ? "Creating" : "Create key"}
          </button>
        </div>
      </form>
    </div>
  );
}
