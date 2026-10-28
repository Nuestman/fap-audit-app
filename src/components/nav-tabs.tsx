"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NavTab = { href: string; label: ReactNode; exact?: boolean; hint?: ReactNode };

export function NavTabs({ tabs, className }: { tabs: NavTab[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("-mx-4 overflow-x-auto px-4", className)}>
      <div className="flex min-w-max gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px flex flex-col items-center border-b-2 px-3 py-2 text-sm whitespace-nowrap",
                active
                  ? "border-slate-900 font-semibold text-slate-900"
                  : "border-transparent text-slate-600 hover:text-slate-900",
              )}
            >
              {t.label}
              {t.hint ? <span className="text-[10px] font-normal text-slate-500">{t.hint}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
