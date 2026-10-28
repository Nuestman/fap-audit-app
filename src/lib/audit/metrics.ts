import type { Answer, Classification } from "@/db/schema";
import { CLASSIFICATIONS, RISKS, riskFor, type Risk } from "./classification";

export type ItemState = {
  sectionCode: string;
  answer: Answer | null;
  classification: Classification | null;
};

export type Counts = {
  yes: number;
  no: number;
  na: number;
  unanswered: number;
  total: number;
  /** Yes / (Yes + No); null when nothing applicable has been answered. */
  compliance: number | null;
  /** Answered / total. */
  completion: number;
};

export function countAnswers(items: ItemState[]): Counts {
  let yes = 0;
  let no = 0;
  let na = 0;
  for (const i of items) {
    if (i.answer === "yes") yes++;
    else if (i.answer === "no") no++;
    else if (i.answer === "na") na++;
  }
  const total = items.length;
  const answered = yes + no + na;
  return {
    yes,
    no,
    na,
    unanswered: total - answered,
    total,
    compliance: yes + no === 0 ? null : yes / (yes + no),
    completion: total === 0 ? 0 : answered / total,
  };
}

export function countsBySection(items: ItemState[], sectionCodes: string[]): Map<string, Counts> {
  return new Map(
    sectionCodes.map((code) => [code, countAnswers(items.filter((i) => i.sectionCode === code))]),
  );
}

export function classificationCounts(
  classifications: (Classification | null)[],
): Record<Classification, number> {
  const out = Object.fromEntries(CLASSIFICATIONS.map((c) => [c, 0])) as Record<
    Classification,
    number
  >;
  for (const c of classifications) if (c) out[c]++;
  return out;
}

export function riskCounts(
  classifications: (Classification | null)[],
): Record<Exclude<Risk, "none">, number> {
  const out = Object.fromEntries(RISKS.map((r) => [r, 0])) as Record<Exclude<Risk, "none">, number>;
  for (const c of classifications) {
    const r = riskFor(c);
    if (r && r !== "none") out[r]++;
  }
  return out;
}

/** Minutes between two "HH:MM" strings, wrapping past midnight. */
export function minutesBetween(start?: string, end?: string): number | null {
  const parse = (v?: string) => {
    const m = v?.match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const a = parse(start);
  const b = parse(end);
  if (a === null || b === null) return null;
  return (b - a + 24 * 60) % (24 * 60);
}

export function formatMinutes(mins: number | null): string {
  if (mins === null) return "–";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}
