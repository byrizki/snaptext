/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import useSWR from "swr";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PencilEdit02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
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

type OcrModel = {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  temperature: number;
  maxOutputTokens: number;
  config: any;
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
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(models.length / itemsPerPage));
  const paginatedModels = models.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [formData, setFormData] = useState<Partial<OcrModel>>({
    name: "",
    provider: "vercel",
    modelId: "",
    temperature: 0.3,
    maxOutputTokens: 4096,
    config: "{}",
  });

  const handleOpenSheet = (model?: OcrModel) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        ...model,
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
        config: "{}",
      });
    }
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Loading models...</TableCell></TableRow>
            ) : paginatedModels.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No models configured. Add one to get started.</TableCell></TableRow>
            ) : (
              paginatedModels.map((model) => (
                <TableRow key={model.id} className="group hover:bg-muted/10 transition-colors">
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{model.provider}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{model.modelId}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenSheet(model)} className="transition-opacity">
                      <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive transition-opacity" onClick={() => handleDelete(model.id)}>
                      <HugeiconsIcon icon={Delete02Icon} size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && models.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, models.length)}</span> of <span className="font-medium">{models.length}</span> models
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
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Provider Model ID</Label>
              <Input value={formData.modelId} onChange={(e) => setFormData({ ...formData, modelId: e.target.value })} placeholder="e.g. google/gemini-1.5-flash" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Temperature</Label>
                <Input type="number" step="0.1" min="0" max="2" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Output Tokens</Label>
                <Input type="number" step="100" min="100" value={formData.maxOutputTokens} onChange={(e) => setFormData({ ...formData, maxOutputTokens: parseInt(e.target.value) })} />
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
