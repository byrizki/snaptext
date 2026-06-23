"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CodeCircleIcon, Presentation02Icon, File01Icon, Delete02Icon, PlayIcon } from "@hugeicons/core-free-icons";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelSelector } from "@/components/demo/model-selector";
import { SchemaEditor } from "@/components/demo/schema-editor";
import { UploadZone } from "@/components/demo/upload-zone";
import { UploadProgress } from "@/components/demo/upload-progress";

interface DashboardScanPanelProps {
  selectedModelId: string;
  onModelChange: (id: string) => void;
  onFileSelect: (file: File, schema?: string) => void;
  status?: string;
  uploadProgress?: number;
  uploadPhase?: string;
}

export function DashboardScanPanel({
  selectedModelId,
  onModelChange,
  onFileSelect,
  status,
  uploadProgress,
  uploadPhase,
}: DashboardScanPanelProps) {
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
    <div className="flex flex-col gap-4 lg:gap-6">
      <DashboardCard className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Document</h2>
            <p className="text-sm text-muted-foreground">PDF, image, or scanned file.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-3 py-2 text-sm font-medium sm:justify-start">
              <span>Schema</span>
              <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
            </label>
            <ModelSelector value={selectedModelId} onChange={onModelChange} />
          </div>
        </div>
        <div className="p-4 sm:p-6 lg:px-8">
          {status === "uploading" ? (
            <div className="flex min-h-[22rem] items-center justify-center p-6 border rounded-[1.75rem] bg-card/55">
              <UploadProgress progress={uploadProgress ?? 0} filename={selectedFile?.name || "document.pdf"} phase={uploadPhase as any} />
            </div>
          ) : selectedFile ? (
            <div className="flex flex-col items-center justify-center min-h-[22rem] p-6 border rounded-[1.75rem] bg-card/55 border-dashed">
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
        </div>
      </DashboardCard>

      {showAdvanced ? (
        <DashboardCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-4 sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Output schema</h2>
              <p className="text-sm text-muted-foreground">Define fields before scanning.</p>
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
          </div>
          <div className="max-h-[680px] overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:px-8">
            {isLoaded ? <SchemaEditor schema={jsonSchema} onChange={handleSchemaChange} mode={editorMode} /> : <Skeleton className="h-80 w-full rounded-2xl" />}
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
