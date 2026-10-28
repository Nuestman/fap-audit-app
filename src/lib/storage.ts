import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Photo storage. Neon Object Storage is not available in this project's region, so images
 * (resized in the browser) are stored in Postgres. Swap this module to move them elsewhere.
 */
export const MAX_ATTACHMENT_BYTES = 1_500_000;

export async function putAttachment(input: {
  auditPostId: number;
  itemResponseId: number | null;
  extraFindingId: number | null;
  fileName: string;
  mimeType: string;
  data: Buffer;
  caption: string | null;
  createdBy: string;
}) {
  const [row] = await db
    .insert(schema.attachment)
    .values({ ...input, sizeBytes: input.data.length })
    .returning({ id: schema.attachment.id, fileName: schema.attachment.fileName });
  return row;
}

export async function getAttachment(id: number) {
  const [row] = await db
    .select({
      data: schema.attachment.data,
      mimeType: schema.attachment.mimeType,
      fileName: schema.attachment.fileName,
    })
    .from(schema.attachment)
    .where(eq(schema.attachment.id, id));
  return row ?? null;
}

export async function deleteAttachment(id: number) {
  await db.delete(schema.attachment).where(eq(schema.attachment.id, id));
}
