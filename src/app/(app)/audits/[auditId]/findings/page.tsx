import { notFound } from "next/navigation";
import { FindingList } from "@/components/audit/finding-list";
import { Button, ButtonLink, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import type { Classification } from "@/db/schema";
import {
  CLASSIFICATIONS,
  classificationLabel,
  compareCodes,
  riskFor,
  severityRank,
  type Risk,
} from "@/lib/audit/classification";
import { collectFindings, type FindingRow } from "@/lib/audit/findings";
import { getAuditDataset } from "@/lib/audit/queries";

const FILTER_CLASSIFICATIONS = CLASSIFICATIONS.filter((c) => c !== "c");
const RISKS: Exclude<Risk, "none">[] = ["critical", "medium", "low"];
const SOURCES = [
  { value: "criterion", label: "Checklist criteria" },
  { value: "h1", label: "H1 extras" },
  { value: "h3", label: "H3 extras" },
] as const;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function applyFilters(
  findings: FindingRow[],
  filters: { site: string; classification: string; risk: string; source: string },
) {
  return findings
    .filter((f) => !filters.site || f.siteCode === filters.site)
    .filter((f) => {
      if (!filters.classification) return true;
      if (filters.classification === "unclassified") return f.classification === null;
      return f.classification === filters.classification;
    })
    .filter((f) => {
      if (!filters.risk) return true;
      return riskFor(f.classification) === filters.risk;
    })
    .filter((f) => !filters.source || f.source === filters.source)
    .sort(
      (a, b) =>
        severityRank(a.classification) - severityRank(b.classification) ||
        a.siteCode.localeCompare(b.siteCode) ||
        compareCodes(a.ref, b.ref),
    );
}

export default async function FindingsPage({
  params,
  searchParams,
}: PageProps<"/audits/[auditId]/findings">) {
  const { auditId } = await params;
  const q = await searchParams;
  const data = await getAuditDataset(Number(auditId));
  if (!data) notFound();

  const filters = {
    site: one(q.site),
    classification: one(q.classification),
    risk: one(q.risk),
    source: one(q.source),
  };
  const base = `/audits/${data.audit.id}/findings`;
  const all = collectFindings(data);
  const sites = [...new Set(all.map((f) => f.siteCode))].sort();
  const shown = applyFilters(all, filters);

  const counts = Object.fromEntries(
    FILTER_CLASSIFICATIONS.map((c) => [c, all.filter((f) => f.classification === c).length]),
  ) as Record<Exclude<Classification, "c">, number>;

  return (
    <div>
      <PageHeader
        title="Findings"
        description={`${shown.length} shown of ${all.length} · ${counts.major_nc} Major NC · ${counts.minor_nc} Minor NC · ${counts.ofi} OFI · ${counts.obs} OBS.`}
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
        <Field label="Classification">
          <Select name="classification" defaultValue={filters.classification}>
            <option value="">All</option>
            {FILTER_CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {classificationLabel(c)} ({counts[c]})
              </option>
            ))}
            <option value="unclassified">Unclassified</option>
          </Select>
        </Field>
        <Field label="Risk">
          <Select name="risk" defaultValue={filters.risk}>
            <option value="">All</option>
            {RISKS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source">
          <Select name="source" defaultValue={filters.source}>
            <option value="">All</option>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button type="submit">Filter</Button>
          <ButtonLink href={base} variant="ghost">
            Reset
          </ButtonLink>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["", "All"],
            ["major_nc", "Major NC"],
            ["minor_nc", "Minor NC"],
            ["ofi", "OFI"],
            ["obs", "OBS"],
          ] as const
        ).map(([value, label]) => {
          const href = value ? `${base}?classification=${value}` : base;
          const active = filters.classification === value && !filters.site && !filters.risk && !filters.source;
          return (
            <ButtonLink key={value || "all"} href={href} variant={active ? "primary" : "secondary"} className="text-xs">
              {label}
              {value ? ` (${counts[value]})` : ` (${all.length})`}
            </ButtonLink>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState>No findings match these filters.</EmptyState>
      ) : (
        <div className="rounded-xl bg-white px-4 ring-1 ring-slate-200">
          <FindingList
            auditId={data.audit.id}
            findings={shown}
            empty="No findings match these filters."
            showRisk
          />
        </div>
      )}
    </div>
  );
}
