"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CodeCircleIcon, Presentation02Icon, SparklesIcon, File01Icon, Delete02Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { ModelSelector } from "@/components/demo/model-selector";
import { UploadZone } from "@/components/demo/upload-zone";
import { HistoryList } from "@/components/demo/history-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchemaEditor } from "./schema-editor";

interface DemoIdlePanelProps {
  selectedModelId: string;
  onModelChange: (id: string) => void;
  onFileSelect: (file: File, schema?: string) => void;
  onRerun: (jobId: string, filename: string) => Promise<void>;
  onView: (jobId: string, filename: string) => Promise<void>;
  onStop: (jobId: string) => Promise<void>;
}

export function DemoIdlePanel({
  selectedModelId,
  onModelChange,
  onFileSelect,
  onRerun,
  onView,
  onStop,
}: DemoIdlePanelProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [jsonSchema, setJsonSchema] = useState("");
  const [editorMode, setEditorMode] = useState<"raw" | "gui">("gui");
  const [isLoaded, setIsLoaded] = useState(false);
  const [quota, setQuota] = useState<{ limit: number; used: number; remaining: number; isAnonymous: boolean } | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    setIsLoadingQuota(true);
    fetch("/api/dashboard/quota")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setQuota(data);
      })
      .catch(console.error)
      .finally(() => setIsLoadingQuota(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("snaptext_json_schema");
    if (saved) {
      setJsonSchema(saved);
      setShowAdvanced(true);
    }
    setIsLoaded(true);
  }, []);

  const handleSchemaChange = (newSchema: string) => {
    setJsonSchema(newSchema);
    if (newSchema) {
      localStorage.setItem("snaptext_json_schema", newSchema);
    } else {
      localStorage.removeItem("snaptext_json_schema");
    }
  };

  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <div className="pointer-events-none absolute left-6 top-24 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 right-6 -z-10 size-72 rounded-full bg-accent/60 blur-3xl" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <HugeiconsIcon icon={SparklesIcon} className="size-4 text-primary" />
            Public demo
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
            Scan one document and inspect the result.
          </h1>
          <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground">
            Upload a PDF or image, pick a model, and optionally shape the JSON output before the scan starts.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "history")} className="lg:items-end">
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="upload" className="px-5">New scan</TabsTrigger>
            <TabsTrigger value="history" className="px-5">History</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "history")} className="w-full">
        <TabsContent value="upload" className="mt-0">
          <div className="flex flex-col gap-4 lg:gap-6">
            <Card className="bg-card/85 shadow-[0_0_64px_rgba(59,130,246,0.10)] backdrop-blur">
              <CardHeader className="gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <CardTitle>Document</CardTitle>
                  <CardDescription>PDF, image, or scanned file.</CardDescription>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-3 py-2 text-sm font-medium sm:justify-start">
                    <span>Schema</span>
                    <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
                  </label>
                  <ModelSelector value={selectedModelId} onChange={onModelChange} />
                </div>
              </CardHeader>
              <CardContent>
                {selectedFile ? (
                  <div className="flex flex-col items-center justify-center p-6 border rounded-[1.75rem] bg-card/55 border-dashed">
                    <div className="flex items-center gap-4 w-full max-w-md p-4 rounded-2xl border bg-background shadow-sm">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <HugeiconsIcon icon={File01Icon} size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button 
                        onClick={() => setSelectedFile(null)}
                        className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition focus:outline-none"
                        aria-label="Remove file"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={18} />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => onFileSelect(selectedFile, showAdvanced ? jsonSchema : undefined)}
                      className="mt-6 flex items-center justify-center gap-2 h-12 w-full max-w-xs rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <HugeiconsIcon icon={PlayIcon} size={16} />
                      Start OCR Scan
                    </button>
                  </div>
                ) : (
                  <UploadZone
                    quota={quota}
                    isLoadingQuota={isLoadingQuota}
                    onFileSelect={setSelectedFile}
                  />
                )}
              </CardContent>
            </Card>

            {showAdvanced ? (
              <Card className="bg-card/85 shadow-[0_0_48px_rgba(139,92,246,0.10)] backdrop-blur">
                <CardHeader className="gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <CardTitle>Output schema</CardTitle>
                    <CardDescription>Define fields before scanning.</CardDescription>
                  </div>
                  <Tabs value={editorMode} onValueChange={(value) => setEditorMode(value as "raw" | "gui")}>
                    <TabsList>
                      <TabsTrigger value="gui" aria-label="Use visual schema editor">
                        <HugeiconsIcon icon={Presentation02Icon} size={14} />
                        GUI
                      </TabsTrigger>
                      <TabsTrigger value="raw" aria-label="Use raw schema editor">
                        <HugeiconsIcon icon={CodeCircleIcon} size={14} />
                        Raw
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="bg-muted/30 py-5">
                  {isLoaded ? <SchemaEditor schema={jsonSchema} onChange={handleSchemaChange} mode={editorMode} /> : <Skeleton className="h-80 w-full rounded-2xl" />}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card className="bg-card/85 shadow-[0_0_64px_rgba(59,130,246,0.10)] backdrop-blur">
            <CardContent>
              <HistoryList onRerun={onRerun} onView={onView} onStop={onStop} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
        Demo uploads can be logged for product quality and model evaluation. Do not upload sensitive documents here.
      </p>
    </section>
  );
}
