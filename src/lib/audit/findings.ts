import type { ActionStatus, Answer, Classification, ExtraKind } from "@/db/schema";
import { compareCodes, severityRank } from "./classification";
import type { AuditDataset } from "./queries";

export function findingHref(auditId: number, f: Pick<FindingRow, "postId" | "sectionCode" | "ref">) {
  return f.sectionCode
    ? `/audits/${auditId}/posts/${f.postId}/${f.sectionCode.toLowerCase()}#${f.ref}`
    : `/audits/${auditId}/posts/${f.postId}/h`;
}

export function findingsOf(
  findings: FindingRow[],
  classification: Classification,
): FindingRow[] {
  return findings.filter((f) => f.classification === classification);
}

export type FindingAction = {
  id: number;
  action: string | null;
  owner: string | null;
  targetDate: string | null;
  priority: number | null;
  status: ActionStatus;
  closeoutEvidence: string | null;
};

export type FindingRow = {
  postId: number;
  siteCode: string;
  source: "criterion" | ExtraKind;
  /** Criterion code (e.g. "A1.2") or "H1" / "H3". */
  ref: string;
  sectionCode: string | null;
  criterion: string | null;
  answer: Answer | null;
  evidence: string | null;
  finding: string | null;
  classification: Classification | null;
  /** H1 linked reference, or H3 potential consequence. */
  detail: string | null;
  interimControl: string | null;
  action: FindingAction | null;
};

const firstAction = (actions: FindingAction[]): FindingAction | null => actions[0] ?? null;

/**
 * Every recorded finding in the audit: criteria answered "No" or carrying a non-conformance
 * classification, plus all H1 / H3 entries. Sorted by post, then severity, then reference.
 */
export function collectFindings(data: AuditDataset): FindingRow[] {
  const items = new Map(
    data.protocol.sections.flatMap((sec) =>
      sec.items.map((item) => [item.id, { code: item.code, text: item.text, sectionCode: sec.code }]),
    ),
  );
  const rows: FindingRow[] = [];

  for (const post of data.posts) {
    for (const r of post.responses) {
      const hasFinding =
        r.answer === "no" || (r.classification !== null && r.classification !== "c") || !!r.finding?.trim();
      if (!hasFinding) continue;
      const item = items.get(r.itemId);
      if (!item) continue;
      rows.push({
        postId: post.post.id,
        siteCode: post.site.code,
        source: "criterion",
        ref: item.code,
        sectionCode: item.sectionCode,
        criterion: item.text,
        answer: r.answer,
        evidence: r.evidence,
        finding: r.finding,
        classification: r.classification,
        detail: null,
        interimControl: null,
        action: firstAction(r.actions),
      });
    }
    for (const e of post.extras) {
      rows.push({
        postId: post.post.id,
        siteCode: post.site.code,
        source: e.kind,
        ref: e.kind.toUpperCase(),
        sectionCode: null,
        criterion: null,
        answer: null,
        evidence: e.evidence,
        finding: e.finding,
        classification: e.classification,
        detail: e.kind === "h1" ? e.linkedRef : e.consequence,
        interimControl: e.interimControl,
        action: firstAction(e.actions),
      });
    }
  }

  const postOrder = new Map(data.posts.map((p, i) => [p.post.id, i]));
  return rows.sort(
    (a, b) =>
      (postOrder.get(a.postId) ?? 0) - (postOrder.get(b.postId) ?? 0) ||
      severityRank(a.classification) - severityRank(b.classification) ||
      compareCodes(a.ref, b.ref),
  );
}