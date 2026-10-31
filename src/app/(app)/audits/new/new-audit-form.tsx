"use client";

import { useActionState, useState } from "react";
import type { PersonOption } from "@/components/audit/person-option";
import { PersonPicker } from "@/components/audit/person-picker";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { createAuditAction } from "./actions";

type Props = {
  sites: { id: number; code: string; name: string; active: boolean }[];
  versions: { id: number; name: string; version: string; isActive: boolean }[];
  auditors: PersonOption[];
  defaultLead: string;
};

export function NewAuditForm({ sites, versions, auditors, defaultLead }: Props) {
  const [state, action, pending] = useActionState(createAuditAction, null);
  const [leadAuditor, setLeadAuditor] = useState<string | null>(defaultLead || null);
  const [team, setTeam] = useState<string | null>(null);

  return (
    <Card className="max-w-2xl p-5">
      <form action={action} className="space-y-4">
        <input type="hidden" name="leadAuditor" value={leadAuditor ?? ""} />
        <input type="hidden" name="auditors" value={team ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Audit title" className="sm:col-span-2">
            <Input name="title" required placeholder="e.g. Q1 2027 FAP Audit" />
          </Field>
          <Field label="Period">
            <Input name="period" placeholder="e.g. Q1 2027" />
          </Field>
          <Field label="Start date">
            <Input name="startDate" type="date" />
          </Field>
          <Field label="Lead auditor">
            <PersonPicker mode="single" people={auditors} value={leadAuditor} onChange={setLeadAuditor} />
          </Field>
          <Field label="Audit team" className="sm:col-span-2">
            <PersonPicker mode="multi" people={auditors} value={team} onChange={setTeam} />
          </Field>
          <Field label="Protocol version" className="sm:col-span-2">
            <Select name="protocolVersionId" defaultValue={versions.find((v) => v.isActive)?.id}>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} (v{v.version})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="text-xs font-medium text-slate-600">Posts to audit</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {sites
              .filter((s) => s.active)
              .map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-slate-200 has-checked:bg-slate-50 has-checked:ring-brand"
                >
                  <input type="checkbox" name="siteIds" value={s.id} defaultChecked className="size-4" />
                  <span className="text-sm">
                    <span className="font-medium">{s.code}</span>{" "}
                    <span className="text-slate-500">{s.name}</span>
                  </span>
                </label>
              ))}
          </div>
        </fieldset>
        {state?.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create audit"}
        </Button>
      </form>
    </Card>
  );
}
