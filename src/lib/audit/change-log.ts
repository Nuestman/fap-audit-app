import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ChangeAction, ChangeEntity, ChangeMap, ChangeSource } from "./change-log-types";

export type { ChangeAction, ChangeEntity, ChangeMap, ChangeSource } from "./change-log-types";
export { CHANGE_ENTITIES } from "./change-log-types";

const IGNORE = new Set(["id", "updatedAt", "updatedBy", "createdAt"]);

function normalize(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  if (v instanceof Date) return v.toISOString();
  return v;
}

/** Field-level diff; ignores bookkeeping columns and unchanged values. */
export function diffChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  keys?: string[],
): ChangeMap {
  const out: ChangeMap = {};
  const fieldKeys =
    keys ??
    [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter(
      (k) => !IGNORE.has(k),
    );
  for (const key of fieldKeys) {
    const from = normalize(before?.[key] ?? null);
    const to = normalize(after?.[key] ?? null);
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    out[key] = { from, to };
  }
  return out;
}

export function summarizeChanges(action: ChangeAction, changes: ChangeMap): string {
  const fields = Object.keys(changes);
  if (action === "delete") return fields.length ? `deleted (${fields.join(", ")})` : "deleted";
  if (action === "insert") return fields.length ? `created (${fields.join(", ")})` : "created";
  return fields.length ? `updated ${fields.join(", ")}` : "updated";
}

export async function recordChange(input: {
  actor: string;
  entity: ChangeEntity;
  entityId: number;
  action: ChangeAction;
  changes: ChangeMap;
  auditId?: number | null;
  auditPostId?: number | null;
  source?: ChangeSource;
}): Promise<boolean> {
  if (input.action !== "delete" && Object.keys(input.changes).length === 0) return false;
  await db.insert(schema.changeEvent).values({
    actor: input.actor,
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    source: input.source ?? "ui",
    auditId: input.auditId ?? null,
    auditPostId: input.auditPostId ?? null,
    changes: input.changes,
    summary: summarizeChanges(input.action, input.changes),
  });
  return true;
}

/** Which entity ids in the set already have at least one change_event. */
export async function entitiesWithHistory(
  entity: ChangeEntity,
  entityIds: number[],
): Promise<Set<number>> {
  if (entityIds.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ entityId: schema.changeEvent.entityId })
    .from(schema.changeEvent)
    .where(
      and(eq(schema.changeEvent.entity, entity), inArray(schema.changeEvent.entityId, entityIds)),
    );
  return new Set(rows.map((r) => r.entityId));
}

export async function listEntityHistory(entity: ChangeEntity, entityId: number, limit = 50) {
  return db
    .select()
    .from(schema.changeEvent)
    .where(and(eq(schema.changeEvent.entity, entity), eq(schema.changeEvent.entityId, entityId)))
    .orderBy(desc(schema.changeEvent.occurredAt), desc(schema.changeEvent.id))
    .limit(limit);
}

export async function listChangeEvents(filters: {
  entity?: string;
  actor?: string;
  auditPostId?: number;
  limit?: number;
  offset?: number;
}) {
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  const conditions = [];
  if (filters.entity) conditions.push(eq(schema.changeEvent.entity, filters.entity));
  if (filters.actor) conditions.push(eq(schema.changeEvent.actor, filters.actor));
  if (filters.auditPostId)
    conditions.push(eq(schema.changeEvent.auditPostId, filters.auditPostId));

  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(schema.changeEvent)
      .where(where)
      .orderBy(desc(schema.changeEvent.occurredAt), desc(schema.changeEvent.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.changeEvent)
      .where(where),
  ]);
  return { rows, total: countRow[0]?.n ?? 0 };
}

export async function auditIdForPost(auditPostId: number): Promise<number | null> {
  const [row] = await db
    .select({ auditId: schema.auditPost.auditId })
    .from(schema.auditPost)
    .where(eq(schema.auditPost.id, auditPostId))
    .limit(1);
  return row?.auditId ?? null;
}
