import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/server";
import {
  clearUserAvatar,
  getUserAvatar,
  putUserAvatar,
} from "@/lib/profile";
import { MAX_ATTACHMENT_BYTES } from "@/lib/storage";

async function requireSessionUser() {
  const { data } = await auth.getSession();
  return data?.user ?? null;
}

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const file = await getUserAvatar(user.id);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": 'inline; filename="avatar"',
    },
  });
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Only images can be uploaded" }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return Response.json({ error: "Image too large" }, { status: 413 });
  }

  await putUserAvatar(user.id, Buffer.from(await file.arrayBuffer()), file.type);
  await auth.updateUser({ image: "/api/profile/avatar" });
  revalidatePath("/", "layout");
  revalidatePath("/profile");
  return Response.json({ ok: true });
}

export async function DELETE() {
  const user = await requireSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await clearUserAvatar(user.id);
  await auth.updateUser({ image: null });
  revalidatePath("/", "layout");
  revalidatePath("/profile");
  return new Response(null, { status: 204 });
}
