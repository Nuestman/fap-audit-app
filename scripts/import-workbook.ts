/**
 * Imports a filled-in audit workbook from the command line. Dry run by default: it prints
 * what would change. Add --apply to write.
 *
 *   npx tsx --conditions=react-server --env-file=.env.local ./scripts/import-workbook.ts <auditId> <workbook.xlsx> [--apply]
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { getAudit, getPostWorkspace, getProtocol } from "@/lib/audit/queries";
import { applyWorkbookImport } from "@/lib/import/apply";
import { parseWorkbook } from "@/lib/import/workbook";

const key = (v: string | null | undefined) => v?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

async function main() {
  const [auditArg, path, flag] = process.argv.slice(2);
  if (!auditArg || !path) throw new Error("Usage: import-workbook.ts <auditId> <workbook.xlsx> [--apply]");
  const audit = await getAudit(Number(auditArg));
  if (!audit) throw new Error(`Audit ${auditArg} not found`);
  const protocol = await getProtocol(audit.protocolVersionId);
  const file = await readFile(path);
  const { posts } = await parseWorkbook(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer,
    protocol,
    audit.posts.map((p) => p.site.code),
  );
  const itemIdByCode = new Map(protocol.sections.flatMap((s) => s.items.map((i) => [i.code, i.id])));

  for (const parsed of posts) {
    const post = audit.posts.find((p) => p.site.code === parsed.siteCode);
    const ws = post ? await getPostWorkspace(post.id) : null;
    if (!ws) continue;
    const byItem = new Map(ws.responses.map((r) => [r.itemId, r]));
    const added: string[] = [];
    const changed: string[] = [];
    for (const c of parsed.criteria) {
      const r = byItem.get(itemIdByCode.get(c.code) ?? -1);
      if (!r || (!r.answer && !r.finding)) added.push(c.code);
      else if (
        (c.answer && c.answer !== r.answer) ||
        (c.finding && key(c.finding) !== key(r.finding)) ||
        (c.classification && c.classification !== r.classification)
      )
        changed.push(c.code);
    }
    const newExtras = parsed.extras.filter(
      (e) => !ws.extras.some((x) => x.kind === e.kind && key(x.finding) === key(e.finding)),
    );
    console.log(
      `${parsed.siteCode}: ${parsed.criteria.length} criteria in workbook; new: ${added.join(", ") || "none"}; ` +
        `changed: ${changed.join(", ") || "none"}; new H1/H3: ${newExtras.map((e) => `${e.kind} "${e.finding.slice(0, 50)}"`).join("; ") || "none"}; ` +
        `H2: ${parsed.practices.length}; table rows: ${parsed.tableValues.size}`,
    );
  }

  if (flag !== "--apply") {
    console.log("Dry run only. Add --apply to write.");
    return;
  }
  const summary = await applyWorkbookImport(audit, protocol, posts, `import: ${basename(path)}`);
  console.log("Applied:", JSON.stringify(summary));
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
