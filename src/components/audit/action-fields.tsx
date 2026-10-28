"use client";

import type { ActionStatus } from "@/db/schema";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { actionStatusLabel } from "@/lib/audit/classification";

export type ActionState = {
  action: string | null;
  owner: string | null;
  targetDate: string | null;
  status: ActionStatus;
};

export const EMPTY_ACTION: ActionState = { action: null, owner: null, targetDate: null, status: "open" };

const STATUSES: ActionStatus[] = ["open", "in_progress", "closed"];

export function ActionFields({
  value,
  onChange,
  label = "Corrective action",
}: {
  value: ActionState;
  onChange: (value: ActionState) => void;
  label?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label={label} className="sm:col-span-6">
        <Textarea
          rows={2}
          value={value.action ?? ""}
          onChange={(e) => onChange({ ...value, action: e.target.value })}
        />
      </Field>
      <Field label="Owner" className="sm:col-span-2">
        <Input
          value={value.owner ?? ""}
          onChange={(e) => onChange({ ...value, owner: e.target.value })}
        />
      </Field>
      <Field label="Target date" className="sm:col-span-2">
        <Input
          type="date"
          value={value.targetDate ?? ""}
          onChange={(e) => onChange({ ...value, targetDate: e.target.value || null })}
        />
      </Field>
      <Field label="Status" className="sm:col-span-2">
        <Select
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as ActionStatus })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {actionStatusLabel(s)}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
