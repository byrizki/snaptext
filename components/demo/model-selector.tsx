"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OcrModel = {
  id: string;
  name: string;
  provider: string;
};

interface ModelSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const { data: models, error, isLoading, isValidating, mutate } = useSWR<OcrModel[]>(
    "/api/models",
    (url: string) => fetch(url).then((res) => res.json())
  );

  useEffect(() => {
    if (models && models.length > 0 && !value) {
      onChange(models[0].id);
    }
  }, [models, value, onChange]);

  if (error) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 text-sm text-destructive">
        <span>Models failed</span>
        <Button
          type="button"
          variant="link"
          size="xs"
          onClick={(event) => {
            event.preventDefault();
            mutate();
          }}
          disabled={isValidating}
          className="h-auto px-0 text-destructive"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !models) {
    return <Skeleton className="h-9 w-36 rounded-full" />;
  }

  if (models.length === 0) return null;

  const selectedModel = models.find((model) => model.id === value);

  return (
    <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
      <SelectTrigger className="w-full min-w-40 bg-card/70 sm:w-fit">
        <SelectValue placeholder="Select model">{selectedModel?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" sideOffset={8}>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
