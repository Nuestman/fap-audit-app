"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useActionState, useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import type { PinStatus } from "@/db/schema";
import { createAuditor, createFapStaff, saveAuditor, saveFapStaff, saveFapStaffModel } from "./actions";

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

type AuditorRow = AuditorState & { id: number };
type StaffRow = StaffState & { id: number };

const PIN_LABEL: Record<PinStatus, string> = {
  active: "Active",
  expired: "Expired",
  unknown: "Unknown",
};

const EMPTY_AUDITOR: AuditorState = {
  name: "",
  organization: null,
  jobTitle: null,
  email: null,
  phone: null,
  employeeNumber: null,
  active: true,
};

const EMPTY_STAFF: StaffState = {
  ...EMPTY_AUDITOR,
  qualification: null,
  pinStatus: "unknown",
  pinExpiresOn: null,
  siteId: null,
};

function dash(v: string | null | undefined) {
  return v?.trim() ? v : "—";
}

function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h3 id={titleId} className="text-sm font-semibold text-brand-accent">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

function SharedFields({
  state,
  onChange,
}: {
  state: AuditorState;
  onChange: (patch: Partial<AuditorState>) => void;
}) {
  return (
    <>
      <Field label="Name">
        <Input
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
          name="name"
        />
      </Field>
      <Field label="Organisation">
        <Input
          name="organization"
          value={state.organization ?? ""}
          onChange={(e) => onChange({ organization: e.target.value || null })}
        />
      </Field>
      <Field label="Job title">
        <Input
          name="jobTitle"
          value={state.jobTitle ?? ""}
          onChange={(e) => onChange({ jobTitle: e.target.value || null })}
        />
      </Field>
      <Field label="Email">
        <Input
          name="email"
          type="email"
          value={state.email ?? ""}
          onChange={(e) => onChange({ email: e.target.value || null })}
        />
      </Field>
      <Field label="Phone">
        <Input
          name="phone"
          value={state.phone ?? ""}
          onChange={(e) => onChange({ phone: e.target.value || null })}
        />
      </Field>
      <Field label="Employee number">
        <Input
          name="employeeNumber"
          value={state.employeeNumber ?? ""}
          onChange={(e) => onChange({ employeeNumber: e.target.value || null })}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
        <input
          type="checkbox"
          checked={state.active}
          onChange={(e) => onChange({ active: e.target.checked })}
        />
        Active in directory
      </label>
    </>
  );
}

