# Offline workbook tools (v1)

Curated copy of the Excel audit workspace that originally lived beside the app as `fap-audit-report`. Kept here so protocol layout and the offline template stay versioned with the product.

**Live audits and reports** are produced in the Next.js app (Excel/Word export from Neon). This folder is for:

- regenerating the blank offline data-entry workbook
- documenting how the v1 checklist / sheet layout was built
- optional sync helpers when comparing an app export to a filled workbook

## Contents

| File | Purpose |
|------|---------|
| `protocol.md` | Checklist source used by `build_workbook.py` (also the origin of app seed `protocol-v1.ts`) |
| `build_workbook.py` | Builds the multi-post Excel template (Summary, Findings, Actions formulas) |
| `FAP Audit Workbook v1.xlsx` | **Blank** v1 template — structure and formulas only, no note-seeded drafts |
| `sync_additional_from_export.py` | Rebuilds a template-style workbook from an app Excel export (ops helper) |

Do **not** commit filled audit workbooks or Word dumps here.

## Generate the blank v1 workbook

```bash
cd tools/workbook
pip install openpyxl   # if needed
python build_workbook.py --empty
```

Writes `FAP Audit Workbook v1.xlsx` (no yellow draft cells from historical audit notes).

With seeded draft text from the in-script `FINDINGS` / `H1_ITEMS` / `H3_ITEMS` maps (if present):

```bash
python build_workbook.py
```

## Relation to the app

- App export: `src/lib/export/excel.ts` (runtime workbook from database)
- App import: `src/lib/import/workbook.ts` / `scripts/import-workbook.ts`
- Protocol seed: `src/db/seed/protocol-v1.ts` (generated from `protocol.md`)
