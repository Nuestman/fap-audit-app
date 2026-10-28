"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/session";

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
