import { redirect } from "next/navigation";
import { listAudits } from "@/lib/audit/queries";

/** Legacy global Actions URL — send people to the latest audit's tracker. */
export default async function ActionsRedirectPage() {
  const audits = await listAudits();
  if (audits[0]) redirect(`/audits/${audits[0].id}/actions`);
  redirect("/audits");
}
