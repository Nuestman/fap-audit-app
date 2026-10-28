import { getSessionUser } from "@/lib/auth/session";
import { getAudit, getProtocol } from "@/lib/audit/queries";
import { applyWorkbookImport } from "@/lib/import/apply";
import { parseWorkbook } from "@/lib/import/workbook";

const MAX_BYTES = 5_000_000;

export async function POST(request: Request, ctx: RouteContext<"/api/audits/[auditId]/import">) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const audit = await getAudit(Number((await ctx.params).auditId));
  if (!audit) return Response.json({ error: "Audit not found" }, { status: 404 });
  if (audit.status === "final") {
    return Response.json({ error: "This audit is marked final. Set it back to in progress to import." }, { status: 409 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a workbook to import" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return Response.json({ error: "Only .xlsx workbooks can be imported" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return Response.json({ error: "The workbook is larger than 5 MB" }, { status: 413 });

  const protocol = await getProtocol(audit.protocolVersionId);
  let parsed: Awaited<ReturnType<typeof parseWorkbook>>;
  try {
    parsed = await parseWorkbook(
      await file.arrayBuffer(),
      protocol,
      audit.posts.map((p) => p.site.code),
    );
  } catch {
    return Response.json({ error: "That file could not be read as an Excel workbook" }, { status: 400 });
  }
  if (parsed.posts.length === 0) {
    return Response.json(
      { error: `No sheet is named after a post in this audit (${audit.posts.map((p) => p.site.code).join(", ")})` },
      { status: 400 },
    );
  }

  const summary = await applyWorkbookImport(audit, protocol, parsed.posts, user.email);
  return Response.json({ summary, ignoredSheets: parsed.ignoredSheets });
}
