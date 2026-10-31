import { FileSpreadsheet, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { overallStatusLabel } from "@/lib/audit/classification";
import { collectFindings } from "@/lib/audit/findings";
import { getAuditDataset, getAuditSummaries } from "@/lib/audit/queries";
import { crossSiteThemes } from "@/lib/audit/themes";
import { formatPercent } from "@/lib/utils";
import { ImportPanel } from "./import-panel";
import { NarrativeForm } from "./narrative-form";

const DOWNLOAD =
  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium ring-1 ring-inset ring-slate-300 bg-white text-slate-900 hover:bg-slate-50";

export default async function ReportPage({ params }: PageProps<"/audits/[auditId]/report">) {
  const { auditId } = await params;
  const data = await getAuditDataset(Number(auditId));
  if (!data) notFound();
  const { audit, protocol } = data;
  const summaries = await getAuditSummaries(audit, protocol);
  const findings = collectFindings(data);
  const themes = crossSiteThemes(findings);
  const actions = findings.filter((f) => f.action);
  const practices = data.posts.reduce((n, p) => n + p.practices.filter((g) => g.practice?.trim()).length, 0);

  const missing = [
    !audit.executiveSummary && "executive summary",
    !audit.scopeNotes && "scope",
    !audit.limitations && "limitations",
    !audit.conclusion && "overall conclusion",
    ...data.posts.filter((p) => !p.post.overallStatus).map((p) => `${p.site.code} overall status (I3)`),
    ...data.posts
      .filter((p) => p.signOffs.every((s) => !s.name))
      .map((p) => `${p.site.code} sign-off (I4)`),
  ].filter((x): x is string => !!x);

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-brand-accent">Export</h2>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/audits/${audit.id}/export/word`} className={DOWNLOAD}>
            <FileText className="size-4 text-sky-700" />
            Word report (draft)
          </a>
          <a href={`/api/audits/${audit.id}/export/excel`} className={DOWNLOAD}>
            <FileSpreadsheet className="size-4 text-emerald-700" />
            Excel workbook
          </a>
        </div>
        <p className="text-xs text-slate-500">
          The Word report is built from everything entered so far. Gaps show as red “[To be completed]” notes. When
          Word asks to update fields on opening, choose Yes to fill in the contents page.
        </p>
        {missing.length ? (
          <p className="text-xs text-amber-700">Still to write: {missing.join(", ")}.</p>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <NarrativeForm
          auditId={audit.id}
          initial={{
            executiveSummary: audit.executiveSummary,
            scopeNotes: audit.scopeNotes,
            limitations: audit.limitations,
            conclusion: audit.conclusion,
          }}
        />

        <Card className="h-fit space-y-3 p-4">
          <h2 className="text-sm font-semibold text-brand-accent">What the report will contain</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-1 font-medium">Post</th>
                <th className="pb-1 font-medium">Answered</th>
                <th className="pb-1 font-medium">Compliance</th>
                <th className="pb-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => {
                const post = data.posts.find((p) => p.post.id === s.postId);
                return (
                  <tr key={s.postId} className="border-t border-slate-100">
                    <td className="py-1.5 font-semibold">{s.siteCode}</td>
                    <td className="py-1.5">
                      {s.overall.total - s.overall.unanswered}/{s.overall.total}
                    </td>
                    <td className="py-1.5">{formatPercent(s.overall.compliance)}</td>
                    <td className="py-1.5 text-xs text-slate-600">
                      {post?.post.overallStatus ? overallStatusLabel(post.post.overallStatus) : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>{findings.length} findings across all posts</li>
            <li>{findings.filter((f) => f.classification === "major_nc").length} Major NCs</li>
            <li>{themes.length} cross-site themes</li>
            <li>{actions.length} corrective actions</li>
            <li>{practices} good practices</li>
          </ul>
        </Card>
      </div>

      <ImportPanel auditId={audit.id} locked={audit.status === "final"} />
    </div>
  );
}
