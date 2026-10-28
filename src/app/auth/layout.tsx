import { ShieldPlus } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ShieldPlus className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">FAP Audit</p>
            <p className="text-xs text-slate-500">First Aid Post & Ambulance audits</p>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">{children}</div>
      </div>
    </main>
  );
}
