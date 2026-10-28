import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import type { Classification } from "@/db/schema";
import {
  classificationCounts,
  countAnswers,
  countsBySection,
  riskCounts,
  type Counts,
  type ItemState,
} from "./metrics";

const s = schema;

export const getProtocol = cache(async (versionId: number) => {
  const version = await db.query.protocolVersion.findFirst({
    where: eq(s.protocolVersion.id, versionId),
    with: {
      sections: {
        orderBy: asc(s.protocolSection.sort),
        with: {
          items: { orderBy: asc(s.protocolItem.sort) },
          tables: {
            orderBy: asc(s.protocolTable.sort),
            with: { rows: { orderBy: asc(s.protocolTableRow.sort) } },
          },
        },
      },
    },
  });
  if (!version) throw new Error(`Protocol version ${versionId} not found`);
  return version;
});

export type Protocol = Awaited<ReturnType<typeof getProtocol>>;

export const getAudit = cache(async (auditId: number) => {
  return db.query.audit.findFirst({
    where: eq(s.audit.id, auditId),
    with: {
      posts: {
        with: { site: true },
        orderBy: asc(s.auditPost.siteId),
      },
    },
  });
});

export type AuditWithPosts = NonNullable<Awaited<ReturnType<typeof getAudit>>>;

export async function listAudits() {
  return db.query.audit.findMany({
    orderBy: desc(s.audit.createdAt),
    with: { posts: { with: { site: true } } },
  });
}

export async function listSites() {
  return db.select().from(s.site).orderBy(asc(s.site.id));
}

export async function listProtocolVersions() {
  return db.query.protocolVersion.findMany({
    orderBy: desc(s.protocolVersion.id),
    with: { sections: { with: { items: { columns: { id: true } } } } },
  });
}

/** Per-item state for every criterion of every post in the audit. */
export async function getItemStates(audit: AuditWithPosts, protocol: Protocol) {
  const postIds = audit.posts.map((p) => p.id);
  const rows = postIds.length
    ? await db
        .select({
          auditPostId: s.itemResponse.auditPostId,
          itemId: s.itemResponse.itemId,
          answer: s.itemResponse.answer,
          classification: s.itemResponse.classification,
        })
        .from(s.itemResponse)
        .where(inArray(s.itemResponse.auditPostId, postIds))
    : [];
  const byKey = new Map(rows.map((r) => [`${r.auditPostId}:${r.itemId}`, r]));
  const out = new Map<number, (ItemState & { itemId: number; itemCode: string })[]>();
  for (const post of audit.posts) {
    out.set(
      post.id,
      protocol.sections.flatMap((sec) =>
        sec.items.map((item) => {
          const r = byKey.get(`${post.id}:${item.id}`);
          return {
            itemId: item.id,
            itemCode: item.code,
            sectionCode: sec.code,
            answer: r?.answer ?? null,
            classification: r?.classification ?? null,
          };
        }),
      ),
    );
  }
  return out;
}

export type PostSummary = {
  postId: number;
  siteCode: string;
  siteName: string;
  overall: Counts;
  bySection: Map<string, Counts>;
  classifications: Record<Classification, number>;
  risks: ReturnType<typeof riskCounts>;
  goodPractices: number;
};

export async function getAuditSummaries(
  audit: AuditWithPosts,
  protocol: Protocol,
): Promise<PostSummary[]> {
  const states = await getItemStates(audit, protocol);
  const postIds = audit.posts.map((p) => p.id);
  const extras = postIds.length
    ? await db
        .select({
          auditPostId: s.extraFinding.auditPostId,
          classification: s.extraFinding.classification,
        })
        .from(s.extraFinding)
        .where(inArray(s.extraFinding.auditPostId, postIds))
    : [];
  const practices = postIds.length
    ? await db
        .select({ auditPostId: s.goodPractice.auditPostId, practice: s.goodPractice.practice })
        .from(s.goodPractice)
        .where(inArray(s.goodPractice.auditPostId, postIds))
    : [];
  const sectionCodes = protocol.sections.map((sec) => sec.code);

  return audit.posts.map((post) => {
    const items = states.get(post.id) ?? [];
    const cls = [
      ...items.map((i) => i.classification),
      ...extras.filter((e) => e.auditPostId === post.id).map((e) => e.classification),
    ];
    return {
      postId: post.id,
      siteCode: post.site.code,
      siteName: post.site.name,
      overall: countAnswers(items),
      bySection: countsBySection(items, sectionCodes),
      classifications: classificationCounts(cls),
      risks: riskCounts(cls),
      goodPractices: practices.filter((p) => p.auditPostId === post.id && p.practice?.trim())
        .length,
    };
  });
}

