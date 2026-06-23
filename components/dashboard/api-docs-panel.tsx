"use client";

import { useMemo, useState, useEffect } from "react";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";

type Lang = "curl" | "python" | "javascript";
type Approach = "url" | "upload";

type Step = {
  id: string;
  title: string;
  description: string;
  method: "POST" | "GET" | "PUT";
  path: string;
};

const urlSteps: Step[] = [
  {
    id: "create-job",
    title: "1. Create OCR Job",
    description: "Submit a public URL of the PDF to start the OCR process.",
    method: "POST",
    path: "/api/v1/jobs",
  },
  {
    id: "get-status",
    title: "2. Check Job Status",
    description: "Retrieve results, logs, and state of the OCR task.",
    method: "GET",
    path: "/api/v1/jobs/[id]",
  },
  {
    id: "cancel-job",
    title: "3. Cancel OCR Job",
    description: "Abort a pending or running OCR task.",
    method: "POST",
    path: "/api/v1/jobs/[id]/cancel",
  },
];

const uploadSteps: Step[] = [
  {
    id: "get-upload-url",
    title: "1. Request Upload URL",
    description: "Get a temporary signed URL to upload your PDF directly.",
    method: "POST",
    path: "/api/v1/jobs/upload-url",
  },
  {
    id: "upload-file",
    title: "2. Upload PDF File",
    description: "Perform an HTTP PUT request to upload the raw binary PDF file.",
    method: "PUT",
    path: "<uploadUrl>",
  },
  {
    id: "create-job-uploaded",
    title: "3. Start OCR Job",
    description: "Initiate the OCR process using the uploaded PDF's URL.",
    method: "POST",
    path: "/api/v1/jobs",
  },
  {
    id: "get-status",
    title: "4. Check Job Status",
    description: "Retrieve results, logs, and state of the OCR task.",
    method: "GET",
    path: "/api/v1/jobs/[id]",
  },
  {
    id: "cancel-job",
    title: "5. Cancel OCR Job",
    description: "Abort a pending or running OCR task.",
    method: "POST",
    path: "/api/v1/jobs/[id]/cancel",
  },
];

const approaches = [
  { id: "url" as const, title: "Hosted file", body: "Send a public PDF URL in one request." },
  { id: "upload" as const, title: "Direct upload", body: "Request an upload URL, upload the file, then start OCR." },
];

const langs = ["curl", "python", "javascript"] as const;

