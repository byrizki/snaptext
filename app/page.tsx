import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { BackgroundGrid } from "@/components/landing/background-grid";
import { Footer } from "@/components/landing/footer";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { ModelComparison } from "@/components/landing/model-comparison";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-background text-foreground selection:bg-blue-500/30 transition-colors">
      <BackgroundGrid />
      <Header />
      <main className="flex-1 w-full pt-16">
        <Hero />
        <Features />
        <ModelComparison />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
