import { HugeiconsIcon } from "@hugeicons/react";
import { FlashIcon, PencilEdit02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/landing/section-heading";

const models = [
  {
    name: "Spark",
    badge: "Fastest",
    description: "Clean printed documents when speed matters most.",
    speed: "under 1s",
    reasoning: "basic",
    handwriting: "No",
    bestFor: "receipts, simple invoices, printed forms",
    icon: FlashIcon,
  },
  {
    name: "Flux",
    badge: "Balanced",
    description: "Mixed layouts with tables, notes, and inconsistent spacing.",
    speed: "2-5s",
    reasoning: "advanced",
    handwriting: "Partial",
    bestFor: "reports, tables, medical records",
    icon: SparklesIcon,
  },
  {
    name: "Zenith",
    badge: "Hard scans",
    description: "Blurry photos, older scans, and documents with handwriting.",
    speed: "variable",
    reasoning: "deep",
    handwriting: "Yes",
    bestFor: "cursive, old documents, low-quality photos",
    icon: PencilEdit02Icon,
  },
];

export function ModelComparison() {
  return (
    <section id="models" className="relative z-10 px-4 py-16 sm:px-6 sm:py-24">
      <div className="absolute right-0 top-24 -z-10 size-96 rounded-full bg-[oklch(0.6_0.18_300)]/12 blur-3xl" />
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Models"
          title="Match the model to the document."
          description="Use a quick model for clean files and a deeper model when the scan quality or layout needs more reasoning."
          align="center"
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {models.map((model) => (
            <Card key={model.name} className="group overflow-hidden rounded-[1.75rem] border-border/70 bg-card/85 shadow-sm transition hover:border-primary/30 hover:shadow-[0_0_56px_rgba(139,92,246,0.12)]">
              <CardContent className="flex min-h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <HugeiconsIcon icon={model.icon} className="size-5" />
                  </div>
                  <Badge variant="secondary" className="rounded-full">{model.badge}</Badge>
                </div>

                <div className="mt-7 min-h-36">
                  <h3 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{model.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{model.description}</p>
                </div>

                <dl className="mt-2 grid gap-2 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border bg-background/60 px-3 py-3">
                    <dt className="text-muted-foreground">Speed</dt>
                    <dd className="font-mono font-medium text-foreground">{model.speed}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border bg-background/60 px-3 py-3">
                    <dt className="text-muted-foreground">Reasoning</dt>
                    <dd className="font-medium text-foreground">{model.reasoning}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border bg-background/60 px-3 py-3">
                    <dt className="text-muted-foreground">Handwriting</dt>
                    <dd className="font-medium text-foreground">{model.handwriting}</dd>
                  </div>
                </dl>

                <p className="mt-auto pt-6 text-sm leading-6 text-muted-foreground">Best for {model.bestFor}.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
