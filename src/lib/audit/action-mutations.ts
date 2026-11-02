import "server-only";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditIdForPost, diffChanges, recordChange } from "@/lib/audit/change-log";

export const ActionInput = z.object({
  action: z.string().nullable(),
  owner: z.string().nullable(),
  targetDate: z.string().nullable(),
  status: z.enum(schema.actionStatusEnum.enumValues),
});
export type ActionInput = z.infer<typeof ActionInput>;

const blank = (v: string | null) => !v || !v.trim();

type ActionStatus = ActionInput["status"];

type ChangeCtx = {
  auditId?: number | null;
  auditPostId?: number | null;
  source?: "ui" | "import" | "system";
};

const ACTION_FIELDS = ["action", "owner", "targetDate", "status", "closeoutEvidence", "priority"] as const;

/** Stamps the close date on the transition to "closed" and clears it on reopening. */
function closedAtChange(from: ActionStatus, to: ActionStatus): { closedAt?: string | null } {
  if (to !== "closed") return { closedAt: null };
  if (from !== "closed") return { closedAt: new Date().toISOString().slice(0, 10) };
  return {};
}

export const TrackedActionInput = ActionInput.extend({ closeoutEvidence: z.string().nullable() });
export type TrackedActionInput = z.infer<typeof TrackedActionInput>;

async function resolveActionPost(existing: {
  itemResponseId: number | null;
  extraFindingId: number | null;
}): Promise<{ auditId: number | null; auditPostId: number | null }> {
  if (existing.itemResponseId) {
    const [r] = await db
      .select({ auditPostId: schema.itemResponse.auditPostId })
      .from(schema.itemResponse)
      .where(eq(schema.itemResponse.id, existing.itemResponseId))
      .limit(1);
    if (!r) return { auditId: null, auditPostId: null };
    return { auditPostId: r.auditPostId, auditId: await auditIdForPost(r.auditPostId) };
  }
  if (existing.extraFindingId) {
    const [r] = await db
      .select({ auditPostId: schema.extraFinding.auditPostId })
      .from(schema.extraFinding)
      .where(eq(schema.extraFinding.id, existing.extraFindingId))
      .limit(1);
    if (!r) return { auditId: null, auditPostId: null };
    return { auditPostId: r.auditPostId, auditId: await auditIdForPost(r.auditPostId) };
  }
  return { auditId: null, auditPostId: null };
}

export async function updateAction(
  id: number,
  input: TrackedActionInput,
  updatedBy: string,
  ctx?: ChangeCtx,
) {
  const [existing] = await db
    .select()
    .from(schema.correctiveAction)
    .where(eq(schema.correctiveAction.id, id));
  if (!existing) throw new Error(`Corrective action ${id} not found`);
  const next = {
    action: input.action?.trim() || null,
    owner: input.owner?.trim() || null,
    targetDate: input.targetDate || null,
    status: input.status,
    closeoutEvidence: input.closeoutEvidence?.trim() || null,
    updatedBy,
    ...closedAtChange(existing.status, input.status),
  };
  await db
    .update(schema.correctiveAction)
    .set(next)
    .where(eq(schema.correctiveAction.id, id));
  const scope = ctx?.auditPostId
    ? { auditId: ctx.auditId ?? null, auditPostId: ctx.auditPostId }
    : await resolveActionPost(existing);
  await recordChange({
    actor: updatedBy,
    entity: "corrective_action",
    entityId: id,
    action: "update",
    changes: diffChanges(existing, next, [...ACTION_FIELDS]),
    auditId: scope.auditId,
    auditPostId: scope.auditPostId,
    source: ctx?.source,
  });
}

/** Updates the first action linked to a finding, creating it once any field is filled. */
export async function upsertFirstAction(
  link: { itemResponseId: number } | { extraFindingId: number },
  input: ActionInput,
  updatedBy: string,
  ctx?: ChangeCtx,
) {
  const where =
    "itemResponseId" in link
      ? eq(schema.correctiveAction.itemResponseId, link.itemResponseId)
      : eq(schema.correctiveAction.extraFindingId, link.extraFindingId);
  const existing = await db
    .select()
    .from(schema.correctiveAction)
    .where(where)
    .orderBy(asc(schema.correctiveAction.id))
    .limit(1);

  const values = {
    action: input.action?.trim() || null,
    owner: input.owner?.trim() || null,
    targetDate: input.targetDate || null,
    status: input.status,
    updatedBy,
  };

  if (existing[0]) {
    const next = { ...values, ...closedAtChange(existing[0].status, input.status) };
    await db
      .update(schema.correctiveAction)
      .set(next)
      .where(eq(schema.correctiveAction.id, existing[0].id));
    await recordChange({
      actor: updatedBy,
      entity: "corrective_action",
      entityId: existing[0].id,
      action: "update",
      changes: diffChanges(existing[0], next, [...ACTION_FIELDS]),
      auditId: ctx?.auditId,
      auditPostId: ctx?.auditPostId,
      source: ctx?.source,
    });
    return existing[0].id;
  }
  if (blank(input.action) && blank(input.owner) && !input.targetDate) return null;
  const [created] = await db
    .insert(schema.correctiveAction)
    .values({ ...link, ...values })
    .returning();
  await recordChange({
    actor: updatedBy,
    entity: "corrective_action",
    entityId: created.id,
    action: "insert",
    changes: diffChanges(null, values, ["action", "owner", "targetDate", "status"]),
    auditId: ctx?.auditId,
    auditPostId: ctx?.auditPostId,
    source: ctx?.source,
  });
  return created.id;
}
