"""Rebuild 'FAP Audit Workbook - Additional data entered.xlsx' from the clean
template, filled with current data from a system Excel export.

Usage:
  python sync_additional_from_export.py [export.xlsx]
"""

from __future__ import annotations

import re
import shutil
import sys
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

from build_workbook import POSTS, inject_actions_sheet, layouts_from_workbook

HERE = Path(__file__).parent
TEMPLATE = HERE / "FAP Audit Workbook.xlsx"
OUTPUT = HERE / "FAP Audit Workbook - Additional data entered.xlsx"
CRIT_RE = re.compile(r"^[A-G]\d+\.\d+$")

# Capacity needed to hold the largest export blocks (same on every post sheet).
H1_SLOTS = 10
H2_SLOTS = 8
H3_SLOTS = 10
I2_SLOTS = 45

THIN = Side(style="thin", color="A6A6A6")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")
DRAFT = PatternFill("solid", fgColor="FFF2CC")
WHITE = PatternFill(fill_type=None)


def risk_formula(row: int) -> str:
    return (
        f'=IF(F{row}="","",IF(F{row}="Major NC","Critical",'
        f'IF(F{row}="Minor NC","Medium",IF(OR(F{row}="OFI",F{row}="OBS"),"Low","None"))))'
    )


def clear_fill(cell) -> None:
    if cell.fill and cell.fill.fgColor and cell.fill.fgColor.rgb in ("FFF2CC", "00FFF2CC"):
        cell.fill = PatternFill(fill_type=None)


def set_value(cell, value) -> None:
    if value is None or value == "":
        cell.value = None
    else:
        cell.value = value
    clear_fill(cell)


def find_title_row(ws, prefix: str) -> int | None:
    for row in range(1, (ws.max_row or 1) + 1):
        a = ws.cell(row=row, column=1).value
        if isinstance(a, str) and a.startswith(prefix):
            return row
    return None


def block_data_rows(ws, title_prefix: str) -> tuple[int, int]:
    """Return inclusive (start, end) of numbered data rows under a section title."""
    title = find_title_row(ws, title_prefix)
    if title is None:
        raise ValueError(f"Missing section {title_prefix!r} on {ws.title}")
    header = title + 1
    start = header + 1
    end = start - 1
    for row in range(start, (ws.max_row or 1) + 1):
        a = ws.cell(row=row, column=1).value
        if isinstance(a, str) and (
            a.startswith("H1.")
            or a.startswith("H2.")
            or a.startswith("H3.")
            or a.startswith("I1.")
            or a.startswith("I2.")
            or a.startswith("I3.")
            or a.startswith("I4.")
            or a.startswith("A2.")
            or a.startswith("B2.")
            or a.startswith("D2.")
            or a.startswith("E2.")
            or a.startswith("G2.")
        ):
            break
        if a is None and ws.cell(row=row, column=2).value is None:
            # blank spacer before next section
            break
        if a == "No." or a == "Priority" or a == "Role":
            continue
        if isinstance(a, int) or (isinstance(a, str) and str(a).isdigit()):
            end = row
            continue
        break
    if end < start:
        raise ValueError(f"No data rows under {title_prefix!r} on {ws.title}")
    return start, end


def ensure_slots(ws, title_prefix: str, needed: int, cols: int, with_risk: bool) -> tuple[int, int]:
    start, end = block_data_rows(ws, title_prefix)
    have = end - start + 1
    if have >= needed:
        return start, start + needed - 1
    insert_at = end + 1
    add = needed - have
    ws.insert_rows(insert_at, amount=add)
    for i in range(add):
        row = insert_at + i
        ws.cell(row=row, column=1, value=have + 1 + i)
        if with_risk:
            ws.cell(row=row, column=7, value=risk_formula(row))
        for col in range(1, cols + 1):
            c = ws.cell(row=row, column=col)
            c.border = BOX
            c.alignment = WRAP
    return start, start + needed - 1


def index_by_id(ws) -> dict[str, int]:
    out: dict[str, int] = {}
    for row in range(1, (ws.max_row or 1) + 1):
        a = ws.cell(row=row, column=1).value
        if isinstance(a, str) and CRIT_RE.match(a):
            out[a] = row
    return out


def copy_criterion_row(src, src_row: int, dst, dst_row: int) -> None:
    # C Response, D Evidence, E Finding, F Classification, H Action, I Owner, J Target, K Status, L Note
    # Keep G risk formula on destination.
    for col in (3, 4, 5, 6, 8, 9, 10, 11, 12):
        set_value(dst.cell(row=dst_row, column=col), src.cell(row=src_row, column=col).value)


def copy_plain_block(src, src_start: int, dst, dst_start: int, n: int, cols: int, skip_cols: set[int]) -> None:
    for i in range(n):
        s_row = src_start + i
        d_row = dst_start + i
        # stop if source row is beyond filled numbered rows
        a = src.cell(row=s_row, column=1).value
        if not (isinstance(a, int) or (isinstance(a, str) and str(a).isdigit())):
            break
        for col in range(1, cols + 1):
            if col in skip_cols:
                continue
            if col == 1:
                dst.cell(row=d_row, column=1, value=i + 1)
                continue
            set_value(dst.cell(row=d_row, column=col), src.cell(row=s_row, column=col).value)


