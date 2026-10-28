import ExcelJS from "exceljs";
import type { Classification } from "@/db/schema";
import { compareCodes, riskFor, riskLabel, severityRank } from "@/lib/audit/classification";
import { collectFindings } from "@/lib/audit/findings";
import { classificationCounts, countAnswers, minutesBetween, riskCounts } from "@/lib/audit/metrics";
import type { AuditDataset } from "@/lib/audit/queries";
import {
  ANSWER_CELLS,
  answerCell,
  CLASSIFICATION_CELLS,
  classificationCell,
  MAIN_HEADERS,
  OVERALL_CELLS,
  overallCell,
  riskFormula,
  STATUS_CELLS,
  statusCell,
} from "@/lib/workbook/format";

type Worksheet = ExcelJS.Worksheet;
type Post = AuditDataset["posts"][number];

const COLORS = {
  dark: "FF1F3864",
  section: "FFD9E2F3",
  border: "FFA6A6A6",
  draft: "FFFFF2CC",
  classification: {
    major_nc: "FFF4B6B6",
    minor_nc: "FFF8CBAD",
    ofi: "FFBDD7EE",
    obs: "FFD9D2E9",
    c: "FFC6EFCE",
  } satisfies Record<Classification, string>,
};

const MAIN_WIDTHS = [8, 55, 12, 38, 60, 14, 10, 50, 18, 13, 12, 45];

const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const thin: Partial<ExcelJS.Border> = { style: "thin", color: { argb: COLORS.border } };
const BOX: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };

function header(ws: Worksheet, row: number, labels: string[], startCol = 1) {
  labels.forEach((label, i) => {
    const c = ws.getCell(row, startCol + i);
    c.value = label;
    c.fill = fill(COLORS.dark);
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { wrapText: true, vertical: "middle" };
    c.border = BOX;
  });
}

function body(ws: Worksheet, row: number, firstCol: number, lastCol: number) {
  for (let col = firstCol; col <= lastCol; col++) {
    const c = ws.getCell(row, col);
    c.alignment = { wrapText: true, vertical: "top" };
    c.border = BOX;
  }
}

function title(ws: Worksheet, row: number, text: string) {
  const c = ws.getCell(row, 1);
  c.value = text;
  c.font = { bold: true, size: 12, color: { argb: COLORS.dark } };
  return row + 1;
}

function list(ws: Worksheet, ref: string, options: string[]) {
  ws.getCell(ref).dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`"${options.join(",")}"`],
    showErrorMessage: true,
    errorTitle: "Invalid entry",
    error: "Choose a value from the list.",
  };
}

function classificationCellStyle(ws: Worksheet, row: number, col: number, c: Classification | null) {
  if (c) ws.getCell(row, col).fill = fill(COLORS.classification[c]);
}

function riskCell(ws: Worksheet, row: number, c: Classification | null) {
  const risk = riskFor(c);
  ws.getCell(row, 7).value = {
    formula: riskFormula(row),
    result: risk ? riskLabel(risk) : "",
  };
}

// ---------------------------------------------------------------- per-post sheet

