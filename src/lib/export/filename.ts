/** e.g. "Q4-2026-FAP-Audit-Workbook-2026-10-28.xlsx"; ASCII only so it survives Content-Disposition. */
export function downloadName(title: string, kind: string, ext: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "Audit"}-${kind}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}
