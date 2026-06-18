import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, CheckmarkCircle02Icon, FileUploadIcon, MagicWand01Icon } from "@hugeicons/core-free-icons";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const proofPoints = ["No account needed", "PDFs and images", "JSON-ready output"];

const extractedFields = [
  ["vendor", "Northline Studio"],
  ["invoice_id", "INV-4837"],
  ["due_date", "2026-02-14"],
  ["total", "$1,284.75"],
];

export function Hero() {
  return (
    <section className="relative z-10 px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:pt-40">
      <div className="absolute left-1/2 top-20 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute right-0 top-48 -z-10 h-80 w-80 rounded-full bg-[oklch(0.6_0.18_300)]/20 blur-3xl" />

      <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:items-center">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1.5 text-sm font-medium text-primary shadow-[0_0_36px_rgba(59,130,246,0.18)] backdrop-blur">
            <HugeiconsIcon icon={MagicWand01Icon} className="size-4" />
            Browser demo is ready
          </div>

          <h1 className="text-balance text-5xl font-semibold tracking-[-0.06em] text-foreground sm:text-6xl lg:text-7xl">
            Turn documents into structured data.
          </h1>
          <p className="mt-6 max-w-[58ch] text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
            Upload a PDF or image, choose the fields you need, and get text, tables, and JSON without building an OCR pipeline.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/demo" className={buttonVariants({ size: "lg", className: "h-12 gap-2 px-6 shadow-[0_0_40px_rgba(59,130,246,0.22)]" })}>
              Try a scan
              <HugeiconsIcon icon={ArrowRight02Icon} className="size-4" />
            </Link>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 bg-card/70 px-6 backdrop-blur" })}>
              Open dashboard
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {proofPoints.map((point) => (
              <div key={point} className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-2 text-sm text-muted-foreground backdrop-blur">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4 text-primary" />
                {point}
              </div>
            ))}
          </div>
        </div>

        <Card className="relative overflow-hidden rounded-[2rem] border-primary/15 bg-card/80 shadow-[0_0_90px_rgba(59,130,246,0.16)] backdrop-blur-xl">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-24 left-10 size-72 rounded-full bg-[oklch(0.6_0.18_300)]/15 blur-3xl" />

          <CardContent className="relative">
            <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="rounded-[1.5rem] border bg-background/70 p-4 shadow-inner">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">invoice.pdf</p>
                    <p className="text-xs text-muted-foreground">4 pages · 2 tables</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">scanning</span>
                </div>

                <div className="relative overflow-hidden rounded-2xl border bg-card/70 p-4">
                  <div className="mb-4 flex items-center gap-3 rounded-xl border bg-background/70 p-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <HugeiconsIcon icon={FileUploadIcon} className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Upload complete</p>
                      <p className="text-xs text-muted-foreground">Reading layout and text</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[92, 76, 84, 62, 70, 48].map((width, index) => (
                      <div key={index} className="h-3 rounded-full bg-muted" style={{ width: `${width}%` }} />
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-muted-foreground">
                  {['Upload', 'Read', 'Export'].map((step, index) => (
                    <div key={step} className={cn("rounded-full border px-2 py-1.5", index < 2 ? "bg-primary/10 text-primary" : "bg-card/70")}>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border bg-background/80 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Structured output</p>
                    <p className="text-xs text-muted-foreground">Fields match your schema</p>
                  </div>
                  <span className="rounded-full border bg-card px-2.5 py-1 text-xs font-semibold text-primary">JSON</span>
                </div>

                <div className="space-y-2.5">
                  {extractedFields.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[0.8fr_1.2fr] gap-3 rounded-2xl border bg-card/70 px-3 py-3 text-sm">
                      <span className="truncate font-mono text-xs text-muted-foreground">{key}</span>
                      <span className="truncate text-right font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>

                <pre className="mt-4 overflow-hidden rounded-2xl border bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-300">
{`{
  "status": "ready",
  "confidence": 0.97,
  "items": 2
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
