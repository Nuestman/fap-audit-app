import { ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ConclusionForm, PriorityList, SignOffEditor } from "@/components/audit/conclusion-editors";
import type { CriterionData } from "@/components/audit/criterion-card";
import { ExtraFindingsEditor, type ExtraFindingData } from "@/components/audit/extra-findings-editor";
import { GoodPracticesEditor } from "@/components/audit/good-practices-editor";
import { asOwnerPeople, filterStaffForSite } from "@/components/audit/person-option";
import { PostDetailsForm } from "@/components/audit/post-details-form";
import { SectionChecklist } from "@/components/audit/section-checklist";
import { SupplementaryTable } from "@/components/audit/supplementary-table";
import { NavTabs } from "@/components/nav-tabs";
import { ButtonLink, Card } from "@/components/ui";
import { compareCodes, RISKS, riskLabel, riskTone, severityRank } from "@/lib/audit/classification";
import { classificationCounts, riskCounts } from "@/lib/audit/metrics";
import {
  getAppConfig,
  getAudit,
  getPostWorkspace,
  getProtocol,
  listActiveAuditors,
  listActiveFapStaff,
  type PostWorkspace,
} from "@/lib/audit/queries";
import { cn } from "@/lib/utils";

type Props = PageProps<"/audits/[auditId]/posts/[postId]/[section]">;

const actionState = (a: PostWorkspace["responses"][number]["actions"][number] | undefined) =>
  a ? { action: a.action, owner: a.owner, targetDate: a.targetDate, status: a.status } : null;

