"use client";

import { NotebookPen, Plus } from "lucide-react";
import { useState } from "react";
import { saveCriterion } from "@/app/(app)/audits/[auditId]/posts/[postId]/actions";
import { Card, Field, Textarea } from "@/components/ui";
import type { Answer, Classification } from "@/db/schema";
import { answerLabel } from "@/lib/audit/classification";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { cn } from "@/lib/utils";
import { ActionFields, EMPTY_ACTION, type ActionState } from "./action-fields";
import { ClassificationSelect } from "./classification-select";
import type { PersonOption } from "./person-option";
import { PhotoStrip, type AttachmentRef } from "./photo-strip";
import { SaveIndicator } from "./save-indicator";

export type CriterionData = {
  itemId: number;
  code: string;
  text: string;
  responseId: number | null;
  answer: Answer | null;
  evidence: string | null;
  finding: string | null;
  classification: Classification | null;
  originalNote: string | null;
  action: ActionState | null;
  attachments: AttachmentRef[];
};

type State = {
  answer: Answer | null;
  evidence: string | null;
  finding: string | null;
  classification: Classification | null;
  action: ActionState;
};

const ANSWERS: Answer[] = ["yes", "no", "na"];
const ANSWER_TONE: Record<Answer, string> = {
  yes: "bg-emerald-600 text-white ring-emerald-600",
  no: "bg-red-600 text-white ring-red-600",
  na: "bg-slate-600 text-white ring-slate-600",
};

export function CriterionCard({
  auditPostId,
  data,
  people,
  onAnswerChange,
}: {
  auditPostId: number;
  people: PersonOption[];
  data: CriterionData;
  onAnswerChange: (itemId: number, answer: Answer | null, classification: Classification | null) => void;
}) {
  const [state, setState] = useState<State>({
    answer: data.answer,
    evidence: data.evidence,
    finding: data.finding,
    classification: data.classification,
    action: data.action ?? EMPTY_ACTION,
  });
  const [responseId, setResponseId] = useState(data.responseId);
  const [showFinding, setShowFinding] = useState(
    Boolean(data.finding || data.classification || data.action?.action),
  );
  const [showNote, setShowNote] = useState(false);

  const persist = async (s: State) => {
    const res = await saveCriterion({ auditPostId, itemId: data.itemId, ...s });
    setResponseId(res.responseId);
    return res;
  };
  const { status, schedule } = useAutosave(persist);

  function update(patch: Partial<State>, immediate = false) {
    const next = { ...state, ...patch };
    setState(next);
    schedule(next, immediate);
    if ("answer" in patch || "classification" in patch) {
      onAnswerChange(data.itemId, next.answer, next.classification);
    }
  }

  const findingOpen = state.answer === "no" || showFinding;

  return (
    <Card
      id={data.code}
      className={cn(
        "scroll-mt-28 p-4",
        state.answer === "no" && "ring-red-200",
        state.answer === "yes" && "ring-emerald-200",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
          {data.code}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">{data.text}</p>
            <SaveIndicator status={status} />
          </div>

          {data.originalNote ? (
            <div>
              <button
                type="button"
                onClick={() => setShowNote((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-amber-800"
              >
                <NotebookPen className="size-3" />
                {showNote ? "Hide" : "Show"} original audit note
              </button>
              {showNote ? (
                <p className="mt-1 whitespace-pre-line rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  {data.originalNote}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 sm:max-w-xs">
            {ANSWERS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => update({ answer: state.answer === a ? null : a }, true)}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold ring-1 ring-inset transition",
                  state.answer === a
                    ? ANSWER_TONE[a]
                    : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
                )}
              >
                {answerLabel(a)}
              </button>
            ))}
          </div>

          {state.answer ? (
            <Field label="Evidence" hint="(what you saw: record, document, observation)">
              <Textarea
                rows={2}
                value={state.evidence ?? ""}
                onChange={(e) => update({ evidence: e.target.value })}
              />
            </Field>
          ) : null}

          {findingOpen ? (
            <div className="space-y-3 rounded-lg bg-slate-50 p-3">
              <Field label="Finding">
                <Textarea
                  rows={2}
                  value={state.finding ?? ""}
                  onChange={(e) => update({ finding: e.target.value })}
                />
              </Field>
              <Field label="Classification">
                <ClassificationSelect
                  value={state.classification}
                  onChange={(classification) => update({ classification }, true)}
                />
              </Field>
              {state.classification !== "c" ? (
                <ActionFields
                  people={people}
                  value={state.action}
                  onChange={(action) => update({ action })}
                />
              ) : null}
            </div>
          ) : state.answer && state.answer !== "na" ? (
            <button
              type="button"
              onClick={() => setShowFinding(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <Plus className="size-3" /> Add finding (e.g. OFI or Observation)
            </button>
          ) : null}

          {state.answer ? (
            <PhotoStrip
              auditPostId={auditPostId}
              initial={data.attachments}
              ensureTarget={async () => {
                if (responseId) return { itemResponseId: responseId };
                const res = await persist(state);
                return { itemResponseId: res.responseId };
              }}
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
}
