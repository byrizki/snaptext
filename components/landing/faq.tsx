import { HugeiconsIcon } from "@hugeicons/react";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/landing/section-heading";

const faqs = [
  {
    question: "How does per-page pricing work?",
    answer: "Each processed page counts once. Model choice can change the page rate, but there is no monthly minimum for trying the product.",
  },
  {
    question: "Can SnapText read handwriting?",
    answer: "Yes. Zenith is built for cursive, older scans, and uneven handwriting. Spark and Flux are better for printed text.",
  },
  {
    question: "Can I request JSON fields?",
    answer: "Yes. Add a schema before the scan and SnapText returns structured JSON for the fields you asked for.",
  },
  {
    question: "What happens to uploaded files?",
    answer: "Files are encrypted in transfer and storage. Retention controls can remove processed files after the workflow is done.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative z-10 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <SectionHeading
            eyebrow="FAQ"
            title="Answers before your first scan."
            description="A few details about pricing, handwriting, structured output, and file handling."
          />
        </div>

        <div className="grid gap-3">
          {faqs.map((faq, index) => (
            <Card key={faq.question} className="rounded-[1.5rem] border-border/70 bg-card/85 shadow-sm transition hover:border-primary/25">
              <CardContent className="grid gap-4 sm:grid-cols-[auto_1fr]">
                <div className="flex size-10 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
                  <HugeiconsIcon icon={HelpCircleIcon} className="size-5" />
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                    <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
