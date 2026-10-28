/**
 * Seeds protocol v1, the four posts, the Q4 2026 audit and the KMS/ODD draft findings.
 * Safe to re-run: each step is skipped if its data already exists.
 *
 * Run: npm run db:seed
 */
import { and, eq } from "drizzle-orm";
import { createAudit } from "../../lib/audit/create-audit";
import { db, schema } from "../index";
import { DRAFTS } from "./kms-odd-drafts";
import { PROTOCOL_V1 } from "./protocol-v1";
import { SITES, SUPPLEMENTARY_TABLES } from "./supplementary-tables";

const AUDIT_TITLE = "Q4 2026 FAP Audit";

async function seedProtocol(): Promise<number> {
  const existing = await db.query.protocolVersion.findFirst({
    where: eq(schema.protocolVersion.version, "1"),
  });
  if (existing) {
    console.log("Protocol v1 already present");
    return existing.id;
  }

  const [version] = await db
    .insert(schema.protocolVersion)
    .values({
      name: "First Aid Post & Ambulance Audit Checklist",
      version: "1",
      effectiveDate: "2026-10-01",
      centralQuestion: PROTOCOL_V1.centralQuestion,
    })
    .returning({ id: schema.protocolVersion.id });

  for (const [sort, section] of PROTOCOL_V1.sections.entries()) {
    const [row] = await db
      .insert(schema.protocolSection)
      .values({
        versionId: version.id,
        code: section.code,
        title: section.title,
        subtitle: section.subtitle,
        sort,
      })
      .returning({ id: schema.protocolSection.id });

    await db.insert(schema.protocolItem).values(
      section.items.map((item, i) => ({
        sectionId: row.id,
        code: item.code,
        text: item.text,
        sort: i,
      })),
    );

    for (const [tSort, table] of SUPPLEMENTARY_TABLES.filter(
      (t) => t.sectionCode === section.code,
    ).entries()) {
      const [tRow] = await db
        .insert(schema.protocolTable)
        .values({
          sectionId: row.id,
          code: table.code,
          title: table.title,
          rowHeader: table.rowHeader,
          columns: table.columns,
          sort: tSort,
        })
        .returning({ id: schema.protocolTable.id });
      await db
        .insert(schema.protocolTableRow)
        .values(table.rows.map((label, i) => ({ tableId: tRow.id, label, sort: i })));
    }
  }
  const items = PROTOCOL_V1.sections.reduce((n, s) => n + s.items.length, 0);
  console.log(`Protocol v1 seeded: ${PROTOCOL_V1.sections.length} sections, ${items} criteria`);
  return version.id;
}

async function seedSites(): Promise<Map<string, number>> {
  await db.insert(schema.site).values(SITES).onConflictDoNothing({ target: schema.site.code });
  const rows = await db.select().from(schema.site);
  return new Map(rows.map((r) => [r.code, r.id]));
}

async function seedAudit(versionId: number, sites: Map<string, number>) {
  const existing = await db.query.audit.findFirst({
    where: eq(schema.audit.title, AUDIT_TITLE),
  });
  if (existing) {
    console.log(`${AUDIT_TITLE} already present; drafts not re-imported`);
    return;
  }

  const auditId = await createAudit({
    title: AUDIT_TITLE,
    period: "Q4 2026",
    protocolVersionId: versionId,
    siteIds: SITES.map((s) => sites.get(s.code)!),
    createdBy: "seed",
  });

  const items = await db
    .select({ id: schema.protocolItem.id, code: schema.protocolItem.code })
    .from(schema.protocolItem)
    .innerJoin(schema.protocolSection, eq(schema.protocolItem.sectionId, schema.protocolSection.id))
    .where(eq(schema.protocolSection.versionId, versionId));
  const itemByCode = new Map(items.map((i) => [i.code, i.id]));

  for (const [siteCode, draft] of Object.entries(DRAFTS)) {
    const post = await db.query.auditPost.findFirst({
      where: and(
        eq(schema.auditPost.auditId, auditId),
        eq(schema.auditPost.siteId, sites.get(siteCode)!),
      ),
    });
    if (!post) throw new Error(`No audit post for ${siteCode}`);

    for (const r of draft.responses) {
      const itemId = itemByCode.get(r.code);
      if (!itemId) throw new Error(`Unknown criterion ${r.code}`);
      const [resp] = await db
        .insert(schema.itemResponse)
        .values({
          auditPostId: post.id,
          itemId,
          answer: r.answer,
          evidence: r.evidence,
          finding: r.finding,
          classification: r.classification,
          originalNote: r.notes.join("\n"),
          updatedBy: "seed",
        })
        .returning({ id: schema.itemResponse.id });
      await db.insert(schema.correctiveAction).values({
        itemResponseId: resp.id,
        action: r.action,
        updatedBy: "seed",
      });
    }

    for (const [sort, e] of draft.extras.entries()) {
      const [extra] = await db
        .insert(schema.extraFinding)
        .values({
          auditPostId: post.id,
          kind: e.kind,
          finding: e.finding,
          linkedRef: e.linkedRef,
          evidence: e.evidence,
          consequence: e.consequence,
          interimControl: e.interimControl,
          classification: e.classification,
          originalNote: e.notes.join("\n"),
          sort,
          updatedBy: "seed",
        })
        .returning({ id: schema.extraFinding.id });
      if (e.action) {
        await db.insert(schema.correctiveAction).values({
          extraFindingId: extra.id,
          action: e.action,
          updatedBy: "seed",
        });
      }
    }
    console.log(
      `${siteCode}: ${draft.responses.length} draft responses, ${draft.extras.length} H1/H3 items`,
    );
  }
  console.log(`${AUDIT_TITLE} created (id ${auditId})`);
}

async function main() {
  const versionId = await seedProtocol();
  const sites = await seedSites();
  await seedAudit(versionId, sites);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
