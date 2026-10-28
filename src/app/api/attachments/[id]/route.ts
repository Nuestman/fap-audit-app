import { auth } from "@/lib/auth/server";
import { deleteAttachment, getAttachment } from "@/lib/storage";

async function authorised() {
  const { data } = await auth.getSession();
  return Boolean(data?.user);
}

export async function GET(_request: Request, ctx: RouteContext<"/api/attachments/[id]">) {
  if (!(await authorised())) return new Response("Unauthorized", { status: 401 });
  const id = Number((await ctx.params).id);
  const file = Number.isInteger(id) ? await getAttachment(id) : null;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=86400",
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
    },
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/attachments/[id]">) {
  if (!(await authorised())) return new Response("Unauthorized", { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return new Response("Bad request", { status: 400 });
  await deleteAttachment(id);
  return new Response(null, { status: 204 });
}
