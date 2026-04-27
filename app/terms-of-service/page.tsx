import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { BackgroundGrid } from "@/components/landing/background-grid";

export const metadata = {
  title: "Terms and Conditions — SnapText",
  description: "Read the terms and conditions for using SnapText services.",
};

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-background text-foreground selection:bg-blue-500/30 transition-colors">
      <BackgroundGrid />
      <Header />
      
      <main className="relative pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-zinc-900 dark:text-zinc-50">
              Terms and Conditions
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Last updated: April 27, 2026
            </p>
          </div>

          <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">1. Acceptance of Terms</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                By accessing and using SnapText, you agree to be bound by these Terms and Conditions and all applicable laws and regulations. 
                If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">2. Account Registration</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                To access certain features, you may be required to register for an account. You are responsible for maintaining the 
                confidentiality of your account and password and for restricting access to your computer. You agree to accept 
                responsibility for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">3. Usage Limits and Quotas</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                SnapText provides different tiers of document processing based on your subscription or usage level:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Quotas:</strong> Daily scan limits are enforced based on your account type (User vs. Global).</li>
                <li><strong>Models:</strong> Access to specific models (Flux, Spark, Zenith) is determined by your current plan.</li>
                <li><strong>Abuse:</strong> We reserve the right to suspend or terminate accounts that attempt to bypass quota limits or automate scanning in a way that impacts service stability.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">4. Intellectual Property</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                You retain all rights to the documents you upload. SnapText does not claim ownership of your data. 
                However, by using the service, you grant us a license to process and temporarily store your documents 
                to perform the requested OCR and analysis services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">5. Prohibited Conduct</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>Use the service for any illegal purpose or in violation of any local, state, national, or international law.</li>
                <li>Violate or encourage others to violate the rights of third parties.</li>
                <li>Attempt to gain unauthorized access to our servers or bypass security measures.</li>
                <li>Upload documents containing malicious code or viruses.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">6. Disclaimer of Warranties</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
                SnapText is provided &quot;as is&quot; without any warranties, expressed or implied. We do not guarantee 100% accuracy 
                in OCR extraction or document analysis, as AI results depend on source document quality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">7. Limitation of Liability</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                In no event shall SnapText or its suppliers be liable for any damages (including, without limitation, damages for 
                loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials 
                on SnapText.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">8. Modifications to Terms</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We reserve the right to modify these terms at any time. By continuing to use SnapText after changes are made, 
                you agree to be bound by the revised terms.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