export function ApiDocsPanel({ onCopy }: { onCopy: (value: string) => void }) {
  const [approach, setApproach] = useState<Approach>("url");
  const [lang, setLang] = useState<Lang>("curl");
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

  const steps = useMemo(() => {
    return approach === "url" ? urlSteps : uploadSteps;
  }, [approach]);

  // Reset selected step when changing approach
  useEffect(() => {
    setSelectedStepIndex(0);
  }, [approach]);

  const activeStep = steps[selectedStepIndex] || steps[0];

  const origin = typeof window !== "undefined" ? window.location.origin : "https://snaptext.io";
  const { code, response } = useMemo(() => {
    return getStepCodeAndResponse(origin, approach, activeStep.id, lang);
  }, [origin, approach, activeStep.id, lang]);

  const handleNext = () => {
    if (selectedStepIndex < steps.length - 1) {
      setSelectedStepIndex(selectedStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedStepIndex > 0) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Left Column: Config & Pipeline Steps */}
      <div className="space-y-6">
        <DashboardCard className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Integration path</h2>
          <p className="mt-1 text-xs text-muted-foreground mb-4">Choose how you deliver documents to the API.</p>
          <div className="space-y-3">
            {approaches.map((item) => (
              <button
                key={item.id}
                onClick={() => setApproach(item.id)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
                  approach === item.id 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <span className={cn(
                    "size-2 rounded-full",
                    approach === item.id ? "bg-primary" : "bg-transparent"
                  )} />
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{item.body}</p>
              </button>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Interactive Pipeline</h2>
          <p className="mt-1 text-xs text-muted-foreground mb-4">Follow the step-by-step workflow. Click a step to view API details.</p>
          <div className="space-y-2">
            {steps.map((item, idx) => {
              const isSelected = selectedStepIndex === idx;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl p-3 text-left transition duration-200 border border-transparent focus:outline-none",
                    isSelected 
                      ? "bg-primary/10 border-primary/20 shadow-sm" 
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  )}
                >
                  {/* Circle/Dot marker on timeline */}
                  <span className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all mt-0.5",
                    isSelected 
                      ? "bg-primary border-primary text-primary-foreground scale-110 shadow-sm" 
                      : "bg-background border-zinc-300 dark:border-zinc-700 text-muted-foreground"
                  )}>
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">{item.title.split(". ")[1]}</span>
                      <MethodBadge method={item.method} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-normal">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DashboardCard>
      </div>

      {/* Right Column: Code & Documentation details */}
      <div className="flex flex-col gap-6">
        <DashboardCard className="overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col h-full border-zinc-800">
          {/* Header Panel */}
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between bg-zinc-900/50">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <MethodBadge method={activeStep.method} size="lg" />
                <span className="font-mono text-xs font-semibold tracking-wide text-zinc-100 select-all">{activeStep.path}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 font-medium">{activeStep.description}</p>
            </div>
            
            <div className="flex shrink-0 rounded-xl border border-white/10 bg-white/5 p-1 self-start sm:self-auto">
              {langs.map((item) => (
                <button
                  key={item}
                  onClick={() => setLang(item)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 font-mono text-xs text-zinc-400 transition hover:text-zinc-100 focus:outline-none",
                    lang === item && "bg-white/10 text-zinc-100"
                  )}
                >
                  {item === "javascript" ? "node" : item}
                </button>
              ))}
            </div>
          </div>

          {/* Code display */}
          <div className="flex-1 relative">
            <div className="absolute right-4 top-4 z-20">
              <button 
                onClick={() => onCopy(code)} 
                className="h-8 rounded-lg bg-white/10 px-3 text-xs font-medium text-zinc-100 hover:bg-white/20 transition focus:outline-none"
              >
                Copy
              </button>
            </div>
            <pre className="max-h-[420px] min-h-[160px] overflow-auto p-5 text-xs font-mono leading-6 bg-zinc-950/80 scrollbar-thin scrollbar-thumb-zinc-800">
              <code className="block select-text whitespace-pre">{code}</code>
            </pre>
          </div>

          {/* Expected Response display */}
          {response && (
            <div className="border-t border-white/10 bg-zinc-900/30 p-5">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Expected Response</h3>
              <pre className="max-h-[220px] overflow-auto p-4 rounded-xl bg-zinc-950/50 border border-white/5 text-[11px] font-mono leading-5 text-zinc-300">
                <code>{response}</code>
              </pre>
            </div>
          )}

          {/* Navigation & Guide Controls */}
          <div className="border-t border-white/10 p-4 bg-zinc-900/50 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                disabled={selectedStepIndex === 0}
                className={cn(
                  "h-9 rounded-xl border border-white/10 px-4 text-xs font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition focus:outline-none"
                )}
              >
                Previous Step
              </button>
              <button
                onClick={handleNext}
                disabled={selectedStepIndex === steps.length - 1}
                className={cn(
                  "h-9 rounded-xl border border-white/10 px-4 text-xs font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition focus:outline-none"
                )}
              >
                Next Step
              </button>
            </div>
            <span className="text-[11px] text-zinc-500 font-medium">
              Step {selectedStepIndex + 1} of {steps.length}
            </span>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

function MethodBadge({ method, size = "sm" }: { method: "POST" | "GET" | "PUT"; size?: "sm" | "lg" }) {
  const isPost = method === "POST";
  const isGet = method === "GET";
  const isPut = method === "PUT";

  return (
    <span
      className={cn(
        "rounded-full font-bold uppercase tracking-wider shrink-0 select-none",
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-xs",
        isPost && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
        isGet && "bg-blue-500/10 text-blue-500 border border-blue-500/20",
        isPut && "bg-amber-500/10 text-amber-500 border border-amber-500/20"
      )}
    >
      {method}
    </span>
  );
}

function getStepCodeAndResponse(origin: string, approach: Approach, stepId: string, lang: Lang) {
  // Hosted file / URL path
  if (approach === "url") {
    if (stepId === "create-job") {
      const response = `{\n  "jobId": "29c2e3a3-e383-4ed4-a30c-abdcc540a13a",\n  "status": "pending"\n}`;
      if (lang === "curl") {
        return {
          response,
          code: `curl -X POST "${origin}/api/v1/jobs" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "pdfUrl": "https://example.com/invoice.pdf",\n    "jsonSchema": "{\\"type\\":\\"object\\",\\"properties\\":{\\"total\\":{\\"type\\":\\"number\\"}}}"\n  }'`
        };
      }
      if (lang === "python") {
        return {
          response,
          code: `import requests\n\nres = requests.post(\n    "${origin}/api/v1/jobs",\n    headers={"Authorization": "Bearer YOUR_API_KEY"},\n    json={\n        "pdfUrl": "https://example.com/invoice.pdf",\n        "jsonSchema": '{"type":"object","properties":{"total":{"type":"number"}}}'\n    }\n)\nprint(res.json())`
        };
      }
      return {
        response,
        code: `const res = await fetch("${origin}/api/v1/jobs", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    pdfUrl: "https://example.com/invoice.pdf",\n    jsonSchema: JSON.stringify({\n      type: "object",\n      properties: { total: { type: "number" } }\n    })\n  })\n});\nconsole.log(await res.json());`
      };
    }

    if (stepId === "get-status") {
      const response = `{\n  "id": "29c2e3a3-e383-4ed4-a30c-abdcc540a13a",\n  "status": "completed", // pending | running | completed | failed\n  "result": {\n    "totalPages": 1,\n    "pages": [\n      {\n        "pageNumber": 1,\n        "data": {\n          "total": 1250.00\n        }\n      }\n    ]\n  }\n}`;
      if (lang === "curl") {
        return {
          response,
          code: `curl -X GET "${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>"`
        };
      }
      if (lang === "python") {
        return {
          response,
          code: `import requests\n\nres = requests.get(\n    "${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a",\n    headers={"Authorization": "Bearer YOUR_API_KEY"}\n)\nprint(res.json())`
        };
      }
      return {
        response,
        code: `const res = await fetch("${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a", {\n  method: "GET",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY"\n  }\n});\nconsole.log(await res.json());`
      };
    }

    if (stepId === "cancel-job") {
      const response = `{\n  "success": true,\n  "message": "Job cancelled"\n}`;
      if (lang === "curl") {
        return {
          response,
          code: `curl -X POST "${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a/cancel" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>"`
        };
      }
      if (lang === "python") {
        return {
          response,
          code: `import requests\n\nres = requests.post(\n    "${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a/cancel",\n    headers={"Authorization": "Bearer YOUR_API_KEY"}\n)\nprint(res.json())`
        };
      }
      return {
        response,
        code: `const res = await fetch("${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a/cancel", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY"\n  }\n});\nconsole.log(await res.json());`
      };
    }
  }

  // Direct upload path
  if (stepId === "get-upload-url") {
    const response = `{\n  "uploadUrl": "https://i3nginsnjk2ynhvj.public.blob.vercel-storage.com/...",\n  "pdfUrl": "https://i3nginsnjk2ynhvj.public.blob.vercel-storage.com/..."\n}`;
    if (lang === "curl") {
      return {
        response,
        code: `curl -X POST "${origin}/api/v1/jobs/upload-url" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "filename": "invoice.pdf",\n    "fileSize": 1500000\n  }'`
      };
    }
    if (lang === "python") {
      return {
        response,
        code: `import requests\n\nres = requests.post(\n    "${origin}/api/v1/jobs/upload-url",\n    headers={"Authorization": "Bearer YOUR_API_KEY"},\n    json={"filename": "invoice.pdf", "fileSize": 1500000}\n)\nprint(res.json())`
      };
    }
    return {
      response,
      code: `const res = await fetch("${origin}/api/v1/jobs/upload-url", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    filename: "invoice.pdf",\n    fileSize: 1500000\n  })\n});\nconsole.log(await res.json());`
    };
  }

  if (stepId === "upload-file") {
    const response = `// HTTP 200 OK (Empty response body)`;
    if (lang === "curl") {
      return {
        response,
        code: `curl -X PUT "https://i3nginsnjk2ynhvj.public.blob.vercel-storage.com/..." \\\n  -H "Content-Type: application/pdf" \\\n  --data-binary "@/path/to/invoice.pdf"`
      };
    }
    if (lang === "python") {
      return {
        response,
        code: `# upload_url is retrieved from the previous Request Upload URL step\nwith open("invoice.pdf", "rb") as file:\n    requests.put(upload_url, data=file)`
      };
    }
    return {
      response,
      code: `// uploadUrl is retrieved from the previous Request Upload URL step\nawait fetch(uploadUrl, {\n  method: "PUT",\n  body: pdfBlob // Blob or File object\n});`
    };
  }

  if (stepId === "create-job-uploaded") {
    const response = `{\n  "jobId": "29c2e3a3-e383-4ed4-a30c-abdcc540a13a",\n  "status": "pending"\n}`;
    if (lang === "curl") {
      return {
        response,
        code: `curl -X POST "${origin}/api/v1/jobs" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "pdfUrl": "https://i3nginsnjk2ynhvj.public.blob.vercel-storage.com/...",\n    "jsonSchema": "{\\"type\\":\\"object\\",\\"properties\\":{\\"total\\":{\\"type\\":\\"number\\"}}}"\n  }'`
      };
    }
    if (lang === "python") {
      return {
        response,
        code: `# pdfUrl is retrieved from the previous Request Upload URL step\nimport requests\n\nres = requests.post(\n    "${origin}/api/v1/jobs",\n    headers={"Authorization": "Bearer YOUR_API_KEY"},\n    json={\n        "pdfUrl": pdf_url,\n        "jsonSchema": '{"type":"object","properties":{"total":{"type":"number"}}}'\n    }\n)\nprint(res.json())`
      };
    }
    return {
      response,
      code: `// pdfUrl is retrieved from the previous Request Upload URL step\nconst res = await fetch("${origin}/api/v1/jobs", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    pdfUrl: pdfUrl,\n    jsonSchema: JSON.stringify({\n      type: "object",\n      properties: { total: { type: "number" } }\n    })\n  })\n});\nconsole.log(await res.json());`
    };
  }

  if (stepId === "get-status") {
    const response = `{\n  "id": "29c2e3a3-e383-4ed4-a30c-abdcc540a13a",\n  "status": "completed",\n  "result": {\n    "totalPages": 1,\n    "pages": [\n      {\n        "pageNumber": 1,\n        "data": {\n          "total": 1250.00\n        }\n      }\n    ]\n  }\n}`;
    if (lang === "curl") {
      return {
        response,
        code: `curl -X GET "${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>"`
      };
    }
    if (lang === "python") {
      return {
        response,
        code: `import requests\n\nres = requests.get(\n    "${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a",\n    headers={"Authorization": "Bearer YOUR_API_KEY"}\n)\nprint(res.json())`
      };
    }
    return {
      response,
      code: `const res = await fetch("${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a", {\n  method: "GET",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY"\n  }\n});\nconsole.log(await res.json());`
    };
  }

  if (stepId === "cancel-job") {
    const response = `{\n  "success": true,\n  "message": "Job cancelled"\n}`;
    if (lang === "curl") {
      return {
        response,
        code: `curl -X POST "${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a/cancel" \\\n  -H "Authorization: Bearer <YOUR_API_KEY>"`
      };
    }
    if (lang === "python") {
      return {
        response,
        code: `import requests\n\nres = requests.post(\n    "${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a/cancel",\n    headers={"Authorization": "Bearer YOUR_API_KEY"}\n)\nprint(res.json())`
      };
    }
    return {
      response,
      code: `const res = await fetch("${origin}/api/v1/jobs/29c2e3a3-e383-4ed4-a30c-abdcc540a13a/cancel", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer YOUR_API_KEY"\n  }\n});\nconsole.log(await res.json());`
    };
  }

  return { code: "", response: "" };
}