function postSheet(wb: ExcelJS.Workbook, data: AuditDataset, post: Post) {
  const ws = wb.addWorksheet(post.site.code, {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  MAIN_WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  ws.getCell("A1").value = `${post.site.code} First Aid Post & Ambulance Audit Checklist`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: COLORS.dark } };
  ws.getCell("A2").value =
    `${data.audit.title}. Exported from the FAP Audit app on ${new Date().toISOString().slice(0, 10)}. ` +
    "Response, Classification and Status are dropdowns; this sheet can be re-imported into the app.";
  ws.mergeCells("A2:L2");
  ws.getCell("A2").alignment = { wrapText: true };
  ws.getRow(2).height = 32;

  const headerRow = 4;
  header(ws, headerRow, MAIN_HEADERS);
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: headerRow }];
  ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;

  const responses = new Map(post.responses.map((r) => [r.itemId, r]));
  let row = headerRow + 1;

  for (const sec of data.protocol.sections) {
    ws.getCell(row, 1).value = `Section ${sec.code} – ${sec.title}`;
    ws.getCell(row, 1).font = { bold: true };
    for (let col = 1; col <= MAIN_HEADERS.length; col++) {
      ws.getCell(row, col).fill = fill(COLORS.section);
      ws.getCell(row, col).border = BOX;
    }
    row++;
    for (const item of sec.items) {
      const r = responses.get(item.id);
      const a = r?.actions[0];
      const values = [
        item.code,
        item.text,
        answerCell(r?.answer ?? null),
        r?.evidence ?? null,
        r?.finding ?? null,
        classificationCell(r?.classification ?? null),
        null,
        a?.action ?? null,
        a?.owner ?? null,
        a?.targetDate ?? null,
        a ? statusCell(a.status) : null,
        r?.originalNote ?? null,
      ];
      values.forEach((v, i) => (ws.getCell(row, i + 1).value = v));
      riskCell(ws, row, r?.classification ?? null);
      body(ws, row, 1, MAIN_HEADERS.length);
      classificationCellStyle(ws, row, 6, r?.classification ?? null);
      list(ws, `C${row}`, ANSWER_CELLS);
      list(ws, `F${row}`, CLASSIFICATION_CELLS);
      list(ws, `K${row}`, STATUS_CELLS);
      row++;
    }
  }

  // ---- supplementary tables (A2, B2, D2, E2, G2)
  const entries = new Map(post.entries.map((e) => [e.rowId, e.values]));
  for (const table of data.protocol.sections.flatMap((s) => s.tables)) {
    row++;
    row = title(ws, row, `${table.code}. ${table.title}`);
    const allTime = table.columns.every((c) => c.type === "time");
    header(ws, row, [table.rowHeader, ...table.columns.map((c) => c.label), ...(allTime ? ["Total time"] : [])], 2);
    row++;
    for (const tr of table.rows) {
      const values = entries.get(tr.id) ?? {};
      ws.getCell(row, 2).value = tr.label;
      table.columns.forEach((c, i) => {
        const v = values[c.key];
        ws.getCell(row, 3 + i).value = c.type === "number" && v && !Number.isNaN(Number(v)) ? Number(v) : v || null;
        if (c.type === "yesno") list(ws, ws.getCell(row, 3 + i).address, ["Yes", "No"]);
        if (c.type === "oknotna") list(ws, ws.getCell(row, 3 + i).address, ["OK", "Not OK", "N/A"]);
      });
      const lastCol = 2 + table.columns.length + (allTime ? 1 : 0);
      if (allTime) {
        const first = table.columns[0].key;
        const last = table.columns[table.columns.length - 1].key;
        const mins = minutesBetween(values[first], values[last]);
        ws.getCell(row, lastCol).value = mins === null ? null : `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
      }
      body(ws, row, 2, lastCol);
      row++;
    }
  }

  // ---- H1
  const h1 = post.extras.filter((e) => e.kind === "h1");
  row++;
  row = title(ws, row, "H1. Opportunities for improvement / findings not covered by a checklist item");
  header(ws, row, [
    "No.",
    "Finding / opportunity",
    "Linked criterion / reference",
    "Evidence",
    "Recommendation",
    "Classification",
    "Risk",
    "Responsible person",
    "Target date",
    "Status",
    "",
    "Original auditor note",
  ]);
  row++;
  for (let n = 0; n < Math.max(8, h1.length + 2); n++) {
    const e = h1[n];
    const a = e?.actions[0];
    const values = [
      n + 1,
      e?.finding ?? null,
      e?.linkedRef ?? null,
      e?.evidence ?? null,
      a?.action ?? null,
      classificationCell(e?.classification ?? null),
      null,
      a?.owner ?? null,
      a?.targetDate ?? null,
      a ? statusCell(a.status) : null,
      null,
      e?.originalNote ?? null,
    ];
    values.forEach((v, i) => (ws.getCell(row, i + 1).value = v));
    riskCell(ws, row, e?.classification ?? null);
    body(ws, row, 1, 12);
    classificationCellStyle(ws, row, 6, e?.classification ?? null);
    list(ws, `F${row}`, CLASSIFICATION_CELLS);
    list(ws, `J${row}`, STATUS_CELLS);
    row++;
  }

  // ---- H2
  row++;
  row = title(ws, row, "H2. Good practices deserving recognition / sharing");
  header(ws, row, ["No.", "Good practice", "Evidence / example", "Why it is valuable", "Potential for replication"]);
  row++;
  for (let n = 0; n < Math.max(5, post.practices.length + 2); n++) {
    const p = post.practices[n];
    [n + 1, p?.practice ?? null, p?.evidence ?? null, p?.value ?? null, p?.replication ?? null].forEach(
      (v, i) => (ws.getCell(row, i + 1).value = v),
    );
    body(ws, row, 1, 5);
    row++;
  }

  // ---- H3
  const h3 = post.extras.filter((e) => e.kind === "h3");
  row++;
  row = title(ws, row, "H3. Other issues requiring resolution (facilities, welfare, fire safety)");
  header(ws, row, [
    "No.",
    "Issue",
    "Potential consequence",
    "Interim control",
    "Responsible person",
    "Classification",
    "Risk",
    "Target date",
    "Status",
    "Required action",
    "",
    "Original auditor note",
  ]);
  row++;
  for (let n = 0; n < Math.max(8, h3.length + 2); n++) {
    const e = h3[n];
    const a = e?.actions[0];
    const values = [
      n + 1,
      e?.finding ?? null,
      e?.consequence ?? null,
      e?.interimControl ?? null,
      a?.owner ?? null,
      classificationCell(e?.classification ?? null),
      null,
      a?.targetDate ?? null,
      a ? statusCell(a.status) : null,
      a?.action ?? null,
      null,
      e?.originalNote ?? null,
    ];
    values.forEach((v, i) => (ws.getCell(row, i + 1).value = v));
    riskCell(ws, row, e?.classification ?? null);
    body(ws, row, 1, 12);
    classificationCellStyle(ws, row, 6, e?.classification ?? null);
    list(ws, `F${row}`, CLASSIFICATION_CELLS);
    list(ws, `I${row}`, STATUS_CELLS);
    row++;
  }

  // ---- I1
  const allCls = [...post.responses.map((r) => r.classification), ...post.extras.map((e) => e.classification)];
  const risks = riskCounts(allCls);
  row++;
  row = title(ws, row, "I1. Summary of findings by risk");
  header(ws, row, ["Risk rating", "Number of findings"], 2);
  row++;
  for (const [label, n] of [
    ["CRITICAL", risks.critical],
    ["MEDIUM", risks.medium],
    ["LOW", risks.low],
    ["Good practices", post.practices.filter((p) => p.practice?.trim()).length],
  ] as const) {
    ws.getCell(row, 2).value = label;
    ws.getCell(row, 3).value = n;
    body(ws, row, 2, 3);
    row++;
  }

  // ---- I2
  const itemCode = new Map(data.protocol.sections.flatMap((s) => s.items.map((i) => [i.id, i.code])));
  const plan = [
    ...post.responses.flatMap((r) =>
      r.actions.map((a) => ({ ref: itemCode.get(r.itemId) ?? "", finding: r.finding, cls: r.classification, a })),
    ),
    ...post.extras.flatMap((e) =>
      e.actions.map((a) => ({ ref: e.kind.toUpperCase(), finding: e.finding, cls: e.classification, a })),
    ),
  ].sort(
    (x, y) =>
      (x.a.priority ?? 999) - (y.a.priority ?? 999) ||
      severityRank(x.cls) - severityRank(y.cls) ||
      compareCodes(x.ref, y.ref),
  );
  row++;
  row = title(ws, row, "I2. Priority corrective action plan");
  header(ws, row, [
    "Priority",
    "Finding",
    "Required action",
    "Responsible person",
    "Target completion",
    "Close-out evidence",
    "Closed?",
  ]);
  row++;
  plan.forEach((p, i) => {
    [
      p.a.priority ?? i + 1,
      `${p.ref}: ${p.finding ?? ""}`,
      p.a.action,
      p.a.owner,
      p.a.targetDate,
      p.a.closeoutEvidence,
      p.a.status === "closed" ? "Yes" : "No",
    ].forEach((v, col) => (ws.getCell(row, col + 1).value = v));
    body(ws, row, 1, 7);
    row++;
  });

  // ---- I3
  row++;
  row = title(ws, row, "I3. Overall auditor conclusion");
  const conclusion: [string, string | null][] = [
    ["Overall status", overallCell(post.post.overallStatus)],
    ["Key strengths", post.post.keyStrengths],
    ["Key risks requiring management attention", post.post.keyRisks],
    ["Overall recommendation", post.post.recommendation],
  ];
  for (const [label, value] of conclusion) {
    ws.getCell(row, 2).value = label;
    ws.getCell(row, 2).font = { bold: true };
    ws.mergeCells(row, 3, row, 8);
    ws.getCell(row, 3).value = value;
    body(ws, row, 2, 8);
    if (label === "Overall status") list(ws, `C${row}`, OVERALL_CELLS);
    else ws.getRow(row).height = 60;
    row++;
  }

  // ---- I4
  row++;
  row = title(ws, row, "I4. Sign-off");
  header(ws, row, ["Role", "Name", "Signature", "Date"], 2);
  row++;
  for (const s of post.signOffs) {
    ws.getCell(row, 2).value = s.role;
    ws.getCell(row, 3).value = s.name;
    ws.getCell(row, 5).value = s.signedDate;
    body(ws, row, 2, 5);
    row++;
  }
}

// ---------------------------------------------------------------- other sheets

function detailsSheet(wb: ExcelJS.Workbook, data: AuditDataset) {
  const ws = wb.addWorksheet("Audit Details");
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 90;
  ws.getCell("A1").value = data.audit.title;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: COLORS.dark } };
  const rows: [string, string | null][] = [
    ["Period", data.audit.period],
    ["Status", data.audit.status],
    ["Start date", data.audit.startDate],
    ["End date", data.audit.endDate],
    ["Lead auditor", data.audit.leadAuditor],
    ["Auditors", data.audit.auditors],
    ["Protocol", `${data.protocol.name} v${data.protocol.version}`],
    ["Posts", data.posts.map((p) => p.site.code).join(", ")],
    ["Central question", data.protocol.centralQuestion],
  ];
  rows.forEach(([label, value], i) => {
    ws.getCell(3 + i, 1).value = label;
    ws.getCell(3 + i, 1).font = { bold: true };
    ws.getCell(3 + i, 2).value = value;
    body(ws, 3 + i, 1, 2);
  });
  for (const post of data.posts) {
    const r = ws.rowCount + 2;
    ws.getCell(r, 1).value = `${post.site.code} visit`;
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 2).value = [
      post.post.auditDate && `Date: ${post.post.auditDate}`,
      post.post.shift && `Shift: ${post.post.shift}`,
      post.post.nurseInCharge && `Nurse in charge: ${post.post.nurseInCharge}`,
      post.post.ambulanceUnits && `Ambulance units: ${post.post.ambulanceUnits}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }
}

function summarySheet(wb: ExcelJS.Workbook, data: AuditDataset) {
  const ws = wb.addWorksheet("Summary");
  ws.getColumn(1).width = 48;
  data.posts.forEach((_, i) => (ws.getColumn(2 + i).width = 12));
  ws.getCell("A1").value = "Summary";
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: COLORS.dark } };

  const states = data.posts.map((p) => {
    const byItem = new Map(p.responses.map((r) => [r.itemId, r]));
    return data.protocol.sections.flatMap((sec) =>
      sec.items.map((item) => ({
        sectionCode: sec.code,
        answer: byItem.get(item.id)?.answer ?? null,
        classification: byItem.get(item.id)?.classification ?? null,
      })),
    );
  });
  const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)}%`);

  let row = 3;
  header(ws, row, ["Compliance by section (Yes ÷ (Yes + No))", ...data.posts.map((p) => p.site.code)]);
  row++;
  for (const sec of data.protocol.sections) {
    ws.getCell(row, 1).value = `${sec.code}. ${sec.title}`;
    states.forEach((items, i) => {
      ws.getCell(row, 2 + i).value = pct(countAnswers(items.filter((x) => x.sectionCode === sec.code)).compliance);
    });
    body(ws, row, 1, 1 + data.posts.length);
    row++;
  }
  ws.getCell(row, 1).value = "OVERALL";
  ws.getCell(row, 1).font = { bold: true };
  states.forEach((items, i) => (ws.getCell(row, 2 + i).value = pct(countAnswers(items).compliance)));
  body(ws, row, 1, 1 + data.posts.length);
  row += 2;

  header(ws, row, ["Completion and findings", ...data.posts.map((p) => p.site.code)]);
  row++;
  const perPost = data.posts.map((p, i) => {
    const counts = countAnswers(states[i]);
    const cls = [...p.responses.map((r) => r.classification), ...p.extras.map((e) => e.classification)];
    return { counts, cls: classificationCounts(cls), risk: riskCounts(cls), post: p };
  });
  const lines: [string, (x: (typeof perPost)[number]) => string | number][] = [
    ["Criteria answered", (x) => `${x.counts.total - x.counts.unanswered}/${x.counts.total}`],
    ["Yes", (x) => x.counts.yes],
    ["No", (x) => x.counts.no],
    ["N/A", (x) => x.counts.na],
    ["Major NC", (x) => x.cls.major_nc],
    ["Minor NC", (x) => x.cls.minor_nc],
    ["OFI", (x) => x.cls.ofi],
    ["OBS", (x) => x.cls.obs],
    ["Critical risk", (x) => x.risk.critical],
    ["Medium risk", (x) => x.risk.medium],
    ["Low risk", (x) => x.risk.low],
    ["Good practices", (x) => x.post.practices.filter((p) => p.practice?.trim()).length],
    ["Overall status (I3)", (x) => overallCell(x.post.post.overallStatus) ?? "–"],
  ];
  for (const [label, fn] of lines) {
    ws.getCell(row, 1).value = label;
    perPost.forEach((x, i) => (ws.getCell(row, 2 + i).value = fn(x)));
    body(ws, row, 1, 1 + data.posts.length);
    row++;
  }
}

function actionsSheet(wb: ExcelJS.Workbook, data: AuditDataset) {
  const ws = wb.addWorksheet("Actions");
  const headers = [
    "Post",
    "Ref",
    "Finding",
    "Classification",
    "Risk",
    "Corrective action",
    "Owner",
    "Target date",
    "Status",
    "Close-out evidence",
  ];
  [8, 8, 60, 14, 10, 55, 18, 13, 12, 40].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  header(ws, 1, headers);
  ws.views = [{ state: "frozen", ySplit: 1 }];
  let row = 2;
  for (const f of collectFindings(data)) {
    if (!f.action) continue;
    const risk = riskFor(f.classification);
    [
      f.siteCode,
      f.ref,
      f.finding,
      classificationCell(f.classification),
      risk ? riskLabel(risk) : null,
      f.action.action,
      f.action.owner,
      f.action.targetDate,
      statusCell(f.action.status),
      f.action.closeoutEvidence,
    ].forEach((v, i) => (ws.getCell(row, i + 1).value = v));
    body(ws, row, 1, headers.length);
    classificationCellStyle(ws, row, 4, f.classification);
    row++;
  }
  ws.autoFilter = { from: "A1", to: { row: 1, column: headers.length } };
}

export async function buildAuditWorkbook(data: AuditDataset): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FAP Audit";
  wb.created = new Date();
  detailsSheet(wb, data);
  summarySheet(wb, data);
  for (const post of data.posts) postSheet(wb, data, post);
  actionsSheet(wb, data);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
