import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Classification } from "@/db/schema";
import {
  actionStatusLabel,
  answerLabel,
  CLASSIFICATIONS,
  classificationDefinition,
  classificationLabel,
  compareCodes,
  overallStatusLabel,
  riskFor,
  riskLabel,
  severityRank,
} from "@/lib/audit/classification";
import { collectFindings, type FindingRow } from "@/lib/audit/findings";
import { classificationCounts, countAnswers, riskCounts, type ItemState } from "@/lib/audit/metrics";
import type { AuditDataset } from "@/lib/audit/queries";
import { crossSiteThemes } from "@/lib/audit/themes";
import { formatDate, formatPercent } from "@/lib/utils";

type Post = AuditDataset["posts"][number];

const NAVY = "1F3864";
const SHADE: Record<Classification, string> = {
  major_nc: "F4B6B6",
  minor_nc: "F8CBAD",
  ofi: "BDD7EE",
  obs: "D9D2E9",
  c: "C6EFCE",
};

// ---------------------------------------------------------------- building blocks

const heading = (text: string, level: 1 | 2 | 3 = 1) =>
  new Paragraph({
    text,
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    pageBreakBefore: level === 1,
  });

const para = (text: string, opts: { bold?: boolean; italics?: boolean; color?: string } = {}) =>
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, ...opts })] });

/** Visible marker for narrative the auditor still has to write. */
const placeholder = (what: string) =>
  new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: `[To be completed: ${what}]`, italics: true, color: "C00000" })],
  });

/** Narrative text, one paragraph per line; a placeholder when empty. */
function narrative(text: string | null | undefined, what: string): Paragraph[] {
  const lines = (text ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines.map((l) => para(l)) : [placeholder(what)];
}

type CellSpec = string | number | null | { text: string; shade?: string; bold?: boolean };

function cell(spec: CellSpec, header = false) {
  const s = typeof spec === "object" && spec !== null ? spec : { text: spec === null ? "" : String(spec) };
  return new TableCell({
    shading: header
      ? { type: ShadingType.CLEAR, color: "auto", fill: NAVY }
      : s.shade
        ? { type: ShadingType.CLEAR, color: "auto", fill: s.shade }
        : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: s.text.split("\n").map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              bold: header || s.bold,
              color: header ? "FFFFFF" : undefined,
              size: 18,
            }),
          ],
        }),
    ),
  });
}

function table(headers: string[], rows: CellSpec[][], widths?: number[]) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h) => cell(h, true)) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c) => cell(c)) })),
    ],
  });
}

const spacer = () => new Paragraph({ text: "" });

const clsCell = (c: Classification | null): CellSpec =>
  c ? { text: classificationLabel(c), shade: SHADE[c] } : "";

const riskText = (c: Classification | null) => {
  const r = riskFor(c);
  return r && r !== "none" ? riskLabel(r) : "";
};

// ---------------------------------------------------------------- data helpers

function itemStates(data: AuditDataset, post: Post): ItemState[] {
  const byItem = new Map(post.responses.map((r) => [r.itemId, r]));
  return data.protocol.sections.flatMap((sec) =>
    sec.items.map((item) => ({
      sectionCode: sec.code,
      answer: byItem.get(item.id)?.answer ?? null,
      classification: byItem.get(item.id)?.classification ?? null,
    })),
  );
}

function postClassifications(post: Post) {
  return [...post.responses.map((r) => r.classification), ...post.extras.map((e) => e.classification)];
}

// ---------------------------------------------------------------- report sections

