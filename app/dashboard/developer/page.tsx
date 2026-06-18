"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiDocsPanel } from "@/components/dashboard/api-docs-panel";
import { ApiKeyReveal } from "@/components/dashboard/api-key-reveal";
import { ApiKeysPanel, type ApiKey } from "@/components/dashboard/api-keys-panel";
import { CreateApiKeyModal } from "@/components/dashboard/create-api-key-modal";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { DeveloperTabs, type DeveloperTab } from "@/components/dashboard/developer-tabs";

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<DeveloperTab>("keys");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpires, setNewKeyExpires] = useState<"never" | "30d" | "90d" | "1y">("never");
  const [creating, setCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/api-keys");
      if (!res.ok) throw new Error("Failed to load keys");
      setApiKeys(await res.json());
    } catch {
      toast.error("Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (event: FormEvent) => {
    event.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("API key name is required.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName, expiresIn: newKeyExpires }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");

      setGeneratedKey(data.rawKey);
      setIsModalOpen(false);
      setNewKeyName("");
      setNewKeyExpires("never");
      toast.success("API key created.");
      fetchKeys();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Revoke this API key? Apps using it will lose access immediately.")) return;

    try {
      const res = await fetch(`/api/dashboard/api-keys?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to revoke key");
      toast.success("API key revoked.");
      fetchKeys();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke API key.");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success("Copied to clipboard.");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <DashboardPageShell
      eyebrow="Developer"
      title="API access"
      description="Manage server keys and copy the request patterns you need."
      actions={<DeveloperTabs value={activeTab} onChange={setActiveTab} />}
    >
      {activeTab === "keys" ? (
        <div className="space-y-4">
          {generatedKey ? <ApiKeyReveal apiKey={generatedKey} copied={copiedKey} onCopy={handleCopy} onDismiss={() => setGeneratedKey(null)} /> : null}
          <ApiKeysPanel apiKeys={apiKeys} loading={loading} onCreate={() => setIsModalOpen(true)} onRevoke={handleRevokeKey} />
        </div>
      ) : (
        <ApiDocsPanel onCopy={handleCopy} />
      )}

      <CreateApiKeyModal
        open={isModalOpen}
        name={newKeyName}
        expires={newKeyExpires}
        creating={creating}
        onNameChange={setNewKeyName}
        onExpiresChange={setNewKeyExpires}
        onSubmit={handleCreateKey}
        onClose={() => setIsModalOpen(false)}
      />
    </DashboardPageShell>
  );
}
