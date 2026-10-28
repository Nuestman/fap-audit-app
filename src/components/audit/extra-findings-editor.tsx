"use client";

import { NotebookPen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  createExtraFinding,
  deleteExtraFinding,
  saveExtraFinding,
  type ExtraInput,
} from "@/app/(app)/audits/[auditId]/posts/[postId]/actions";
import { Button, Card, EmptyState, Field, Input, Textarea } from "@/components/ui";
import type { Classification, ExtraKind } from "@/db/schema";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { ActionFields, EMPTY_ACTION } from "./action-fields";
import { ClassificationSelect } from "./classification-select";
import { PhotoStrip, type AttachmentRef } from "./photo-strip";
import { SaveIndicator } from "./save-indicator";

export type ExtraFindingData = ExtraInput & {
  id: number;
  kind: ExtraKind;
  originalNote: string | null;
  attachments: AttachmentRef[];
};

function ExtraCard({
  auditPostId,
  data,
  index,
  onDelete,
}: {
  auditPostId: number;
  data: ExtraFindingData;
  index: number;
  onDelete: () => void;
}) {
  const [v, setV] = useState<ExtraInput>({
    finding: data.finding,
    linkedRef: data.linkedRef,
    evidence: data.evidence,
    consequence: data.consequence,
    interimControl: data.interimControl,
    classification: data.classification,
    action: data.action ?? EMPTY_ACTION,
  });
  const { status, schedule } = useAutosave((d: ExtraInput) => saveExtraFinding(data.id, d));

  function set(patch: Partial<ExtraInput>, immediate = false) {
    const next = { ...v, ...patch };
    setV(next);
    schedule(next, immediate);
  }

  const isH1 = data.kind === "h1";

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">
          {isH1 ? "H1" : "H3"} item {index + 1}
        </span>
        <div className="flex items-center gap-2">
          <SaveIndicator status={status} />
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      {data.originalNote ? (
        <p className="flex gap-1 whitespace-pre-line rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          <NotebookPen className="mt-0.5 size-3 shrink-0" />
          {data.originalNote}
        </p>
      ) : null}
      <Field label={isH1 ? "Finding / opportunity" : "Issue"}>
        <Textarea rows={2} value={v.finding ?? ""} onChange={(e) => set({ finding: e.target.value })} />
      </Field>
      {isH1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Linked criterion / reference">
            <Input value={v.linkedRef ?? ""} onChange={(e) => set({ linkedRef: e.target.value })} />
          </Field>
          <Field label="Evidence">
            <Input value={v.evidence ?? ""} onChange={(e) => set({ evidence: e.target.value })} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Potential consequence">
            <Textarea
              rows={2}
              value={v.consequence ?? ""}
              onChange={(e) => set({ consequence: e.target.value })}
            />
          </Field>
          <Field label="Interim control">
            <Textarea
              rows={2}
              value={v.interimControl ?? ""}
              onChange={(e) => set({ interimControl: e.target.value })}
            />
          </Field>
        </div>
      )}
      <Field label="Classification">
        <ClassificationSelect
          value={v.classification}
          onChange={(classification: Classification | null) => set({ classification }, true)}
        />
      </Field>
      <ActionFields
        label={isH1 ? "Recommendation" : "Required action"}
        value={v.action}
        onChange={(action) => set({ action })}
      />
      <PhotoStrip
        auditPostId={auditPostId}
        initial={data.attachments}
        ensureTarget={async () => ({ extraFindingId: data.id })}
      />
    </Card>
  );
}

export function ExtraFindingsEditor({
  auditPostId,
  kind,
  initial,
}: {
  auditPostId: number;
  kind: ExtraKind;
  initial: ExtraFindingData[];
}) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      const row = await createExtraFinding(auditPostId, kind);
      setItems((prev) => [
        ...prev,
        { ...row, action: EMPTY_ACTION, attachments: [] } satisfies ExtraFindingData,
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this item and its action?")) return;
    await deleteExtraFinding(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? <EmptyState>None recorded.</EmptyState> : null}
      {items.map((item, i) => (
        <ExtraCard
          key={item.id}
          auditPostId={auditPostId}
          data={item}
          index={i}
          onDelete={() => remove(item.id)}
        />
      ))}
      <Button variant="secondary" onClick={add} disabled={busy}>
        <Plus className="size-4" /> Add {kind === "h1" ? "finding" : "issue"}
      </Button>
    </div>
  );
}
