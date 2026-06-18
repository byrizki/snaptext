import { BackgroundGrid } from "@/components/landing/background-grid";
import { FAQ } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { ModelComparison } from "@/components/landing/model-comparison";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <BackgroundGrid />
      <Header />
      <main className="relative w-full">
        <Hero />
        <Features />
        <ModelComparison />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
