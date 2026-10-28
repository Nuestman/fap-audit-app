"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createAudit } from "@/lib/audit/create-audit";

const NewAuditSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  period: z.string().trim().optional(),
  startDate: z.string().optional(),
  leadAuditor: z.string().trim().optional(),
  auditors: z.string().trim().optional(),
  protocolVersionId: z.coerce.number().int().positive(),
  siteIds: z.array(z.coerce.number().int().positive()).min(1, "Choose at least one post"),
});

export async function createAuditAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const user = await requireUser();
  const parsed = NewAuditSchema.safeParse({
    title: formData.get("title"),
    period: formData.get("period") || undefined,
    startDate: formData.get("startDate") || undefined,
    leadAuditor: formData.get("leadAuditor") || undefined,
    auditors: formData.get("auditors") || undefined,
    protocolVersionId: formData.get("protocolVersionId"),
    siteIds: formData.getAll("siteIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const d = parsed.data;
  const id = await createAudit({
    title: d.title,
    period: d.period ?? null,
    startDate: d.startDate ?? null,
    leadAuditor: d.leadAuditor ?? null,
    auditors: d.auditors ?? null,
    protocolVersionId: d.protocolVersionId,
    siteIds: d.siteIds,
    createdBy: user.email,
  });
  redirect(`/audits/${id}`);
}
