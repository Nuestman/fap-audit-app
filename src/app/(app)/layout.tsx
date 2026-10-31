import { ClipboardCheck, ListTodo, Settings } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { UserMenu } from "@/components/user-menu";
import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/profile";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/audits", label: "Audits", icon: ClipboardCheck },
  { href: "/actions", label: "Actions", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const profile = await getUserProfile(user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link
            href="/audits"
            className="flex shrink-0 items-center rounded-md px-2.5 py-1.5 hover:bg-slate-100"
          >
            <BrandLogo />
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <UserMenu name={user.name} email={user.email} hasAvatar={profile.hasAvatar} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="no-print border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
          <span>FAP Audit v{APP_VERSION}</span>
          <Link href="/changelog" className="hover:text-slate-800 hover:underline">
            Changelog
          </Link>
        </div>
      </footer>
    </div>
  );
}
