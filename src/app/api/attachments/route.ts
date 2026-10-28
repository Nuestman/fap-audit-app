import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { MAX_ATTACHMENT_BYTES, putAttachment } from "@/lib/storage";

const optionalId = z.preprocess(
  (v) => (v === null || v === "" ? null : Number(v)),
  z.number().int().positive().nullable(),
);

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Only images can be uploaded" }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return Response.json({ error: "Image too large" }, { status: 413 });
  }

  const parsed = z
    .object({
      auditPostId: z.coerce.number().int().positive(),
      itemResponseId: optionalId,
      extraFindingId: optionalId,
    })
    .safeParse({
      auditPostId: form.get("auditPostId"),
      itemResponseId: form.get("itemResponseId"),
      extraFindingId: form.get("extraFindingId"),
    });
  if (!parsed.success) return Response.json({ error: "Invalid target" }, { status: 400 });

  const row = await putAttachment({
    ...parsed.data,
    fileName: file.name || "photo.jpg",
    mimeType: file.type,
    data: Buffer.from(await file.arrayBuffer()),
    caption: null,
    createdBy: session.user.email,
  });
  return Response.json(row);
}
