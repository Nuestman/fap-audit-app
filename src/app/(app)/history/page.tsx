import Link from "next/link";
import { Button, ButtonLink, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import { CHANGE_ENTITIES, listChangeEvents } from "@/lib/audit/change-log";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() ? v : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function formatWhen(d: Date) {
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const q = await searchParams;
  const filters = {
    entity: one(q.entity),
    actor: one(q.actor),
  };
  const { rows, total } = await listChangeEvents({
    entity: filters.entity || undefined,
    actor: filters.actor || undefined,
    limit: 150,
  });
  const actors = [...new Set(rows.map((r) => r.actor))].sort();

  return (
    <div>
      <PageHeader
        breadcrumb={<Link href="/settings">Settings</Link>}
        title="Change history"
        description={`${total} recorded change${total === 1 ? "" : "s"}. Tracks edits to audit data; not included in Excel/Word exports.`}
      />

      <form className="mb-6 grid gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-3 sm:items-end">
        <Field label="Entity">
          <Select name="entity" defaultValue={filters.entity}>
            <option value="">All</option>
            {CHANGE_ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Actor">
          <Select name="actor" defaultValue={filters.actor}>
            <option value="">Anyone</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button type="submit">Filter</Button>
          <ButtonLink href="/history" variant="ghost">
            Reset
          </ButtonLink>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState>No changes recorded yet. Edits to checklist items, H1/H3, and actions will appear here.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((ev) => (
            <li key={ev.id} className="rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{ev.summary ?? ev.action}</span>
                  <span className="ml-2 font-mono text-xs text-slate-500">
                    {ev.entity}#{ev.entityId}
                  </span>
                </div>
                <span className="text-xs text-slate-500">{formatWhen(ev.occurredAt)}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {ev.actor}
                {ev.source !== "ui" ? ` · ${ev.source}` : ""}
                {ev.auditPostId ? ` · post ${ev.auditPostId}` : ""}
              </p>
              {Object.keys(ev.changes).length ? (
                <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  {Object.entries(ev.changes).map(([field, change]) => (
                    <li key={field} className="grid gap-1 sm:grid-cols-[8rem_1fr_1fr]">
                      <span className="font-semibold text-slate-700">{field}</span>
                      <span className="rounded bg-slate-50 px-2 py-1 text-slate-500">
                        {formatValue(change.from)}
                      </span>
                      <span className="rounded bg-slate-50 px-2 py-1 text-slate-800">
                        {formatValue(change.to)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
