import { HugeiconsIcon } from "@hugeicons/react";
import { ApiIcon, FileUploadIcon, AiSheetsIcon, SearchVisualIcon } from "@hugeicons/core-free-icons";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/landing/section-heading";

const features = [
  {
    title: "Upload any common document",
    description: "Start with PDFs, receipts, forms, invoices, or document photos from a phone.",
    icon: FileUploadIcon,
  },
  {
    title: "Read layout, not just text",
    description: "Extract text, tables, totals, dates, and line items while keeping field context.",
    icon: SearchVisualIcon,
  },
  {
    title: "Shape the JSON",
    description: "Add the fields you expect before scanning so output is easier to review and store.",
    icon: AiSheetsIcon,
  },
  {
    title: "Move to API later",
    description: "Use the same scan workflow from your backend when the browser demo is not enough.",
    icon: ApiIcon,
  },
];

export function Features() {
  return (
    <section id="features" className="relative z-10 px-4 py-16 sm:px-6 sm:py-24">
      <div className="absolute left-0 top-1/4 -z-10 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <SectionHeading
            eyebrow="Workflow"
            title="A clean path from file to fields."
            description="SnapText keeps the first scan simple, then gives you enough control to repeat it in production."
          />
          <div className="rounded-[2rem] border bg-card/70 p-3 shadow-[0_0_60px_rgba(59,130,246,0.08)] backdrop-blur">
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted-foreground sm:text-sm">
              {['Drop file', 'Pick fields', 'Export JSON'].map((step, index) => (
                <div key={step} className="rounded-full border bg-background/70 px-3 py-2">
                  <span className="mr-1 text-primary">0{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="group overflow-hidden rounded-[1.75rem] border-border/70 bg-card/85 shadow-sm transition hover:border-primary/30 hover:shadow-[0_0_48px_rgba(59,130,246,0.12)]">
              <CardContent className="relative">
                <div className="absolute -right-10 -top-10 size-28 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
                <div className="mb-8 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <HugeiconsIcon icon={feature.icon} className="size-5" />
                </div>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">{feature.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
