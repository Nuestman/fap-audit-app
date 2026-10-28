"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionFields } from "@/components/audit/action-fields";
import { ClassificationBadge, RiskBadge } from "@/components/audit/badges";
import { SaveIndicator } from "@/components/audit/save-indicator";
import { Badge, Card, Field, Textarea } from "@/components/ui";
import type { TrackedActionInput } from "@/lib/audit/action-mutations";
import type { TrackedAction } from "@/lib/audit/queries";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { cn, formatDate } from "@/lib/utils";
import { saveTrackedAction } from "./actions";

export function ActionRow({ action, overdue }: { action: TrackedAction; overdue: boolean }) {
  const [state, setState] = useState<TrackedActionInput>({
    action: action.action,
    owner: action.owner,
    targetDate: action.targetDate,
    status: action.status,
    closeoutEvidence: action.closeoutEvidence,
  });
  const { status, schedule } = useAutosave((v: TrackedActionInput) => saveTrackedAction(action.id, v));

  function update(next: TrackedActionInput, immediate = false) {
    setState(next);
    schedule(next, immediate);
  }

  const href = action.sectionCode
    ? `/audits/${action.auditId}/posts/${action.postId}/${action.sectionCode.toLowerCase()}#${action.ref}`
    : `/audits/${action.auditId}/posts/${action.postId}/h`;

  return (
    <Card className={cn("space-y-3 p-4", overdue && "ring-red-300")}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-900">{action.siteCode}</span>
        <Link href={href} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 hover:underline">
          {action.ref}
        </Link>
        <ClassificationBadge value={action.classification} />
        <RiskBadge classification={action.classification} />
        {overdue ? <Badge className="bg-red-50 text-red-700 ring-red-200">Overdue</Badge> : null}
        {action.closedAt ? <span className="text-slate-500">Closed {formatDate(action.closedAt)}</span> : null}
        <span className="ml-auto text-slate-400">{action.auditTitle}</span>
        <SaveIndicator status={status} />
      </div>
      {action.finding ? <p className="text-sm text-slate-700">{action.finding}</p> : null}
      <ActionFields
        value={state}
        onChange={(v) => update({ ...state, ...v }, v.status !== state.status)}
      />
      {state.status === "closed" || state.closeoutEvidence ? (
        <Field label="Close-out evidence" hint="(what shows the action is done and effective)">
          <Textarea
            rows={2}
            value={state.closeoutEvidence ?? ""}
            onChange={(e) => update({ ...state, closeoutEvidence: e.target.value })}
          />
        </Field>
      ) : null}
    </Card>
  );
}
