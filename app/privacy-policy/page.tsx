import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { BackgroundGrid } from "@/components/landing/background-grid";

export const metadata = {
  title: "Privacy Policy — SnapText",
  description: "Learn how SnapText handles your data and protects your privacy.",
};

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-background text-foreground selection:bg-blue-500/30 transition-colors">
      <BackgroundGrid />
      <Header />

      <main className="relative pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-zinc-900 dark:text-zinc-50">
              Privacy Policy
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Last updated: April 27, 2026
            </p>
          </div>

          <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">1. Introduction</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Welcome to SnapText. We are committed to protecting your personal information and your right to privacy.
                This Privacy Policy explains how we collect, use, and safeguard your data when you use our OCR and document processing services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">2. Data We Collect</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                In order to provide our service, we collect the following types of information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Account Information:</strong> Name, email address, and profile information provided through Google OAuth or manual signup.</li>
                <li><strong>Document Data:</strong> Files you upload (PDFs, images) and the text extracted from them.</li>
                <li><strong>Usage Data:</strong> Information about your scans, including model selection (Flux, Spark, Zenith), processing time, and quota consumption.</li>
                <li><strong>Technical Data:</strong> IP address, browser type, and device information for security and analytics.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">3. How We Use Your Data</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                We use your data for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>To perform OCR extraction and document analysis.</li>
                <li>To manage your account and track your daily scan quotas.</li>
                <li>To maintain your personal scan history and provide deep-linkable results.</li>
                <li>To improve our AI models and service performance.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">4. Data Storage and Security</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Your documents are stored securely using Vercel Blob storage, and your account data is managed in an encrypted PostgreSQL database.
                We use industry-standard security measures to protect your information, but please be aware that no method of transmission over the
                internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">5. Third-Party Services</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                SnapText integrates with several trusted third-party providers:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Better Auth:</strong> For secure authentication and session management.</li>
                <li><strong>Cloudflare AI:</strong> For processing document extraction via AI models.</li>
                <li><strong>Vercel:</strong> For application hosting and blob storage.</li>
                <li><strong>Neon:</strong> For our serverless PostgreSQL database.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">6. Your Rights</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                You have the right to access, correct, or delete your personal data. You can manage your documents and history through your
                SnapText Dashboard. If you wish to close your account and delete all associated data, please contact our support team.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">7. Contact Us</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                If you have any questions about this Privacy Policy, please reach out to us at privacy@snaptext.app.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
