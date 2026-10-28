"use client";

import { useActionState, useState } from "react";
import { SaveIndicator } from "@/components/audit/save-indicator";
import { Button, Field, Input } from "@/components/ui";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { createSite, saveSite } from "./actions";

type SiteState = { name: string; location: string | null; active: boolean };

export function SiteRow({ id, code, initial }: { id: number; code: string; initial: SiteState }) {
  const [state, setState] = useState(initial);
  const { status, schedule } = useAutosave((v: SiteState) => saveSite(id, v));

  function update(patch: Partial<SiteState>, immediate = false) {
    const next = { ...state, ...patch };
    setState(next);
    if (next.name.trim()) schedule(next, immediate);
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-3 font-mono text-sm font-semibold text-slate-900">{code}</td>
      <td className="py-2 pr-3">
        <Input value={state.name} onChange={(e) => update({ name: e.target.value })} />
      </td>
      <td className="py-2 pr-3">
        <Input value={state.location ?? ""} onChange={(e) => update({ location: e.target.value })} />
      </td>
      <td className="py-2 pr-3 text-center">
        <input
          type="checkbox"
          checked={state.active}
          onChange={(e) => update({ active: e.target.checked }, true)}
          aria-label={`${code} active`}
        />
      </td>
      <td className="py-2">
        <SaveIndicator status={status} />
      </td>
    </tr>
  );
}

export function NewSiteForm() {
  const [result, action, pending] = useActionState(createSite, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr_auto] sm:items-end">
      <Field label="Code">
        <Input name="code" required placeholder="e.g. NEW" />
      </Field>
      <Field label="Name">
        <Input name="name" required placeholder="NEW First Aid Post" />
      </Field>
      <Field label="Location">
        <Input name="location" />
      </Field>
      <Button type="submit" disabled={pending}>
        Add post
      </Button>
      {result?.error ? <p className="text-sm text-red-700 sm:col-span-4">{result.error}</p> : null}
    </form>
  );
}
