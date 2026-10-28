import { ClipboardCheck, ListTodo, LogOut, Settings, ShieldPlus } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Audits", icon: ClipboardCheck },
  { href: "/actions", label: "Actions", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex size-7 items-center justify-center rounded-md bg-slate-900 text-white">
              <ShieldPlus className="size-4" />
            </span>
            <span className="hidden sm:inline">FAP Audit</span>
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
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 md:inline">{user.name || user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                title="Sign out"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