def table_rows_by_label(ws, title_prefix: str) -> dict[str, int]:
    title = find_title_row(ws, title_prefix)
    if title is None:
        return {}
    out: dict[str, int] = {}
    for row in range(title + 2, (ws.max_row or 1) + 1):
        a = ws.cell(row=row, column=1).value
        b = ws.cell(row=row, column=2).value
        if isinstance(a, str) and (
            a.startswith("H1.")
            or a.startswith("H2.")
            or a.startswith("H3.")
            or a.startswith("I1.")
            or a.startswith("A2.")
            or a.startswith("B2.")
            or a.startswith("D2.")
            or a.startswith("E2.")
            or a.startswith("G2.")
        ):
            break
        if isinstance(b, str) and b.strip():
            out[b.strip()] = row
        elif b is None and a is None:
            break
    return out


def copy_labeled_table(src, dst, title_prefix: str, value_cols: range) -> None:
    src_map = table_rows_by_label(src, title_prefix)
    dst_map = table_rows_by_label(dst, title_prefix)
    for label, d_row in dst_map.items():
        s_row = src_map.get(label)
        if not s_row:
            continue
        for col in value_cols:
            set_value(dst.cell(row=d_row, column=col), src.cell(row=s_row, column=col).value)


def parse_visit(text: str | None) -> dict[str, str]:
    """Parse 'Date: 2026-10-12 · Shift: Day · Staff on duty: X · Ambulance units: Y'."""
    out = {"date": "", "shift": "", "staff": "", "ambulance": ""}
    if not text:
        return out
    parts = [p.strip() for p in text.split("·")]
    for part in parts:
        low = part.lower()
        if low.startswith("date:"):
            out["date"] = part.split(":", 1)[1].strip()
        elif low.startswith("shift:"):
            out["shift"] = part.split(":", 1)[1].strip()
        elif low.startswith("staff on duty:"):
            out["staff"] = part.split(":", 1)[1].strip()
        elif low.startswith("ambulance"):
            out["ambulance"] = part.split(":", 1)[1].strip()
    return out


def to_date(value: str):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return value


def fill_audit_details(export_wb, dst_wb) -> None:
    src = export_wb["Audit Details"]
    dst = dst_wb["Audit Details"]
    # Export layout is label/value in A/B, plus visit rows.
    meta = {}
    visits = {}
    for row in range(1, (src.max_row or 1) + 1):
        a, b = src.cell(row=row, column=1).value, src.cell(row=row, column=2).value
        if not isinstance(a, str):
            continue
        if a.endswith(" visit"):
            visits[a.split()[0]] = parse_visit(b if isinstance(b, str) else None)
        else:
            meta[a] = b

    site = "Obuasi - South Mine"
    lead = meta.get("Lead auditor")
    auditors = meta.get("Auditors")
    # Row map in template Audit Details
    # 4 Site, 5 Post, 6 Date, 7 Lead, 8 Auditors, 9 Shift, 10 Staff on Duty, 11 Ambulance
    for i, post in enumerate(POSTS, start=2):
        dst.cell(row=4, column=i, value=site)
        dst.cell(row=5, column=i, value=post)
        v = visits.get(post, {})
        dst.cell(row=6, column=i, value=to_date(v.get("date", "")))
        if isinstance(dst.cell(row=6, column=i).value, date):
            dst.cell(row=6, column=i).number_format = "dd-mmm-yyyy"
        dst.cell(row=7, column=i, value=lead)
        dst.cell(row=8, column=i, value=auditors)
        dst.cell(row=9, column=i, value=v.get("shift") or None)
        # Template may still say Nurse-in-Charge on older files; current template uses Staff on Duty
        dst.cell(row=10, column=i, value=v.get("staff") or None)
        amb = v.get("ambulance") or None
        if amb and amb.lower().startswith("not applicable"):
            amb = "N/A — no ambulance stationed"
        dst.cell(row=11, column=i, value=amb)


def expand_post_capacity(ws) -> None:
    ensure_slots(ws, "H1.", H1_SLOTS, cols=12, with_risk=True)
    ensure_slots(ws, "H2.", H2_SLOTS, cols=5, with_risk=False)
    ensure_slots(ws, "H3.", H3_SLOTS, cols=12, with_risk=True)
    ensure_slots(ws, "I2.", I2_SLOTS, cols=7, with_risk=False)


