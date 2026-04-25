import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon, Database01Icon, AiBrain01Icon, Activity01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background">
      <aside className="w-full lg:w-64 border-r bg-card/50 backdrop-blur-xl flex flex-col hidden lg:flex">
        <div className="p-6 border-b">
          <Link href="/demo" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="text-primary">SnapText</span> Admin
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin/models" className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary/10 text-primary font-medium transition-colors">
            <HugeiconsIcon icon={AiBrain01Icon} size={20} />
            OCR Models
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-not-allowed opacity-50">
            <HugeiconsIcon icon={Activity01Icon} size={20} />
            Telemetry
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-not-allowed opacity-50">
            <HugeiconsIcon icon={Database01Icon} size={20} />
            Job History
          </div>
        </nav>
        <div className="p-4 border-t">
          <Link href="/demo" className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">
            <HugeiconsIcon icon={Settings02Icon} size={20} />
            Back to Demo
          </Link>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-xl">
          <Link href="/demo" className="font-bold text-xl tracking-tight">
            <span className="text-primary">SnapText</span> Admin
          </Link>
          <Link href="/demo" className="text-sm text-muted-foreground">Exit</Link>
        </header>
        
        <div className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
