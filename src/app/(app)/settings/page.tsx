import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { allowedEmails } from "@/lib/auth/allow-list";
import { requireUser } from "@/lib/auth/session";
import {
  getAppConfig,
  listAuditors,
  listFapStaff,
  listProtocolVersions,
  listSites,
} from "@/lib/audit/queries";
import { formatDate } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { AuditorsDirectory, FapStaffDirectory, StaffModelPicker } from "./people-editors";
import { NewSiteForm, SiteRow } from "./site-editors";

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-brand-accent">{title}</h2>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export default async function SettingsPage() {
  const [user, sites, auditors, staff, versions, config] = await Promise.all([
    requireUser(),
    listSites(),
    listAuditors(),
    listFapStaff(),
    listProtocolVersions(),
    getAppConfig(),
  ]);
  const allowed = allowedEmails();
  const siteOpts = sites.map((s) => ({ id: s.id, code: s.code, name: s.name }));

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <Section title="First aid posts" hint="Inactive posts are hidden when creating a new audit.">
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[36rem]">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-1 pr-3 font-medium">Code</th>
                <th className="pb-1 pr-3 font-medium">Name</th>
                <th className="pb-1 pr-3 font-medium">Location</th>
                <th className="pb-1 pr-3 text-center font-medium">Active</th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <SiteRow
                  key={s.id}
                  id={s.id}
                  code={s.code}
                  initial={{ name: s.name, location: s.location, active: s.active }}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <NewSiteForm />
        </div>
      </Section>

      <Section
        title="FAP staff model"
        hint="Controls whether staff are offered globally or only at their assigned post."
      >
        <StaffModelPicker initial={config.fapStaffModel} />
      </Section>

      <Section
        title="Auditors"
        hint="Used for lead auditor, audit team, and action owners. Inactive names are hidden from new picks."
      >
        <AuditorsDirectory
          rows={auditors.map((p) => ({
            id: p.id,
            name: p.name,
            organization: p.organization,
            jobTitle: p.jobTitle,
            email: p.email,
            phone: p.phone,
            employeeNumber: p.employeeNumber,
            active: p.active,
          }))}
        />
      </Section>

      <Section
        title="FAP staff"
        hint="Staff on duty and action owners. Assign a FAP when using the site-assigned model."
      >
        <FapStaffDirectory
          sites={siteOpts}
          rows={staff.map((p) => ({
            id: p.id,
            name: p.name,
            organization: p.organization,
            jobTitle: p.jobTitle,
            email: p.email,
            phone: p.phone,
            employeeNumber: p.employeeNumber,
            qualification: p.qualification,
            pinStatus: p.pinStatus,
            pinExpiresOn: p.pinExpiresOn,
            siteId: p.siteId,
            active: p.active,
          }))}
        />
      </Section>

      <Section
        title="Protocol versions"
        hint="Each audit is locked to the protocol version it was created with, so later edits never change past results."
      >
        <ul className="divide-y divide-slate-100">
          {versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="font-medium text-slate-900">{v.name}</span>
              <Badge>v{v.version}</Badge>
              {v.isActive ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">Active</Badge> : null}
              <span className="text-slate-500">
                {v.sections.length} sections · {v.sections.reduce((n, s) => n + s.items.length, 0)} criteria
                {v.effectiveDate ? ` · effective ${formatDate(v.effectiveDate)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Who can sign up"
        hint={
          <>
            Set by the <code>ALLOWED_EMAILS</code> environment variable (comma-separated).
          </>
        }
      >
        {allowed.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-700">
            {allowed.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-amber-700">
            No list is set. Anyone can register in development; nobody can in production.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">Signed in as {user.email}.</p>
      </Section>

      <Section title="About" hint="Release version for this deployment.">
        <p className="text-sm text-slate-700">
          FAP Audit <span className="font-mono font-medium">v{APP_VERSION}</span>
        </p>
        <p className="mt-2 text-sm">
          <Link href="/changelog" className="text-brand underline">
            View changelog
          </Link>
        </p>
      </Section>
    </div>
  );
}
