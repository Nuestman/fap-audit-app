"use client";

import { useMemo, useState } from "react";
import { EmptyState, ProgressBar } from "@/components/ui";
import type { Answer, Classification } from "@/db/schema";
import { NON_CONFORMITIES } from "@/lib/audit/classification";
import { cn } from "@/lib/utils";
import { CriterionCard, type CriterionData } from "./criterion-card";
import type { PersonOption } from "./person-option";

type Filter = "all" | "unanswered" | "findings";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unanswered", label: "Unanswered" },
  { key: "findings", label: "Non-conformities" },
];

export function SectionChecklist({
  auditPostId,
  criteria,
  people,
}: {
  auditPostId: number;
  criteria: CriterionData[];
  people: PersonOption[];
}) {
  const [states, setStates] = useState(
    () =>
      new Map(
        criteria.map((c) => [c.itemId, { answer: c.answer, classification: c.classification }]),
      ),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState<Set<number> | null>(null);

  const answered = useMemo(
    () => Array.from(states.values()).filter((s) => s.answer).length,
    [states],
  );

  function onAnswerChange(itemId: number, answer: Answer | null, classification: Classification | null) {
    setStates((prev) => new Map(prev).set(itemId, { answer, classification }));
  }

  function applyFilter(f: Filter) {
    setFilter(f);
    if (f === "all") return setVisible(null);
    const ids = criteria
      .filter((c) => {
        const s = states.get(c.itemId)!;
        return f === "unanswered"
          ? !s.answer
          : s.answer === "no" || (s.classification && NON_CONFORMITIES.includes(s.classification));
      })
      .map((c) => c.itemId);
    setVisible(new Set(ids));
  }

  const shown = visible ? criteria.filter((c) => visible.has(c.itemId)) : criteria;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => applyFilter(f.key)}
              className={cn(
                "rounded-md px-3 py-1 text-sm",
                filter === f.key ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex w-48 items-center gap-2 text-xs text-slate-600">
          <ProgressBar value={criteria.length ? answered / criteria.length : 0} />
          <span className="shrink-0">
            {answered}/{criteria.length}
          </span>
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState>Nothing matches this filter.</EmptyState>
      ) : (
        shown.map((c) => (
          <CriterionCard
            key={c.itemId}
            auditPostId={auditPostId}
            data={c}
            people={people}
            onAnswerChange={onAnswerChange}
          />
        ))
      )}
    </div>
  );
}