/** Everything the section form needs for one post. */
export async function getPostWorkspace(auditPostId: number) {
  const post = await db.query.auditPost.findFirst({
    where: eq(s.auditPost.id, auditPostId),
    with: { site: true, audit: true },
  });
  if (!post) return null;

  const [responses, extras, practices, entries, signOffs, attachments] = await Promise.all([
    db.query.itemResponse.findMany({
      where: eq(s.itemResponse.auditPostId, auditPostId),
      with: { actions: { orderBy: asc(s.correctiveAction.id) } },
    }),
    db.query.extraFinding.findMany({
      where: eq(s.extraFinding.auditPostId, auditPostId),
      orderBy: [asc(s.extraFinding.sort), asc(s.extraFinding.id)],
      with: { actions: { orderBy: asc(s.correctiveAction.id) } },
    }),
    db.query.goodPractice.findMany({
      where: eq(s.goodPractice.auditPostId, auditPostId),
      orderBy: [asc(s.goodPractice.sort), asc(s.goodPractice.id)],
    }),
    db.query.tableEntry.findMany({ where: eq(s.tableEntry.auditPostId, auditPostId) }),
    db.query.signOff.findMany({
      where: eq(s.signOff.auditPostId, auditPostId),
      orderBy: asc(s.signOff.sort),
    }),
    db
      .select({
        id: s.attachment.id,
        itemResponseId: s.attachment.itemResponseId,
        extraFindingId: s.attachment.extraFindingId,
        fileName: s.attachment.fileName,
        caption: s.attachment.caption,
      })
      .from(s.attachment)
      .where(eq(s.attachment.auditPostId, auditPostId))
      .orderBy(asc(s.attachment.id)),
  ]);

  return { post, responses, extras, practices, entries, signOffs, attachments };
}

export type PostWorkspace = NonNullable<Awaited<ReturnType<typeof getPostWorkspace>>>;

/** The whole audit, every post's workspace included; feeds the dashboard, report and exports. */
export async function getAuditDataset(auditId: number) {
  const audit = await getAudit(auditId);
  if (!audit) return null;
  const protocol = await getProtocol(audit.protocolVersionId);
  const workspaces = await Promise.all(audit.posts.map((p) => getPostWorkspace(p.id)));
  const posts = audit.posts.map((post, i) => {
    const ws = workspaces[i];
    if (!ws) throw new Error(`Audit post ${post.id} disappeared while loading`);
    return { ...ws, site: post.site };
  });
  return { audit, protocol, posts };
}

export type AuditDataset = NonNullable<Awaited<ReturnType<typeof getAuditDataset>>>;

/** Every corrective action across all audits, with the finding it belongs to. */
export async function listActions() {
  const base = {
    id: s.correctiveAction.id,
    action: s.correctiveAction.action,
    owner: s.correctiveAction.owner,
    targetDate: s.correctiveAction.targetDate,
    priority: s.correctiveAction.priority,
    status: s.correctiveAction.status,
    closeoutEvidence: s.correctiveAction.closeoutEvidence,
    closedAt: s.correctiveAction.closedAt,
    auditId: s.audit.id,
    auditTitle: s.audit.title,
    postId: s.auditPost.id,
    siteCode: s.site.code,
  };
  const [fromCriteria, fromExtras] = await Promise.all([
    db
      .select({
        ...base,
        ref: s.protocolItem.code,
        sectionCode: s.protocolSection.code,
        finding: s.itemResponse.finding,
        classification: s.itemResponse.classification,
      })
      .from(s.correctiveAction)
      .innerJoin(s.itemResponse, eq(s.itemResponse.id, s.correctiveAction.itemResponseId))
      .innerJoin(s.protocolItem, eq(s.protocolItem.id, s.itemResponse.itemId))
      .innerJoin(s.protocolSection, eq(s.protocolSection.id, s.protocolItem.sectionId))
      .innerJoin(s.auditPost, eq(s.auditPost.id, s.itemResponse.auditPostId))
      .innerJoin(s.site, eq(s.site.id, s.auditPost.siteId))
      .innerJoin(s.audit, eq(s.audit.id, s.auditPost.auditId)),
    db
      .select({
        ...base,
        kind: s.extraFinding.kind,
        finding: s.extraFinding.finding,
        classification: s.extraFinding.classification,
      })
      .from(s.correctiveAction)
      .innerJoin(s.extraFinding, eq(s.extraFinding.id, s.correctiveAction.extraFindingId))
      .innerJoin(s.auditPost, eq(s.auditPost.id, s.extraFinding.auditPostId))
      .innerJoin(s.site, eq(s.site.id, s.auditPost.siteId))
      .innerJoin(s.audit, eq(s.audit.id, s.auditPost.auditId)),
  ]);
  return [
    ...fromCriteria,
    ...fromExtras.map(({ kind, ...r }) => ({ ...r, ref: kind.toUpperCase(), sectionCode: null })),
  ];
}

export type TrackedAction = Awaited<ReturnType<typeof listActions>>[number];

export async function getAuditPost(auditId: number, auditPostId: number) {
  return db.query.auditPost.findFirst({
    where: and(eq(s.auditPost.id, auditPostId), eq(s.auditPost.auditId, auditId)),
    with: { site: true },
  });
}
