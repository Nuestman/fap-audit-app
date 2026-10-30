"use client";

import { useActionState, useState } from "react";
import { SaveIndicator } from "@/components/audit/save-indicator";
import { Button, Field, Input, Select } from "@/components/ui";
import type { PinStatus } from "@/db/schema";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { saveFapStaffModel } from "./actions";

type AuditorState = {
  name: string;
  organization: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  employeeNumber: string | null;
  active: boolean;
};

type StaffState = AuditorState & {
  qualification: string | null;
  pinStatus: PinStatus;
  pinExpiresOn: string | null;
  siteId: number | null;
};

type SiteOpt = { id: number; code: string; name: string };

const PIN_LABEL: Record<PinStatus, string> = {
  active: "Active",
  expired: "Expired",
  unknown: "Unknown",
};

function SharedFields({
  state,
  update,
}: {
  state: AuditorState;
  update: (patch: Partial<AuditorState>, immediate?: boolean) => void;
}) {
  return (
    <>
      <Field label="Name">
        <Input value={state.name} onChange={(e) => update({ name: e.target.value })} required />
      </Field>
      <Field label="Organisation">
        <Input
          value={state.organization ?? ""}
          onChange={(e) => update({ organization: e.target.value || null })}
        />
      </Field>
      <Field label="Job title">
        <Input value={state.jobTitle ?? ""} onChange={(e) => update({ jobTitle: e.target.value || null })} />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={state.email ?? ""}
          onChange={(e) => update({ email: e.target.value || null })}
        />
      </Field>
      <Field label="Phone">
        <Input value={state.phone ?? ""} onChange={(e) => update({ phone: e.target.value || null })} />
      </Field>
      <Field label="Employee number">
        <Input
          value={state.employeeNumber ?? ""}
          onChange={(e) => update({ employeeNumber: e.target.value || null })}
        />
      </Field>
    </>
  );
}

export function AuditorCard({
  id,
  initial,
  save,
}: {
  id: number;
  initial: AuditorState;
  save: (id: number, input: AuditorState) => Promise<void>;
}) {
  const [state, setState] = useState(initial);
  const { status, schedule } = useAutosave((v: AuditorState) => save(id, v));

  function update(patch: Partial<AuditorState>, immediate = false) {
    const next = { ...state, ...patch };
    setState(next);
    if (next.name.trim()) schedule(next, immediate);
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={state.active}
            onChange={(e) => update({ active: e.target.checked }, true)}
          />
          Active in directory
        </label>
        <SaveIndicator status={status} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SharedFields state={state} update={update} />
      </div>
    </div>
  );
}

export function FapStaffCard({
  id,
  initial,
  sites,
  save,
}: {
  id: number;
  initial: StaffState;
  sites: SiteOpt[];
  save: (id: number, input: StaffState) => Promise<void>;
}) {
  const [state, setState] = useState(initial);
  const { status, schedule } = useAutosave((v: StaffState) => save(id, v));

  function update(patch: Partial<StaffState>, immediate = false) {
    const next = { ...state, ...patch };
    setState(next);
    if (next.name.trim()) schedule(next, immediate);
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={state.active}
            onChange={(e) => update({ active: e.target.checked }, true)}
          />
          Active in directory
        </label>
        <SaveIndicator status={status} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SharedFields state={state} update={update} />
        <Field label="Qualification">
          <Input
            value={state.qualification ?? ""}
            onChange={(e) => update({ qualification: e.target.value || null })}
          />
        </Field>
        <Field label="PIN status">
          <Select
            value={state.pinStatus}
            onChange={(e) => update({ pinStatus: e.target.value as PinStatus }, true)}
          >
            {(Object.keys(PIN_LABEL) as PinStatus[]).map((k) => (
              <option key={k} value={k}>
                {PIN_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="PIN expires">
          <Input
            type="date"
            value={state.pinExpiresOn ?? ""}
            onChange={(e) => update({ pinExpiresOn: e.target.value || null })}
          />
        </Field>
        <Field label="Assigned FAP">
          <Select
            value={state.siteId ?? ""}
            onChange={(e) =>
              update({ siteId: e.target.value ? Number(e.target.value) : null }, true)
            }
          >
            <option value="">Unassigned</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}

export function NewAuditorForm({
  create,
}: {
  create: (prev: { error: string } | null, formData: FormData) => Promise<{ error: string } | null>;
}) {
  const [result, action, pending] = useActionState(create, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Name">
        <Input name="name" required placeholder="e.g. Numan Usman" />
      </Field>
      <Field label="Organisation">
        <Input name="organization" />
      </Field>
      <Field label="Job title">
        <Input name="jobTitle" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" />
      </Field>
      <Field label="Phone">
        <Input name="phone" />
      </Field>
      <Field label="Employee number">
        <Input name="employeeNumber" />
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending}>
          Add auditor
        </Button>
        {result?.error ? <p className="mt-2 text-sm text-red-700">{result.error}</p> : null}
      </div>
    </form>
  );
}

export function NewFapStaffForm({
  create,
  sites,
}: {
  create: (prev: { error: string } | null, formData: FormData) => Promise<{ error: string } | null>;
  sites: SiteOpt[];
}) {
  const [result, action, pending] = useActionState(create, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Name">
        <Input name="name" required placeholder="e.g. Jane Nurse" />
      </Field>
      <Field label="Organisation">
        <Input name="organization" />
      </Field>
      <Field label="Job title">
        <Input name="jobTitle" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" />
      </Field>
      <Field label="Phone">
        <Input name="phone" />
      </Field>
      <Field label="Employee number">
        <Input name="employeeNumber" />
      </Field>
      <Field label="Qualification">
        <Input name="qualification" />
      </Field>
      <Field label="PIN status">
        <Select name="pinStatus" defaultValue="unknown">
          {(Object.keys(PIN_LABEL) as PinStatus[]).map((k) => (
            <option key={k} value={k}>
              {PIN_LABEL[k]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="PIN expires">
        <Input name="pinExpiresOn" type="date" />
      </Field>
      <Field label="Assigned FAP">
        <Select name="siteId" defaultValue="">
          <option value="">Unassigned</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending}>
          Add FAP staff
        </Button>
        {result?.error ? <p className="mt-2 text-sm text-red-700">{result.error}</p> : null}
      </div>
    </form>
  );
}

export function StaffModelPicker({ initial }: { initial: "global" | "site_assigned" }) {
  const [model, setModel] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function change(next: "global" | "site_assigned") {
    setModel(next);
    setSaving(true);
    try {
      await saveFapStaffModel(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="radio"
          name="fapStaffModel"
          checked={model === "global"}
          onChange={() => change("global")}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Global</span> — all active FAP staff appear at every post
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="radio"
          name="fapStaffModel"
          checked={model === "site_assigned"}
          onChange={() => change("site_assigned")}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Site-assigned</span> — nurse-in-charge and post action
          owners only offer staff assigned to that FAP (plus unassigned)
        </span>
      </label>
      {saving ? <p className="text-xs text-slate-500">Saving…</p> : null}
    </div>
  );
}
