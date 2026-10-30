"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import type { FapStaffModel, PinStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";

const blank = (v: string | null | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

const SiteInput = z.object({
  name: z.string().trim().min(1),
  location: z.string().trim().nullable(),
  active: z.boolean(),
});

export async function saveSite(id: number, input: z.infer<typeof SiteInput>) {
  await requireUser();
  const d = SiteInput.parse(input);
  await db
    .update(schema.site)
    .set({ name: d.name, location: d.location || null, active: d.active })
    .where(eq(schema.site.id, z.number().int().positive().parse(id)));
}

const NewSite = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, "Code must be 2–10 letters or digits"),
  name: z.string().trim().min(1, "Name is required"),
  location: z.string().trim().optional(),
});

export async function createSite(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  await requireUser();
  const parsed = NewSite.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const inserted = await db
    .insert(schema.site)
    .values({ code: parsed.data.code, name: parsed.data.name, location: parsed.data.location ?? null })
    .onConflictDoNothing({ target: schema.site.code })
    .returning({ id: schema.site.id });
  if (inserted.length === 0) return { error: `A post with code ${parsed.data.code} already exists` };
  refresh();
  return null;
}

const optionalText = z.string().trim().nullable();

const AuditorInput = z.object({
  name: z.string().trim().min(1),
  organization: optionalText,
  jobTitle: optionalText,
  email: optionalText,
  phone: optionalText,
  employeeNumber: optionalText,
  active: z.boolean(),
});

const FapStaffInput = z.object({
  name: z.string().trim().min(1),
  organization: optionalText,
  jobTitle: optionalText,
  email: optionalText,
  phone: optionalText,
  employeeNumber: optionalText,
  qualification: optionalText,
  pinStatus: z.enum(["active", "expired", "unknown"]),
  pinExpiresOn: z.string().trim().nullable(),
  siteId: z.number().int().positive().nullable(),
  active: z.boolean(),
});

export async function saveAuditor(id: number, input: z.infer<typeof AuditorInput>) {
  await requireUser();
  const d = AuditorInput.parse(input);
  await db
    .update(schema.auditor)
    .set({
      name: d.name,
      organization: blank(d.organization),
      jobTitle: blank(d.jobTitle),
      email: blank(d.email),
      phone: blank(d.phone),
      employeeNumber: blank(d.employeeNumber),
      active: d.active,
    })
    .where(eq(schema.auditor.id, z.number().int().positive().parse(id)));
  refresh();
}

export async function createAuditor(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  await requireUser();
  const parsed = AuditorInput.omit({ active: true }).safeParse({
    name: formData.get("name"),
    organization: formData.get("organization") || null,
    jobTitle: formData.get("jobTitle") || null,
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    employeeNumber: formData.get("employeeNumber") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const inserted = await db
    .insert(schema.auditor)
    .values({
      name: parsed.data.name,
      organization: blank(parsed.data.organization),
      jobTitle: blank(parsed.data.jobTitle),
      email: blank(parsed.data.email),
      phone: blank(parsed.data.phone),
      employeeNumber: blank(parsed.data.employeeNumber),
    })
    .onConflictDoNothing({ target: schema.auditor.name })
    .returning({ id: schema.auditor.id });
  if (inserted.length === 0) return { error: `"${parsed.data.name}" is already in the auditors list` };
  refresh();
  return null;
}

export async function saveFapStaff(id: number, input: z.infer<typeof FapStaffInput>) {
  await requireUser();
  const d = FapStaffInput.parse(input);
  await db
    .update(schema.fapStaff)
    .set({
      name: d.name,
      organization: blank(d.organization),
      jobTitle: blank(d.jobTitle),
      email: blank(d.email),
      phone: blank(d.phone),
      employeeNumber: blank(d.employeeNumber),
      qualification: blank(d.qualification),
      pinStatus: d.pinStatus as PinStatus,
      pinExpiresOn: blank(d.pinExpiresOn),
      siteId: d.siteId,
      active: d.active,
    })
    .where(eq(schema.fapStaff.id, z.number().int().positive().parse(id)));
  refresh();
}

export async function createFapStaff(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  await requireUser();
  const siteRaw = String(formData.get("siteId") ?? "").trim();
  const parsed = FapStaffInput.omit({ active: true }).safeParse({
    name: formData.get("name"),
    organization: formData.get("organization") || null,
    jobTitle: formData.get("jobTitle") || null,
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    employeeNumber: formData.get("employeeNumber") || null,
    qualification: formData.get("qualification") || null,
    pinStatus: formData.get("pinStatus") || "unknown",
    pinExpiresOn: formData.get("pinExpiresOn") || null,
    siteId: siteRaw ? Number(siteRaw) : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const inserted = await db
    .insert(schema.fapStaff)
    .values({
      name: parsed.data.name,
      organization: blank(parsed.data.organization),
      jobTitle: blank(parsed.data.jobTitle),
      email: blank(parsed.data.email),
      phone: blank(parsed.data.phone),
      employeeNumber: blank(parsed.data.employeeNumber),
      qualification: blank(parsed.data.qualification),
      pinStatus: parsed.data.pinStatus as PinStatus,
      pinExpiresOn: blank(parsed.data.pinExpiresOn),
      siteId: parsed.data.siteId,
    })
    .onConflictDoNothing({ target: schema.fapStaff.name })
    .returning({ id: schema.fapStaff.id });
  if (inserted.length === 0) return { error: `"${parsed.data.name}" is already in the FAP staff list` };
  refresh();
  return null;
}

export async function saveFapStaffModel(model: FapStaffModel) {
  await requireUser();
  const value = z.enum(["global", "site_assigned"]).parse(model);
  await db
    .insert(schema.appConfig)
    .values({ id: 1, fapStaffModel: value })
    .onConflictDoUpdate({
      target: schema.appConfig.id,
      set: { fapStaffModel: value, updatedAt: new Date() },
    });
  refresh();
}
