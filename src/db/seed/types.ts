import type { Answer, Classification, ExtraKind, TableColumn } from "../schema";

export type ProtocolSeed = {
  centralQuestion: string;
  sections: {
    code: string;
    title: string;
    subtitle: string | null;
    items: { code: string; text: string }[];
  }[];
};

export type SupplementaryTableSeed = {
  sectionCode: string;
  code: string;
  title: string;
  rowHeader: string;
  columns: TableColumn[];
  rows: string[];
};

export type DraftSeed = Record<
  string,
  {
    responses: {
      code: string;
      answer: Answer | null;
      evidence: string;
      finding: string;
      classification: Classification;
      action: string;
      notes: string[];
    }[];
    extras: {
      kind: ExtraKind;
      finding: string;
      linkedRef: string | null;
      evidence: string | null;
      consequence: string | null;
      interimControl: string | null;
      classification: Classification;
      action: string | null;
      notes: string[];
    }[];
  }
>;
