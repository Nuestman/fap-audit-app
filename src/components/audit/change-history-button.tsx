"use client";

import { History, X } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";
import { fetchEntityHistory } from "@/app/(app)/audits/[auditId]/posts/[postId]/actions";
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
  hasHistory: initialHasHistory,
  label = "Previous values",
}: {
  entity: ChangeEntity;
  entityId: number | null;
  hasHistory: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hasHistory, setHasHistory] = useState(initialHasHistory);
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  useEffect(() => {
    setHasHistory(initialHasHistory);
  }, [initialHasHistory]);

  if (!entityId || !hasHistory) return null;

  function openModal() {
    setOpen(true);
    if (rows) return;
    startTransition(async () => {
      const data = await fetchEntityHistory(entity, entityId!);
      setRows(data);
      if (data.length === 0) setHasHistory(false);
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
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal
            aria-labelledby={titleId}
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 id={titleId} className="text-sm font-semibold text-brand-accent">
                Previous values
              </h3>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[calc(80vh-3.5rem)] overflow-y-auto p-4">
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
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
