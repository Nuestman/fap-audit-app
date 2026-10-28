import { compareCodes } from "./classification";
import type { FindingRow } from "./findings";

export type CrossSiteTheme = {
  ref: string;
  sectionCode: string;
  criterion: string;
  findings: FindingRow[];
};

/** Criteria answered "No" at two or more posts: likely systemic rather than local issues. */
export function crossSiteThemes(findings: FindingRow[], minPosts = 2): CrossSiteTheme[] {
  const byRef = new Map<string, FindingRow[]>();
  for (const f of findings) {
    if (f.source !== "criterion" || f.answer !== "no") continue;
    byRef.set(f.ref, [...(byRef.get(f.ref) ?? []), f]);
  }
  return [...byRef.entries()]
    .filter(([, rows]) => new Set(rows.map((r) => r.postId)).size >= minPosts)
    .map(([ref, rows]) => ({
      ref,
      sectionCode: rows[0].sectionCode ?? "",
      criterion: rows[0].criterion ?? "",
      findings: rows,
    }))
    .sort((a, b) => b.findings.length - a.findings.length || compareCodes(a.ref, b.ref));
}
