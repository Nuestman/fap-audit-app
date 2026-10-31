import Link from "next/link";
import { notFound } from "next/navigation";
import { NavTabs } from "@/components/nav-tabs";
import { Badge } from "@/components/ui";
import { getAudit } from "@/lib/audit/queries";

export default async function AuditLayout({
  children,
  params,
}: LayoutProps<"/audits/[auditId]">) {
  const { auditId } = await params;
  const audit = await getAudit(Number(auditId));
  if (!audit) notFound();
  const base = `/audits/${audit.id}`;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="text-sm text-slate-500">
          <Link href="/audits">Audits</Link> /
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-accent">{audit.title}</h1>
          <Badge>{audit.status.replace("_", " ")}</Badge>
        </div>
        <NavTabs
          className="no-print"
          tabs={[
            { href: base, label: "Overview", exact: true },
            ...audit.posts.map((p) => ({ href: `${base}/posts/${p.id}`, label: p.site.code })),
            { href: `${base}/dashboard`, label: "Dashboard" },
            { href: `${base}/report`, label: "Report & export" },
          ]}
        />
      </div>
      {children}
    </div>
  );
}
