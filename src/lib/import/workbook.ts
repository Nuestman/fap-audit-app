import ExcelJS from "exceljs";
import type { ActionStatus, Answer, Classification, ExtraKind, OverallStatus } from "@/db/schema";
import type { Protocol } from "@/lib/audit/queries";
import {
  cellDate,
  cellText,
  cellTime,
  CRITERION_ID,
  parseAnswer,
  parseClassification,
  parseOverall,
  parseStatus,
} from "@/lib/workbook/format";

/**
 * Reads a filled-in copy of the audit workbook: either the original
 * `FAP Audit Workbook.xlsx` or one exported from the app. Each post sheet is
 * named by its site code. Blank cells come back as null so the caller can
 * leave existing values untouched.
 */

export type ParsedAction = {
  action: string | null;
  owner: string | null;
  targetDate: string | null;
  status: ActionStatus | null;
};

export type ParsedCriterion = {
  code: string;
  answer: Answer | null;
  evidence: string | null;
  finding: string | null;
  classification: Classification | null;
  originalNote: string | null;
  action: ParsedAction;
};

export type ParsedExtra = {
  kind: ExtraKind;
  finding: string;
  linkedRef: string | null;
  evidence: string | null;
  consequence: string | null;
  interimControl: string | null;
  classification: Classification | null;
  originalNote: string | null;
  action: ParsedAction;
};

export type ParsedPractice = {
  practice: string;
  evidence: string | null;
  value: string | null;
  replication: string | null;
};

export type ParsedPost = {
  siteCode: string;
  criteria: ParsedCriterion[];
  extras: ParsedExtra[];
  practices: ParsedPractice[];
  /** Keyed by protocol table row id; only non-empty cells are present. */
  tableValues: Map<number, Record<string, string>>;
  conclusion: {
    overallStatus: OverallStatus | null;
    keyStrengths: string | null;
    keyRisks: string | null;
    recommendation: string | null;
  };
  signOffs: Map<string, { name: string | null; signedDate: string | null }>;
};

const norm = (s: string | null) => s?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
const hasAction = (a: ParsedAction) => !!(a.action || a.owner || a.targetDate || a.status);

/** Title rows such as "A2. Audit evidence sources" or "H1. Opportunities…". */
const BLOCK_TITLE = /^([A-Z]\d)\.\s/;

type Block = "criteria" | "table" | "h1" | "h2" | "h3" | "i3" | "i4" | "skip";
type ProtocolTable = Protocol["sections"][number]["tables"][number];

export async function parseWorkbook(
  file: ArrayBuffer,
  protocol: Protocol,
  siteCodes: string[],
): Promise<{ posts: ParsedPost[]; ignoredSheets: string[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file);

  const criterionCodes = new Set(protocol.sections.flatMap((s) => s.items.map((i) => i.code)));
  const tables = new Map(protocol.sections.flatMap((s) => s.tables).map((t) => [t.code, t]));
  const wanted = new Map(siteCodes.map((c) => [c.toUpperCase(), c]));

  const posts: ParsedPost[] = [];
  const ignoredSheets: string[] = [];

  for (const ws of wb.worksheets) {
    const siteCode = wanted.get(ws.name.trim().toUpperCase());
    if (!siteCode) {
      ignoredSheets.push(ws.name);
      continue;
    }
    const post: ParsedPost = {
      siteCode,
      criteria: [],
      extras: [],
      practices: [],
      tableValues: new Map(),
      conclusion: { overallStatus: null, keyStrengths: null, keyRisks: null, recommendation: null },
      signOffs: new Map(),
    };

    let block: Block = "criteria";
    let table: ProtocolTable | null = null;

    ws.eachRow((row) => {
      const v = (col: number) => row.getCell(col).value;
      const t = (col: number) => cellText(v(col));
      const first = t(1);

      const titleMatch = first?.match(BLOCK_TITLE);
      if (titleMatch) {
        const code = titleMatch[1];
        table = tables.get(code) ?? null;
        block = table
          ? "table"
          : code === "H1"
            ? "h1"
            : code === "H2"
              ? "h2"
              : code === "H3"
                ? "h3"
                : code === "I3"
                  ? "i3"
                  : code === "I4"
                    ? "i4"
                    : "skip";
        return;
      }

      switch (block) {
        case "criteria": {
          if (!first || !CRITERION_ID.test(first) || !criterionCodes.has(first)) return;
          const c: ParsedCriterion = {
            code: first,
            answer: parseAnswer(t(3)),
            evidence: t(4),
            finding: t(5),
            classification: parseClassification(t(6)),
            originalNote: t(12),
            action: { action: t(8), owner: t(9), targetDate: cellDate(v(10)), status: parseStatus(t(11)) },
          };
          if (c.answer || c.evidence || c.finding || c.classification || hasAction(c.action)) {
            post.criteria.push(c);
          }
          return;
        }
        case "table": {
          if (!table) return;
          const label = norm(t(2));
          const tableRow = table.rows.find((r) => norm(r.label) === label);
          if (!tableRow) return;
          const values: Record<string, string> = {};
          table.columns.forEach((col, i) => {
            const raw = v(3 + i);
            const value = col.type === "time" ? cellTime(raw) : cellText(raw);
            if (value) values[col.key] = value;
          });
          if (Object.keys(values).length) post.tableValues.set(tableRow.id, values);
          return;
        }
        case "h1": {
          const finding = t(2);
          if (typeof v(1) !== "number" || !finding) return;
          post.extras.push({
            kind: "h1",
            finding,
            linkedRef: t(3),
            evidence: t(4),
            consequence: null,
            interimControl: null,
            classification: parseClassification(t(6)),
            originalNote: t(12),
            action: { action: t(5), owner: t(8), targetDate: cellDate(v(9)), status: parseStatus(t(10)) },
          });
          return;
        }
        case "h2": {
          const practice = t(2);
          if (typeof v(1) !== "number" || !practice) return;
          post.practices.push({ practice, evidence: t(3), value: t(4), replication: t(5) });
          return;
        }
        case "h3": {
          const finding = t(2);
          if (typeof v(1) !== "number" || !finding) return;
          post.extras.push({
            kind: "h3",
            finding,
            linkedRef: null,
            evidence: null,
            consequence: t(3),
            interimControl: t(4),
            classification: parseClassification(t(6)),
            originalNote: t(12),
            action: { action: t(10), owner: t(5), targetDate: cellDate(v(8)), status: parseStatus(t(9)) },
          });
          return;
        }
        case "i3": {
          const label = norm(t(2));
          const value = t(3);
          if (label === "overall status") post.conclusion.overallStatus = parseOverall(value);
          else if (label === "key strengths") post.conclusion.keyStrengths = value;
          else if (label.startsWith("key risks")) post.conclusion.keyRisks = value;
          else if (label === "overall recommendation") post.conclusion.recommendation = value;
          return;
        }
        case "i4": {
          const role = t(2);
          if (!role || norm(role) === "role") return;
          const name = t(3);
          const signedDate = cellDate(v(5));
          if (name || signedDate) post.signOffs.set(norm(role), { name, signedDate });
          return;
        }
        case "skip":
          return;
        default: {
          const unreachable: never = block;
          throw new Error(`Unknown block: ${unreachable}`);
        }
      }
    });
    posts.push(post);
  }
  return { posts, ignoredSheets };
}
