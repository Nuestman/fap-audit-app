# Dashboard metrics

How every number on `/audits/[auditId]/dashboard` (and the matching audit overview cards) is computed.

Nothing on the dashboard is stored as a pre-calculated score. Values are derived on each request from live checklist answers, classifications, and findings.

| Concern | Code |
|---------|------|
| Answer counts, compliance, completion | `src/lib/audit/metrics.ts` |
| Classification → risk mapping | `src/lib/audit/classification.ts` |
| Per-post summaries | `getAuditSummaries` in `src/lib/audit/queries.ts` |
| Finding rows (classified lists, themes input) | `src/lib/audit/findings.ts` |
| Cross-site themes | `src/lib/audit/themes.ts` |
| Dashboard UI | `src/app/(app)/audits/[auditId]/dashboard/page.tsx` |
| Aggregated findings + filters | `src/app/(app)/audits/[auditId]/findings/page.tsx` |

Display percentages use `Math.round(value * 100)` (so `14/18 ≈ 0.777…` shows as **78%**).

---

## Compliance

**Formula:** `Yes ÷ (Yes + No)`

**Excludes:** N/A and unanswered criteria.

| Answer | Meaning for this metric |
|--------|-------------------------|
| Yes | Requirement applied and was met |
| No | Requirement applied and was not met |
| N/A | Requirement did not apply — omitted so it neither helps nor hurts the score |
| Unanswered | Not judged yet — omitted so incomplete work is not treated as failure |

**What it means in plain language:** of the criteria that *applied* and have been answered Yes or No, what share were met?

**Where it appears**

- **Compliance by section** — one cell per post × protocol section (A, B, C, …).
- **Overall** row — same formula over *all* checklist criteria for that post (still excluding N/A and unanswered).
- **Compliance and completion** chart — overall compliance per post.

Hover a section cell for the raw breakdown: `yes · no · N/A · unanswered`.

### Worked example (ODD · Section C)

Section C has 18 criteria. At ODD they were answered **14 Yes** and **4 No** (0 N/A, 0 unanswered):

```
14 ÷ (14 + 4) = 14/18 ≈ 78%
```

**How to explain it:** “Of the 18 Section C requirements that applied at ODD, 14 were met and 4 were not, so compliance is 78%.”

It does *not* mean “78% of the whole post is fine” — only that four-fifths of the applicable Section C checklist items were Yes.

### Cell colour bands

| Score | Band |
|------:|------|
| ≥ 90% | Green |
| 75–89% | Lime |
| 50–74% | Amber |
| &lt; 50% | Red |
| No Yes/No yet | Em dash (–) |

---

## Completion

**Formula:** `(Yes + No + N/A) ÷ total checklist criteria`

**What it means:** how far through the protocol checklist the auditors have got for that post. N/A *counts as answered* here, because the criterion was considered.

Shown next to compliance on the **Compliance and completion** chart and on the audit overview cards. Completion and compliance answer different questions; a post can be 100% complete and still have low compliance.

---

## Findings by classification

Counts of classifications recorded on that post, from:

1. Checklist item responses (`item_response.classification`), and  
2. Extra findings H1 / H3 (`extra_finding.classification`).

| Code | Label | Typical meaning |
|------|-------|-----------------|
| `major_nc` | Major NC | Significant / systemic / high H&S risk |
| `minor_nc` | Minor NC | Isolated failure |
| `ofi` | OFI | Opportunity for improvement |
| `obs` | OBS | Observation / early warning |
| `c` | Conformance | Fully met (usually not charted as a “finding”) |

The chart stacks Major / Minor / OFI / OBS per post. Unclassified rows are not counted.

---

## Risk profile

Risk is **derived from classification**, not entered separately:

| Classification | Risk |
|----------------|------|
| Major NC | Critical |
| Minor NC | Medium |
| OFI or OBS | Low |
| Conformance (`c`) | None (excluded from the risk chart) |

The **Risk profile (all posts)** chart sums Critical / Medium / Low across every post in the audit. Same mapping drives I1 risk tallies in Excel/Word exports.

---

## Classified finding lists (Major NC, Minor NC, OFI)

Built from `collectFindings()`, then filtered by classification:

| Dashboard panel | Filter |
|-----------------|--------|
| Major NCs | `classification === major_nc` |
| Minor NCs | `classification === minor_nc` |
| OFIs | `classification === ofi` |

A row is treated as a “finding” if it is:

- a checklist criterion answered **No**, or carrying a non-conformance / OFI / OBS classification, or with finding text; or  
- any **H1** / **H3** extra finding.

Each list entry shows post, ref, criterion (if any), finding text, and the first linked corrective action when present. Links jump to the section form. **View all** opens the Findings page pre-filtered to that classification.

### Findings page (`/audits/[auditId]/findings`)

Aggregated list across every post in the audit, with filters for:

- **Post** (site code)
- **Classification** (Major NC, Minor NC, OFI, OBS, unclassified)
- **Risk** (Critical / Medium / Low — derived from classification)
- **Source** (checklist criterion, H1, or H3)

Quick chips jump to common classification filters. Same finding rows as the dashboard panels; OBS is available here even though it has no dedicated dashboard panel.

---

## Cross-site themes

Computed by `crossSiteThemes()` — **not stored in the database**.

A theme is a checklist **criterion code** (e.g. `C1.6`) that is answered **No** at **two or more posts** in the same audit. H1/H3 extras never become themes. Local-only Nos do not appear.

Themes are sorted by how many posts share the failure, then by ref. Use them to spot issues that look **systemic** rather than post-specific.

If the dashboard shows three themes, that means exactly three criterion codes currently fail at two or more posts.

---

## H1 linked criterion / reference

H1 rows store an optional free-text **Linked criterion / reference** (`extra_finding.linked_ref`). It is typed on the Section H card (not a foreign key to `protocol_item`). Use it for an ISO clause or a “related to …” criterion note when the finding has no exact checklist home. Excel/Word H1 columns show the same text.

---

## What is *not* on this dashboard

| Topic | Where it lives |
|-------|----------------|
| Action tracker (owners, due dates, close-out) | `/actions` |
| Per-post I2 priority action plan | Post section I / Excel post sheet |
| Excel **Actions** sheet | Export-time flatten of findings that have an action (not Excel formulas into post sheets) |
| Good-practice counts | Included in post summaries / Excel summary; not a dedicated dashboard panel |

---

## Same formulas elsewhere

Excel Summary and the Word draft report reuse the same compliance, classification, risk, Major NC, and cross-site theme logic so dashboard and exports stay aligned.
