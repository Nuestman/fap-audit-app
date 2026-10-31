import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-start gap-1">
          <Link href="/" className="rounded-md hover:opacity-90">
            <BrandLogo />
          </Link>
          <p className="text-xs text-slate-500">First Aid Post & Ambulance audits</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">{children}</div>
      </div>
    </main>
  );
}
