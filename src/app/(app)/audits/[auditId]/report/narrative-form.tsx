"use client";

import { useState } from "react";
import { SaveIndicator } from "@/components/audit/save-indicator";
import { Card, Field, Textarea } from "@/components/ui";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { saveAuditNarrative } from "../actions";

type Narrative = {
  executiveSummary: string | null;
  scopeNotes: string | null;
  limitations: string | null;
  conclusion: string | null;
};

const FIELDS: { key: keyof Narrative; label: string; hint: string; rows: number }[] = [
  {
    key: "executiveSummary",
    label: "Executive summary",
    hint: "Purpose, overall result, the most serious risks and the key recommendations.",
    rows: 8,
  },
  {
    key: "scopeNotes",
    label: "Scope",
    hint: "Posts, ambulances, shifts and services covered.",
    rows: 4,
  },
  {
    key: "limitations",
    label: "Limitations",
    hint: "Records not produced, areas not visited, staff unavailable.",
    rows: 4,
  },
  {
    key: "conclusion",
    label: "Overall conclusion",
    hint: "Answer the central question across all posts.",
    rows: 6,
  },
];

export function NarrativeForm({ auditId, initial }: { auditId: number; initial: Narrative }) {
  const [v, setV] = useState(initial);
  const { status, schedule } = useAutosave((d: Narrative) => saveAuditNarrative(auditId, d), 1200);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-accent">Report narrative</h2>
        <SaveIndicator status={status} />
      </div>
      <div className="space-y-4">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            <Textarea
              rows={f.rows}
              value={v[f.key] ?? ""}
              onChange={(e) => {
                const next = { ...v, [f.key]: e.target.value };
                setV(next);
                schedule(next);
              }}
            />
          </Field>
        ))}
      </div>
    </Card>
  );
}
