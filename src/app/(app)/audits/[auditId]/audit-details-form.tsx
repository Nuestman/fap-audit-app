"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PersonOption } from "@/components/audit/person-option";
import { PersonPicker } from "@/components/audit/person-picker";
import { SaveIndicator } from "@/components/audit/save-indicator";
import { Card, Field, Input, Select } from "@/components/ui";
import type { AuditStatus } from "@/db/schema";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { saveAuditDetails } from "./actions";

type Details = {
  title: string;
  period: string | null;
  status: AuditStatus;
  startDate: string | null;
  endDate: string | null;
  leadAuditor: string | null;
  auditors: string | null;
};

const STATUS_LABEL: Record<AuditStatus, string> = {
  draft: "Draft",
  in_progress: "In progress",
  final: "Final",
};

export function AuditDetailsForm({
  auditId,
  initial,
  auditors,
}: {
  auditId: number;
  initial: Details;
  auditors: PersonOption[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const { status, schedule } = useAutosave(async (d: Details) => {
    if (!d.title.trim()) return;
    await saveAuditDetails(auditId, d);
    router.refresh();
  }, 1200);

  function set(patch: Partial<Details>, immediate = false) {
    const next = { ...v, ...patch };
    setV(next);
    schedule(next, immediate);
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-accent">Audit details</h2>
        <SaveIndicator status={status} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Title">
          <Input value={v.title} onChange={(e) => set({ title: e.target.value })} required />
        </Field>
        <Field label="Period">
          <Input value={v.period ?? ""} onChange={(e) => set({ period: e.target.value })} />
        </Field>
        <Field label="Status">
          <Select value={v.status} onChange={(e) => set({ status: e.target.value as AuditStatus }, true)}>
            {(Object.keys(STATUS_LABEL) as AuditStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start date">
          <Input
            type="date"
            value={v.startDate ?? ""}
            onChange={(e) => set({ startDate: e.target.value || null })}
          />
        </Field>
        <Field label="End date">
          <Input
            type="date"
            value={v.endDate ?? ""}
            onChange={(e) => set({ endDate: e.target.value || null })}
          />
        </Field>
        <Field label="Lead auditor">
          <PersonPicker
            mode="single"
            people={auditors}
            value={v.leadAuditor}
            onChange={(leadAuditor) => set({ leadAuditor })}
          />
        </Field>
        <Field label="Audit team" className="sm:col-span-2 lg:col-span-3">
          <PersonPicker
            mode="multi"
            people={auditors}
            value={v.auditors}
            onChange={(auditorsValue) => set({ auditors: auditorsValue })}
          />
        </Field>
      </div>
    </Card>
  );
}
