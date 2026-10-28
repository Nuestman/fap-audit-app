import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, ProgressBar } from "@/components/ui";
import { getAudit, getAuditSummaries, getProtocol } from "@/lib/audit/queries";
import { formatPercent } from "@/lib/utils";
import { AuditDetailsForm } from "./audit-details-form";

export default async function AuditOverviewPage({ params }: PageProps<"/audits/[auditId]">) {
  const { auditId } = await params;
  const audit = await getAudit(Number(auditId));
  if (!audit) notFound();
  const protocol = await getProtocol(audit.protocolVersionId);
  const summaries = await getAuditSummaries(audit, protocol);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaries.map((s) => (
          <Link key={s.postId} href={`/audits/${audit.id}/posts/${s.postId}`}>
            <Card className="h-full space-y-3 p-4 transition hover:ring-slate-400">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{s.siteCode}</p>
                  <p className="text-xs text-slate-500">{s.siteName}</p>
                </div>
                {s.classifications.major_nc > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                    <AlertTriangle className="size-3" />
                    {s.classifications.major_nc} Major
                  </span>
                ) : null}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Completed</span>
                  <span>
                    {s.overall.total - s.overall.unanswered}/{s.overall.total}
                  </span>
                </div>
                <ProgressBar value={s.overall.completion} />
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-[11px] text-slate-500">Compliance</dt>
                  <dd className="text-sm font-semibold">{formatPercent(s.overall.compliance)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Minor NC</dt>
                  <dd className="text-sm font-semibold">{s.classifications.minor_nc}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">OFI / OBS</dt>
                  <dd className="text-sm font-semibold">
                    {s.classifications.ofi + s.classifications.obs}
                  </dd>
                </div>
              </dl>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Central question</p>
        <p className="mt-1 text-sm italic text-slate-700">{protocol.centralQuestion}</p>
      </Card>

      <AuditDetailsForm
        auditId={audit.id}
        initial={{
          title: audit.title,
          period: audit.period,
          status: audit.status,
          startDate: audit.startDate,
          endDate: audit.endDate,
          leadAuditor: audit.leadAuditor,
          auditors: audit.auditors,
        }}
      />
    </div>
  );
}