export function AuditorsDirectory({ rows }: { rows: AuditorRow[] }) {
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editing, setEditing] = useState<AuditorRow | null>(null);
  const [draft, setDraft] = useState<AuditorState>(EMPTY_AUDITOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(createAuditor, null);
  const [addSubmitted, setAddSubmitted] = useState(false);

  function close() {
    setMode("closed");
    setEditing(null);
    setError(null);
    setAddSubmitted(false);
  }

  useEffect(() => {
    if (addSubmitted && !createPending && createState === null) {
      setMode("closed");
      setEditing(null);
      setError(null);
      setAddSubmitted(false);
    }
  }, [addSubmitted, createPending, createState]);

  function openAdd() {
    setError(null);
    setDraft(EMPTY_AUDITOR);
    setEditing(null);
    setAddSubmitted(false);
    setMode("add");
  }

  function openEdit(row: AuditorRow) {
    setError(null);
    setEditing(row);
    setDraft({
      name: row.name,
      organization: row.organization,
      jobTitle: row.jobTitle,
      email: row.email,
      phone: row.phone,
      employeeNumber: row.employeeNumber,
      active: row.active,
    });
    setMode("edit");
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !draft.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await saveAuditor(editing.id, draft);
      close();
    } catch {
      setError("Could not save. Check the name is unique and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: AuditorRow, active: boolean) {
    await saveAuditor(row.id, {
      name: row.name,
      organization: row.organization,
      jobTitle: row.jobTitle,
      email: row.email,
      phone: row.phone,
      employeeNumber: row.employeeNumber,
      active,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" onClick={openAdd}>
          <Plus className="size-4" /> Add auditor
        </Button>
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[40rem]">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-1 pr-3 font-medium">Name</th>
              <th className="pb-1 pr-3 font-medium">Organisation</th>
              <th className="pb-1 pr-3 font-medium">Job title</th>
              <th className="pb-1 pr-3 font-medium">Email</th>
              <th className="pb-1 pr-3 text-center font-medium">Active</th>
              <th className="pb-1" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-sm text-slate-500">
                  None yet. Use Add auditor to create the first entry.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 text-sm">
                  <td className="py-2 pr-3 font-medium text-slate-900">{row.name}</td>
                  <td className="py-2 pr-3 text-slate-600">{dash(row.organization)}</td>
                  <td className="py-2 pr-3 text-slate-600">{dash(row.jobTitle)}</td>
                  <td className="py-2 pr-3 text-slate-600">{dash(row.email)}</td>
                  <td className="py-2 pr-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => toggleActive(row, e.target.checked)}
                      aria-label={`${row.name} active`}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <Button type="button" variant="ghost" onClick={() => openEdit(row)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal title={mode === "edit" ? "Edit auditor" : "Add auditor"} open={mode !== "closed"} onClose={close}>
        {mode === "edit" ? (
          <form onSubmit={onSaveEdit} className="grid gap-3 sm:grid-cols-2">
            <SharedFields state={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />
            {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !draft.name.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        ) : (
          <CreateAuditorForm
            action={(fd) => {
              setAddSubmitted(true);
              createAction(fd);
            }}
            pending={createPending}
            error={createState?.error ?? null}
            onCancel={close}
          />
        )}
      </Modal>
    </div>
  );
}

function CreateAuditorForm({
  action,
  pending,
  error,
  onCancel,
}: {
  action: (payload: FormData) => void;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
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
      {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add auditor"}
        </Button>
      </div>
    </form>
  );
}

export function FapStaffDirectory({ rows, sites }: { rows: StaffRow[]; sites: SiteOpt[] }) {
  const siteCode = (id: number | null) => sites.find((s) => s.id === id)?.code ?? "—";
  const [mode, setMode] = useState<"closed" | "add" | "edit">("closed");
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [draft, setDraft] = useState<StaffState>(EMPTY_STAFF);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createState, createAction, createPending] = useActionState(createFapStaff, null);
  const [addSubmitted, setAddSubmitted] = useState(false);

  function close() {
    setMode("closed");
    setEditing(null);
    setError(null);
    setAddSubmitted(false);
  }

  useEffect(() => {
    if (addSubmitted && !createPending && createState === null) {
      setMode("closed");
      setEditing(null);
      setError(null);
      setAddSubmitted(false);
    }
  }, [addSubmitted, createPending, createState]);

  function openAdd() {
    setError(null);
    setDraft(EMPTY_STAFF);
    setEditing(null);
    setAddSubmitted(false);
    setMode("add");
  }

  function openEdit(row: StaffRow) {
    setError(null);
    setEditing(row);
    setDraft({
      name: row.name,
      organization: row.organization,
      jobTitle: row.jobTitle,
      email: row.email,
      phone: row.phone,
      employeeNumber: row.employeeNumber,
      qualification: row.qualification,
      pinStatus: row.pinStatus,
      pinExpiresOn: row.pinExpiresOn,
      siteId: row.siteId,
      active: row.active,
    });
    setMode("edit");
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !draft.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await saveFapStaff(editing.id, draft);
      close();
    } catch {
      setError("Could not save. Check the name is unique and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: StaffRow, active: boolean) {
    await saveFapStaff(row.id, {
      name: row.name,
      organization: row.organization,
      jobTitle: row.jobTitle,
      email: row.email,
      phone: row.phone,
      employeeNumber: row.employeeNumber,
      qualification: row.qualification,
      pinStatus: row.pinStatus,
      pinExpiresOn: row.pinExpiresOn,
      siteId: row.siteId,
      active,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" onClick={openAdd}>
          <Plus className="size-4" /> Add FAP staff
        </Button>
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[48rem]">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-1 pr-3 font-medium">Name</th>
              <th className="pb-1 pr-3 font-medium">Job title</th>
              <th className="pb-1 pr-3 font-medium">Qualification</th>
              <th className="pb-1 pr-3 font-medium">PIN</th>
              <th className="pb-1 pr-3 font-medium">FAP</th>
              <th className="pb-1 pr-3 text-center font-medium">Active</th>
              <th className="pb-1" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-3 text-sm text-slate-500">
                  None yet. Use Add FAP staff to create the first entry.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 text-sm">
                  <td className="py-2 pr-3 font-medium text-slate-900">{row.name}</td>
                  <td className="py-2 pr-3 text-slate-600">{dash(row.jobTitle)}</td>
                  <td className="py-2 pr-3 text-slate-600">{dash(row.qualification)}</td>
                  <td className="py-2 pr-3">
                    <Badge
                      className={
                        row.pinStatus === "active"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : row.pinStatus === "expired"
                            ? "bg-red-50 text-red-700 ring-red-200"
                            : undefined
                      }
                    >
                      {PIN_LABEL[row.pinStatus]}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 font-mono text-slate-600">{siteCode(row.siteId)}</td>
                  <td className="py-2 pr-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => toggleActive(row, e.target.checked)}
                      aria-label={`${row.name} active`}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <Button type="button" variant="ghost" onClick={() => openEdit(row)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title={mode === "edit" ? "Edit FAP staff" : "Add FAP staff"}
        open={mode !== "closed"}
        onClose={close}
      >
        {mode === "edit" ? (
          <form onSubmit={onSaveEdit} className="grid gap-3 sm:grid-cols-2">
            <SharedFields state={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />
            <Field label="Qualification">
              <Input
                value={draft.qualification ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, qualification: e.target.value || null }))}
              />
            </Field>
            <Field label="PIN status">
              <Select
                value={draft.pinStatus}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, pinStatus: e.target.value as PinStatus }))
                }
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
                value={draft.pinExpiresOn ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, pinExpiresOn: e.target.value || null }))}
              />
            </Field>
            <Field label="Assigned FAP">
              <Select
                value={draft.siteId ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    siteId: e.target.value ? Number(e.target.value) : null,
                  }))
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
            {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !draft.name.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        ) : (
          <CreateFapStaffForm
            action={(fd) => {
              setAddSubmitted(true);
              createAction(fd);
            }}
            pending={createPending}
            error={createState?.error ?? null}
            sites={sites}
            onCancel={close}
          />
        )}
      </Modal>
    </div>
  );
}

function CreateFapStaffForm({
  action,
  pending,
  error,
  sites,
  onCancel,
}: {
  action: (payload: FormData) => void;
  pending: boolean;
  error: string | null;
  sites: SiteOpt[];
  onCancel: () => void;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
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
      {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add FAP staff"}
        </Button>
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
          <span className="font-medium">Site-assigned</span> — staff on duty and post action
          owners only offer staff assigned to that FAP (plus unassigned)
        </span>
      </label>
      {saving ? <p className="text-xs text-slate-500">Saving…</p> : null}
    </div>
  );
}
