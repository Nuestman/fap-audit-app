import { getSessionUser } from "@/lib/auth/session";
import { getAuditDataset } from "@/lib/audit/queries";
import { buildAuditWorkbook } from "@/lib/export/excel";
import { downloadName } from "@/lib/export/filename";

export async function GET(_request: Request, ctx: RouteContext<"/api/audits/[auditId]/export/excel">) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const data = await getAuditDataset(Number((await ctx.params).auditId));
  if (!data) return new Response("Not found", { status: 404 });
  const file = await buildAuditWorkbook(data);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${downloadName(data.audit.title, "Workbook", "xlsx")}"`,
      "Cache-Control": "no-store",
    },
  });
}
