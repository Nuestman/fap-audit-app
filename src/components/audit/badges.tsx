import type { Classification } from "@/db/schema";
import {
  classificationLabel,
  classificationTone,
  riskFor,
  riskLabel,
  riskTone,
} from "@/lib/audit/classification";
import { cn } from "@/lib/utils";

export function ClassificationBadge({
  value,
  className,
}: {
  value: Classification | null;
  className?: string;
}) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        classificationTone(value),
        className,
      )}
    >
      {classificationLabel(value)}
    </span>
  );
}

export function RiskBadge({ classification }: { classification: Classification | null }) {
  const risk = riskFor(classification);
  if (!risk || risk === "none") return null;
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-semibold", riskTone(risk))}>
      {riskLabel(risk)}
    </span>
  );
}

export function ComplianceCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">–</span>;
  const pct = Math.round(value * 100);
  const tone =
    pct >= 90
      ? "bg-emerald-100 text-emerald-800"
      : pct >= 75
        ? "bg-lime-100 text-lime-800"
        : pct >= 50
          ? "bg-amber-100 text-amber-800"
          : "bg-red-100 text-red-800";
  return <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-semibold", tone)}>{pct}%</span>;
}
