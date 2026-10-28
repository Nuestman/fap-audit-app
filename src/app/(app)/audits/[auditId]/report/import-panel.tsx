"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { ImportSummary } from "@/lib/import/apply";

type Result = { summary: ImportSummary[]; ignoredSheets: string[] } | { error: string };

export function ImportPanel({ auditId, locked }: { auditId: number; locked: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/audits/${auditId}/import`, { method: "POST", body });
      setResult((await res.json()) as Result);
      if (res.ok) router.refresh();
    } catch {
      setResult({ error: "Upload failed. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Import a filled-in workbook</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Sheets named after a post (ODD, STP, KMS, GCS) are read. Filled cells overwrite the app&rsquo;s values;
          blank cells leave them unchanged. H1, H2 and H3 rows are added unless the same text already exists.
        </p>
      </div>
      {locked ? (
        <p className="text-sm text-amber-700">This audit is marked final. Set it back to in progress to import.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="max-w-sm"
          />
          <Button onClick={upload} disabled={!file || busy}>
            <Upload className="size-4" />
            {busy ? "Importing…" : "Import"}
          </Button>
        </div>
      )}
      {result && "error" in result ? <p className="text-sm text-red-700">{result.error}</p> : null}
      {result && "summary" in result ? (
        <div className="space-y-1 text-sm text-slate-700">
          {result.summary.map((s) => (
            <p key={s.siteCode}>
              <span className="font-semibold">{s.siteCode}:</span> {s.criteria} criteria, {s.extrasAdded} H1/H3 added,{" "}
              {s.extrasUpdated} updated, {s.practicesAdded} good practices, {s.tableRows} table rows
              {s.conclusion ? ", conclusion" : ""}
              {s.signOffs ? `, ${s.signOffs} sign-offs` : ""}.
            </p>
          ))}
          {result.ignoredSheets.length ? (
            <p className="text-xs text-slate-500">Ignored sheets: {result.ignoredSheets.join(", ")}.</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
