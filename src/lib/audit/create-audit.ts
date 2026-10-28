import { db, schema } from "@/db";
import { SIGN_OFF_ROLES } from "@/db/seed/supplementary-tables";

type NewAudit = {
  title: string;
  period: string | null;
  protocolVersionId: number;
  siteIds: number[];
  leadAuditor?: string | null;
  auditors?: string | null;
  startDate?: string | null;
  createdBy: string | null;
};

/** Creates an audit with one audit_post per site and the I4 sign-off rows. */
export async function createAudit(input: NewAudit): Promise<number> {
  const [created] = await db
    .insert(schema.audit)
    .values({
      title: input.title,
      period: input.period,
      protocolVersionId: input.protocolVersionId,
      leadAuditor: input.leadAuditor ?? null,
      auditors: input.auditors ?? null,
      startDate: input.startDate ?? null,
      createdBy: input.createdBy,
    })
    .returning({ id: schema.audit.id });

  const posts = await db
    .insert(schema.auditPost)
    .values(input.siteIds.map((siteId) => ({ auditId: created.id, siteId })))
    .returning({ id: schema.auditPost.id });

  await db.insert(schema.signOff).values(
    posts.flatMap((p) =>
      SIGN_OFF_ROLES.map((role, sort) => ({ auditPostId: p.id, role, sort })),
    ),
  );
  return created.id;
}
