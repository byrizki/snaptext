"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CpuIcon, FlashIcon, StarIcon, SparklesIcon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIER_CONFIGS = {
  nano: { icon: CpuIcon, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
  flash: { icon: FlashIcon, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  pro: { icon: StarIcon, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  max: { icon: SparklesIcon, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
} as const;

type Tier = keyof typeof TIER_CONFIGS;

type OcrModel = {
  id: string;
  name: string;
  tier: Tier;
  provider: string;
};

interface ModelSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<OcrModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data: OcrModel[]) => {
        setModels(data);
        if (data.length > 0 && !value) {
          onChange(data[0].id);
        }
      })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <div className="animate-pulse h-9 w-52 bg-zinc-100 dark:bg-zinc-800 rounded-full" />;
  }

  if (models.length === 0) return null;

  const selectedModel = models.find((m) => m.id === value);
  const tierCfg = selectedModel ? TIER_CONFIGS[selectedModel.tier] : null;

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(v);
      }}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-full border border-zinc-200/70 dark:border-zinc-800/70",
          "bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm text-sm font-medium",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-blue-500/40"
        )}
      >
        {tierCfg && selectedModel && (
          <Badge
            variant="outline"
            className={`gap-1 px-1.5 py-0 border-0 bg-transparent shadow-none ${tierCfg.color}`}
          >
            <HugeiconsIcon icon={tierCfg.icon} size={13} />
          </Badge>
        )}
        <span className="truncate max-w-[160px]">
          {selectedModel ? selectedModel.name : "Select model"}
        </span>
        <SelectPrimitive.Icon
          render={
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="size-3.5 text-zinc-400 shrink-0 ml-0.5"
            />
          }
        />
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner side="bottom" sideOffset={6} align="end" className="isolate z-50">
          <SelectPrimitive.Popup className="min-w-52 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 origin-(--transform-origin)">
            <SelectPrimitive.List className="p-1.5">
              {models.map((model) => {
                const cfg = TIER_CONFIGS[model.tier];
                return (
                  <SelectPrimitive.Item
                    key={model.id}
                    value={model.id}
                    className="relative flex items-center justify-between gap-3 rounded-xl py-2 px-3 text-sm cursor-default select-none outline-none focus:bg-zinc-50 dark:focus:bg-zinc-800/70 data-highlighted:bg-zinc-50 dark:data-highlighted:bg-zinc-800/70 transition-colors"
                  >
                    <SelectPrimitive.ItemText className="font-medium text-zinc-800 dark:text-zinc-200">
                      {model.name}
                    </SelectPrimitive.ItemText>
                    <Badge
                      variant="outline"
                      className={`gap-1 text-[10px] h-4 px-1.5 leading-none shrink-0 ${cfg.color}`}
                    >
                      <HugeiconsIcon icon={cfg.icon} size={11} />
                      <span className="capitalize">{model.tier}</span>
                    </Badge>
                  </SelectPrimitive.Item>
                );
              })}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
