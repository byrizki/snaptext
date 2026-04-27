import { Metadata } from "next";
import { Header } from "@/components/landing/header";
import { BackgroundGrid } from "@/components/landing/background-grid";
import { Footer } from "@/components/landing/footer";
import { Contact } from "@/components/landing/contact";

export const metadata: Metadata = {
  title: "Contact Sales | SnapText",
  description: "Get in touch with SnapText for enterprise solutions, volume pricing, and technical support.",
};

export default function ContactPage() {
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-background text-foreground selection:bg-blue-500/30 transition-colors">
      <BackgroundGrid />
      <Header />
      <main className="flex-1 w-full pt-32 pb-24 relative z-10">
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
