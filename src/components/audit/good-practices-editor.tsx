"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  createGoodPractice,
  deleteGoodPractice,
  saveGoodPractice,
} from "@/app/(app)/audits/[auditId]/posts/[postId]/actions";
import { Button, Card, EmptyState, Field, Textarea } from "@/components/ui";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { SaveIndicator } from "./save-indicator";

type Practice = {
  id: number;
  practice: string | null;
  evidence: string | null;
  value: string | null;
  replication: string | null;
};

function PracticeCard({ data, index, onDelete }: { data: Practice; index: number; onDelete: () => void }) {
  const [v, setV] = useState(data);
  const { status, schedule } = useAutosave((p: Practice) => saveGoodPractice(p.id, p));

  function set(patch: Partial<Practice>) {
    const next = { ...v, ...patch };
    setV(next);
    schedule(next);
  }

  const fields: { key: keyof Omit<Practice, "id">; label: string }[] = [
    { key: "practice", label: "Good practice" },
    { key: "evidence", label: "Evidence / example" },
    { key: "value", label: "Why it is valuable" },
    { key: "replication", label: "Potential for replication" },
  ];

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">Good practice {index + 1}</span>
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
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <Textarea rows={2} value={v[f.key] ?? ""} onChange={(e) => set({ [f.key]: e.target.value })} />
          </Field>
        ))}
      </div>
    </Card>
  );
}

export function GoodPracticesEditor({ auditPostId, initial }: { auditPostId: number; initial: Practice[] }) {
  const [items, setItems] = useState(initial);

  async function add() {
    const row = await createGoodPractice(auditPostId);
    setItems((prev) => [...prev, row]);
  }

  async function remove(id: number) {
    if (!confirm("Delete this good practice?")) return;
    await deleteGoodPractice(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? <EmptyState>No good practices recorded yet.</EmptyState> : null}
      {items.map((p, i) => (
        <PracticeCard key={p.id} data={p} index={i} onDelete={() => remove(p.id)} />
      ))}
      <Button variant="secondary" onClick={add}>
        <Plus className="size-4" /> Add good practice
      </Button>
    </div>
  );
}
