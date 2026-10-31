import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { listActiveAuditors, listProtocolVersions, listSites } from "@/lib/audit/queries";
import { NewAuditForm } from "./new-audit-form";

export default async function NewAuditPage() {
  const [user, sites, versions, auditors] = await Promise.all([
    requireUser(),
    listSites(),
    listProtocolVersions(),
    listActiveAuditors(),
  ]);

  return (
    <>
      <PageHeader
        breadcrumb={<Link href="/audits">Audits</Link>}
        title="New audit"
        description="Creates a checklist for each selected post using the chosen protocol version."
      />
      <NewAuditForm
        sites={sites.filter((s) => s.active)}
        versions={versions.map((v) => ({
          id: v.id,
          name: v.name,
          version: v.version,
          isActive: v.isActive,
        }))}
        auditors={auditors}
        defaultLead={user.name}
      />
    </>
  );
}
