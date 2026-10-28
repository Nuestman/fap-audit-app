"use client";

import { useState } from "react";
import { savePostDetails } from "@/app/(app)/audits/[auditId]/posts/[postId]/actions";
import { Card, Field, Input, Select } from "@/components/ui";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { SaveIndicator } from "./save-indicator";

type Details = {
  auditDate: string | null;
  shift: string | null;
  nurseInCharge: string | null;
  ambulanceUnits: string | null;
};

const SHIFTS = ["Day", "Night", "24-hour", "Other"];

export function PostDetailsForm({ auditPostId, initial }: { auditPostId: number; initial: Details }) {
  const [v, setV] = useState(initial);
  const { status, schedule } = useAutosave((d: Details) => savePostDetails(auditPostId, d));

  function set(patch: Partial<Details>) {
    const next = { ...v, ...patch };
    setV(next);
    schedule(next);
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Audit details for this post</h3>
        <SaveIndicator status={status} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Audit date">
          <Input
            type="date"
            value={v.auditDate ?? ""}
            onChange={(e) => set({ auditDate: e.target.value || null })}
          />
        </Field>
        <Field label="Shift / coverage audited">
          <Select value={v.shift ?? ""} onChange={(e) => set({ shift: e.target.value || null })}>
            <option value="" />
            {SHIFTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nurse-in-charge / ambulance driver">
          <Input
            value={v.nurseInCharge ?? ""}
            onChange={(e) => set({ nurseInCharge: e.target.value })}
          />
        </Field>
        <Field label="Ambulance(s) audited" hint="(unit numbers)">
          <Input
            value={v.ambulanceUnits ?? ""}
            onChange={(e) => set({ ambulanceUnits: e.target.value })}
          />
        </Field>
      </div>
    </Card>
  );
}