def sync_post(export_wb, dst_wb, post: str) -> None:
    src = export_wb[post]
    dst = dst_wb[post]
    expand_post_capacity(dst)

    # Criteria
    src_ids = index_by_id(src)
    dst_ids = index_by_id(dst)
    for cid, d_row in dst_ids.items():
        s_row = src_ids.get(cid)
        if s_row:
            copy_criterion_row(src, s_row, dst, d_row)

    # Supplementary tables
    copy_labeled_table(src, dst, "A2.", range(3, 5))
    copy_labeled_table(src, dst, "B2.", range(3, 6))
    copy_labeled_table(src, dst, "D2.", range(3, 8))  # times; keep destination total formula in col 8 if present
    # For D2, also copy calculated total if export has a value/formula in col 8 — prefer keeping template formula
    copy_labeled_table(src, dst, "E2.", range(3, 5))
    copy_labeled_table(src, dst, "G2.", range(3, 5))

    # H1 / H2 / H3
    for prefix, cols, skip, slots in (
        ("H1.", 12, {7}, H1_SLOTS),
        ("H2.", 5, set(), H2_SLOTS),
        ("H3.", 12, {7}, H3_SLOTS),
    ):
        s0, _ = block_data_rows(src, prefix)
        d0, _ = block_data_rows(dst, prefix)
        # clear destination data cells first (keep numbers + risk formulas)
        for i in range(slots):
            d_row = d0 + i
            for col in range(2, cols + 1):
                if col in skip:
                    continue
                set_value(dst.cell(row=d_row, column=col), None)
            dst.cell(row=d_row, column=1, value=i + 1)
            if 7 not in skip and prefix != "H2.":
                dst.cell(row=d_row, column=7, value=risk_formula(d_row))
        copy_plain_block(src, s0, dst, d0, slots, cols, skip)

    # I2 priority plan
    s0, _ = block_data_rows(src, "I2.")
    d0, _ = block_data_rows(dst, "I2.")
    for i in range(I2_SLOTS):
        d_row = d0 + i
        for col in range(2, 8):
            set_value(dst.cell(row=d_row, column=col), None)
        dst.cell(row=d_row, column=1, value=i + 1)
    copy_plain_block(src, s0, dst, d0, I2_SLOTS, 7, set())

    # I3 conclusion labels in column B, values in C
    for row in range(1, (src.max_row or 1) + 1):
        label = src.cell(row=row, column=2).value
        if label not in {
            "Overall status",
            "Key strengths",
            "Key risks requiring management attention",
            "Overall recommendation",
        }:
            continue
        for d_row in range(1, (dst.max_row or 1) + 1):
            if dst.cell(row=d_row, column=2).value == label:
                set_value(dst.cell(row=d_row, column=3), src.cell(row=row, column=3).value)
                break

    # I4 sign-off: Role in B, Name/Signature/Date in C-E
    src_i4 = find_title_row(src, "I4.")
    dst_i4 = find_title_row(dst, "I4.")
    if src_i4 and dst_i4:
        src_map = {}
        for row in range(src_i4 + 2, (src.max_row or 1) + 1):
            role = src.cell(row=row, column=2).value
            if isinstance(role, str) and role.strip():
                src_map[role.strip()] = row
            elif role is None:
                break
        for row in range(dst_i4 + 2, (dst.max_row or 1) + 1):
            role = dst.cell(row=row, column=2).value
            if not isinstance(role, str):
                break
            s_row = src_map.get(role.strip())
            if not s_row:
                continue
            for col in (3, 4, 5):
                set_value(dst.cell(row=row, column=col), src.cell(row=s_row, column=col).value)


def patch_summary_h2(dst_wb) -> None:
    if "Summary" not in dst_wb.sheetnames:
        return
    layouts = layouts_from_workbook(dst_wb)
    layout = layouts[0]
    ws = dst_wb["Summary"]
    for row in range(1, (ws.max_row or 1) + 1):
        if ws.cell(row=row, column=1).value != "Good practices recorded (H2)":
            continue
        for p, post in enumerate(POSTS, start=2):
            ws.cell(
                row=row,
                column=p,
                value=f"=COUNTA('{post}'!B{layout['h2_start']}:B{layout['h2_end']})",
            )
        break


def main(export_path: Path) -> None:
    if not TEMPLATE.exists():
        raise SystemExit(f"Missing template: {TEMPLATE}")
    if not export_path.exists():
        raise SystemExit(f"Missing export: {export_path}")

    tmp = HERE / "_additional_sync_tmp.xlsx"
    shutil.copy2(TEMPLATE, tmp)
    export_wb = load_workbook(export_path)
    dst_wb = load_workbook(tmp)

    for post in POSTS:
        if post not in export_wb.sheetnames:
            raise SystemExit(f"Export missing post sheet {post}")
        sync_post(export_wb, dst_wb, post)

    fill_audit_details(export_wb, dst_wb)
    dst_wb.save(tmp)
    inject_actions_sheet(tmp)
    # inject reloads/saves; patch summary on the saved file
    dst_wb = load_workbook(tmp)
    patch_summary_h2(dst_wb)
    try:
        dst_wb.save(OUTPUT)
        print(f"Updated {OUTPUT.name} from {export_path.name}")
    except PermissionError:
        alt = HERE / "FAP Audit Workbook - Additional data entered - synced.xlsx"
        dst_wb.save(alt)
        print(f"Original locked; wrote {alt.name}")
    finally:
        tmp.unlink(missing_ok=True)


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "Q4-2026-FAP-Audit-Workbook-2026-11-04.xlsx"
    main(path)
