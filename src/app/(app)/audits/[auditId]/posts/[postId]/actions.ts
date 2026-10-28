"use server";

import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { ActionInput, upsertFirstAction } from "@/lib/audit/action-mutations";

const s = schema;
const id = z.number().int().positive();
const text = z.string().max(20000).nullable();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .or(z.literal("").transform(() => null));
const classification = z.enum(s.classificationEnum.enumValues).nullable();

const clean = (v: string | null) => (v && v.trim() ? v : null);

// ---------------------------------------------------------------- criteria

const CriterionInput = z.object({
  auditPostId: id,
  itemId: id,
  answer: z.enum(s.answerEnum.enumValues).nullable(),
  evidence: text,
  finding: text,
  classification,
  action: ActionInput,
});
export type CriterionInput = z.infer<typeof CriterionInput>;

export async function saveCriterion(input: CriterionInput): Promise<{ responseId: number }> {
  const user = await requireUser();
  const d = CriterionInput.parse(input);
  const values = {
    answer: d.answer,
    evidence: clean(d.evidence),
    finding: clean(d.finding),
    classification: d.classification,
    updatedBy: user.email,
  };
  const [row] = await db
    .insert(s.itemResponse)
    .values({ auditPostId: d.auditPostId, itemId: d.itemId, ...values })
    .onConflictDoUpdate({
      target: [s.itemResponse.auditPostId, s.itemResponse.itemId],
      set: { ...values, updatedAt: new Date() },
    })
    .returning({ id: s.itemResponse.id });
  await upsertFirstAction({ itemResponseId: row.id }, d.action, user.email);
  return { responseId: row.id };
}

// ---------------------------------------------------------------- post details and conclusion

const DetailsInput = z.object({
  auditDate: isoDate,
  shift: text,
  nurseInCharge: text,
  ambulanceUnits: text,
});

export async function savePostDetails(auditPostId: number, input: z.infer<typeof DetailsInput>) {
  await requireUser();
  const d = DetailsInput.parse(input);
  await db
    .update(s.auditPost)
    .set({
      auditDate: d.auditDate,
      shift: clean(d.shift),
      nurseInCharge: clean(d.nurseInCharge),
      ambulanceUnits: clean(d.ambulanceUnits),
    })
    .where(eq(s.auditPost.id, id.parse(auditPostId)));
}

const ConclusionInput = z.object({
  overallStatus: z.enum(s.overallStatusEnum.enumValues).nullable(),
  keyStrengths: text,
  keyRisks: text,
  recommendation: text,
});

export async function saveConclusion(
  auditPostId: number,
  input: z.infer<typeof ConclusionInput>,
) {
  await requireUser();
  const d = ConclusionInput.parse(input);
  await db
    .update(s.auditPost)
    .set({
      overallStatus: d.overallStatus,
      keyStrengths: clean(d.keyStrengths),
      keyRisks: clean(d.keyRisks),
      recommendation: clean(d.recommendation),
    })
    .where(eq(s.auditPost.id, id.parse(auditPostId)));
}

// ---------------------------------------------------------------- supplementary tables

export async function saveTableEntry(
  auditPostId: number,
  rowId: number,
  values: Record<string, string>,
) {
  await requireUser();
  const v = z.record(z.string(), z.string().max(2000)).parse(values);
  await db
    .insert(s.tableEntry)
    .values({ auditPostId: id.parse(auditPostId), rowId: id.parse(rowId), values: v })
    .onConflictDoUpdate({
      target: [s.tableEntry.auditPostId, s.tableEntry.rowId],
      set: { values: v, updatedAt: new Date() },
    });
}

// ---------------------------------------------------------------- H1 / H3

export async function createExtraFinding(auditPostId: number, kind: "h1" | "h3") {
  await requireUser();
  const postId = id.parse(auditPostId);
  const [{ value }] = await db
    .select({ value: max(s.extraFinding.sort) })
    .from(s.extraFinding)
    .where(and(eq(s.extraFinding.auditPostId, postId), eq(s.extraFinding.kind, kind)));
  const [row] = await db
    .insert(s.extraFinding)
    .values({ auditPostId: postId, kind: z.enum(["h1", "h3"]).parse(kind), sort: (value ?? -1) + 1 })
    .returning();
  return row;
}

const ExtraInput = z.object({
  finding: text,
  linkedRef: text,
  evidence: text,
  consequence: text,
  interimControl: text,
  classification,
  action: ActionInput,
});
export type ExtraInput = z.infer<typeof ExtraInput>;

export async function saveExtraFinding(extraId: number, input: ExtraInput) {
  const user = await requireUser();
  const d = ExtraInput.parse(input);
  const fid = id.parse(extraId);
  await db
    .update(s.extraFinding)
    .set({
      finding: clean(d.finding),
      linkedRef: clean(d.linkedRef),
      evidence: clean(d.evidence),
      consequence: clean(d.consequence),
      interimControl: clean(d.interimControl),
      classification: d.classification,
      updatedBy: user.email,
    })
    .where(eq(s.extraFinding.id, fid));
  await upsertFirstAction({ extraFindingId: fid }, d.action, user.email);
}

export async function deleteExtraFinding(extraId: number) {
  await requireUser();
  await db.delete(s.extraFinding).where(eq(s.extraFinding.id, id.parse(extraId)));
}

// ---------------------------------------------------------------- H2 good practices

export async function createGoodPractice(auditPostId: number) {
  await requireUser();
  const postId = id.parse(auditPostId);
  const [{ value }] = await db
    .select({ value: max(s.goodPractice.sort) })
    .from(s.goodPractice)
    .where(eq(s.goodPractice.auditPostId, postId));
  const [row] = await db
    .insert(s.goodPractice)
    .values({ auditPostId: postId, sort: (value ?? -1) + 1 })
    .returning();
  return row;
}

const PracticeInput = z.object({ practice: text, evidence: text, value: text, replication: text });

export async function saveGoodPractice(practiceId: number, input: z.infer<typeof PracticeInput>) {
  await requireUser();
  const d = PracticeInput.parse(input);
  await db
    .update(s.goodPractice)
    .set({
      practice: clean(d.practice),
      evidence: clean(d.evidence),
      value: clean(d.value),
      replication: clean(d.replication),
    })
    .where(eq(s.goodPractice.id, id.parse(practiceId)));
}

export async function deleteGoodPractice(practiceId: number) {
  await requireUser();
  await db.delete(s.goodPractice).where(eq(s.goodPractice.id, id.parse(practiceId)));
}

// ---------------------------------------------------------------- I2 / I4

export async function saveActionPriority(actionId: number, priority: number | null) {
  await requireUser();
  await db
    .update(s.correctiveAction)
    .set({ priority: z.number().int().min(1).max(99).nullable().parse(priority) })
    .where(eq(s.correctiveAction.id, id.parse(actionId)));
}

export async function saveSignOff(
  signOffId: number,
  input: { name: string | null; signedDate: string | null },
) {
  await requireUser();
  const d = z.object({ name: text, signedDate: isoDate }).parse(input);
  await db
    .update(s.signOff)
    .set({ name: clean(d.name), signedDate: d.signedDate })
    .where(eq(s.signOff.id, id.parse(signOffId)));
}
