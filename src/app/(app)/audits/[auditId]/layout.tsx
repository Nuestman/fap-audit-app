import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditChromeOffset } from "@/components/audit-chrome-offset";
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
    <div>
      <div className="mb-3 space-y-3">
        <div className="text-sm text-slate-500">
          <Link href="/audits">Audits</Link> /
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-accent">{audit.title}</h1>
          <Badge>{audit.status.replace("_", " ")}</Badge>
        </div>
      </div>
      <div
        id="audit-sticky-chrome"
        className="no-print sticky top-14 z-20 -mx-4 mb-5 bg-white/95 px-4 backdrop-blur"
      >
        <AuditChromeOffset />
        <NavTabs
          tabs={[
            { href: base, label: "Overview", exact: true },
            ...audit.posts.map((p) => ({ href: `${base}/posts/${p.id}`, label: p.site.code })),
            { href: `${base}/dashboard`, label: "Dashboard" },
            { href: `${base}/findings`, label: "Findings" },
            { href: `${base}/actions`, label: "Actions" },
            { href: `${base}/report`, label: "Report & export" },
          ]}
        />
      </div>
      {children}
    </div>
  );
}
