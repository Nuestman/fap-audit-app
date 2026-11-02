"use server";

import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { ActionInput, upsertFirstAction } from "@/lib/audit/action-mutations";
import {
  auditIdForPost,
  diffChanges,
  listEntityHistory,
  recordChange,
} from "@/lib/audit/change-log";
import type { ChangeEntity } from "@/lib/audit/change-log-types";

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

const CRITERION_FIELDS = ["answer", "evidence", "finding", "classification"] as const;
const EXTRA_FIELDS = [
  "finding",
  "linkedRef",
  "evidence",
  "consequence",
  "interimControl",
  "classification",
] as const;
const POST_DETAIL_FIELDS = ["auditDate", "shift", "staffOnDuty", "ambulanceUnits"] as const;
const CONCLUSION_FIELDS = ["overallStatus", "keyStrengths", "keyRisks", "recommendation"] as const;
const PRACTICE_FIELDS = ["practice", "evidence", "value", "replication"] as const;

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

export async function saveCriterion(
  input: CriterionInput,
): Promise<{ responseId: number; changeLogged: boolean }> {
  const user = await requireUser();
  const d = CriterionInput.parse(input);
  const [before] = await db
    .select()
    .from(s.itemResponse)
    .where(and(eq(s.itemResponse.auditPostId, d.auditPostId), eq(s.itemResponse.itemId, d.itemId)))
    .limit(1);
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

  const changes = diffChanges(
    before ?? null,
    { answer: values.answer, evidence: values.evidence, finding: values.finding, classification: values.classification },
    [...CRITERION_FIELDS],
  );
  const auditId = await auditIdForPost(d.auditPostId);
  const changeLogged = await recordChange({
    actor: user.email,
    entity: "item_response",
    entityId: row.id,
    action: before ? "update" : "insert",
    changes,
    auditId,
    auditPostId: d.auditPostId,
  });
  await upsertFirstAction({ itemResponseId: row.id }, d.action, user.email, {
    auditId,
    auditPostId: d.auditPostId,
  });
  return { responseId: row.id, changeLogged };
}

// ---------------------------------------------------------------- post details and conclusion

const DetailsInput = z.object({
  auditDate: isoDate,
  shift: text,
  staffOnDuty: text,
  ambulanceUnits: text,
});

export async function savePostDetails(auditPostId: number, input: z.infer<typeof DetailsInput>) {
  const user = await requireUser();
  const d = DetailsInput.parse(input);
  const postId = id.parse(auditPostId);
  const [before] = await db.select().from(s.auditPost).where(eq(s.auditPost.id, postId)).limit(1);
  const next = {
    auditDate: d.auditDate,
    shift: clean(d.shift),
    staffOnDuty: clean(d.staffOnDuty),
    ambulanceUnits: clean(d.ambulanceUnits),
  };
  await db.update(s.auditPost).set(next).where(eq(s.auditPost.id, postId));
  if (before) {
    await recordChange({
      actor: user.email,
      entity: "audit_post",
      entityId: postId,
      action: "update",
      changes: diffChanges(before, next, [...POST_DETAIL_FIELDS]),
      auditId: before.auditId,
      auditPostId: postId,
    });
  }
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
  const user = await requireUser();
  const d = ConclusionInput.parse(input);
  const postId = id.parse(auditPostId);
  const [before] = await db.select().from(s.auditPost).where(eq(s.auditPost.id, postId)).limit(1);
  const next = {
    overallStatus: d.overallStatus,
    keyStrengths: clean(d.keyStrengths),
    keyRisks: clean(d.keyRisks),
    recommendation: clean(d.recommendation),
  };
  await db.update(s.auditPost).set(next).where(eq(s.auditPost.id, postId));
  if (before) {
    await recordChange({
      actor: user.email,
      entity: "audit_post",
      entityId: postId,
      action: "update",
      changes: diffChanges(before, next, [...CONCLUSION_FIELDS]),
      auditId: before.auditId,
      auditPostId: postId,
    });
  }
}

// ---------------------------------------------------------------- supplementary tables

