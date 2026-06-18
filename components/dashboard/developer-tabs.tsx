"use client";

import { cn } from "@/lib/utils";

export type DeveloperTab = "keys" | "docs";

interface DeveloperTabsProps {
  value: DeveloperTab;
  onChange: (value: DeveloperTab) => void;
}

export function DeveloperTabs({ value, onChange }: DeveloperTabsProps) {
  return (
    <div className="flex rounded-2xl border bg-card p-1 shadow-sm">
      {[
        { value: "keys" as const, label: "Keys" },
        { value: "docs" as const, label: "Docs" },
      ].map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground",
            value === tab.value && "bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
