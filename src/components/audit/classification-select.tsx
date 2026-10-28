"use client";

import type { Classification } from "@/db/schema";
import {
  CLASSIFICATIONS,
  classificationDefinition,
  classificationLabel,
  classificationTone,
} from "@/lib/audit/classification";
import { cn } from "@/lib/utils";
import { RiskBadge } from "./badges";

export function ClassificationSelect({
  value,
  onChange,
  options = CLASSIFICATIONS,
}: {
  value: Classification | null;
  onChange: (value: Classification | null) => void;
  options?: Classification[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {options.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(value === c ? null : c)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition",
              value === c
                ? cn(classificationTone(c), "ring-2")
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {classificationLabel(c)}
          </button>
        ))}
        <RiskBadge classification={value} />
      </div>
      {value ? (
        <p className="text-xs text-slate-500">{classificationDefinition(value)}</p>
      ) : (
        <p className="text-xs text-amber-700">Choose a classification.</p>
      )}
    </div>
  );
}
