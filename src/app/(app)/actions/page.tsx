import { Button, ButtonLink, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import type { ActionStatus } from "@/db/schema";
import { actionStatusLabel, compareCodes, severityRank } from "@/lib/audit/classification";
import { listActions, type TrackedAction } from "@/lib/audit/queries";
import { todayIso } from "@/lib/utils";
import { ActionRow } from "./action-row";

const STATUSES: ActionStatus[] = ["open", "in_progress", "closed"];

const isOverdue = (a: TrackedAction, today: string) =>
  a.status !== "closed" && !!a.targetDate && a.targetDate < today;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ActionsPage({ searchParams }: PageProps<"/actions">) {
  const q = await searchParams;
  const filters = {
    site: one(q.site),
    owner: one(q.owner),
    status: one(q.status) || "unclosed",
    overdue: one(q.overdue) === "1",
  };
  const today = todayIso();
  const all = await listActions();

  const sites = [...new Set(all.map((a) => a.siteCode))].sort();
  const owners = [...new Set(all.map((a) => a.owner?.trim()).filter((o): o is string => !!o))].sort();

  const shown = all
    .filter((a) => !filters.site || a.siteCode === filters.site)
    .filter((a) => !filters.owner || a.owner?.trim() === filters.owner)
    .filter((a) =>
      filters.status === "all"
        ? true
        : filters.status === "unclosed"
          ? a.status !== "closed"
          : a.status === filters.status,
    )
    .filter((a) => !filters.overdue || isOverdue(a, today))
    .sort(
      (a, b) =>
        Number(isOverdue(b, today)) - Number(isOverdue(a, today)) ||
        (a.priority ?? 999) - (b.priority ?? 999) ||
        severityRank(a.classification) - severityRank(b.classification) ||
        a.siteCode.localeCompare(b.siteCode) ||
        compareCodes(a.ref, b.ref),
    );

  const overdueCount = all.filter((a) => isOverdue(a, today)).length;
  const openCount = all.filter((a) => a.status !== "closed").length;

  return (
    <div>
      <PageHeader
        title="Corrective actions"
        description={`${openCount} open of ${all.length} · ${overdueCount} overdue. Edits save automatically.`}
      />

      <form className="mb-6 grid gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-5 sm:items-end">
        <Field label="Post">
          <Select name="site" defaultValue={filters.site}>
            <option value="">All posts</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Owner">
          <Select name="owner" defaultValue={filters.owner}>
            <option value="">Anyone</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={filters.status}>
            <option value="unclosed">Open or in progress</option>
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {actionStatusLabel(s)}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" name="overdue" value="1" defaultChecked={filters.overdue} />
          Overdue only
        </label>
        <div className="flex gap-2">
          <Button type="submit">Filter</Button>
          <ButtonLink href="/actions" variant="ghost">
            Reset
          </ButtonLink>
        </div>
      </form>

      {shown.length === 0 ? (
        <EmptyState>No corrective actions match these filters.</EmptyState>
      ) : (
        <div className="space-y-3">
          {shown.map((a) => (
            <ActionRow key={a.id} action={a} overdue={isOverdue(a, today)} />
          ))}
        </div>
      )}
    </div>
  );
}
