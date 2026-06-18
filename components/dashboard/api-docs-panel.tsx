"use client";

import { useMemo, useState } from "react";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

type Lang = "curl" | "python" | "javascript";
type Approach = "url" | "upload";

const approaches = [
  { id: "url" as const, title: "Hosted file", body: "Send a public PDF URL in one request." },
  { id: "upload" as const, title: "Direct upload", body: "Request an upload URL, upload the file, then start OCR." },
];

const langs = ["curl", "python", "javascript"] as const;

export function ApiDocsPanel({ onCopy }: { onCopy: (value: string) => void }) {
  const [approach, setApproach] = useState<Approach>("url");
  const [lang, setLang] = useState<Lang>("curl");

  const origin = typeof window !== "undefined" ? window.location.origin : "https://snaptext.io";
  const code = useMemo(() => getCodeSample(origin, approach, lang), [origin, approach, lang]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:gap-6">
      <div className="space-y-4">
        <DashboardCard className="p-4 sm:p-5">
          <h2 className="text-base font-semibold text-foreground">Integration path</h2>
          <div className="mt-4 space-y-2">
            {approaches.map((item) => (
              <button
                key={item.id}
                onClick={() => setApproach(item.id)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition hover:bg-accent",
                  approach === item.id && "border-primary/30 bg-primary/10"
                )}
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
              </button>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard className="p-4 sm:p-5">
          <h2 className="text-base font-semibold text-foreground">Endpoints</h2>
          <div className="mt-4 space-y-2 font-mono text-xs">
            <Endpoint method="POST" path="/api/v1/jobs" />
            {approach === "upload" ? <Endpoint method="POST" path="/api/v1/jobs/upload-url" /> : null}
            <Endpoint method="GET" path="/api/v1/jobs/[id]" />
            <Endpoint method="POST" path="/api/v1/jobs/[id]/cancel" />
          </div>
        </DashboardCard>
      </div>

      <DashboardCard className="overflow-hidden bg-zinc-950 text-zinc-100">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-zinc-400">ocr_sample</p>
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            {langs.map((item) => (
              <button
                key={item}
                onClick={() => setLang(item)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-mono text-xs text-zinc-400 transition hover:text-zinc-100",
                  lang === item && "bg-white/10 text-zinc-100"
                )}
              >
                {item === "javascript" ? "node" : item}
              </button>
            ))}
          </div>
        </div>
        <pre className="max-h-[560px] overflow-auto p-4 text-xs leading-6 sm:p-6"><code>{code}</code></pre>
        <div className="border-t border-white/10 p-4 text-right">
          <button onClick={() => onCopy(code)} className="h-9 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200">
            Copy code
          </button>
        </div>
      </DashboardCard>
    </div>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-3 py-2">
      <span className="text-muted-foreground">{path}</span>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{method}</span>
    </div>
  );
}

function getCodeSample(origin: string, approach: Approach, lang: Lang) {
  if (approach === "url" && lang === "curl") {
    return `curl -X POST "${origin}/api/v1/jobs" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"pdfUrl":"https://example.com/invoice.pdf","filename":"invoice.pdf","fileSize":10240}'`;
  }
  if (approach === "url" && lang === "python") {
    return `import requests\n\nres = requests.post(\n    "${origin}/api/v1/jobs",\n    headers={"Authorization": "Bearer YOUR_API_KEY"},\n    json={"pdfUrl": "https://example.com/invoice.pdf", "filename": "invoice.pdf", "fileSize": 10240}\n)\nprint(res.json()["jobId"])`;
  }
  if (approach === "url") {
    return `const res = await fetch("${origin}/api/v1/jobs", {\n  method: "POST",\n  headers: {\n    Authorization: "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    pdfUrl: "https://example.com/invoice.pdf",\n    filename: "invoice.pdf",\n    fileSize: 10240\n  })\n});\nconsole.log(await res.json());`;
  }
  if (lang === "curl") {
    return `curl -X POST "${origin}/api/v1/jobs/upload-url" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"filename":"invoice.pdf","fileSize":1500000}'\n\n# PUT the file to the returned uploadUrl, then POST /api/v1/jobs with the returned pdfUrl.`;
  }
  if (lang === "python") {
    return `import requests\n\ncreds = requests.post(\n    "${origin}/api/v1/jobs/upload-url",\n    headers={"Authorization": "Bearer YOUR_API_KEY"},\n    json={"filename": "invoice.pdf", "fileSize": 1500000}\n).json()\n\nwith open("invoice.pdf", "rb") as file:\n    requests.put(creds["uploadUrl"], data=file)\n\njob = requests.post("${origin}/api/v1/jobs", headers={"Authorization": "Bearer YOUR_API_KEY"}, json={"pdfUrl": creds["pdfUrl"]})\nprint(job.json())`;
  }
  return `const creds = await fetch("${origin}/api/v1/jobs/upload-url", {\n  method: "POST",\n  headers: { Authorization: "Bearer YOUR_API_KEY", "Content-Type": "application/json" },\n  body: JSON.stringify({ filename: "invoice.pdf", fileSize: 1500000 })\n}).then((res) => res.json());\n\nawait fetch(creds.uploadUrl, { method: "PUT", body: pdfBlob });\n\nconst job = await fetch("${origin}/api/v1/jobs", {\n  method: "POST",\n  headers: { Authorization: "Bearer YOUR_API_KEY", "Content-Type": "application/json" },\n  body: JSON.stringify({ pdfUrl: creds.pdfUrl })\n});\nconsole.log(await job.json());`;
}
