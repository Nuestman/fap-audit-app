"use client";

import { useEffect, useMemo, useState } from "react";
import { Input, Select } from "@/components/ui";
import type { PersonOption } from "./person-option";

const OTHER = "__other__";

function splitNames(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

function joinNames(names: string[]): string | null {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(", ") : null;
}

function optionLabel(p: PersonOption) {
  return p.label ?? p.name;
}

function SinglePicker({
  people,
  value,
  onChange,
}: {
  people: PersonOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const known = useMemo(() => new Set(people.map((p) => p.name)), [people]);
  const current = value?.trim() || "";
  const isKnown = current !== "" && known.has(current);
  // Empty string after choosing Other used to snap back to "—"; keep Other open with local state.
  const [otherOpen, setOtherOpen] = useState(() => Boolean(current && !known.has(current)));

  useEffect(() => {
    if (isKnown) setOtherOpen(false);
    else if (current) setOtherOpen(true);
  }, [isKnown, current]);

  const selectValue = isKnown ? current : otherOpen ? OTHER : "";
  const showOther = selectValue === OTHER;

  const groups = useMemo(() => {
    const map = new Map<string | undefined, PersonOption[]>();
    for (const p of people) {
      const list = map.get(p.group) ?? [];
      list.push(p);
      map.set(p.group, list);
    }
    return [...map.entries()];
  }, [people]);

  const hasGroups = groups.some(([g]) => g);

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            setOtherOpen(false);
            onChange(null);
          } else if (v === OTHER) {
            setOtherOpen(true);
            // Clear a directory name so the free-text box starts empty; keep an orphan custom value.
            onChange(isKnown ? null : value);
          } else {
            setOtherOpen(false);
            onChange(v);
          }
        }}
      >
        <option value="">—</option>
        {hasGroups
          ? groups.map(([group, list]) =>
              group ? (
                <optgroup key={group} label={group}>
                  {list.map((p) => (
                    <option key={`${p.group}-${p.id}`} value={p.name}>
                      {optionLabel(p)}
                    </option>
                  ))}
                </optgroup>
              ) : (
                list.map((p) => (
                  <option key={p.id} value={p.name}>
                    {optionLabel(p)}
                  </option>
                ))
              ),
            )
          : people.map((p) => (
              <option key={p.id} value={p.name}>
                {optionLabel(p)}
              </option>
            ))}
        <option value={OTHER}>Other…</option>
      </Select>
      {showOther ? (
        <Input
          autoFocus
          value={current}
          placeholder="Type a name"
          onChange={(e) => onChange(e.target.value || null)}
        />
      ) : null}
    </div>
  );
}

function MultiPicker({
  people,
  value,
  onChange,
}: {
  people: PersonOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const known = useMemo(() => new Set(people.map((p) => p.name)), [people]);
  const selected = splitNames(value);
  const ticked = selected.filter((n) => known.has(n));
  const other = selected.filter((n) => !known.has(n)).join(", ");

  function emit(nextTicked: string[], nextOther: string) {
    onChange(joinNames([...nextTicked, ...splitNames(nextOther)]));
  }

  return (
    <div className="space-y-2">
      {people.length === 0 ? (
        <p className="text-xs text-slate-500">No people in the directory yet. Use Other, or add them in Settings.</p>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {people.map((p) => {
            const checked = ticked.includes(p.name);
            return (
              <li key={p.id}>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...ticked, p.name]
                        : ticked.filter((n) => n !== p.name);
                      emit(next, other);
                    }}
                  />
                  <span>
                    {optionLabel(p)}
                    {p.group ? <span className="ml-1 text-xs text-slate-400">({p.group})</span> : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <Input
        value={other}
        placeholder="Other (comma-separated if several)"
        onChange={(e) => emit(ticked, e.target.value)}
      />
    </div>
  );
}

export function PersonPicker({
  mode,
  people,
  value,
  onChange,
}: {
  mode: "single" | "multi";
  people: PersonOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  if (mode === "single") return <SinglePicker people={people} value={value} onChange={onChange} />;
  if (mode === "multi") return <MultiPicker people={people} value={value} onChange={onChange} />;
  const unreachable: never = mode;
  throw new Error(`Unknown PersonPicker mode: ${unreachable}`);
}
