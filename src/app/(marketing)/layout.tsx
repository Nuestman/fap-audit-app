import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#f6f7f9] text-slate-900">{children}</div>;
}
