"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PencilEdit02Icon, Delete02Icon, CpuIcon, FlashIcon, StarIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type OcrModel = {
  id: string;
  name: string;
  tier: "nano" | "flash" | "pro" | "max";
  provider: string;
  modelId: string;
  temperature: number;
  maxOutputTokens: number;
  config: any;
};

const TIER_CONFIGS = {
  nano: { icon: CpuIcon, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
  flash: { icon: FlashIcon, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  pro: { icon: StarIcon, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  max: { icon: SparklesIcon, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
};

export default function ModelsAdminPage() {
  const [models, setModels] = useState<OcrModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<OcrModel | null>(null);

  const [formData, setFormData] = useState<Partial<OcrModel>>({
    name: "",
    tier: "flash",
    provider: "vercel",
    modelId: "",
    temperature: 0.3,
    maxOutputTokens: 4096,
    config: {},
  });

  const fetchModels = async () => {
    try {
      const res = await fetch("/api/admin/models");
      if (res.ok) {
        setModels(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleOpenDialog = (model?: OcrModel) => {
    if (model) {
      setEditingModel(model);
      setFormData(model);
    } else {
      setEditingModel(null);
      setFormData({
        name: "",
        tier: "flash",
        provider: "vercel",
        modelId: "",
        temperature: 0.3,
        maxOutputTokens: 4096,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const isEditing = !!editingModel;
    const url = isEditing ? `/api/admin/models/${editingModel.id}` : "/api/admin/models";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        fetchModels();
      } else {
        alert("Failed to save model");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving model");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    try {
      const res = await fetch(`/api/admin/models/${id}`, { method: "DELETE" });
      if (res.ok) fetchModels();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OCR Models</h1>
          <p className="text-muted-foreground mt-1">Manage AI models available for document scanning.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <HugeiconsIcon icon={Add01Icon} size={16} /> Add Model
          </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Model ID</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading models...</TableCell></TableRow>
            ) : models.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No models configured. Add one to get started.</TableCell></TableRow>
            ) : (
              models.map((model) => {
                const TierIcon = TIER_CONFIGS[model.tier].icon;
                return (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{model.provider}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{model.modelId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 pr-2.5 ${TIER_CONFIGS[model.tier].color}`}>
                        <HugeiconsIcon icon={TIER_CONFIGS[model.tier].icon} size={14} />
                        <span className="capitalize">{model.tier}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(model)}>
                        <HugeiconsIcon icon={PencilEdit02Icon} size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(model.id)}>
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingModel ? "Edit Model" : "Add New Model"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Display Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Gemini 1.5 Flash" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Tier / Class</Label>
                <Select value={formData.tier} onValueChange={(val: any) => setFormData({ ...formData, tier: val })}>
                  <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nano">Nano (Fastest)</SelectItem>
                    <SelectItem value="flash">Flash (Balanced)</SelectItem>
                    <SelectItem value="pro">Pro (Smart)</SelectItem>
                    <SelectItem value="max">Max (Best)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Provider Model ID</Label>
              <Input value={formData.modelId} onChange={(e) => setFormData({ ...formData, modelId: e.target.value })} placeholder="e.g. @vercel/google/gemini-1.5-flash" />
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
              <div className="grid gap-2">
              <Label>Model Config (JSON)</Label>
              <Textarea 
                value={typeof formData.config === 'string' ? formData.config : JSON.stringify(formData.config, null, 2)} 
                onChange={(e) => setFormData({ ...formData, config: e.target.value })} 
                placeholder='e.g. { "thinking": { "type": "disabled" } }'
                className="font-mono text-xs h-24"
              />
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingModel ? "Save Changes" : "Create Model"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
