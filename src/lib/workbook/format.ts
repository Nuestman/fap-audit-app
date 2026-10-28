import type { CellValue } from "exceljs";
import type { ActionStatus, Answer, Classification, OverallStatus } from "@/db/schema";

/**
 * Cell vocabulary shared by the Excel export and import. It matches the
 * dropdowns in the original `FAP Audit Workbook.xlsx`.
 */

export const MAIN_HEADERS = [
  "ID",
  "Audit criterion",
  "Response",
  "Evidence",
  "Finding",
  "Classification",
  "Risk",
  "Corrective action",
  "Owner",
  "Target date",
  "Status",
  "Original auditor note",
];

/** Matches criterion IDs such as "A1.2" or "G1.15". */
export const CRITERION_ID = /^[A-Z]\d+\.\d+$/;

export const ANSWER_CELLS = ["Yes", "No", "N/A"];
export const CLASSIFICATION_CELLS = ["Major NC", "Minor NC", "OFI", "OBS", "C"];
export const STATUS_CELLS = ["Open", "In progress", "Closed"];
export const OVERALL_CELLS = [
  "Satisfactory",
  "Satisfactory with improvements required",
  "Unsatisfactory - immediate action required",
];

export function answerCell(a: Answer | null): string | null {
  if (!a) return null;
  switch (a) {
    case "yes":
      return "Yes";
    case "no":
      return "No";
    case "na":
      return "N/A";
    default: {
      const unreachable: never = a;
      throw new Error(`Unknown answer: ${unreachable}`);
    }
  }
}

export function classificationCell(c: Classification | null): string | null {
  if (!c) return null;
  switch (c) {
    case "major_nc":
      return "Major NC";
    case "minor_nc":
      return "Minor NC";
    case "ofi":
      return "OFI";
    case "obs":
      return "OBS";
    case "c":
      return "C";
    default: {
      const unreachable: never = c;
      throw new Error(`Unknown classification: ${unreachable}`);
    }
  }
}

export function statusCell(s: ActionStatus): string {
  switch (s) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "closed":
      return "Closed";
    default: {
      const unreachable: never = s;
      throw new Error(`Unknown action status: ${unreachable}`);
    }
  }
}

export function overallCell(s: OverallStatus | null): string | null {
  if (!s) return null;
  switch (s) {
    case "satisfactory":
      return OVERALL_CELLS[0];
    case "satisfactory_with_improvements":
      return OVERALL_CELLS[1];
    case "unsatisfactory":
      return OVERALL_CELLS[2];
    default: {
      const unreachable: never = s;
      throw new Error(`Unknown overall status: ${unreachable}`);
    }
  }
}

/** Excel formula that derives Risk from the Classification cell in column F. */
export function riskFormula(row: number): string {
  const f = `F${row}`;
  return `IF(${f}="","",IF(${f}="Major NC","Critical",IF(${f}="Minor NC","Medium",IF(OR(${f}="OFI",${f}="OBS"),"Low","None"))))`;
}

// ---------------------------------------------------------------- parsing

const norm = (v: string | null) => v?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

/** Plain text of any exceljs cell value (rich text, formulas and hyperlinks included). */
export function cellText(v: CellValue): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if ("richText" in v) return v.richText.map((r) => r.text).join("").trim() || null;
  if ("text" in v && typeof v.text === "string") return v.text.trim() || null;
  if ("result" in v) return v.result === undefined ? null : cellText(v.result as CellValue);
  return null;
}

/** "HH:MM" from a time cell, whether Excel stored it as a Date, a day fraction or text. */
export function cellTime(v: CellValue): string | null {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (v instanceof Date) return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
  if (typeof v === "number" && v >= 0 && v < 1) {
    const mins = Math.round(v * 24 * 60);
    return `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
  }
  const m = cellText(v)?.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${pad(Number(m[1]))}:${m[2]}` : null;
}

/** ISO date (YYYY-MM-DD) from a date cell or text such as "2026-11-30" or "30/11/2026". */
export function cellDate(v: CellValue): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = cellText(v);
  if (!t) return null;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return null;
}

export function parseAnswer(v: string | null): Answer | null {
  switch (norm(v)) {
    case "yes":
    case "y":
      return "yes";
    case "no":
    case "n":
      return "no";
    case "n/a":
    case "na":
      return "na";
    default:
      return null;
  }
}

export function parseClassification(v: string | null): Classification | null {
  switch (norm(v)) {
    case "major nc":
    case "major":
      return "major_nc";
    case "minor nc":
    case "minor":
      return "minor_nc";
    case "ofi":
      return "ofi";
    case "obs":
      return "obs";
    case "c":
    case "conformance":
      return "c";
    default:
      return null;
  }
}

export function parseStatus(v: string | null): ActionStatus | null {
  switch (norm(v)) {
    case "open":
      return "open";
    case "in progress":
      return "in_progress";
    case "closed":
    case "yes":
      return "closed";
    default:
      return null;
  }
}

export function parseOverall(v: string | null): OverallStatus | null {
  const n = norm(v);
  if (n.startsWith("unsatisfactory")) return "unsatisfactory";
  if (n.startsWith("satisfactory with")) return "satisfactory_with_improvements";
  if (n.startsWith("satisfactory")) return "satisfactory";
  return null;
}
