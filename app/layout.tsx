import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SnapText — AI-Powered OCR Engine",
    template: "%s | SnapText",
  },
  description: "Your magic wand for unstructured data. The ultimate OCR engine built to power the next generation of AI applications.",
  keywords: ["OCR", "AI", "Document Extraction", "Data Processing", "SaaS", "PDF parsing"],
  authors: [{ name: "SnapText Inc." }],
  creator: "SnapText",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://snaptextid.vercel.app",
    title: "SnapText — AI-Powered OCR Engine",
    description: "Your magic wand for unstructured data. The ultimate OCR engine built to power the next generation of AI applications.",
    siteName: "SnapText",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapText — AI-Powered OCR Engine",
    description: "Your magic wand for unstructured data. The ultimate OCR engine built to power the next generation of AI applications.",
    creator: "@snaptext",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", outfit.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
