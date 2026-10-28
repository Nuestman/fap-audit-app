/**
 * Builds the Word and Excel exports for an audit and parses a workbook, without writing to the database.
 *
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/check-exports.ts [auditId] [workbook.xlsx]
 *
 * Outputs go to the OS temp folder.
 */
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAuditDataset } from "@/lib/audit/queries";
import { buildAuditWorkbook } from "@/lib/export/excel";
import { buildWordReport } from "@/lib/export/word-report";
import { parseWorkbook } from "@/lib/import/workbook";

async function main() {
  const auditId = Number(process.argv[2] ?? 1);
  const workbookPath = process.argv[3];
  const data = await getAuditDataset(auditId);
  if (!data) throw new Error(`Audit ${auditId} not found`);

  const docx = join(tmpdir(), `fap-audit-${auditId}.docx`);
  const xlsx = join(tmpdir(), `fap-audit-${auditId}.xlsx`);
  await writeFile(docx, await buildWordReport(data));
  await writeFile(xlsx, await buildAuditWorkbook(data));
  console.log(`Wrote ${docx}\nWrote ${xlsx}`);

  if (workbookPath) {
    const file = await readFile(workbookPath);
    const { posts, ignoredSheets } = await parseWorkbook(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer,
      data.protocol,
      data.posts.map((p) => p.site.code),
    );
    console.log(`Parsed ${workbookPath}; ignored sheets: ${ignoredSheets.join(", ")}`);
    for (const p of posts) {
      console.log(
        `${p.siteCode}: ${p.criteria.length} criteria, ${p.extras.filter((e) => e.kind === "h1").length} H1, ` +
          `${p.extras.filter((e) => e.kind === "h3").length} H3, ${p.practices.length} H2, ` +
          `${p.tableValues.size} table rows, ${p.signOffs.size} sign-offs`,
      );
    }
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