export default async function PostSectionPage({ params }: Props) {
  const { auditId, postId, section } = await params;
  const audit = await getAudit(Number(auditId));
  const post = audit?.posts.find((p) => p.id === Number(postId));
  if (!audit || !post) notFound();

  const [protocol, ws, auditors, staff, config] = await Promise.all([
    getProtocol(audit.protocolVersionId),
    getPostWorkspace(post.id),
    listActiveAuditors(),
    listActiveFapStaff(),
    getAppConfig(),
  ]);
  if (!ws) notFound();
  const staffForPost = filterStaffForSite(staff, post.siteId, config.fapStaffModel);
  const owners = asOwnerPeople(auditors, staffForPost);

  const keys = ["details", ...protocol.sections.map((s) => s.code.toLowerCase()), "h", "i"];
  if (!keys.includes(section)) notFound();

  const responseByItem = new Map(ws.responses.map((r) => [r.itemId, r]));
  const photosFor = (match: (a: PostWorkspace["attachments"][number]) => boolean) =>
    ws.attachments.filter(match).map((a) => ({ id: a.id, fileName: a.fileName }));

  const base = `/audits/${audit.id}/posts/${post.id}`;
  const tabs = keys.map((k) => {
    const sec = protocol.sections.find((s) => s.code.toLowerCase() === k);
    const answered = sec ? sec.items.filter((i) => responseByItem.get(i.id)?.answer).length : 0;
    return {
      href: `${base}/${k}`,
      label: k === "details" ? "Details" : k.toUpperCase(),
      hint: sec ? `${answered}/${sec.items.length}` : undefined,
    };
  });
  const index = keys.indexOf(section);
  const prev = keys[index - 1];
  const next = keys[index + 1];

  let body: ReactNode;
  const sec = protocol.sections.find((s) => s.code.toLowerCase() === section);

  if (section === "details") {
    body = (
      <div className="space-y-4">
        <PostDetailsForm
          auditPostId={post.id}
          staff={staffForPost}
          initial={{
            auditDate: post.auditDate,
            shift: post.shift,
            staffOnDuty: post.staffOnDuty,
            ambulanceUnits: post.ambulanceUnits,
          }}
        />
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-brand-accent">Sections</h3>
          <ul className="divide-y divide-slate-100">
            {protocol.sections.map((s) => {
              const answered = s.items.filter((i) => responseByItem.get(i.id)?.answer).length;
              return (
                <li key={s.id}>
                  <Link
                    href={`${base}/${s.code.toLowerCase()}`}
                    className="flex items-center justify-between py-2 text-sm hover:text-slate-900"
                  >
                    <span>
                      <span className="mr-2 font-mono font-semibold">{s.code}</span>
                      {s.title}
                    </span>
                    <span className={cn("text-xs", answered === s.items.length ? "text-emerald-700" : "text-slate-500")}>
                      {answered}/{s.items.length}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          Do not record patient names or identifiers in findings, and only photograph equipment
          and premises.
        </p>
      </div>
    );
  } else if (sec) {
    const criteria: CriterionData[] = sec.items.map((item) => {
      const r = responseByItem.get(item.id);
      return {
        itemId: item.id,
        code: item.code,
        text: item.text,
        responseId: r?.id ?? null,
        answer: r?.answer ?? null,
        evidence: r?.evidence ?? null,
        finding: r?.finding ?? null,
        classification: r?.classification ?? null,
        originalNote: r?.originalNote ?? null,
        action: actionState(r?.actions[0]),
        attachments: r ? photosFor((a) => a.itemResponseId === r.id) : [],
      };
    });
    const entryByRow = new Map(ws.entries.map((e) => [e.rowId, e.values]));
    body = (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-brand-accent">
            Section {sec.code} – {sec.title}
          </h2>
          {sec.subtitle ? <p className="text-sm text-slate-500">{sec.subtitle}</p> : null}
        </div>
        <SectionChecklist auditPostId={post.id} criteria={criteria} people={owners} />
        {sec.tables.map((t) => (
          <SupplementaryTable
            key={t.id}
            auditPostId={post.id}
            table={{
              code: t.code,
              title: t.title,
              rowHeader: t.rowHeader,
              columns: t.columns,
              rows: t.rows.map((r) => ({ id: r.id, label: r.label, values: entryByRow.get(r.id) ?? {} })),
            }}
          />
        ))}
      </div>
    );
  } else if (section === "h") {
    const extras = (kind: "h1" | "h3"): ExtraFindingData[] =>
      ws.extras
        .filter((e) => e.kind === kind)
        .map((e) => ({
          id: e.id,
          kind: e.kind,
          finding: e.finding,
          linkedRef: e.linkedRef,
          evidence: e.evidence,
          consequence: e.consequence,
          interimControl: e.interimControl,
          classification: e.classification,
          originalNote: e.originalNote,
          action: actionState(e.actions[0]) ?? { action: null, owner: null, targetDate: null, status: "open" },
          attachments: photosFor((a) => a.extraFindingId === e.id),
        }));
    body = (
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-accent">H1. Findings not covered by a checklist item</h2>
            <p className="text-sm text-slate-500">Opportunities for improvement or non-conformities with no matching criterion.</p>
          </div>
          <ExtraFindingsEditor auditPostId={post.id} kind="h1" initial={extras("h1")} people={owners} />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-accent">H2. Good practices deserving recognition</h2>
          <GoodPracticesEditor
            auditPostId={post.id}
            initial={ws.practices.map((p) => ({
              id: p.id,
              practice: p.practice,
              evidence: p.evidence,
              value: p.value,
              replication: p.replication,
            }))}
          />
        </section>
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-accent">H3. Other issues requiring resolution</h2>
            <p className="text-sm text-slate-500">Facilities, staff welfare, fire safety and similar issues.</p>
          </div>
          <ExtraFindingsEditor auditPostId={post.id} kind="h3" initial={extras("h3")} people={owners} />
        </section>
      </div>
    );
  } else {
    const allClassifications = [
      ...ws.responses.map((r) => r.classification),
      ...ws.extras.map((e) => e.classification),
    ];
    const risks = riskCounts(allClassifications);
    const classes = classificationCounts(allClassifications);
    const itemCode = new Map(protocol.sections.flatMap((s) => s.items.map((i) => [i.id, i.code])));
    const priorityActions = [
      ...ws.responses.flatMap((r) =>
        r.actions.map((a) => ({
          id: a.id,
          ref: itemCode.get(r.itemId) ?? "?",
          finding: r.finding,
          action: a.action,
          owner: a.owner,
          targetDate: a.targetDate,
          classification: r.classification,
          priority: a.priority,
        })),
      ),
      ...ws.extras.flatMap((e) =>
        e.actions.map((a) => ({
          id: a.id,
          ref: e.kind.toUpperCase(),
          finding: e.finding,
          action: a.action,
          owner: a.owner,
          targetDate: a.targetDate,
          classification: e.classification,
          priority: a.priority,
        })),
      ),
    ].sort(
      (a, b) =>
        (a.priority ?? 999) - (b.priority ?? 999) ||
        severityRank(a.classification) - severityRank(b.classification) ||
        compareCodes(a.ref, b.ref),
    );

    body = (
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-brand-accent">I1. Summary of findings by risk</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RISKS.map((r) => (
              <div key={r} className="rounded-lg bg-slate-50 p-3 text-center">
                <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", riskTone(r))}>{riskLabel(r)}</span>
                <p className="mt-1 text-2xl font-semibold">{risks[r]}</p>
              </div>
            ))}
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <span className="text-xs font-semibold text-emerald-800">Good practices</span>
              <p className="mt-1 text-2xl font-semibold">{ws.practices.filter((p) => p.practice).length}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {classes.major_nc} Major NC · {classes.minor_nc} Minor NC · {classes.ofi} OFI · {classes.obs} OBS
          </p>
        </Card>
        <PriorityList actions={priorityActions} />
        <ConclusionForm
          auditPostId={post.id}
          initial={{
            overallStatus: post.overallStatus,
            keyStrengths: post.keyStrengths,
            keyRisks: post.keyRisks,
            recommendation: post.recommendation,
          }}
        />
        <SignOffEditor
          rows={ws.signOffs.map((s) => ({ id: s.id, role: s.role, name: s.name, signedDate: s.signedDate }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-4 bg-[#f6f7f9]/95 px-4 pt-1 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold text-brand-accent">{post.site.code}</h2>
          <span className="text-sm text-slate-500">{post.site.name}</span>
        </div>
        <NavTabs tabs={tabs} />
      </div>
      {body}
      <div className="flex justify-between pt-2">
        {prev ? (
          <ButtonLink variant="secondary" href={`${base}/${prev}`}>
            <ChevronLeft className="size-4" /> {prev === "details" ? "Details" : `Section ${prev.toUpperCase()}`}
          </ButtonLink>
        ) : (
          <span />
        )}
        {next ? (
          <ButtonLink href={`${base}/${next}`}>
            Section {next.toUpperCase()} <ChevronRight className="size-4" />
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
