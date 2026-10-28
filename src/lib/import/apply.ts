import "server-only";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { upsertFirstAction } from "@/lib/audit/action-mutations";
import { getPostWorkspace, type AuditWithPosts, type Protocol } from "@/lib/audit/queries";
import type { ParsedAction, ParsedPost } from "./workbook";

const s = schema;

export type ImportSummary = {
  siteCode: string;
  criteria: number;
  extrasAdded: number;
  extrasUpdated: number;
  practicesAdded: number;
  tableRows: number;
  conclusion: boolean;
  signOffs: number;
};

const key = (v: string | null | undefined) => v?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

type ExistingAction = {
  action: string | null;
  owner: string | null;
  targetDate: string | null;
  status: "open" | "in_progress" | "closed";
};

/** Workbook cells win where filled; blank cells keep what the app already has. */
function mergeAction(parsed: ParsedAction, existing: ExistingAction | undefined) {
  return {
    action: parsed.action ?? existing?.action ?? null,
    owner: parsed.owner ?? existing?.owner ?? null,
    targetDate: parsed.targetDate ?? existing?.targetDate ?? null,
    status: parsed.status ?? existing?.status ?? "open",
  };
}

const actionFilled = (a: ParsedAction) => !!(a.action || a.owner || a.targetDate || a.status);

async function applyPost(auditPostId: number, protocol: Protocol, parsed: ParsedPost, user: string) {
  const ws = await getPostWorkspace(auditPostId);
  if (!ws) throw new Error(`Audit post ${auditPostId} not found`);
  const summary: ImportSummary = {
    siteCode: parsed.siteCode,
    criteria: 0,
    extrasAdded: 0,
    extrasUpdated: 0,
    practicesAdded: 0,
    tableRows: 0,
    conclusion: false,
    signOffs: 0,
  };

  // ---- criteria
  const itemIdByCode = new Map(protocol.sections.flatMap((sec) => sec.items.map((i) => [i.code, i.id])));
  const responseByItem = new Map(ws.responses.map((r) => [r.itemId, r]));
  for (const c of parsed.criteria) {
    const itemId = itemIdByCode.get(c.code);
    if (!itemId) continue;
    const existing = responseByItem.get(itemId);
    const values = {
      answer: c.answer ?? existing?.answer ?? null,
      evidence: c.evidence ?? existing?.evidence ?? null,
      finding: c.finding ?? existing?.finding ?? null,
      classification: c.classification ?? existing?.classification ?? null,
      originalNote: existing?.originalNote ?? c.originalNote,
      updatedBy: user,
    };
    const [row] = await db
      .insert(s.itemResponse)
      .values({ auditPostId, itemId, ...values })
      .onConflictDoUpdate({
        target: [s.itemResponse.auditPostId, s.itemResponse.itemId],
        set: { ...values, updatedAt: new Date() },
      })
      .returning({ id: s.itemResponse.id });
    if (actionFilled(c.action)) {
      await upsertFirstAction({ itemResponseId: row.id }, mergeAction(c.action, existing?.actions[0]), user);
    }
    summary.criteria++;
  }

  // ---- H1 / H3, matched to existing entries by their finding text
  for (const e of parsed.extras) {
    const existing = ws.extras.find((x) => x.kind === e.kind && key(x.finding) === key(e.finding));
    const values = {
      finding: e.finding,
      linkedRef: e.linkedRef ?? existing?.linkedRef ?? null,
      evidence: e.evidence ?? existing?.evidence ?? null,
      consequence: e.consequence ?? existing?.consequence ?? null,
      interimControl: e.interimControl ?? existing?.interimControl ?? null,
      classification: e.classification ?? existing?.classification ?? null,
      updatedBy: user,
    };
    let extraId: number;
    if (existing) {
      await db.update(s.extraFinding).set(values).where(eq(s.extraFinding.id, existing.id));
      extraId = existing.id;
      summary.extrasUpdated++;
    } else {
      const [created] = await db
        .insert(s.extraFinding)
        .values({
          auditPostId,
          kind: e.kind,
          originalNote: e.originalNote,
          sort: ws.extras.length + summary.extrasAdded,
          ...values,
        })
        .returning({ id: s.extraFinding.id });
      extraId = created.id;
      summary.extrasAdded++;
    }
    if (actionFilled(e.action)) {
      await upsertFirstAction({ extraFindingId: extraId }, mergeAction(e.action, existing?.actions[0]), user);
    }
  }

  // ---- H2, new practices only
  const knownPractices = new Set(ws.practices.map((p) => key(p.practice)));
  for (const p of parsed.practices) {
    if (knownPractices.has(key(p.practice))) continue;
    await db.insert(s.goodPractice).values({
      auditPostId,
      ...p,
      sort: ws.practices.length + summary.practicesAdded,
    });
    knownPractices.add(key(p.practice));
    summary.practicesAdded++;
  }

  // ---- supplementary tables
  const entryByRow = new Map(ws.entries.map((e) => [e.rowId, e.values]));
  for (const [rowId, values] of parsed.tableValues) {
    const merged = { ...(entryByRow.get(rowId) ?? {}), ...values };
    await db
      .insert(s.tableEntry)
      .values({ auditPostId, rowId, values: merged })
      .onConflictDoUpdate({
        target: [s.tableEntry.auditPostId, s.tableEntry.rowId],
        set: { values: merged, updatedAt: new Date() },
      });
    summary.tableRows++;
  }

  // ---- I3 conclusion
  const c = parsed.conclusion;
  const conclusion = Object.fromEntries(Object.entries(c).filter(([, v]) => v !== null));
  if (Object.keys(conclusion).length) {
    await db.update(s.auditPost).set(conclusion).where(eq(s.auditPost.id, auditPostId));
    summary.conclusion = true;
  }

  // ---- I4 sign-off, matched by role
  for (const so of ws.signOffs) {
    const p = parsed.signOffs.get(key(so.role));
    if (!p) continue;
    await db
      .update(s.signOff)
      .set({ name: p.name ?? so.name, signedDate: p.signedDate ?? so.signedDate })
      .where(and(eq(s.signOff.id, so.id), eq(s.signOff.auditPostId, auditPostId)));
    summary.signOffs++;
  }

  return summary;
}

export async function applyWorkbookImport(
  audit: AuditWithPosts,
  protocol: Protocol,
  posts: ParsedPost[],
  user: string,
): Promise<ImportSummary[]> {
  const out: ImportSummary[] = [];
  for (const parsed of posts) {
    const post = audit.posts.find((p) => p.site.code === parsed.siteCode);
    if (post) out.push(await applyPost(post.id, protocol, parsed, user));
  }
  return out;
}
