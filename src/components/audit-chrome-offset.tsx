"use client";

import { useEffect } from "react";

const VAR = "--audit-chrome-h";

/** Keeps `--audit-chrome-h` in sync so nested sticky bars sit below the audit chrome. */
export function AuditChromeOffset({ targetId }: { targetId?: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId ?? "audit-sticky-chrome");
    if (!el) return;

    const apply = () => {
      document.documentElement.style.setProperty(VAR, `${el.getBoundingClientRect().height}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      document.documentElement.style.removeProperty(VAR);
    };
  }, [targetId]);

  return null;
}