export async function saveTableEntry(
  auditPostId: number,
  rowId: number,
  values: Record<string, string>,
) {
  const user = await requireUser();
  const postId = id.parse(auditPostId);
  const rid = id.parse(rowId);
  const v = z.record(z.string(), z.string().max(2000)).parse(values);
  const [before] = await db
    .select()
    .from(s.tableEntry)
    .where(and(eq(s.tableEntry.auditPostId, postId), eq(s.tableEntry.rowId, rid)))
    .limit(1);
  const [row] = await db
    .insert(s.tableEntry)
    .values({ auditPostId: postId, rowId: rid, values: v })
    .onConflictDoUpdate({
      target: [s.tableEntry.auditPostId, s.tableEntry.rowId],
      set: { values: v, updatedAt: new Date() },
    })
    .returning({ id: s.tableEntry.id });
  const changes = diffChanges(
    before ? { values: before.values } : null,
    { values: v },
    ["values"],
  );
  await recordChange({
    actor: user.email,
    entity: "table_entry",
    entityId: row.id,
    action: before ? "update" : "insert",
    changes,
    auditId: await auditIdForPost(postId),
    auditPostId: postId,
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

export async function saveExtraFinding(
  extraId: number,
  input: ExtraInput,
): Promise<{ changeLogged: boolean }> {
  const user = await requireUser();
  const d = ExtraInput.parse(input);
  const fid = id.parse(extraId);
  const [before] = await db.select().from(s.extraFinding).where(eq(s.extraFinding.id, fid)).limit(1);
  const next = {
    finding: clean(d.finding),
    linkedRef: clean(d.linkedRef),
    evidence: clean(d.evidence),
    consequence: clean(d.consequence),
    interimControl: clean(d.interimControl),
    classification: d.classification,
    updatedBy: user.email,
  };
  await db.update(s.extraFinding).set(next).where(eq(s.extraFinding.id, fid));
  let changeLogged = false;
  if (before) {
    const auditId = await auditIdForPost(before.auditPostId);
    changeLogged = await recordChange({
      actor: user.email,
      entity: "extra_finding",
      entityId: fid,
      action: "update",
      changes: diffChanges(before, next, [...EXTRA_FIELDS]),
      auditId,
      auditPostId: before.auditPostId,
    });
    await upsertFirstAction({ extraFindingId: fid }, d.action, user.email, {
      auditId,
      auditPostId: before.auditPostId,
    });
  } else {
    await upsertFirstAction({ extraFindingId: fid }, d.action, user.email);
  }
  return { changeLogged };
}

export async function deleteExtraFinding(extraId: number) {
  const user = await requireUser();
  const fid = id.parse(extraId);
  const [before] = await db.select().from(s.extraFinding).where(eq(s.extraFinding.id, fid)).limit(1);
  await db.delete(s.extraFinding).where(eq(s.extraFinding.id, fid));
  if (before) {
    await recordChange({
      actor: user.email,
      entity: "extra_finding",
      entityId: fid,
      action: "delete",
      changes: diffChanges(before, null, [...EXTRA_FIELDS]),
      auditId: await auditIdForPost(before.auditPostId),
      auditPostId: before.auditPostId,
    });
  }
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
  const user = await requireUser();
  const d = PracticeInput.parse(input);
  const pid = id.parse(practiceId);
  const [before] = await db.select().from(s.goodPractice).where(eq(s.goodPractice.id, pid)).limit(1);
  const next = {
    practice: clean(d.practice),
    evidence: clean(d.evidence),
    value: clean(d.value),
    replication: clean(d.replication),
  };
  await db.update(s.goodPractice).set(next).where(eq(s.goodPractice.id, pid));
  if (before) {
    await recordChange({
      actor: user.email,
      entity: "good_practice",
      entityId: pid,
      action: "update",
      changes: diffChanges(before, next, [...PRACTICE_FIELDS]),
      auditId: await auditIdForPost(before.auditPostId),
      auditPostId: before.auditPostId,
    });
  }
}

export async function deleteGoodPractice(practiceId: number) {
  const user = await requireUser();
  const pid = id.parse(practiceId);
  const [before] = await db.select().from(s.goodPractice).where(eq(s.goodPractice.id, pid)).limit(1);
  await db.delete(s.goodPractice).where(eq(s.goodPractice.id, pid));
  if (before) {
    await recordChange({
      actor: user.email,
      entity: "good_practice",
      entityId: pid,
      action: "delete",
      changes: diffChanges(before, null, [...PRACTICE_FIELDS]),
      auditId: await auditIdForPost(before.auditPostId),
      auditPostId: before.auditPostId,
    });
  }
}

// ---------------------------------------------------------------- I2 / I4

export async function saveActionPriority(actionId: number, priority: number | null) {
  const user = await requireUser();
  const aid = id.parse(actionId);
  const [before] = await db
    .select()
    .from(s.correctiveAction)
    .where(eq(s.correctiveAction.id, aid))
    .limit(1);
  const nextPriority = z.number().int().min(1).max(99).nullable().parse(priority);
  await db
    .update(s.correctiveAction)
    .set({ priority: nextPriority })
    .where(eq(s.correctiveAction.id, aid));
  if (before) {
    let auditPostId: number | null = null;
    if (before.itemResponseId) {
      const [r] = await db
        .select({ auditPostId: s.itemResponse.auditPostId })
        .from(s.itemResponse)
        .where(eq(s.itemResponse.id, before.itemResponseId))
        .limit(1);
      auditPostId = r?.auditPostId ?? null;
    } else if (before.extraFindingId) {
      const [r] = await db
        .select({ auditPostId: s.extraFinding.auditPostId })
        .from(s.extraFinding)
        .where(eq(s.extraFinding.id, before.extraFindingId))
        .limit(1);
      auditPostId = r?.auditPostId ?? null;
    }
    await recordChange({
      actor: user.email,
      entity: "corrective_action",
      entityId: aid,
      action: "update",
      changes: diffChanges({ priority: before.priority }, { priority: nextPriority }, ["priority"]),
      auditId: auditPostId ? await auditIdForPost(auditPostId) : null,
      auditPostId,
    });
  }
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

/** Load change history for one entity (used by the per-item history modal). */
export async function fetchEntityHistory(entity: ChangeEntity, entityId: number) {
  await requireUser();
  return listEntityHistory(entity, id.parse(entityId));
}
