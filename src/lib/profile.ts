import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type UserProfileFields = {
  jobTitle: string | null;
  organisation: string | null;
  phone: string | null;
  hasAvatar: boolean;
};

export async function getUserProfile(userId: string): Promise<UserProfileFields> {
  const [row] = await db
    .select({
      jobTitle: schema.userProfile.jobTitle,
      organisation: schema.userProfile.organisation,
      phone: schema.userProfile.phone,
      avatarMimeType: schema.userProfile.avatarMimeType,
    })
    .from(schema.userProfile)
    .where(eq(schema.userProfile.userId, userId))
    .limit(1);

  if (!row) {
    return { jobTitle: null, organisation: null, phone: null, hasAvatar: false };
  }
  return {
    jobTitle: row.jobTitle,
    organisation: row.organisation,
    phone: row.phone,
    hasAvatar: Boolean(row.avatarMimeType),
  };
}

export async function upsertUserProfileFields(
  userId: string,
  fields: { jobTitle: string | null; organisation: string | null; phone: string | null },
) {
  await db
    .insert(schema.userProfile)
    .values({ userId, ...fields })
    .onConflictDoUpdate({
      target: schema.userProfile.userId,
      set: { ...fields, updatedAt: new Date() },
    });
}

export async function putUserAvatar(userId: string, data: Buffer, mimeType: string) {
  await db
    .insert(schema.userProfile)
    .values({
      userId,
      avatarData: data,
      avatarMimeType: mimeType,
    })
    .onConflictDoUpdate({
      target: schema.userProfile.userId,
      set: {
        avatarData: data,
        avatarMimeType: mimeType,
        updatedAt: new Date(),
      },
    });
}

export async function clearUserAvatar(userId: string) {
  await db
    .update(schema.userProfile)
    .set({ avatarData: null, avatarMimeType: null, updatedAt: new Date() })
    .where(eq(schema.userProfile.userId, userId));
}

export async function getUserAvatar(userId: string) {
  const [row] = await db
    .select({
      data: schema.userProfile.avatarData,
      mimeType: schema.userProfile.avatarMimeType,
    })
    .from(schema.userProfile)
    .where(eq(schema.userProfile.userId, userId))
    .limit(1);
  if (!row?.data || !row.mimeType) return null;
  return { data: row.data, mimeType: row.mimeType };
}
