import { Plus } from "lucide-react";
import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { listAudits } from "@/lib/audit/queries";
import { formatDate } from "@/lib/utils";

export default async function AuditsPage() {
  const audits = await listAudits();

  return (
    <>
      <PageHeader
        title="Audits"
        description="Each audit covers one or more first aid posts and their ambulances."
        actions={
          <ButtonLink href="/audits/new">
            <Plus className="size-4" /> New audit
          </ButtonLink>
        }
      />
      {audits.length === 0 ? (
        <EmptyState>
          <p>No audits yet.</p>
          <div className="mt-4 flex justify-center">
            <ButtonLink href="/audits/new">
              <Plus className="size-4" /> New audit
            </ButtonLink>
          </div>
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {audits.map((a) => (
            <Link key={a.id} href={`/audits/${a.id}`}>
              <Card className="p-4 transition hover:ring-slate-400">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-accent">{a.title}</p>
                    <p className="text-sm text-slate-500">
                      {a.period ?? "No period"} · started {formatDate(a.startDate ?? a.createdAt)}
                    </p>
                  </div>
                  <Badge>{a.status.replace("_", " ")}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.posts.map((p) => (
                    <Badge key={p.id} className="bg-white">
                      {p.site.code}
                    </Badge>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
