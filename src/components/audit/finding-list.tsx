import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ClassificationBadge, RiskBadge } from "@/components/audit/badges";
import { EmptyState } from "@/components/ui";
import { findingHref, type FindingRow } from "@/lib/audit/findings";

export function FindingList({
  auditId,
  findings,
  empty,
  showRisk = false,
}: {
  auditId: number;
  findings: FindingRow[];
  empty: string;
  showRisk?: boolean;
}) {
  if (findings.length === 0) return <EmptyState>{empty}</EmptyState>;

  return (
    <ul className="divide-y divide-slate-100">
      {findings.map((f) => (
        <li key={`${f.postId}-${f.source}-${f.ref}-${f.finding}`} className="py-3">
          <Link href={findingHref(auditId, f)} className="group block">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <AlertTriangle className="size-3.5 shrink-0 text-slate-400" />
              <span className="font-semibold text-slate-900">{f.siteCode}</span>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{f.ref}</code>
              <ClassificationBadge value={f.classification} />
              {showRisk ? <RiskBadge classification={f.classification} /> : null}
              {f.criterion ? <span className="text-slate-500">{f.criterion}</span> : null}
            </div>
            <p className="mt-1 text-sm text-slate-800 group-hover:underline">
              {f.finding || "No finding text recorded yet."}
            </p>
            {f.action?.action ? (
              <p className="mt-1 text-xs text-slate-500">Action: {f.action.action}</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
