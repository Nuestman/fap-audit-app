import { getSessionUser } from "@/lib/auth/session";
import { getAuditDataset } from "@/lib/audit/queries";
import { downloadName } from "@/lib/export/filename";
import { buildWordReport } from "@/lib/export/word-report";

export async function GET(_request: Request, ctx: RouteContext<"/api/audits/[auditId]/export/word">) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const data = await getAuditDataset(Number((await ctx.params).auditId));
  if (!data) return new Response("Not found", { status: 404 });
  const file = await buildWordReport(data);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${downloadName(data.audit.title, "Report", "docx")}"`,
      "Cache-Control": "no-store",
    },
  });
}
