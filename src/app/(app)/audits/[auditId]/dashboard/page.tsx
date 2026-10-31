import { AlertTriangle, Repeat } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ClassificationBadge, ComplianceCell } from "@/components/audit/badges";
import { ClassificationChart, ComplianceChart, RiskChart } from "@/components/dashboard/charts";
import { Card, EmptyState } from "@/components/ui";
import { collectFindings } from "@/lib/audit/findings";
import { crossSiteThemes } from "@/lib/audit/themes";
import { getAuditDataset, getAuditSummaries } from "@/lib/audit/queries";

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-brand-accent">{title}</h2>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export default async function DashboardPage({ params }: PageProps<"/audits/[auditId]/dashboard">) {
  const { auditId } = await params;
  const data = await getAuditDataset(Number(auditId));
  if (!data) notFound();
  const { audit, protocol } = data;
  const summaries = await getAuditSummaries(audit, protocol);
  const findings = collectFindings(data);
  const majors = findings.filter((f) => f.classification === "major_nc");
  const themes = crossSiteThemes(findings);
  const findingHref = (postId: number, sectionCode: string | null, ref: string) =>
    sectionCode
      ? `/audits/${audit.id}/posts/${postId}/${sectionCode.toLowerCase()}#${ref}`
      : `/audits/${audit.id}/posts/${postId}/h`;

  const totals = summaries.reduce(
    (t, s) => ({
      critical: t.critical + s.risks.critical,
      medium: t.medium + s.risks.medium,
      low: t.low + s.risks.low,
    }),
    { critical: 0, medium: 0, low: 0 },
  );

  return (
    <div className="space-y-6">
      <Panel
        title="Compliance by section"
        hint="Yes ÷ (Yes + No) for each section. N/A and unanswered criteria are excluded."
      >
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2 pr-3 font-medium">Section</th>
                {summaries.map((s) => (
                  <th key={s.postId} className="pb-2 pr-2 text-center font-medium">
                    {s.siteCode}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {protocol.sections.map((sec) => (
                <tr key={sec.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3 text-slate-700">
                    <span className="font-semibold">{sec.code}</span> {sec.title}
                  </td>
                  {summaries.map((s) => {
                    const c = s.bySection.get(sec.code);
                    return (
                      <td key={s.postId} className="py-2 pr-2 text-center">
                        <Link
                          href={`/audits/${audit.id}/posts/${s.postId}/${sec.code.toLowerCase()}`}
                          title={c ? `${c.yes} yes · ${c.no} no · ${c.na} N/A · ${c.unanswered} unanswered` : ""}
                        >
                          <ComplianceCell value={c?.compliance ?? null} />
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="py-2 pr-3 text-slate-900">Overall</td>
                {summaries.map((s) => (
                  <td key={s.postId} className="py-2 pr-2 text-center">
                    <ComplianceCell value={s.overall.compliance} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Findings by classification">
          <ClassificationChart
            data={summaries.map((s) => ({
              site: s.siteCode,
              major: s.classifications.major_nc,
              minor: s.classifications.minor_nc,
              ofi: s.classifications.ofi,
              obs: s.classifications.obs,
            }))}
          />
        </Panel>
        <Panel title="Compliance and completion">
          <ComplianceChart
            data={summaries.map((s) => ({
              site: s.siteCode,
              compliance: s.overall.compliance,
              completion: s.overall.completion,
            }))}
          />
        </Panel>
        <Panel title="Risk profile (all posts)">
          <RiskChart
            data={[
              { name: "Critical", value: totals.critical, color: "#dc2626" },
              { name: "Medium", value: totals.medium, color: "#f97316" },
              { name: "Low", value: totals.low, color: "#0284c7" },
            ]}
          />
        </Panel>
      </div>

      <Panel
        title={`Major non-conformities (${majors.length})`}
        hint="Critical risk: immediate corrective action required."
      >
        {majors.length === 0 ? (
          <EmptyState>No Major NCs recorded.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {majors.map((f) => (
              <li key={`${f.postId}-${f.source}-${f.ref}-${f.finding}`} className="py-3">
                <Link href={findingHref(f.postId, f.sectionCode, f.ref)} className="group block">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <AlertTriangle className="size-3.5 text-red-600" />
                    <span className="font-semibold text-slate-900">{f.siteCode}</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{f.ref}</code>
                    {f.criterion ? <span className="text-slate-500">{f.criterion}</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-800 group-hover:underline">
                    {f.finding || "No finding text recorded yet."}
                  </p>
                  {f.action?.action ? (
                    <p className="mt-1 text-xs text-slate-500">Action: {f.action.action}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={`Cross-site themes (${themes.length})`}
        hint="Criteria answered “No” at two or more posts. These usually need a site-wide fix rather than a local one."
      >
        {themes.length === 0 ? (
          <EmptyState>No criterion has failed at more than one post yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {themes.map((t) => (
              <li key={t.ref} className="py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Repeat className="size-3.5 text-slate-500" />
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{t.ref}</code>
                  <span className="text-slate-800">{t.criterion}</span>
                </div>
                <ul className="mt-2 space-y-1 pl-6">
                  {t.findings.map((f) => (
                    <li key={f.postId} className="flex flex-wrap items-baseline gap-2 text-xs">
                      <Link
                        href={findingHref(f.postId, f.sectionCode, f.ref)}
                        className="font-semibold text-slate-900 underline"
                      >
                        {f.siteCode}
                      </Link>
                      <ClassificationBadge value={f.classification} />
                      <span className="text-slate-600">{f.finding}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
