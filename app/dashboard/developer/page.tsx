"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

type TabType = "keys" | "docs";
type DocLangType = "curl" | "python" | "javascript";

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<TabType>("keys");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpires, setNewKeyExpires] = useState<"never" | "30d" | "90d" | "1y">("never");
  const [creating, setCreating] = useState(false);
  
  // Reveal key state
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Docs code state
  const [activeLang, setActiveLang] = useState<DocLangType>("curl");
  const [activeApproach, setActiveApproach] = useState<"approachA" | "approachB">("approachA");

  // Fetch keys
  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/api-keys");
      if (!res.ok) throw new Error("Failed to load keys");
      const data = await res.json();
      setApiKeys(data);
    } catch (err) {
      toast.error("Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // Create Key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("API Key name is required.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          expiresIn: newKeyExpires,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create key");
      }

      const data = await res.json();
      setGeneratedKey(data.rawKey);
      setIsModalOpen(false);
      setNewKeyName("");
      setNewKeyExpires("never");
      toast.success("API Key successfully generated!");
      fetchKeys();
    } catch (err: any) {
      toast.error(err.message || "Failed to create API Key.");
    } finally {
      setCreating(false);
    }
  };

  // Revoke Key
  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API Key? Any application using this key will immediately lose access to the API.")) {
      return;
    }

    try {
      const res = await fetch(`/api/dashboard/api-keys?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke key");
      }

      toast.success("API Key successfully revoked.");
      fetchKeys();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke API key.");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Developer Portal
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-[15px]">
            Manage your API keys, read integration guides, and build programmatic ocr triggers.
          </p>
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 self-start sm:self-auto shadow-sm">
          <button
            onClick={() => setActiveTab("keys")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "keys"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            API Credentials
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "docs"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            }`}
          >
            API Documentation
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full">
        {/* Tab 1: API Keys Management */}
        {activeTab === "keys" && (
          <div className="space-y-6">
            {/* Generated Key Reveal Panel */}
            <AnimatePresence>
              {generatedKey && (
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="p-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                        Copy Your API Key
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
                        This key will be displayed **only once** for your security. Please save it in a secure password manager immediately.
                      </p>
                      
                      <div className="flex items-center gap-3 mt-4 max-w-xl">
                        <div className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 font-mono text-sm select-all overflow-x-auto truncate shadow-inner text-zinc-900 dark:text-zinc-50">
                          {generatedKey}
                        </div>
                        <button
                          onClick={() => handleCopy(generatedKey)}
                          className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md"
                        >
                          {copiedKey ? "Copied!" : "Copy Key"}
                        </button>
                      </div>
                      
                      <button
                        onClick={() => setGeneratedKey(null)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 mt-2 block underline"
                      >
                        I have stored the key securely
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keys Table Container */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-md overflow-hidden">
              <div className="p-6 border-b border-zinc-150 dark:border-zinc-800/80 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">API Keys</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Use keys to scan PDFs from your apps and terminals.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Key
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-3 text-sm">Loading API keys...</p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 space-y-4">
                  <div className="size-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-zinc-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">No active API keys found</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">Generate a key to integrate SnapText OCR directly into your custom pipelines and scripts.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">API Key</th>
                        <th className="px-6 py-4">Created At</th>
                        <th className="px-6 py-4">Expires At</th>
                        <th className="px-6 py-4">Last Used</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {apiKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 text-zinc-700 dark:text-zinc-300 transition-colors">
                          <td className="px-6 py-4 font-bold text-zinc-950 dark:text-zinc-50">
                            {key.name}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            {key.maskedKey}
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-500">
                            {new Date(key.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-500">
                            {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "Never"}
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-500">
                            {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never Used"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              className="px-3 py-1.5 rounded-lg border border-red-200/50 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Documentation */}
        {activeTab === "docs" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Nav & Info Panel (Left column) */}
            <div className="lg:col-span-1 space-y-6">
              {/* Approach Switcher */}
              <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-md space-y-4">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">Choose Integration Strategy</h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setActiveApproach("approachA")}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      activeApproach === "approachA"
                        ? "border-blue-500/80 bg-blue-50/20 dark:bg-blue-950/10"
                        : "border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full p-1 ${activeApproach === "approachA" ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Approach A: Hosted PDF Link</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Submit files hosted on your own storage or external public links. Single request.</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveApproach("approachB")}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      activeApproach === "approachB"
                        ? "border-blue-500/80 bg-blue-50/20 dark:bg-blue-950/10"
                        : "border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full p-1 ${activeApproach === "approachB" ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Approach B: Signed Upload Token</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Generate secure signed token, upload directly to storage, trigger job. Avoids server payload limits.</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Endpoint Reference Panel */}
              <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-md space-y-4">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">Endpoint Index</h3>
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="font-bold text-blue-600 dark:text-blue-400">POST</span>
                    <span className="text-zinc-700 dark:text-zinc-300">/api/v1/jobs</span>
                  </div>
                  {activeApproach === "approachB" && (
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <span className="font-bold text-blue-600 dark:text-blue-400">POST</span>
                      <span className="text-zinc-700 dark:text-zinc-300">/api/v1/jobs/upload-url</span>
                    </div>
                  )}
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="font-bold text-violet-600 dark:text-violet-400">GET</span>
                    <span className="text-zinc-700 dark:text-zinc-300">/api/v1/jobs/[id]</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="font-bold text-red-600 dark:text-red-400">POST</span>
                    <span className="text-zinc-700 dark:text-zinc-300">/api/v1/jobs/[id]/cancel</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Samples Panel (Right Column) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden flex flex-col h-full min-h-[500px]">
                {/* Header Bar */}
                <div className="px-5 py-4 bg-zinc-950/70 border-b border-zinc-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-red-500"></span>
                    <span className="size-2.5 rounded-full bg-yellow-500"></span>
                    <span className="size-2.5 rounded-full bg-green-500"></span>
                    <span className="text-xs text-zinc-500 font-mono ml-2">ocr_integration_sample</span>
                  </div>

                  <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-850">
                    <button
                      onClick={() => setActiveLang("curl")}
                      className={`px-3 py-1.5 text-[11px] font-mono rounded transition-colors ${
                        activeLang === "curl" ? "bg-zinc-850 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      curl
                    </button>
                    <button
                      onClick={() => setActiveLang("python")}
                      className={`px-3 py-1.5 text-[11px] font-mono rounded transition-colors ${
                        activeLang === "python" ? "bg-zinc-850 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Python
                    </button>
                    <button
                      onClick={() => setActiveLang("javascript")}
                      className={`px-3 py-1.5 text-[11px] font-mono rounded transition-colors ${
                        activeLang === "javascript" ? "bg-zinc-850 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Node.js
                    </button>
                  </div>
                </div>

                {/* Preformatted Code Content */}
                <div className="flex-1 p-6 font-mono text-xs overflow-x-auto text-zinc-350 select-all leading-relaxed whitespace-pre bg-zinc-900 shadow-inner">
                  {activeApproach === "approachA" && activeLang === "curl" && (
                    <code className="text-emerald-400">
{`# 1. Trigger the job using an external hosted PDF link
curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://snaptext.io'}/api/v1/jobs" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pdfUrl": "https://example.com/sample.pdf",
    "filename": "sample.pdf",
    "fileSize": 10240,
    "fileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "ocrModelId": null,
    "jsonSchema": null
  }'

# Returns:
# {"jobId": "uuid-here", "runId": "wrun_...", "status": "pending"}`}
                    </code>
                  )}

                  {activeApproach === "approachA" && activeLang === "python" && (
                    <code className="text-blue-400">
{`import requests

url = "${typeof window !== 'undefined' ? window.location.origin : 'https://snaptext.io'}/api/v1/jobs"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "pdfUrl": "https://example.com/sample.pdf",
    "filename": "sample.pdf",
    "fileSize": 10240,
    "fileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}

res = requests.post(url, headers=headers, json=payload)
job_info = res.json()
print(f"Triggered Job ID: {job_info['jobId']}")`}
                    </code>
                  )}

                  {activeApproach === "approachA" && activeLang === "javascript" && (
                    <code className="text-yellow-400">
{`const res = await fetch("${typeof window !== 'undefined' ? window.location.origin : 'https://snaptext.io'}/api/v1/jobs", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    pdfUrl: "https://example.com/sample.pdf",
    filename: "sample.pdf",
    fileSize: 10240,
    fileHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  })
});

const job = await res.json();
console.log("Job status:", job.status);`}
                    </code>
                  )}

                  {activeApproach === "approachB" && activeLang === "curl" && (
                    <code className="text-emerald-400">
{`# 1. Request client upload credentials for secure storage
curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://snaptext.io'}/api/v1/jobs/upload-url" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filename": "local.pdf",
    "fileSize": 1500000,
    "fileHash": "f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }'
 
# Returns:
# {"token": "ey...", "pathname": "uploads/f3b...", "uploadUrl": "..."}
 
# 2. Upload file directly to secure storage using PUT
curl -X PUT "https://blob.vercel-storage.com/uploads/f3b0c442...pdf" \\
  -H "x-client-token: <RETURNED_TOKEN>" \\
  -H "Content-Type: application/pdf" \\
  --data-binary "@local.pdf"
 
# 3. Create the OCR trigger with the uploaded public URL
curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://snaptext.io'}/api/v1/jobs" \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pdfUrl": "https://<BLOB_ID>.public.blob.vercel-storage.com/uploads/f3b0c442...pdf",
    "filename": "local.pdf",
    "fileSize": 1500000,
    "fileHash": "f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }'`}
                    </code>
                  )}
 
                  {activeApproach === "approachB" && activeLang === "python" && (
                    <code className="text-blue-400">
{`import requests
 
# 1. Get signed token details
url = "${typeof window !== 'undefined' ? window.location.origin : 'https://snaptext.io'}/api/v1/jobs/upload-url"
headers = {"Authorization": "Bearer YOUR_API_KEY"}
res = requests.post(url, headers=headers, json={
    "filename": "report.pdf",
    "fileSize": 10000,
    "fileHash": "f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}).json()
 
token = res["token"]
pathname = res["pathname"]
 
# 2. Stream local binary directly to secure storage
with open("report.pdf", "rb") as f:
    blob_res = requests.put(
        f"https://blob.vercel-storage.com/{pathname}",
        headers={"x-client-token": token, "Content-Type": "application/pdf"},
        data=f
    )
pdf_url = blob_res.url
 
# 3. Create OCR scanning task
job_res = requests.post(
    "${typeof window !== 'undefined' ? window.location.origin : 'https://snaptext.io'}/api/v1/jobs",
    headers=headers,
    json={
        "pdfUrl": pdf_url,
        "filename": "report.pdf",
        "fileSize": 10000,
        "fileHash": "f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
).json()
print("OCR Triggered:", job_res["jobId"])`}
                    </code>
                  )}
 
                  {activeApproach === "approachB" && activeLang === "javascript" && (
                    <code className="text-yellow-400">
{`// 1. Get signed token details
const credentialsRes = await fetch("${typeof window !== 'undefined' ? window.location.origin : 'https://snaptext.io'}/api/v1/jobs/upload-url", {
  method: "POST",
  headers: { "Authorization": "Bearer YOUR_API_KEY" },
  body: JSON.stringify({
    filename: "local.pdf",
    fileSize: 45000,
    fileHash: "f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  })
});
const { token, pathname } = await credentialsRes.json();
 
// 2. Upload file directly to secure storage (bypasses server body limit)
const blobRes = await fetch(\`https://blob.vercel-storage.com/\${pathname}\`, {
  method: "PUT",
  headers: {
    "x-client-token": token,
    "Content-Type": "application/pdf"
  },
  body: pdfBuffer // Buffer or Blob of target PDF file
});
const pdfUrl = blobRes.url;
 
// 3. Initiate OCR job
const jobRes = await fetch("${typeof window !== 'undefined' ? window.location.origin : 'https://snaptext.io'}/api/v1/jobs", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    pdfUrl,
    filename: "local.pdf",
    fileSize: 45000,
    fileHash: "f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  })
});
const job = await jobRes.json();
console.log("Started scanning:", job.jobId);`}
                    </code>
                  )}
                </div>

                {/* Footer Copy Action */}
                <div className="p-4 bg-zinc-950/40 border-t border-zinc-800 text-right">
                  <button
                    onClick={() => {
                      const text = document.querySelector(".overflow-x-auto")?.textContent || "";
                      handleCopy(text);
                    }}
                    className="h-8 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
                  >
                    Copy Code Snippet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Key Generation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-2xl z-10 w-full max-w-md relative overflow-hidden"
            >
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Generate API Key</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Provide details to construct a secure credentials token prefixing with `st-`.</p>

              <form onSubmit={handleCreateKey} className="space-y-4 mt-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Key Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Backend"
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-sm focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-50"
                    maxLength={32}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Expiration Period</label>
                  <select
                    value={newKeyExpires}
                    onChange={(e: any) => setNewKeyExpires(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-sm focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-50"
                  >
                    <option value="never">Never Expire</option>
                    <option value="30d">30 Days</option>
                    <option value="90d">90 Days</option>
                    <option value="1y">1 Year</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-10 px-4 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-md disabled:opacity-55"
                  >
                    {creating ? "Generating..." : "Generate Key"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
