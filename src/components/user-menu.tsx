"use client";

import { ChevronDown, FileText, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  name: string;
  email: string;
  hasAvatar: boolean;
};

function initials(name: string, email: string) {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu({ name, email, hasAvatar }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const displayName = name.trim() || email;
  const avatar = initials(name, email);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "flex max-w-[14rem] items-center gap-2 rounded-full py-1 pr-2 pl-1 text-left transition-colors",
          "hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
          open && "bg-slate-100",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/api/profile/avatar"
            alt=""
            className="size-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
          />
        ) : (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold tracking-wide text-white"
            aria-hidden
          >
            {avatar}
          </span>
        )}
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-sm font-medium text-slate-900">{displayName}</span>
          {name.trim() ? (
            <span className="block truncate text-[11px] text-slate-500">{email}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200"
        >
          <div className="border-b border-slate-100 px-3.5 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
          </div>
          <div className="p-1.5">
            <Link
              href="/profile"
              role="menuitem"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <UserRound className="size-4 text-slate-500" />
              Profile
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <Settings className="size-4 text-slate-500" />
              Settings
            </Link>
            <Link
              href="/changelog"
              role="menuitem"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <FileText className="size-4 text-slate-500" />
              Changelog
            </Link>
          </div>
          <div className="border-t border-slate-100 p-1.5">
            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
