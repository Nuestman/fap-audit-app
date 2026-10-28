import "server-only";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";

export const ActionInput = z.object({
  action: z.string().nullable(),
  owner: z.string().nullable(),
  targetDate: z.string().nullable(),
  status: z.enum(schema.actionStatusEnum.enumValues),
});
export type ActionInput = z.infer<typeof ActionInput>;

const blank = (v: string | null) => !v || !v.trim();

type ActionStatus = ActionInput["status"];

/** Stamps the close date on the transition to "closed" and clears it on reopening. */
function closedAtChange(from: ActionStatus, to: ActionStatus): { closedAt?: string | null } {
  if (to !== "closed") return { closedAt: null };
  if (from !== "closed") return { closedAt: new Date().toISOString().slice(0, 10) };
  return {};
}

export const TrackedActionInput = ActionInput.extend({ closeoutEvidence: z.string().nullable() });
export type TrackedActionInput = z.infer<typeof TrackedActionInput>;

export async function updateAction(id: number, input: TrackedActionInput, updatedBy: string) {
  const [existing] = await db
    .select({ status: schema.correctiveAction.status })
    .from(schema.correctiveAction)
    .where(eq(schema.correctiveAction.id, id));
  if (!existing) throw new Error(`Corrective action ${id} not found`);
  await db
    .update(schema.correctiveAction)
    .set({
      action: input.action?.trim() || null,
      owner: input.owner?.trim() || null,
      targetDate: input.targetDate || null,
      status: input.status,
      closeoutEvidence: input.closeoutEvidence?.trim() || null,
      updatedBy,
      ...closedAtChange(existing.status, input.status),
    })
    .where(eq(schema.correctiveAction.id, id));
}

/** Updates the first action linked to a finding, creating it once any field is filled. */
export async function upsertFirstAction(
  link: { itemResponseId: number } | { extraFindingId: number },
  input: ActionInput,
  updatedBy: string,
) {
  const where =
    "itemResponseId" in link
      ? eq(schema.correctiveAction.itemResponseId, link.itemResponseId)
      : eq(schema.correctiveAction.extraFindingId, link.extraFindingId);
  const existing = await db
    .select({ id: schema.correctiveAction.id, status: schema.correctiveAction.status })
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
    await db
      .update(schema.correctiveAction)
      .set({ ...values, ...closedAtChange(existing[0].status, input.status) })
      .where(eq(schema.correctiveAction.id, existing[0].id));
    return existing[0].id;
  }
  if (blank(input.action) && blank(input.owner) && !input.targetDate) return null;
  const [created] = await db
    .insert(schema.correctiveAction)
    .values({ ...link, ...values })
    .returning({ id: schema.correctiveAction.id });
  return created.id;
}
