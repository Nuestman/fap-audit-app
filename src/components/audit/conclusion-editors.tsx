"use client";

import { useState } from "react";
import {
  saveActionPriority,
  saveConclusion,
  saveSignOff,
} from "@/app/(app)/audits/[auditId]/posts/[postId]/actions";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import type { Classification, OverallStatus } from "@/db/schema";
import { overallStatusLabel } from "@/lib/audit/classification";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { ClassificationBadge, RiskBadge } from "./badges";
import { SaveIndicator } from "./save-indicator";

type Conclusion = {
  overallStatus: OverallStatus | null;
  keyStrengths: string | null;
  keyRisks: string | null;
  recommendation: string | null;
};

const OVERALL: OverallStatus[] = ["satisfactory", "satisfactory_with_improvements", "unsatisfactory"];

export function ConclusionForm({ auditPostId, initial }: { auditPostId: number; initial: Conclusion }) {
  const [v, setV] = useState(initial);
  const { status, schedule } = useAutosave((c: Conclusion) => saveConclusion(auditPostId, c));

  function set(patch: Partial<Conclusion>, immediate = false) {
    const next = { ...v, ...patch };
    setV(next);
    schedule(next, immediate);
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">I3. Overall auditor conclusion</h3>
        <SaveIndicator status={status} />
      </div>
      <Field label="Overall status">
        <Select
          value={v.overallStatus ?? ""}
          onChange={(e) => set({ overallStatus: (e.target.value || null) as OverallStatus | null }, true)}
        >
          <option value="">Not yet decided</option>
          {OVERALL.map((o) => (
            <option key={o} value={o}>
              {overallStatusLabel(o)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Key strengths">
        <Textarea rows={3} value={v.keyStrengths ?? ""} onChange={(e) => set({ keyStrengths: e.target.value })} />
      </Field>
      <Field label="Key risks requiring management attention">
        <Textarea rows={3} value={v.keyRisks ?? ""} onChange={(e) => set({ keyRisks: e.target.value })} />
      </Field>
      <Field label="Overall recommendation">
        <Textarea
          rows={3}
          value={v.recommendation ?? ""}
          onChange={(e) => set({ recommendation: e.target.value })}
        />
      </Field>
    </Card>
  );
}

export type PriorityAction = {
  id: number;
  ref: string;
  finding: string | null;
  action: string | null;
  owner: string | null;
  targetDate: string | null;
  classification: Classification | null;
  priority: number | null;
};

function PriorityInput({ action }: { action: PriorityAction }) {
  const [value, setValue] = useState(action.priority?.toString() ?? "");
  const { status, schedule } = useAutosave((v: string) =>
    saveActionPriority(action.id, v ? Number(v) : null),
  );
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={1}
        max={99}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          schedule(e.target.value);
        }}
        className="w-16"
        aria-label="Priority"
      />
      <SaveIndicator status={status} />
    </div>
  );
}

export function PriorityList({ actions }: { actions: PriorityAction[] }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-900">I2. Priority corrective action plan</h3>
      <p className="mb-3 text-xs text-slate-500">
        Number the actions in order of priority (1 = most urgent). Actions are edited on their findings.
      </p>
      {actions.length === 0 ? (
        <p className="text-sm text-slate-500">No corrective actions recorded for this post yet.</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-1 pr-2 font-medium">Priority</th>
                <th className="pb-1 pr-2 font-medium">Ref</th>
                <th className="pb-1 pr-2 font-medium">Finding</th>
                <th className="pb-1 pr-2 font-medium">Required action</th>
                <th className="pb-1 pr-2 font-medium">Owner</th>
                <th className="pb-1 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-2">
                    <PriorityInput action={a} />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="font-mono text-xs font-semibold">{a.ref}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <ClassificationBadge value={a.classification} />
                      <RiskBadge classification={a.classification} />
                    </div>
                  </td>
                  <td className="max-w-xs py-2 pr-2 text-slate-700">{a.finding}</td>
                  <td className="max-w-xs py-2 pr-2 text-slate-700">{a.action}</td>
                  <td className="py-2 pr-2 text-slate-700">{a.owner ?? "–"}</td>
                  <td className="py-2 text-slate-700">{a.targetDate ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

type SignOffRow = { id: number; role: string; name: string | null; signedDate: string | null };

function SignOffLine({ row }: { row: SignOffRow }) {
  const [v, setV] = useState({ name: row.name, signedDate: row.signedDate });
  const { status, schedule } = useAutosave((d: typeof v) => saveSignOff(row.id, d));
  function set(patch: Partial<typeof v>) {
    const next = { ...v, ...patch };
    setV(next);
    schedule(next);
  }
  return (
    <div className="grid items-end gap-2 border-t border-slate-100 py-2 sm:grid-cols-[1fr_1fr_10rem_5rem]">
      <span className="text-sm font-medium text-slate-800">{row.role}</span>
      <Input placeholder="Name" value={v.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
      <Input
        type="date"
        value={v.signedDate ?? ""}
        onChange={(e) => set({ signedDate: e.target.value || null })}
      />
      <SaveIndicator status={status} />
    </div>
  );
}

export function SignOffEditor({ rows }: { rows: SignOffRow[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-1 text-sm font-semibold text-slate-900">I4. Sign-off</h3>
      <p className="mb-2 text-xs text-slate-500">Typed name and date; signatures go on the printed report.</p>
      {rows.map((r) => (
        <SignOffLine key={r.id} row={r} />
      ))}
    </Card>
  );
}