function cover(data: AuditDataset) {
  const a = data.audit;
  return [
    new Paragraph({ spacing: { before: 2400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: a.title, bold: true, size: 48, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [
        new TextRun({ text: "First Aid Post & Ambulance Audit Report", size: 28, color: NAVY }),
      ],
    }),
    table(
      ["Document control", ""],
      [
        ["Posts audited", data.posts.map((p) => `${p.site.code} (${p.site.name})`).join("\n")],
        ["Audit period", a.period],
        ["Audit dates", `${formatDate(a.startDate)} to ${formatDate(a.endDate)}`],
        ["Lead auditor", a.leadAuditor],
        ["Audit team", a.auditors],
        ["Protocol", `${data.protocol.name} v${data.protocol.version}`],
        ["Report status", a.status === "final" ? "Final" : "Draft"],
        ["Generated", formatDate(new Date())],
      ],
      [30, 70],
    ),
    new Paragraph({ children: [new PageBreak()] }),
    new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  ];
}

function executiveSummary(data: AuditDataset, findings: FindingRow[]) {
  const majors = findings.filter((f) => f.classification === "major_nc");
  const themes = crossSiteThemes(findings);
  const keyFacts = data.posts.map((p) => {
    const counts = countAnswers(itemStates(data, p));
    const cls = classificationCounts(postClassifications(p));
    return `${p.site.code}: compliance ${formatPercent(counts.compliance)} on ${counts.total - counts.unanswered} of ${counts.total} criteria answered; ${cls.major_nc} Major NC, ${cls.minor_nc} Minor NC, ${cls.ofi + cls.obs} OFI/OBS.`;
  });
  return [
    heading("1. Executive summary"),
    ...narrative(data.audit.executiveSummary, "executive summary (purpose, overall result, most serious risks, key recommendations)"),
    heading("Key figures", 2),
    ...keyFacts.map((t) => new Paragraph({ text: t, bullet: { level: 0 } })),
    para(
      `${majors.length} Major non-conformit${majors.length === 1 ? "y was" : "ies were"} raised` +
        (themes.length ? `, and ${themes.length} criteria failed at two or more posts.` : "."),
    ),
  ];
}

function methodology(data: AuditDataset) {
  return [
    heading("2. Introduction and methodology"),
    heading("Scope", 2),
    ...narrative(data.audit.scopeNotes, "scope: posts, ambulances, shifts and services covered"),
    heading("Central question", 2),
    para(data.protocol.centralQuestion ?? "", { italics: true }),
    heading("Method", 2),
    para(
      `Each post was assessed against the ${data.protocol.name} (v${data.protocol.version}), covering ` +
        `${data.protocol.sections.length} sections and ${data.protocol.sections.reduce((n, s) => n + s.items.length, 0)} criteria. ` +
        "Evidence came from observation, document and record review, equipment checks and staff interviews. " +
        "Each criterion was marked Yes, No or N/A. Compliance is Yes ÷ (Yes + No); N/A and unanswered criteria are excluded.",
    ),
    heading("Classification of findings", 2),
    table(
      ["Classification", "Risk", "Definition"],
      CLASSIFICATIONS.map((c) => [clsCell(c), riskText(c) || "None", classificationDefinition(c)]),
      [22, 12, 66],
    ),
    heading("Limitations", 2),
    ...narrative(data.audit.limitations, "limitations (records not produced, areas not visited, staff unavailable)"),
  ];
}

function overallResults(data: AuditDataset) {
  const posts = data.posts.map((p) => {
    const states = itemStates(data, p);
    return {
      p,
      states,
      counts: countAnswers(states),
      cls: classificationCounts(postClassifications(p)),
      risk: riskCounts(postClassifications(p)),
    };
  });
  return [
    heading("3. Overall results"),
    table(
      ["Post", "Answered", "Compliance", "Major NC", "Minor NC", "OFI", "OBS", "Overall status"],
      posts.map(({ p, counts, cls }) => [
        { text: p.site.code, bold: true },
        `${counts.total - counts.unanswered}/${counts.total}`,
        formatPercent(counts.compliance),
        cls.major_nc,
        cls.minor_nc,
        cls.ofi,
        cls.obs,
        p.post.overallStatus ? overallStatusLabel(p.post.overallStatus) : "Not yet decided",
      ]),
    ),
    spacer(),
    heading("Compliance by section", 2),
    table(
      ["Section", ...posts.map(({ p }) => p.site.code)],
      data.protocol.sections.map((sec) => [
        `${sec.code}. ${sec.title}`,
        ...posts.map(({ states }) => formatPercent(countAnswers(states.filter((s) => s.sectionCode === sec.code)).compliance)),
      ]),
    ),
  ];
}

function themesSection(findings: FindingRow[]) {
  const themes = crossSiteThemes(findings);
  return [
    heading("4. Cross-site themes"),
    para(
      "Criteria answered “No” at two or more posts. These point to site-wide gaps that are better fixed once, centrally, than post by post.",
    ),
    ...(themes.length
      ? [
          table(
            ["Ref", "Criterion", "Posts", "Findings"],
            themes.map((t) => [
              t.ref,
              t.criterion,
              t.findings.map((f) => f.siteCode).join(", "),
              t.findings.map((f) => `${f.siteCode}: ${f.finding ?? "No finding text"}`).join("\n"),
            ]),
            [8, 30, 10, 52],
          ),
        ]
      : [para("No criterion failed at more than one post.")]),
  ];
}

function perSiteFindings(data: AuditDataset, findings: FindingRow[]) {
  const out: (Paragraph | Table)[] = [heading("5. Findings by post")];
  data.posts.forEach((p, i) => {
    const rows = findings.filter((f) => f.postId === p.post.id);
    const checklist = rows.filter((f) => f.source === "criterion");
    const h1 = rows.filter((f) => f.source === "h1");
    const h3 = rows.filter((f) => f.source === "h3");
    out.push(
      new Paragraph({
        text: `5.${i + 1} ${p.site.code}: ${p.site.name}`,
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: i > 0,
      }),
      para(
        [
          p.post.auditDate && `Visited ${formatDate(p.post.auditDate)}`,
          p.post.shift && `shift: ${p.post.shift}`,
          p.post.nurseInCharge && `nurse in charge: ${p.post.nurseInCharge}`,
          p.post.ambulanceUnits && `ambulance units: ${p.post.ambulanceUnits}`,
        ]
          .filter(Boolean)
          .join("; ") || "Visit details not recorded.",
        { italics: true, color: "595959" },
      ),
      heading("Checklist findings", 3),
      checklist.length
        ? table(
            ["Ref", "Finding", "Evidence", "Class.", "Risk"],
            checklist.map((f) => [f.ref, f.finding ?? "", f.evidence ?? "", clsCell(f.classification), riskText(f.classification)]),
            [8, 46, 28, 10, 8],
          )
        : para("No checklist findings recorded."),
    );
    if (h1.length) {
      out.push(
        heading("Findings not covered by a checklist item (H1)", 3),
        table(
          ["Finding", "Reference", "Class.", "Risk"],
          h1.map((f) => [f.finding ?? "", f.detail ?? "", clsCell(f.classification), riskText(f.classification)]),
          [60, 20, 12, 8],
        ),
      );
    }
    if (h3.length) {
      out.push(
        heading("Other issues requiring resolution (H3)", 3),
        table(
          ["Issue", "Potential consequence", "Interim control", "Class."],
          h3.map((f) => [f.finding ?? "", f.detail ?? "", f.interimControl ?? "", clsCell(f.classification)]),
          [34, 34, 22, 10],
        ),
      );
    }
  });
  return out;
}

function goodPractices(data: AuditDataset) {
  const rows = data.posts.flatMap((p) =>
    p.practices
      .filter((g) => g.practice?.trim())
      .map((g): CellSpec[] => [p.site.code, g.practice ?? "", g.evidence ?? "", g.replication ?? ""]),
  );
  return [
    heading("6. Good practices"),
    ...(rows.length
      ? [table(["Post", "Good practice", "Evidence", "Potential for replication"], rows, [8, 40, 30, 22])]
      : [placeholder("good practices observed (section H2 for each post)")]),
  ];
}

function actionPlan(findings: FindingRow[]) {
  const rows = findings
    .filter((f) => f.action)
    .sort(
      (a, b) =>
        severityRank(a.classification) - severityRank(b.classification) ||
        (a.action?.priority ?? 999) - (b.action?.priority ?? 999) ||
        a.siteCode.localeCompare(b.siteCode) ||
        compareCodes(a.ref, b.ref),
    );
  return [
    heading("7. Consolidated corrective action plan"),
    para("Ordered by severity, then by the priority set for each post. Owners and dates left blank still need to be agreed."),
    table(
      ["Post", "Ref", "Risk", "Corrective action", "Owner", "Target", "Status"],
      rows.map((f) => [
        f.siteCode,
        f.ref,
        { text: riskText(f.classification), shade: f.classification ? SHADE[f.classification] : undefined },
        f.action?.action ?? "",
        f.action?.owner ?? "",
        f.action?.targetDate ? formatDate(f.action.targetDate) : "",
        f.action ? actionStatusLabel(f.action.status) : "",
      ]),
      [7, 7, 9, 45, 13, 11, 8],
    ),
  ];
}

function conclusion(data: AuditDataset) {
  const out: (Paragraph | Table)[] = [
    heading("8. Conclusion and sign-off"),
    ...narrative(data.audit.conclusion, "overall conclusion answering the central question"),
  ];
  for (const p of data.posts) {
    out.push(
      heading(`${p.site.code}`, 2),
      para(
        `Overall status: ${p.post.overallStatus ? overallStatusLabel(p.post.overallStatus) : "not yet decided"}`,
        { bold: true },
      ),
      para("Key strengths", { bold: true }),
      ...narrative(p.post.keyStrengths, `key strengths at ${p.site.code}`),
      para("Key risks requiring management attention", { bold: true }),
      ...narrative(p.post.keyRisks, `key risks at ${p.site.code}`),
      para("Overall recommendation", { bold: true }),
      ...narrative(p.post.recommendation, `recommendation for ${p.site.code}`),
      table(
        ["Role", "Name", "Signature", "Date"],
        p.signOffs.map((s) => [s.role, s.name ?? "", "", s.signedDate ? formatDate(s.signedDate) : ""]),
        [32, 28, 24, 16],
      ),
    );
  }
  return out;
}

function appendices(data: AuditDataset) {
  const out: (Paragraph | Table)[] = [heading("Appendices: completed checklists")];
  data.posts.forEach((p, i) => {
    const byItem = new Map(p.responses.map((r) => [r.itemId, r]));
    out.push(
      new Paragraph({
        text: `Appendix ${String.fromCharCode(65 + i)}: ${p.site.code} checklist`,
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: i > 0,
      }),
    );
    for (const sec of data.protocol.sections) {
      out.push(
        heading(`${sec.code}. ${sec.title}`, 3),
        table(
          ["ID", "Criterion", "Response", "Class."],
          sec.items.map((item) => {
            const r = byItem.get(item.id);
            return [item.code, item.text, r?.answer ? answerLabel(r.answer) : "", clsCell(r?.classification ?? null)];
          }),
          [8, 66, 12, 14],
        ),
      );
    }
  });
  return out;
}

export async function buildWordReport(data: AuditDataset): Promise<Buffer> {
  const findings = collectFindings(data);
  const doc = new Document({
    creator: data.audit.leadAuditor ?? "FAP Audit",
    title: data.audit.title,
    description: "First Aid Post & Ambulance Audit Report",
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: "Calibri", size: 21 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 32, bold: true, color: NAVY },
          paragraph: { spacing: { before: 240, after: 160 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 26, bold: true, color: NAVY },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 22, bold: true, color: "404040" },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${data.audit.title} · page `, size: 16, color: "808080" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "808080" }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...cover(data),
          ...executiveSummary(data, findings),
          ...methodology(data),
          ...overallResults(data),
          ...themesSection(findings),
          ...perSiteFindings(data, findings),
          ...goodPractices(data),
          ...actionPlan(findings),
          ...conclusion(data),
          ...appendices(data),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
