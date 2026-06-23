/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import useSWR from "swr";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PencilEdit02Icon, Delete02Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type OcrModel = {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  temperature: number;
  maxOutputTokens: number;
  priority: number;
  inputPrice: number;
  outputPrice: number;
  config: any;
  isEnabled: boolean;
};

export default function ModelsAdminPage() {
  const { data: modelsData = [], isLoading, mutate } = useSWR<OcrModel[]>(
    "/api/admin/models",
    (url: string) => fetch(url).then((r) => r.json())
  );
  const models = Array.isArray(modelsData) ? modelsData : [];

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<OcrModel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Group models by name
  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.name]) {
      acc[model.name] = [];
    }
    acc[model.name].push(model);
    return acc;
  }, {} as Record<string, OcrModel[]>);

  const groupNames = Object.keys(groupedModels);
  const totalPages = Math.max(1, Math.ceil(groupNames.length / itemsPerPage));
  const paginatedGroupNames = groupNames.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [formData, setFormData] = useState<Partial<OcrModel>>({
    name: "",
    provider: "vercel",
    modelId: "",
    temperature: 0.3,
    maxOutputTokens: 4096,
    priority: 1,
    inputPrice: 0,
    outputPrice: 0,
    config: "{}",
    isEnabled: true,
  });
  const handleOpenSheet = (model?: OcrModel) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        ...model,
        priority: model.priority ?? 1,
        inputPrice: model.inputPrice ?? 0,
        outputPrice: model.outputPrice ?? 0,
        isEnabled: model.isEnabled ?? true,
        config: typeof model.config === 'string' ? model.config : JSON.stringify(model.config || {}, null, 2)
      });
    } else {
      setEditingModel(null);
      setFormData({
        name: "",
        provider: "vercel",
        modelId: "",
        temperature: 0.3,
        maxOutputTokens: 4096,
        priority: 1,
        inputPrice: 0,
        outputPrice: 0,
        config: "{}",
        isEnabled: true,
      });
    }
    setIsSheetOpen(true);
  };

  const handleDuplicateSheet = (model: OcrModel) => {
    setEditingModel(null);
    setFormData({
      ...model,
      id: undefined,
      name: `${model.name} (Copy)`,
      priority: model.priority ?? 1,
      inputPrice: model.inputPrice ?? 0,
      outputPrice: model.outputPrice ?? 0,
      isEnabled: model.isEnabled ?? true,
      config: typeof model.config === 'string' ? model.config : JSON.stringify(model.config || {}, null, 2)
    });
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const isEditing = !!editingModel;
    const url = isEditing ? `/api/admin/models/${editingModel.id}` : "/api/admin/models";
    const method = isEditing ? "PUT" : "POST";

    let parsedConfig = {};
    try {
      parsedConfig = typeof formData.config === 'string' ? JSON.parse(formData.config || '{}') : formData.config;
    } catch (e: any) {
      toast.error("Invalid JSON configuration." + e?.message);
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, config: parsedConfig }),
      });

      if (res.ok) {
        toast.success(isEditing ? "Model updated" : "Model created");
        setIsSheetOpen(false);
        mutate();
      } else {
        toast.error("Failed to save model");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving model");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    try {
      const res = await fetch(`/api/admin/models/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Model deleted");
        mutate();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete model");
    }
  };

  return (
    <DashboardPageShell
      eyebrow="Admin"
      title="OCR models"
      description="Manage the model options available during document scanning."
      actions={(
        <Button onClick={() => handleOpenSheet()} className="gap-2 rounded-2xl shadow-sm">
          <HugeiconsIcon icon={Add01Icon} size={16} /> Add model
        </Button>
      )}
    >
      <DashboardCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Model ID</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Pricing ($/1M tokens)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading models...</TableCell></TableRow>
            ) : groupNames.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No models configured. Add one to get started.</TableCell></TableRow>
            ) : (
              paginatedGroupNames.flatMap((groupName) => [
                <TableRow key={`group-${groupName}`} className="bg-muted/10 font-semibold hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 border-l-2 border-l-primary">
                  <TableCell colSpan={7} className="py-2.5 px-4 text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      <span>{groupName}</span>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                        {groupedModels[groupName].length} {groupedModels[groupName].length === 1 ? 'configuration' : 'configurations'}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>,
                ...groupedModels[groupName].map((model) => (
                  <TableRow key={model.id} className="group hover:bg-muted/5 transition-colors border-l-2 border-l-transparent">
                    <TableCell className="pl-6 font-normal text-muted-foreground text-xs">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-muted-foreground/30">└─</span> Config
                      </span>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{model.provider}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{model.modelId}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{model.priority}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      In: ${model.inputPrice?.toFixed(2) ?? "0.00"} | Out: ${model.outputPrice?.toFixed(2) ?? "0.00"}
                    </TableCell>
                    <TableCell>
                      {model.isEnabled !== false ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicateSheet(model)} className="transition-opacity" title="Copy configuration">
                        <HugeiconsIcon icon={Copy01Icon} size={16} className="text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenSheet(model)} className="transition-opacity" title="Edit configuration">
                        <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive transition-opacity" onClick={() => handleDelete(model.id)} title="Delete configuration">
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ])
            )}
          </TableBody>
        </Table>

        {!isLoading && groupNames.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, groupNames.length)}</span> of <span className="font-medium">{groupNames.length}</span> model groups
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </DashboardCard>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto min-w-lg">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingModel ? "Edit Model" : "Add New Model"}</SheetTitle>
            <SheetDescription>Configure parameters for the language model.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 px-4">
            <div className="grid gap-2">
              <Label>Display Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Gemini 1.5 Flash" />
            </div>
            
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select value={formData.provider ?? undefined} onValueChange={(val) => setFormData({ ...formData, provider: val ?? undefined })}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vercel">Vercel AI Gateway</SelectItem>
                  <SelectItem value="cloudflare">Cloudflare Workers AI</SelectItem>
                  <SelectItem value="sumopod">Sumopod AI</SelectItem>
                  <SelectItem value="nvidia">Nvidia NIM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Provider Model ID</Label>
              <Input value={formData.modelId} onChange={(e) => setFormData({ ...formData, modelId: e.target.value })} placeholder="e.g. google/gemini-1.5-flash" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Temperature</Label>
                <Input type="number" step="0.1" min="0" max="2" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Tokens</Label>
                <Input type="number" step="100" min="100" value={formData.maxOutputTokens} onChange={(e) => setFormData({ ...formData, maxOutputTokens: parseInt(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Priority / Weight</Label>
                <Input type="number" min="1" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Input Price ($ / 1M tokens)</Label>
                <Input type="number" step="0.01" min="0" value={formData.inputPrice} onChange={(e) => setFormData({ ...formData, inputPrice: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Output Price ($ / 1M tokens)</Label>
                <Input type="number" step="0.01" min="0" value={formData.outputPrice} onChange={(e) => setFormData({ ...formData, outputPrice: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Model Config (JSON)</Label>
              <Textarea 
                value={formData.config} 
                onChange={(e) => setFormData({ ...formData, config: e.target.value })} 
                placeholder='e.g. { "thinking": { "type": "disabled" } }'
                className="font-mono text-xs h-32"
              />
            </div>

            <div className="flex items-center justify-between border p-3 rounded-2xl bg-muted/20">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium">Enabled</Label>
                <span className="text-xs text-muted-foreground">Only active models can be selected or used for OCR.</span>
              </div>
              <Switch 
                checked={formData.isEnabled !== false} 
                onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })} 
              />
            </div>
          </div>
          <SheetFooter className="mt-8">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : (editingModel ? "Save Changes" : "Create Model")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </DashboardPageShell>
  );
}
