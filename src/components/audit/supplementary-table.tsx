"use client";

import { useState } from "react";
import { saveTableEntry } from "@/app/(app)/audits/[auditId]/posts/[postId]/actions";
import { Card, Input, Select } from "@/components/ui";
import type { TableColumn } from "@/db/schema";
import { formatMinutes, minutesBetween } from "@/lib/audit/metrics";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { SaveIndicator } from "./save-indicator";

export type SupplementaryTableData = {
  code: string;
  title: string;
  rowHeader: string;
  columns: TableColumn[];
  rows: { id: number; label: string; values: Record<string, string> }[];
};

function Cell({
  column,
  value,
  onChange,
}: {
  column: TableColumn;
  value: string;
  onChange: (v: string) => void;
}) {
  switch (column.type) {
    case "yesno":
      return (
        <Select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-20">
          <option value="" />
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </Select>
      );
    case "oknotna":
      return (
        <Select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-24">
          <option value="" />
          <option value="OK">OK</option>
          <option value="Not OK">Not OK</option>
          <option value="N/A">N/A</option>
        </Select>
      );
    case "number":
      return (
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-20"
        />
      );
    case "time":
      return (
        <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="min-w-24" />
      );
    case "text":
      return <Input value={value} onChange={(e) => onChange(e.target.value)} className="min-w-40" />;
    default: {
      const unreachable: never = column.type;
      throw new Error(`Unknown column type: ${unreachable}`);
    }
  }
}

function TableRow({
  auditPostId,
  row,
  columns,
  showTotal,
}: {
  auditPostId: number;
  row: SupplementaryTableData["rows"][number];
  columns: TableColumn[];
  showTotal: boolean;
}) {
  const [values, setValues] = useState(row.values);
  const { status, schedule } = useAutosave((v: Record<string, string>) =>
    saveTableEntry(auditPostId, row.id, v),
  );

  function set(key: string, v: string) {
    const next = { ...values, [key]: v };
    setValues(next);
    schedule(next);
  }

  const first = columns[0]?.key;
  const last = columns[columns.length - 1]?.key;

  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="py-2 pr-3 text-sm font-medium text-slate-800">
        {row.label}
        <div>
          <SaveIndicator status={status} />
        </div>
      </td>
      {columns.map((c) => (
        <td key={c.key} className="py-2 pr-2">
          <Cell column={c} value={values[c.key] ?? ""} onChange={(v) => set(c.key, v)} />
        </td>
      ))}
      {showTotal ? (
        <td className="py-2 text-sm font-semibold text-slate-800">
          {formatMinutes(minutesBetween(values[first], values[last]))}
        </td>
      ) : null}
    </tr>
  );
}

export function SupplementaryTable({
  auditPostId,
  table,
}: {
  auditPostId: number;
  table: SupplementaryTableData;
}) {
  const showTotal = table.columns.every((c) => c.type === "time");
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">
        {`${table.code}. ${table.title}`}
      </h3>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-1 pr-3 font-medium">{table.rowHeader}</th>
              {table.columns.map((c) => (
                <th key={c.key} className="pb-1 pr-2 font-medium">
                  {c.label}
                </th>
              ))}
              {showTotal ? <th className="pb-1 font-medium">Total time</th> : null}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <TableRow
                key={r.id}
                auditPostId={auditPostId}
                row={r}
                columns={table.columns}
                showTotal={showTotal}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
