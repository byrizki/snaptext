import Image from "next/image";
import Link from "next/link";

export function DashboardBrand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <span className="flex size-9 items-center justify-center rounded-2xl border bg-card shadow-sm">
        <Image src="/logo.svg" alt="SnapText Logo" width={28} height={28} className="size-5 object-contain" />
      </span>
      <span className="text-base font-semibold tracking-tight text-foreground">SnapText</span>
    </Link>
  );
}
