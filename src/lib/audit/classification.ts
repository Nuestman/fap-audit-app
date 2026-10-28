import type { ActionStatus, Answer, Classification, OverallStatus } from "@/db/schema";

export type Risk = "critical" | "medium" | "low" | "none";

export const CLASSIFICATIONS: Classification[] = ["major_nc", "minor_nc", "ofi", "obs", "c"];
export const RISKS: Exclude<Risk, "none">[] = ["critical", "medium", "low"];
export const NON_CONFORMITIES: Classification[] = ["major_nc", "minor_nc"];

/** Most severe first; unclassified sorts last. */
export function severityRank(classification: Classification | null): number {
  return classification ? CLASSIFICATIONS.indexOf(classification) : CLASSIFICATIONS.length;
}

export function compareCodes(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

export function riskFor(classification: Classification | null): Risk | null {
  if (!classification) return null;
  switch (classification) {
    case "major_nc":
      return "critical";
    case "minor_nc":
      return "medium";
    case "ofi":
    case "obs":
      return "low";
    case "c":
      return "none";
    default: {
      const unreachable: never = classification;
      throw new Error(`Unknown classification: ${unreachable}`);
    }
  }
}

export function classificationLabel(c: Classification): string {
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
      return "Conformance";
    default: {
      const unreachable: never = c;
      throw new Error(`Unknown classification: ${unreachable}`);
    }
  }
}

export function classificationLongLabel(c: Classification): string {
  switch (c) {
    case "major_nc":
      return "Major Non-Conformity";
    case "minor_nc":
      return "Minor Non-Conformity";
    case "ofi":
      return "Opportunity for Improvement";
    case "obs":
      return "Observation";
    case "c":
      return "Conformance";
    default: {
      const unreachable: never = c;
      throw new Error(`Unknown classification: ${unreachable}`);
    }
  }
}

/** Definitions from the audit protocol, shown inline next to the classification picker. */
export function classificationDefinition(c: Classification): string {
  switch (c) {
    case "major_nc":
      return "Significant failure to meet ISO 45001:2018 requirements, a systemic breakdown, or high risk to workers' health and safety. Immediate corrective action required.";
    case "minor_nc":
      return "Isolated failure that does not indicate a systemic breakdown or significantly affect intended outcomes. Corrective action required.";
    case "ofi":
      return "Requirement met, but effectiveness, efficiency or maturity could improve. Improvement recommended, not mandatory.";
    case "obs":
      return "Currently compliant, but could become a non-conformity if left unaddressed. Early warning; monitor or take preventive action.";
    case "c":
      return "Objective evidence shows the requirement is fully implemented and effective. No action required.";
    default: {
      const unreachable: never = c;
      throw new Error(`Unknown classification: ${unreachable}`);
    }
  }
}

export function classificationTone(c: Classification): string {
  switch (c) {
    case "major_nc":
      return "bg-red-100 text-red-800 ring-red-200";
    case "minor_nc":
      return "bg-orange-100 text-orange-800 ring-orange-200";
    case "ofi":
      return "bg-sky-100 text-sky-800 ring-sky-200";
    case "obs":
      return "bg-violet-100 text-violet-800 ring-violet-200";
    case "c":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    default: {
      const unreachable: never = c;
      throw new Error(`Unknown classification: ${unreachable}`);
    }
  }
}

export function riskLabel(r: Risk): string {
  switch (r) {
    case "critical":
      return "Critical";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    case "none":
      return "None";
    default: {
      const unreachable: never = r;
      throw new Error(`Unknown risk: ${unreachable}`);
    }
  }
}

export function riskTone(r: Risk): string {
  switch (r) {
    case "critical":
      return "bg-red-600 text-white";
    case "medium":
      return "bg-orange-500 text-white";
    case "low":
      return "bg-sky-600 text-white";
    case "none":
      return "bg-slate-200 text-slate-700";
    default: {
      const unreachable: never = r;
      throw new Error(`Unknown risk: ${unreachable}`);
    }
  }
}

export function answerLabel(a: Answer): string {
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

export function actionStatusLabel(s: ActionStatus): string {
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

export function overallStatusLabel(s: OverallStatus): string {
  switch (s) {
    case "satisfactory":
      return "Satisfactory";
    case "satisfactory_with_improvements":
      return "Satisfactory with improvements required";
    case "unsatisfactory":
      return "Unsatisfactory – immediate action required";
    default: {
      const unreachable: never = s;
      throw new Error(`Unknown overall status: ${unreachable}`);
    }
  }
}
