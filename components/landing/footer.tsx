import Image from "next/image";
import Link from "next/link";

const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "Models", href: "/#models" },
  { label: "Demo", href: "/demo" },
];

const companyLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-of-service" },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t bg-background/90">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:py-16">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-card ring-1 ring-border">
              <Image src="/logo.svg" alt="SnapText logo" width={28} height={28} className="size-6" />
            </span>
            <span className="text-lg font-semibold tracking-[-0.03em]">SnapText</span>
          </div>
          <p className="mt-5 max-w-[48ch] text-sm leading-6 text-muted-foreground">
            OCR infrastructure for teams that need structured document data without building a parsing pipeline from scratch.
          </p>
        </div>
        <nav aria-label="Product links">
          <h2 className="text-sm font-semibold text-foreground">Product</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {productLinks.map((link) => (
              <li key={link.label}><Link className="transition hover:text-foreground" href={link.href}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company links">
          <h2 className="text-sm font-semibold text-foreground">Company</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {companyLinks.map((link) => (
              <li key={link.label}><Link className="transition hover:text-foreground" href={link.href}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 border-t px-4 py-6 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} SnapText Inc.</p>
        <p className="font-mono tabular-nums">Built for PDFs, images, and messy tables.</p>
      </div>
    </footer>
  );
}
