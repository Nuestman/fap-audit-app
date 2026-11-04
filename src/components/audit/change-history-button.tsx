"use client";

import { History } from "lucide-react";
import { useState, useTransition } from "react";
import { fetchEntityHistory } from "@/app/(app)/audits/[auditId]/posts/[postId]/actions";
import { Dialog } from "@/components/ui/dialog";
import type { ChangeEntity } from "@/lib/audit/change-log-types";

type EventRow = Awaited<ReturnType<typeof fetchEntityHistory>>[number];

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() ? v : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function formatWhen(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChangeHistoryButton({
  entity,
  entityId,
  hasHistory,
  label = "Previous values",
}: {
  entity: ChangeEntity;
  entityId: number | null;
  hasHistory: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  /** Hide after a fetch proves there is nothing (avoids syncing prop via useEffect). */
  const [confirmedEmpty, setConfirmedEmpty] = useState(false);
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  const show = Boolean(entityId && hasHistory && !confirmedEmpty);
  if (!show) return null;

  function openModal() {
    setOpen(true);
    if (rows) return;
    startTransition(async () => {
      const data = await fetchEntityHistory(entity, entityId!);
      setRows(data);
      if (data.length === 0) setConfirmedEmpty(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        title="Show earlier saved values for this item"
      >
        <History className="size-3" />
        {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Previous values" size="md">
        {pending && !rows ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !rows?.length ? (
          <p className="text-sm text-slate-500">No earlier values recorded.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((ev) => (
              <li key={ev.id} className="rounded-lg bg-slate-50 p-3 text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-slate-500">
                  <span className="font-medium text-slate-800">{ev.summary ?? ev.action}</span>
                  <span>{formatWhen(ev.occurredAt)}</span>
                </div>
                <p className="mt-0.5 text-slate-500">
                  {ev.actor}
                  {ev.source !== "ui" ? ` · ${ev.source}` : ""}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {Object.entries(ev.changes).map(([field, change]) => (
                    <li key={field}>
                      <span className="font-semibold text-slate-700">{field}</span>
                      <div className="mt-0.5 grid gap-1 sm:grid-cols-2">
                        <p className="rounded bg-white px-2 py-1 text-slate-500 ring-1 ring-slate-100">
                          <span className="mr-1 text-[10px] uppercase tracking-wide">from</span>
                          {formatValue(change.from)}
                        </p>
                        <p className="rounded bg-white px-2 py-1 text-slate-800 ring-1 ring-slate-100">
                          <span className="mr-1 text-[10px] uppercase tracking-wide text-slate-500">
                            to
                          </span>
                          {formatValue(change.to)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}
