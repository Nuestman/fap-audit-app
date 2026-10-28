"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";

const text = z.string().max(50000).nullable();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .or(z.literal("").transform(() => null));
const clean = (v: string | null) => (v && v.trim() ? v : null);

const DetailsInput = z.object({
  title: z.string().trim().min(1),
  period: text,
  status: z.enum(schema.auditStatusEnum.enumValues),
  startDate: isoDate,
  endDate: isoDate,
  leadAuditor: text,
  auditors: text,
});

export async function saveAuditDetails(auditId: number, input: z.infer<typeof DetailsInput>) {
  await requireUser();
  const d = DetailsInput.parse(input);
  await db
    .update(schema.audit)
    .set({
      title: d.title,
      period: clean(d.period),
      status: d.status,
      startDate: d.startDate,
      endDate: d.endDate,
      leadAuditor: clean(d.leadAuditor),
      auditors: clean(d.auditors),
    })
    .where(eq(schema.audit.id, z.number().int().positive().parse(auditId)));
}

const NarrativeInput = z.object({
  executiveSummary: text,
  scopeNotes: text,
  limitations: text,
  conclusion: text,
});

export async function saveAuditNarrative(auditId: number, input: z.infer<typeof NarrativeInput>) {
  await requireUser();
  const d = NarrativeInput.parse(input);
  await db
    .update(schema.audit)
    .set({
      executiveSummary: clean(d.executiveSummary),
      scopeNotes: clean(d.scopeNotes),
      limitations: clean(d.limitations),
      conclusion: clean(d.conclusion),
    })
    .where(eq(schema.audit.id, z.number().int().positive().parse(auditId)));
}
