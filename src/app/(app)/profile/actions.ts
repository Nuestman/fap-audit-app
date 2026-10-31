"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { requireUser } from "@/lib/auth/session";
import { upsertUserProfileFields } from "@/lib/profile";

const blank = (v: string | null | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

const ProfileInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  jobTitle: z.string().trim().max(120).nullable(),
  organisation: z.string().trim().max(160).nullable(),
  phone: z.string().trim().max(40).nullable(),
});

export type ProfileFormState = { ok: true } | { ok: false; error: string };

export async function saveProfile(
  _prev: ProfileFormState | null,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = ProfileInput.safeParse({
    name: formData.get("name"),
    jobTitle: blank(String(formData.get("jobTitle") ?? "")),
    organisation: blank(String(formData.get("organisation") ?? "")),
    phone: blank(String(formData.get("phone") ?? "")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile" };
  }

  const { error } = await auth.updateUser({
    name: parsed.data.name,
  });
  if (error) {
    return { ok: false, error: error.message || "Could not update your name." };
  }

  await upsertUserProfileFields(user.id, {
    jobTitle: parsed.data.jobTitle,
    organisation: parsed.data.organisation,
    phone: parsed.data.phone,
  });

  refresh();
  return { ok: true };
}
