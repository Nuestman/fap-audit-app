import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { listProtocolVersions, listSites } from "@/lib/audit/queries";
import { NewAuditForm } from "./new-audit-form";

export default async function NewAuditPage() {
  const [user, sites, versions] = await Promise.all([
    requireUser(),
    listSites(),
    listProtocolVersions(),
  ]);

  return (
    <>
      <PageHeader
        breadcrumb={<Link href="/">Audits</Link>}
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
        defaultLead={user.name}
      />
    </>
  );
}
