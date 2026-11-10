"""Build the FAP audit data-entry workbook from protocol.md.

Run:
  python build_workbook.py              # with optional note-seeded drafts (if defined)
  python build_workbook.py --empty      # blank v1 template (no draft findings/notes)
  python build_workbook.py --empty -o "FAP Audit Workbook v1.xlsx"
"""

import argparse
import re
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

HERE = Path(__file__).parent
PROTOCOL = HERE / "protocol.md"
OUTPUT = HERE / "FAP Audit Workbook.xlsx"
OUTPUT_EMPTY = HERE / "FAP Audit Workbook v1.xlsx"

POSTS = ["ODD", "STP", "KMS", "GCS"]

RESPONSES = ["Yes", "No", "N/A"]
CLASSIFICATIONS = ["Major NC", "Minor NC", "OFI", "OBS", "C"]
RISKS = ["Critical", "Medium", "Low"]
STATUSES = ["Open", "In progress", "Closed"]
OVERALL_STATUSES = [
    "Satisfactory",
    "Satisfactory with improvements required",
    "Unsatisfactory - immediate action required",
]

MAIN_HEADERS = [
    "ID", "Audit criterion", "Response", "Evidence", "Finding",
    "Classification", "Risk", "Corrective action", "Owner",
    "Target date", "Status", "Original auditor note",
]
MAIN_WIDTHS = [8, 55, 12, 38, 60, 14, 10, 50, 18, 13, 12, 45]

# ---------------------------------------------------------------- styles
DARK = PatternFill("solid", fgColor="1F3864")
SECTION = PatternFill("solid", fgColor="D9E2F3")
SUBTABLE = PatternFill("solid", fgColor="E7E6E6")
DRAFT = PatternFill("solid", fgColor="FFF2CC")
RED = PatternFill("solid", fgColor="F4B6B6")
ORANGE = PatternFill("solid", fgColor="F8CBAD")
BLUE = PatternFill("solid", fgColor="BDD7EE")
PURPLE = PatternFill("solid", fgColor="D9D2E9")
GREEN = PatternFill("solid", fgColor="C6EFCE")
THIN = Side(style="thin", color="A6A6A6")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")
WHITE_BOLD = Font(bold=True, color="FFFFFF")
BOLD = Font(bold=True)
TITLE = Font(bold=True, size=14, color="1F3864")
SUBTITLE = Font(bold=True, size=12, color="1F3864")


# ---------------------------------------------------------------- draft findings
# One entry per criterion. Where several notes relate to one criterion they are
# combined, and the most severe classification is used.
FINDINGS = {
    "KMS": [
        dict(
            id="A1.2",
            notes=["Share procedure for first aid post"],
            evidence="[Confirm] FAP procedure requested; not produced during the audit.",
            finding="No documented, approved procedure defining the scope of services of the KMS first aid post was available for review.",
            cls="Minor NC",
            action="Issue an approved FAP procedure covering scope of services, operating hours and escalation; keep a controlled copy at the post.",
        ),
        dict(
            id="A1.3",
            notes=["Provide clinical protocols at the first aid post", "Provide clinical policies"],
            evidence="[Confirm] No clinical protocols or policies found at the post.",
            finding="Clinical protocols and clinical policies were not available at the first aid post for nurses to refer to.",
            cls="Minor NC",
            action="Place controlled copies of the approved clinical protocols and policies at the post (hard copy or accessible electronic copy) and brief all nurses on where to find them.",
        ),
        dict(
            id="A1.5",
            notes=["Provide certificate of qualification and licenses for all emergency nurses"],
            evidence="[Confirm] Certificates and licences requested; not produced during the audit.",
            finding="Qualifications and current professional licences of the emergency nurses could not be verified. (Raise to Major NC if any nurse is found practising without a current licence.)",
            cls="Minor NC",
            action="Compile copies of qualifications and current licences for all FAP nurses and set up licence-expiry tracking.",
        ),
        dict(
            id="A1.8",
            notes=["Provide evidence of drills that includes nurses"],
            evidence="[Confirm] No drill reports or attendance records showing nurse participation.",
            finding="No records were available of emergency drills that included the FAP nurses.",
            cls="Minor NC",
            action="Include FAP nurses in scheduled site emergency drills; keep drill reports and attendance registers.",
        ),
        dict(
            id="A1.9",
            notes=["Provide and display emergency contacts at the first aid post", "Provide document with referral facilities"],
            evidence="[Confirm] No emergency contact list displayed; no referral facility list available.",
            finding="Emergency contact numbers were not displayed at the post, and there was no documented list of referral facilities.",
            cls="Minor NC",
            action="Display a verified, dated emergency contact list at the post. Document referral facilities with their capabilities and contact numbers, and review the list quarterly.",
        ),
        dict(
            id="A1.10",
            notes=["Ensure the mine emergency response plan is made available to nurses"],
            evidence="[Confirm] Mine ERP not available at the post.",
            finding="The mine Emergency Response Plan (ERP) was not available to the FAP nurses.",
            cls="Minor NC",
            action="Provide a controlled copy of the mine ERP at the post and brief nurses on their role in it.",
        ),
        dict(
            id="C1.3",
            notes=["Provide recent training evidence for nurses on BLS, AED, CPR", "Develop a training matrix for nurses for in-service trainings"],
            evidence="[Confirm] No current BLS/CPR/AED certificates produced; no training matrix.",
            finding="There was no evidence of current BLS/CPR/AED training for the FAP nurses, and no training matrix for in-service training. Competence to manage a cardiac arrest cannot be demonstrated.",
            cls="Major NC",
            action="Obtain current BLS/CPR/AED certificates for all nurses and schedule refresher training for anyone lapsed. Develop and maintain a nurse training matrix.",
        ),
        dict(
            id="C1.4",
            notes=["Request attendance sheets for SHE Day Briefs which include nurses"],
            evidence="[Confirm] SHE Day Brief attendance sheets not produced.",
            finding="There was no evidence that FAP nurses attend SHE Day Briefs.",
            cls="Minor NC",
            action="Include nurses in SHE Day Briefs and keep signed attendance sheets.",
        ),
        dict(
            id="C1.11",
            notes=["Check on the charging system for the AED"],
            evidence="[Confirm] Concern raised about AED charging system during inspection.",
            finding="The AED charging system was in doubt, so the AED's readiness could not be confirmed. (Raise to Major NC if the AED is found non-functional.)",
            cls="Minor NC",
            action="Have the AED and its charger checked by the vendor or biomedical technician. Add AED battery, pads and self-test status to the daily checklist.",
        ),
        dict(
            id="C1.12",
            notes=["No suction machine is available. Ensure one is provided", "Provide OPA"],
            evidence="Observed: no suction machine at the post. [Confirm] OPAs absent.",
            finding="No suction machine and no oropharyngeal airways (OPAs) were available at the post. Staff cannot clear or maintain the airway of an unconscious, bleeding or vomiting patient.",
            cls="Major NC",
            action="Procure a portable (battery or manual) suction unit and a full OPA size range. Add both to the daily equipment checklist.",
        ),
        dict(
            id="C1.16",
            notes=["Provide cabinets with locks to store controlled drugs"],
            evidence="[Confirm] Observed: no lockable storage for controlled drugs.",
            finding="There was no lockable cabinet for storing controlled drugs.",
            cls="Major NC",
            action="Install a lockable controlled-drugs cabinet with restricted key holding and a controlled-drugs register.",
        ),
        dict(
            id="C1.17",
            notes=["Provide temperature monitor for fridge and ensure segregation of drugs and food items"],
            evidence="[Confirm] Observed: no fridge thermometer; medicines and food stored together.",
            finding="The medicine fridge has no temperature monitor, and medicines were stored together with food items.",
            cls="Minor NC",
            action="Provide a min/max fridge thermometer with a twice-daily temperature log. Remove food from the medicine fridge (provide a separate staff fridge if needed).",
        ),
        dict(
            id="C1.18",
            notes=["Provide new waste bins as current ones are faulty"],
            evidence="Observed: waste bins faulty.",
            finding="The clinical waste bins at the post are faulty.",
            cls="Minor NC",
            action="Replace faulty bins with colour-coded pedal bins in line with the waste segregation standard.",
        ),
        dict(
            id="D1.1",
            notes=["Provide portable radios"],
            evidence="[Confirm] No portable radios at the post.",
            finding="The post has no portable radios, which limits communication with the control room and responders during an emergency.",
            cls="Minor NC",
            action="Provide portable radios on the site emergency channel and add a radio check to the daily checklist.",
        ),
        dict(
            id="E1.5",
            notes=["Ensure there is a proper documentation system for issued drugs", "Include issued drugs when sending out daily reports"],
            evidence="[Confirm] No medicines issue register; daily reports reviewed do not list issued drugs.",
            finding="There is no proper system for documenting drugs issued at the post, and issued drugs are not included in the daily report.",
            cls="Minor NC",
            action="Introduce a medicines issue register (patient, drug, dose, quantity, issued by) and include issued drugs in the daily report.",
        ),
        dict(
            id="E1.8",
            notes=["Provide a digital health management system to manage confidentiality issues"],
            evidence="[Confirm] Paper records; describe how confidentiality was compromised.",
            finding="Patient records are paper-based and confidentiality cannot be adequately assured.",
            cls="Minor NC",
            action="Short term: keep records in a lockable cabinet with restricted access. Long term: implement a digital health management system.",
        ),
        dict(
            id="E1.10",
            notes=["Ensure clinical audits are performed"],
            evidence="[Confirm] No clinical audit reports available.",
            finding="No periodic clinical audits are carried out at the post.",
            cls="Minor NC",
            action="Set up a clinical audit schedule (e.g. quarterly record review) with documented results and actions.",
        ),
        dict(
            id="E1.13",
            notes=["Review both first aid and emergency procedures", "Review clinical protocols"],
            evidence="[Confirm] Record the review/issue dates seen on the procedures and protocols.",
            finding="The first-aid and emergency procedures and the clinical protocols are due for review.",
            cls="Minor NC",
            action="Review the procedures and protocols against current evidence and AGA requirements. Record the review date and next review date on each document.",
        ),
    ],
    "ODD": [
        dict(
            id="C1.4",
            notes=["Request attendance sheets for SHE Day Briefs which include nurses"],
            evidence="[Confirm] SHE Day Brief attendance sheets not produced.",
            finding="There was no evidence that FAP nurses attend SHE Day Briefs.",
            cls="Minor NC",
            action="Include nurses in SHE Day Briefs and keep signed attendance sheets.",
        ),
        dict(
            id="C1.7",
            notes=["Provide adequate lighting around the post especially at night"],
            evidence="[Confirm] Observed/reported: poor external lighting at night.",
            finding="Lighting around the post is inadequate at night, affecting safe access for patients and the ambulance.",
            cls="Minor NC",
            action="Install adequate external lighting around the post and its access route.",
        ),
        dict(
            id="C1.8",
            notes=["Space is congested in the first aid post. Make arrangements for expansion"],
            evidence="Observed: post congested.",
            finding="The post is congested. There is not enough space for resuscitation, treatment and patient privacy.",
            cls="Minor NC",
            action="Plan an expansion of the post. In the meantime, remove non-essential items to keep the resuscitation area clear.",
        ),
        dict(
            id="C1.10",
            notes=["Ensure oxygen cylinders for both the post and ambulance are refilled when empty"],
            evidence="[Confirm] Record cylinder pressures found at the post.",
            finding="Oxygen cylinders at the post are not consistently refilled when empty. (Raise to Major NC if no full cylinder was available.)",
            cls="Minor NC",
            action="Keep at least one full spare cylinder, refill cylinders after use, and record pressures on the daily checklist.",
        ),
        dict(
            id="C1.11",
            notes=["Conduct checks on AED at Admin to ensure it is functional", "Expiry date for AED pads is January 2027. Make provision for a new set"],
            evidence="[Confirm] No check records for the Admin AED. Observed: AED pads expire January 2027.",
            finding="There is no evidence of functional checks on the AED at the Admin building. AED pads are in date but expire in January 2027 (early warning).",
            cls="Minor NC",
            action="Add the Admin AED to the routine check schedule and order replacement pads before January 2027.",
        ),
        dict(
            id="C1.17",
            notes=["Provide thermometer for fridge"],
            evidence="[Confirm] Observed: no fridge thermometer.",
            finding="The medicine fridge has no thermometer, so storage temperatures are not monitored.",
            cls="Minor NC",
            action="Provide a min/max fridge thermometer with a twice-daily temperature log.",
        ),
        dict(
            id="E1.8",
            notes=["Provide a digital health management system to manage confidentiality issues"],
            evidence="[Confirm] Paper records; describe how confidentiality was compromised.",
            finding="Patient records are paper-based and confidentiality cannot be adequately assured.",
            cls="Minor NC",
            action="Short term: keep records in a lockable cabinet with restricted access. Long term: implement a digital health management system.",
        ),
        dict(
            id="F1.17",
            notes=["Ensure document control for ambulance checklist is controlled"],
            evidence="[Confirm] Ambulance checklist in use has no document number/revision/approval.",
            finding="The ambulance readiness checklist in use is not a controlled document.",
            cls="Minor NC",
            action="Bring the ambulance checklist under document control (number, revision, approval) and withdraw uncontrolled copies.",
        ),
        dict(
            id="G1.11",
            notes=["Develop a removal checklist for items in the ambulance"],
            evidence="[Confirm] No record of items used/removed from the ambulance.",
            finding="There is no checklist for items used or removed from the ambulance, so replenishment after use cannot be verified.",
            cls="OFI",
            action="Develop an ambulance item-use/removal checklist linked to restocking.",
            response="",
        ),
        dict(
            id="G1.12",
            notes=["Ensure oxygen cylinders for both the post and ambulance are refilled when empty"],
            evidence="[Confirm] Record cylinder pressures found in the ambulance.",
            finding="Ambulance oxygen cylinders are not consistently refilled or replaced when empty.",
            cls="Minor NC",
            action="Refill or replace cylinders immediately after use and record pressures on the ambulance shift checklist.",
        ),
        dict(
            id="G1.13",
            notes=["Develop a system for documenting ambulance post-transport cleaning and waste disposal"],
            evidence="[Confirm] No cleaning/waste disposal records for the ambulance.",
            finding="There is no system for documenting ambulance cleaning and waste disposal after patient transport.",
            cls="Minor NC",
            action="Introduce a post-transport cleaning and waste disposal log in the ambulance.",
        ),
    ],
}

# Section H1: findings with no direct checklist criterion.
H1_ITEMS = {
    "KMS": [
        dict(
            notes=["Ensure FAP statistics checklist is controlled as per AGA standards"],
            ref="ISO 45001 cl. 7.5 (no checklist item)",
            evidence="[Confirm] Statistics checklist has no document number/revision/approval.",
            finding="The FAP statistics checklist is not controlled in line with AGA document-control standards.",
            recommendation="Bring the statistics checklist under document control (number, revision, approval).",
            cls="Minor NC",
        ),
    ],
}

# Section H3: facility and welfare issues outside the clinical criteria.
H3_ITEMS = {
    "KMS": [
        dict(
            notes=["Provide a washroom in the first aid post"],
            issue="There is no washroom at the first aid post.",
            consequence="Staff must leave the post to use facilities, so it may be left unattended; hygiene and staff welfare are affected.",
            interim="Designate the nearest washroom and arrange cover when staff step away.",
            cls="Minor NC",
        ),
        dict(
            notes=["Liaise for lockers for nurses to keep their belongings"],
            issue="Nurses have no lockers for their personal belongings.",
            consequence="Personal items kept in clinical areas; security and infection-control concern.",
            interim="",
            cls="OFI",
        ),
        dict(
            notes=["Provide a microwave for the post"],
            issue="There is no microwave at the post.",
            consequence="Staff welfare; staff may leave the post during meal breaks.",
            interim="",
            cls="OFI",
        ),
    ],
    "ODD": [
        dict(
            notes=["AC was observed leaking. Ensure it is fixed and repaired"],
            issue="The air conditioner was observed leaking.",
            consequence="Slip hazard, water near electrical equipment, and damage to stock and records.",
            interim="Place a drip tray, mark the wet area, and log a maintenance request.",
            cls="Minor NC",
        ),
        dict(
            notes=["Provide smoke detectors in the post"],
            issue="There are no smoke detectors in the post.",
            consequence="A fire, including one involving oxygen cylinders, may not be detected early.",
            interim="Confirm fire extinguishers are in place and in date.",
            cls="Minor NC",
        ),
        dict(
            notes=["Floor boards are weak and require replacement"],
            issue="The floorboards are weak.",
            consequence="Trip or fall hazard for staff and patients, especially when moving stretchers.",
            interim="Mark weak sections and avoid stretcher movement over them.",
            cls="Minor NC",
        ),
        dict(
            notes=["Provide lockers and microwaves"],
            issue="There are no staff lockers or microwave at the post.",
            consequence="Staff welfare; personal items kept in clinical areas.",
            interim="",
            cls="OFI",
        ),
    ],
}

# Notes exactly as written in "FIRST AID POST AUDIT FINDINGS.docx", in order.
ORIGINAL_NOTES = {
    "KMS": [
        "Provide certificate of qualification and licenses for all emergency nurses",
        "Share procedure for first aid post",
        "Provide clinical protocols at the first aid post",
        "Provide evidence of drills that includes nurses",
        "Provide and display emergency contacts at the first aid post",
        "Provide document with referral facilities",
        "Provide clinical policies",
        "Develop a training matrix for nurses for in-service trainings",
        "Ensure FAP statistics checklist is controlled as per AGA standards",
        "Provide cabinets with locks to store controlled drugs",
        "Ensure there is a proper documentation system for issued drugs",
        "Include issued drugs when sending out daily reports",
        "Check on the charging system for the AED",
        "Review both first aid and emergency procedures",
        "Ensure the mine emergency response plan is made available to nurses",
        "Request attendance sheets for SHE Day Briefs which include nurses",
        "Provide recent training evidence for nurses on BLS, AED, CPR",
        "No suction machine is available. Ensure one is provided",
        "Provide OPA",
        "Provide new waste bins as current ones are faulty",
        "Provide temperature monitor for fridge and ensure segregation of drugs and food items",
        "Ensure clinical audits are performed",
        "Review clinical protocols",
        "Provide a washroom in the first aid post",
        "Provide portable radios",
        "Provide a digital health management system to manage confidentiality issues",
        "Liaise for lockers for nurses to keep their belongings",
        "Provide a microwave for the post",
    ],
    "ODD": [
        "Ensure document control for ambulance checklist is controlled",
        "Conduct checks on AED at Admin to ensure it is functional",
        "Expiry date for AED pads is January 2027. Make provision for a new set",
        "Request attendance sheets for SHE Day Briefs which include nurses",
        "Provide thermometer for fridge",
        "AC was observed leaking. Ensure it is fixed and repaired",
        "Develop a removal checklist for items in the ambulance",
        "Develop a system for documenting ambulance post-transport cleaning and waste disposal",
        "Ensure oxygen cylinders for both the post and ambulance are refilled when empty",
        "Provide lockers and microwaves",
        "Space is congested in the first aid post. Make arrangements for expansion",
        "Provide a digital health management system to manage confidentiality issues",
        "Provide adequate lighting around the post especially at night",
        "Provide smoke detectors in the post",
        "Floor boards are weak and require replacement",
    ],
}


# ---------------------------------------------------------------- protocol parsing
def parse_protocol():
    """Return [(section_title, [(id, criterion), ...]), ...] for sections A-G."""
    sections = []
    subtitle = {}
    for line in PROTOCOL.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("SECTION "):
            sections.append([line, []])
            continue
        sub = re.match(r"^([A-G]1)\. (.+)$", line)
        if sub:
            subtitle[sub.group(1)] = sub.group(2)
            continue
        crit = re.match(r"^([A-G]\d\.\d+)\t(.+?)\t☐Yes", line)
        if crit:
            sections[-1][1].append((crit.group(1), crit.group(2).strip()))
    result = []
    for title, items in sections:
        if not items:
            continue
        group = items[0][0].split(".")[0]
        if group in subtitle:
            title = f"{title}  ({group}. {subtitle[group]})"
        result.append((title, items))
    return result


# ---------------------------------------------------------------- helpers
def risk_formula(row):
    f = f"F{row}"
    return (
        f'=IF({f}="","",IF({f}="Major NC","Critical",IF({f}="Minor NC","Medium",'
        f'IF(OR({f}="OFI",{f}="OBS"),"Low","None"))))'
    )


def style_header(ws, row, headers, start_col=1):
    for i, text in enumerate(headers):
        c = ws.cell(row=row, column=start_col + i, value=text)
        c.fill = DARK
        c.font = WHITE_BOLD
        c.alignment = Alignment(wrap_text=True, vertical="center")
        c.border = BOX


def style_body(ws, row, first_col, last_col):
    for col in range(first_col, last_col + 1):
        c = ws.cell(row=row, column=col)
        c.alignment = WRAP
        c.border = BOX


def table_title(ws, row, text):
    c = ws.cell(row=row, column=1, value=text)
    c.font = SUBTITLE
    return row + 1


def list_validation(options):
    dv = DataValidation(type="list", formula1='"' + ",".join(options) + '"', allow_blank=True)
    dv.error = "Choose a value from the list."
    dv.errorTitle = "Invalid entry"
    return dv


def mark_draft(ws, row, cols):
    for col in cols:
        ws.cell(row=row, column=col).fill = DRAFT


# ---------------------------------------------------------------- post sheet
def build_post_sheet(wb, post, sections):
    ws = wb.create_sheet(post)
    for i, w in enumerate(MAIN_WIDTHS, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    ws["A1"] = f"{post} First Aid Post & Ambulance Audit Checklist"
    ws["A1"].font = TITLE
    ws["A2"] = (
        "Response, Classification and Status are dropdowns. Risk fills in automatically from "
        "Classification. Yellow cells are draft text written from the audit notes: check them "
        "against your ticked checklist and evidence before use."
    )
    ws["A2"].alignment = WRAP
    ws.merge_cells("A2:L2")
    ws.row_dimensions[2].height = 32

    header_row = 4
    style_header(ws, header_row, MAIN_HEADERS)
    ws.freeze_panes = ws.cell(row=header_row + 1, column=3)

    dv_resp = list_validation(RESPONSES)
    dv_cls = list_validation(CLASSIFICATIONS)
    dv_risk = list_validation(RISKS)
    dv_status = list_validation(STATUSES)
    dv_ok = list_validation(["OK", "Not OK", "N/A"])
    dv_yesno = list_validation(["Yes", "No"])
    dv_overall = list_validation(OVERALL_STATUSES)
    for dv in (dv_resp, dv_cls, dv_risk, dv_status, dv_ok, dv_yesno, dv_overall):
        ws.add_data_validation(dv)

    drafts = {f["id"]: f for f in FINDINGS.get(post, [])}

    row = header_row + 1
    crit_start = row
    for title, items in sections:
        ws.cell(row=row, column=1, value=title).font = BOLD
        for col in range(1, len(MAIN_HEADERS) + 1):
            ws.cell(row=row, column=col).fill = SECTION
            ws.cell(row=row, column=col).border = BOX
        row += 1
        for cid, text in items:
            ws.cell(row=row, column=1, value=cid)
            ws.cell(row=row, column=2, value=text)
            ws.cell(row=row, column=7, value=risk_formula(row))
            style_body(ws, row, 1, len(MAIN_HEADERS))
            d = drafts.get(cid)
            if d:
                ws.cell(row=row, column=3, value=d.get("response", "No") or None)
                ws.cell(row=row, column=4, value=d["evidence"])
                ws.cell(row=row, column=5, value=d["finding"])
                ws.cell(row=row, column=6, value=d["cls"])
                ws.cell(row=row, column=8, value=d["action"])
                ws.cell(row=row, column=11, value="Open")
                ws.cell(row=row, column=12, value="\n".join(f"- {n}" for n in d["notes"]))
                mark_draft(ws, row, [3, 4, 5, 6, 8, 11, 12])
            row += 1
    crit_end = row - 1
    dv_resp.add(f"C{crit_start}:C{crit_end}")
    dv_cls.add(f"F{crit_start}:F{crit_end}")
    dv_status.add(f"K{crit_start}:K{crit_end}")

    # ---- A2 evidence sources
    row += 1
    row = table_title(ws, row, "A2. Audit evidence sources")
    style_header(ws, row, ["Evidence source", "Reviewed?", "Comments / reference"], start_col=2)
    row += 1
    first = row
    for src in [
        "Policies / SOPs", "Staff roster / duty schedule", "Training records",
        "Clinical records / registers", "Drug / controlled medicine records",
        "Equipment checklists", "Ambulance readiness records", "Emergency drill reports",
        "Referral / transfer records", "Incident / near-miss reports",
    ]:
        ws.cell(row=row, column=2, value=src)
        style_body(ws, row, 2, 4)
        row += 1
    dv_yesno.add(f"C{first}:C{row - 1}")

    # ---- B2 activity data
    row += 1
    row = table_title(ws, row, "B2. Activity data to review")
    style_header(ws, row, ["Indicator", "Previous 3 months", "Current 3 months", "Comment"], start_col=2)
    row += 1
    for ind in [
        "Total first-aid presentations", "Occupational injuries", "Medical/non-occupational cases",
        "Emergency referrals", "Ambulance transfers", "Cardiac arrest/AED events",
        "Heat-related cases", "Major trauma cases", "Repeat presentations",
    ]:
        ws.cell(row=row, column=2, value=ind)
        style_body(ws, row, 2, 5)
        row += 1

    # ---- D2 response times
    row += 1
    row = table_title(ws, row, "D2. Response-time audit (enter times as hh:mm; total calculates automatically)")
    style_header(
        ws, row,
        ["Event / case", "Call received", "Team/ambulance arrival", "Departure scene",
         "Hospital arrival", "Handover complete", "Total time"],
        start_col=2,
    )
    row += 1
    for case in ["Case 1", "Case 2", "Case 3", "Drill"]:
        ws.cell(row=row, column=2, value=case)
        for col in range(3, 8):
            ws.cell(row=row, column=col).number_format = "hh:mm"
        total = ws.cell(row=row, column=8, value=f'=IF(OR(C{row}="",G{row}=""),"",MOD(G{row}-C{row},1))')
        total.number_format = "[h]:mm"
        style_body(ws, row, 2, 8)
        row += 1

    # ---- E2 sample records
    row += 1
    row = table_title(ws, row, "E2. Sample records reviewed")
    style_header(ws, row, ["Record type", "Sample size", "Issues noted"], start_col=2)
    row += 1
    for rec in [
        "First-aid presentations", "Occupational injury cases", "Emergency referrals",
        "Ambulance transfers", "Medication records", "Incident/near-miss reports",
    ]:
        ws.cell(row=row, column=2, value=rec)
        style_body(ws, row, 2, 4)
        row += 1

    # ---- G2 ambulance spot checks
    row += 1
    row = table_title(ws, row, "G2. Ambulance daily readiness spot-checks")
    style_header(ws, row, ["Check", "Result", "Comments"], start_col=2)
    row += 1
    first = row
    for chk in [
        "Fuel / vehicle status", "Oxygen / cylinder pressure", "AED / monitor", "Suction",
        "Airway / BVM", "Trauma kit", "Medicines / expiry", "Stretcher / restraints",
        "Communication", "PPE / infection control",
    ]:
        ws.cell(row=row, column=2, value=chk)
        style_body(ws, row, 2, 4)
        row += 1
    dv_ok.add(f"C{first}:C{row - 1}")

    # ---- H1 findings without a direct criterion
    row += 1
    row = table_title(ws, row, "H1. Opportunities for improvement / findings not covered by a checklist item")
    style_header(
        ws, row,
        ["No.", "Finding / opportunity", "Linked criterion / reference", "Evidence",
         "Recommendation", "Classification", "Risk", "Responsible person", "Target date",
         "Status", "", "Original auditor note"],
    )
    row += 1
    h1_start = row
    items = H1_ITEMS.get(post, [])
    for n in range(1, 9):
        ws.cell(row=row, column=1, value=n)
        ws.cell(row=row, column=7, value=risk_formula(row))
        style_body(ws, row, 1, 12)
        if n <= len(items):
            it = items[n - 1]
            ws.cell(row=row, column=2, value=it["finding"])
            ws.cell(row=row, column=3, value=it["ref"])
            ws.cell(row=row, column=4, value=it["evidence"])
            ws.cell(row=row, column=5, value=it["recommendation"])
            ws.cell(row=row, column=6, value=it["cls"])
            ws.cell(row=row, column=10, value="Open")
            ws.cell(row=row, column=12, value="\n".join(f"- {x}" for x in it["notes"]))
            mark_draft(ws, row, [2, 3, 4, 5, 6, 10, 12])
        row += 1
    h1_end = row - 1
    dv_cls.add(f"F{h1_start}:F{h1_end}")
    dv_status.add(f"J{h1_start}:J{h1_end}")

    # ---- H2 good practices
    row += 1
    row = table_title(ws, row, "H2. Good practices deserving recognition / sharing")
    style_header(
        ws, row,
        ["No.", "Good practice", "Evidence / example", "Why it is valuable", "Potential for replication"],
    )
    row += 1
    h2_start = row
    for n in range(1, 6):
        ws.cell(row=row, column=1, value=n)
        style_body(ws, row, 1, 5)
        row += 1
    h2_end = row - 1

    # ---- H3 other issues
    row += 1
    row = table_title(ws, row, "H3. Other issues requiring resolution (facilities, welfare, fire safety)")
    style_header(
        ws, row,
        ["No.", "Issue", "Potential consequence", "Interim control", "Responsible person",
         "Classification", "Risk", "Target date", "Status", "", "", "Original auditor note"],
    )
    row += 1
    h3_start = row
    items = H3_ITEMS.get(post, [])
    for n in range(1, 9):
        ws.cell(row=row, column=1, value=n)
        ws.cell(row=row, column=7, value=risk_formula(row))
        style_body(ws, row, 1, 12)
        if n <= len(items):
            it = items[n - 1]
            ws.cell(row=row, column=2, value=it["issue"])
            ws.cell(row=row, column=3, value=it["consequence"])
            ws.cell(row=row, column=4, value=it["interim"] or None)
            ws.cell(row=row, column=6, value=it["cls"])
            ws.cell(row=row, column=9, value="Open")
            ws.cell(row=row, column=12, value="\n".join(f"- {x}" for x in it["notes"]))
            mark_draft(ws, row, [2, 3, 4, 6, 9, 12])
        row += 1
    h3_end = row - 1
    dv_cls.add(f"F{h3_start}:F{h3_end}")
    dv_status.add(f"I{h3_start}:I{h3_end}")

    # ---- I1 summary by risk (auto)
    row += 1
    row = table_title(ws, row, "I1. Summary of findings by risk (calculated)")
    style_header(ws, row, ["Risk rating", "Number of findings", "Examples / reference numbers"], start_col=2)
    row += 1
    for risk in RISKS:
        ws.cell(row=row, column=2, value=risk.upper())
        ws.cell(row=row, column=3, value=f'=COUNTIF(G:G,"{risk}")')
        style_body(ws, row, 2, 4)
        row += 1
    ws.cell(row=row, column=2, value="Good practices")
    ws.cell(row=row, column=3, value=f"=COUNTA(B{h2_start}:B{h2_end})")
    style_body(ws, row, 2, 4)
    row += 1

    # ---- I2 priority action plan
    row += 1
    row = table_title(ws, row, "I2. Priority corrective action plan")
    style_header(
        ws, row,
        ["Priority", "Finding", "Required action", "Responsible person", "Target completion",
         "Close-out evidence", "Closed?"],
    )
    row += 1
    first = row
    for n in range(1, 8):
        ws.cell(row=row, column=1, value=n)
        style_body(ws, row, 1, 7)
        row += 1
    dv_yesno.add(f"G{first}:G{row - 1}")

    # ---- I3 conclusion
    row += 1
    row = table_title(ws, row, "I3. Overall auditor conclusion")
    status_row = row
    for label in ["Overall status", "Key strengths", "Key risks requiring management attention", "Overall recommendation"]:
        ws.cell(row=row, column=2, value=label).font = BOLD
        ws.merge_cells(start_row=row, start_column=3, end_row=row, end_column=8)
        style_body(ws, row, 2, 8)
        if label != "Overall status":
            ws.row_dimensions[row].height = 60
        row += 1
    dv_overall.add(f"C{status_row}")

    # ---- I4 sign-off
    row += 1
    row = table_title(ws, row, "I4. Sign-off")
    style_header(ws, row, ["Role", "Name", "Signature", "Date"], start_col=2)
    row += 1
    for role in [
        "Lead Auditor", "Occupational Health / Medical Lead", "First Aid Post / Clinic Lead",
        "HSE Representative", "Mine Management Representative",
    ]:
        ws.cell(row=row, column=2, value=role)
        style_body(ws, row, 2, 5)
        row += 1

    # ---- conditional colours
    last = row
    for value, fill in [("Major NC", RED), ("Minor NC", ORANGE), ("OFI", BLUE), ("OBS", PURPLE), ("C", GREEN)]:
        ws.conditional_formatting.add(f"F5:F{last}", CellIsRule(operator="equal", formula=[f'"{value}"'], fill=fill))
    for value, fill in [("Critical", RED), ("Medium", ORANGE), ("Low", BLUE)]:
        ws.conditional_formatting.add(f"G5:G{last}", CellIsRule(operator="equal", formula=[f'"{value}"'], fill=fill))
    for value, fill in [("Yes", GREEN), ("No", RED), ("OK", GREEN), ("Not OK", RED)]:
        ws.conditional_formatting.add(f"C5:C{last}", CellIsRule(operator="equal", formula=[f'"{value}"'], fill=fill))

    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = f"{header_row}:{header_row}"

    return dict(
        crit_start=crit_start,
        crit_end=crit_end,
        h1_start=h1_start,
        h1_end=h1_end,
        h2_start=h2_start,
        h2_end=h2_end,
        h3_start=h3_start,
        h3_end=h3_end,
        status_row=status_row,
    )


# ---------------------------------------------------------------- other sheets
def build_instructions(wb):
    ws = wb.active
    ws.title = "Instructions"
    ws.column_dimensions["A"].width = 28
    ws.column_dimensions["B"].width = 70
    ws.column_dimensions["C"].width = 22
    ws.column_dimensions["D"].width = 45

    ws["A1"] = "First Aid Post & Ambulance Audit Workbook"
    ws["A1"].font = TITLE
    ws["A3"] = "Central question"
    ws["A3"].font = BOLD
    ws["B3"] = (
        "If a serious injury or acute medical emergency occurs anywhere on this mine site today, "
        "can this system recognize it, stabilize the patient, evacuate them safely and rapidly, "
        "and deliver them to the right level of definitive care?"
    )
    ws["A4"] = "Posts audited"
    ws["A4"].font = BOLD
    ws["B4"] = ", ".join(POSTS)

    rows = [
        ("How to use", ""),
        ("1. Audit Details", "Fill in site, date, auditors, shift and ambulance numbers for each post."),
        ("2. Post sheets", "One sheet per post (ODD, STP, KMS, GCS). For each criterion choose Yes / No / N/A, then record the evidence you saw, the finding, the classification and the corrective action."),
        ("3. One row per criterion", "If you have several findings for one criterion, list them in the same cell and choose the most severe classification."),
        ("4. Findings with no criterion", "Use H1 for findings that don't match a checklist item, and H3 for facility, welfare and fire-safety issues."),
        ("5. Summary", "Compliance scores and finding counts calculate automatically from the post sheets."),
        ("6. Findings", "Side-by-side findings for every post: checklist criteria plus H1 / H2 / H3 slots. Response / Finding / Classification columns per post. Cross-site marks checklist Nos at ≥2 posts, or H items filled at ≥2 posts. Edit on the post sheets only — this sheet is formula-linked."),
        ("7. Actions", "Live register of corrective actions pulled by formula from each post sheet (checklist H, H1 recommendations, H3 interim controls). Edit actions on the post sheets only — this sheet updates automatically. Use the filter to hide blank rows."),
        ("8. Note Mapping", "Shows where each original audit note was placed, so nothing is lost."),
        ("Yellow cells", "Draft text written from the KMS and ODD audit notes. Check each against your ticked checklist and evidence; overwrite as needed and clear the yellow fill once confirmed."),
        ("[Confirm] in Evidence", "The note implied this evidence but did not state it. Replace with what you actually saw (document, record, observation)."),
        ("Risk column", "Calculated from Classification (Major NC = Critical, Minor NC = Medium, OFI/OBS = Low). Do not type over it."),
    ]
    r = 6
    for a, b in rows:
        ws.cell(row=r, column=1, value=a).font = BOLD
        ws.cell(row=r, column=2, value=b)
        r += 1

    r += 1
    ws.cell(row=r, column=1, value="Classification definitions").font = SUBTITLE
    r += 1
    style_header(ws, r, ["Classification", "Meaning", "Risk (report scale)", "Action required"])
    r += 1
    defs = [
        ("Major NC", "A significant failure to meet one or more requirements of ISO 45001:2018 or a systemic breakdown of the management system that seriously affects its ability to achieve intended results, or where there is a high risk to workers' health and safety.", "Critical", "Immediate corrective action is required and may require follow-up verification.", RED),
        ("Minor NC", "An isolated failure to meet a requirement of ISO 45001:2018 or the organization's management system that does not indicate a systemic breakdown or significantly affect the achievement of intended outcomes.", "Medium", "Corrective action is required.", ORANGE),
        ("OFI", "Opportunity for Improvement. The requirement is met, but there is potential to improve effectiveness, efficiency, or maturity of the management system. This is not a non-conformity.", "Low", "Improvement is recommended but not mandatory.", BLUE),
        ("OBS", "Observation. A condition or trend that currently complies with ISO 45001 requirements but, if left unaddressed, could develop into a non-conformity. It serves as an early warning.", "Low", "Monitoring or preventive action is recommended.", PURPLE),
        ("C", "Conformance. Objective evidence demonstrates that the requirement of ISO 45001:2018 and the organization's documented management system has been fully implemented and is effective.", "None", "No action required.", GREEN),
    ]
    for code, meaning, risk, action, fill in defs:
        for col, val in enumerate([code, meaning, risk, action], start=1):
            ws.cell(row=r, column=col, value=val)
        style_body(ws, r, 1, 4)
        ws.cell(row=r, column=1).fill = fill
        r += 1

    for row in ws.iter_rows(min_row=3, max_row=r, max_col=4):
        for c in row:
            c.alignment = WRAP


def build_audit_details(wb):
    ws = wb.create_sheet("Audit Details")
    ws["A1"] = "Audit details"
    ws["A1"].font = TITLE
    ws.column_dimensions["A"].width = 34
    style_header(ws, 3, ["Field"] + POSTS)
    fields = [
        "Site / Location", "First Aid Post / Station", "Audit Date", "Lead Auditor", "Auditors",
        "Shift / Coverage Audited", "Staff on Duty", "Ambulance(s) Audited (Unit No.)",
    ]
    dv = list_validation(["Day", "Night", "24-hour", "Other"])
    ws.add_data_validation(dv)
    for i, field in enumerate(fields, start=4):
        ws.cell(row=i, column=1, value=field).font = BOLD
        style_body(ws, i, 1, 1 + len(POSTS))
        if field == "First Aid Post / Station":
            for j, post in enumerate(POSTS, start=2):
                ws.cell(row=i, column=j, value=post)
        if field == "Audit Date":
            for j in range(2, 2 + len(POSTS)):
                ws.cell(row=i, column=j).number_format = "dd-mmm-yyyy"
        if field == "Shift / Coverage Audited":
            dv.add(f"B{i}:{ws.cell(row=i, column=1 + len(POSTS)).column_letter}{i}")
    for j in range(2, 2 + len(POSTS)):
        ws.column_dimensions[ws.cell(row=1, column=j).column_letter].width = 28


def build_summary(wb, sections, layout):
    ws = wb.create_sheet("Summary", 2)
    ws["A1"] = "Audit summary (calculated - do not type in this sheet)"
    ws["A1"].font = TITLE
    ws.column_dimensions["A"].width = 52

    cs, ce = layout["crit_start"], layout["crit_end"]

    ws["A3"] = "Compliance by section = Yes / (Yes + No). N/A is excluded."
    ws["A3"].font = SUBTITLE
    sub = ["Yes", "No", "N/A", "Not answered", "Compliance"]
    style_header(ws, 4, [""] * (1 + len(POSTS) * len(sub)))
    style_header(ws, 5, ["Section"])
    for p, post in enumerate(POSTS):
        col = 2 + p * len(sub)
        style_header(ws, 5, sub, start_col=col)
        ws.cell(row=4, column=col, value=post).alignment = Alignment(horizontal="center")
        ws.merge_cells(start_row=4, start_column=col, end_row=4, end_column=col + len(sub) - 1)

    r = 6
    first_section_row = r
    for title, items in sections:
        letter = items[0][0][0]
        ws.cell(row=r, column=1, value=title.split("  (")[0])
        for p, post in enumerate(POSTS):
            col = 2 + p * len(sub)
            ids = f"'{post}'!$A${cs}:$A${ce}"
            resp = f"'{post}'!$C${cs}:$C${ce}"
            for k, val in enumerate(["Yes", "No", "N/A"]):
                ws.cell(row=r, column=col + k, value=f'=COUNTIFS({ids},"{letter}*",{resp},"{val}")')
            ws.cell(row=r, column=col + 3, value=f'=COUNTIFS({ids},"{letter}*",{resp},"")')
            y = ws.cell(row=r, column=col).coordinate
            n = ws.cell(row=r, column=col + 1).coordinate
            pct = ws.cell(row=r, column=col + 4, value=f'=IF({y}+{n}=0,"",{y}/({y}+{n}))')
            pct.number_format = "0%"
        style_body(ws, r, 1, 1 + len(POSTS) * len(sub))
        r += 1
    last_section_row = r - 1
    ws.cell(row=r, column=1, value="OVERALL").font = BOLD
    for p in range(len(POSTS)):
        col = 2 + p * len(sub)
        for k in range(4):
            letter = ws.cell(row=r, column=col + k).column_letter
            ws.cell(row=r, column=col + k, value=f"=SUM({letter}{first_section_row}:{letter}{last_section_row})").font = BOLD
        y = ws.cell(row=r, column=col).coordinate
        n = ws.cell(row=r, column=col + 1).coordinate
        pct = ws.cell(row=r, column=col + 4, value=f'=IF({y}+{n}=0,"",{y}/({y}+{n}))')
        pct.number_format = "0%"
        pct.font = BOLD
    style_body(ws, r, 1, 1 + len(POSTS) * len(sub))
    r += 2

    ws.cell(row=r, column=1, value="Findings by classification (checklist + H1 + H3)").font = SUBTITLE
    r += 1
    style_header(ws, r, ["Classification"] + POSTS + ["Total"])
    r += 1
    for cls in CLASSIFICATIONS:
        ws.cell(row=r, column=1, value=cls)
        for p, post in enumerate(POSTS, start=2):
            ws.cell(row=r, column=p, value=f"=COUNTIF('{post}'!F:F,\"{cls}\")")
        ws.cell(row=r, column=2 + len(POSTS), value=f"=SUM(B{r}:{ws.cell(row=r, column=1 + len(POSTS)).column_letter}{r})")
        style_body(ws, r, 1, 2 + len(POSTS))
        r += 1
    r += 1

    ws.cell(row=r, column=1, value="Findings by risk").font = SUBTITLE
    r += 1
    style_header(ws, r, ["Risk"] + POSTS + ["Total"])
    r += 1
    for risk in RISKS:
        ws.cell(row=r, column=1, value=risk)
        for p, post in enumerate(POSTS, start=2):
            ws.cell(row=r, column=p, value=f"=COUNTIF('{post}'!G:G,\"{risk}\")")
        ws.cell(row=r, column=2 + len(POSTS), value=f"=SUM(B{r}:{ws.cell(row=r, column=1 + len(POSTS)).column_letter}{r})")
        style_body(ws, r, 1, 2 + len(POSTS))
        r += 1
    ws.cell(row=r, column=1, value="Good practices recorded (H2)")
    for p, post in enumerate(POSTS, start=2):
        ws.cell(row=r, column=p, value=f"=COUNTA('{post}'!B{layout['h2_start']}:B{layout['h2_end']})")
    ws.cell(row=r, column=2 + len(POSTS), value=f"=SUM(B{r}:{ws.cell(row=r, column=1 + len(POSTS)).column_letter}{r})")
    style_body(ws, r, 1, 2 + len(POSTS))
    r += 2

    ws.cell(row=r, column=1, value="Overall status (from section I3 of each post sheet)").font = SUBTITLE
    r += 1
    style_header(ws, r, ["Post", "Overall status"])
    r += 1
    for post in POSTS:
        ws.cell(row=r, column=1, value=post)
        ws.cell(row=r, column=2, value=f"=IF('{post}'!C{layout['status_row']}=\"\",\"\",'{post}'!C{layout['status_row']})")
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
        style_body(ws, r, 1, 6)
        r += 1

    for col in range(2, 2 + len(POSTS) * len(sub)):
        ws.column_dimensions[ws.cell(row=1, column=col).column_letter].width = 11
    ws.freeze_panes = "B6"


CRITERION_ID_RE = re.compile(r"^[A-G]\d+\.\d+$")

ACTIONS_HEADERS = [
    "Post",
    "Ref",
    "Finding",
    "Classification",
    "Risk",
    "Corrective action",
    "Owner",
    "Target date",
    "Status",
    "Close-out evidence",
]
ACTIONS_WIDTHS = [8, 10, 60, 14, 10, 55, 18, 13, 12, 40]


def _cell(post: str, col: str, row: int) -> str:
    return f"'{post}'!{col}{row}"


def _if_filled(gate: str, value_expr: str) -> str:
    return f'=IF({gate}="","",{value_expr})'


def _actions_source_rows(ws, layout: dict) -> list[tuple[str, int, dict[str, str]]]:
    """Map post-sheet rows to Actions columns. Keys are Actions field names → sheet col letters."""
    sources: list[tuple[str, int, dict[str, str]]] = []
    for row in range(layout["crit_start"], layout["crit_end"] + 1):
        cid = ws.cell(row=row, column=1).value
        if not (isinstance(cid, str) and CRITERION_ID_RE.match(cid)):
            continue
        # Checklist: action H, finding E, owner I, target J, status K
        sources.append(
            (
                "checklist",
                row,
                {
                    "gate": "H",
                    "ref": "A",
                    "finding": "E",
                    "classification": "F",
                    "risk": "G",
                    "action": "H",
                    "owner": "I",
                    "target": "J",
                    "status": "K",
                },
            )
        )
    for row in range(layout["h1_start"], layout["h1_end"] + 1):
        # H1: recommendation E, finding B, owner H, target I, status J
        sources.append(
            (
                "h1",
                row,
                {
                    "gate": "E",
                    "ref": "A",
                    "finding": "B",
                    "classification": "F",
                    "risk": "G",
                    "action": "E",
                    "owner": "H",
                    "target": "I",
                    "status": "J",
                },
            )
        )
    for row in range(layout["h3_start"], layout["h3_end"] + 1):
        # H3: interim control D, issue B, owner E, target H, status I
        sources.append(
            (
                "h3",
                row,
                {
                    "gate": "D",
                    "ref": "A",
                    "finding": "B",
                    "classification": "F",
                    "risk": "G",
                    "action": "D",
                    "owner": "E",
                    "target": "H",
                    "status": "I",
                },
            )
        )
    return sources


def _criterion_rows(wb, layout: dict) -> list[tuple[str, str, int]]:
    """(id, criterion text, row) for checklist items on the first post sheet."""
    ws = wb[POSTS[0]]
    rows: list[tuple[str, str, int]] = []
    for row in range(layout["crit_start"], layout["crit_end"] + 1):
        cid = ws.cell(row=row, column=1).value
        if isinstance(cid, str) and CRITERION_ID_RE.match(cid):
            text = ws.cell(row=row, column=2).value
            rows.append((cid, text if isinstance(text, str) else "", row))
    return rows


def _write_findings_matrix_row(
    ws,
    out: int,
    headers_len: int,
    rid: str,
    label: str,
    *,
    # per-post (response_col, finding_col, class_col, src_row) — None skips that post's formulas
    post_refs: list[tuple[str | None, str | None, str | None, int | None]],
    theme_on_no: bool,
) -> int:
    ws.cell(row=out, column=1, value=rid)
    ws.cell(row=out, column=2, value=label)
    resp_coords: list[str] = []
    finding_coords: list[str] = []
    for p, post in enumerate(POSTS):
        base = 3 + p * 3
        resp_col, finding_col, class_col, src_row = post_refs[p]
        if src_row is None:
            resp = ws.cell(row=out, column=base, value=None)
            find = ws.cell(row=out, column=base + 1, value=None)
            ws.cell(row=out, column=base + 2, value=None)
        else:
            resp = ws.cell(
                row=out,
                column=base,
                value=f"={_cell(post, resp_col, src_row)}" if resp_col else None,
            )
            find = ws.cell(
                row=out,
                column=base + 1,
                value=f"={_cell(post, finding_col, src_row)}" if finding_col else None,
            )
            ws.cell(
                row=out,
                column=base + 2,
                value=f"={_cell(post, class_col, src_row)}" if class_col else None,
            )
        resp_coords.append(resp.coordinate)
        finding_coords.append(find.coordinate)

    finding_count = ws.cell(
        row=out,
        column=4 + len(POSTS) * 3,
        value="=" + "+".join(f'IF({c}="","",1)' for c in finding_coords),
    )
    if theme_on_no:
        no_count = ws.cell(
            row=out,
            column=3 + len(POSTS) * 3,
            value="=" + "+".join(f'IF({c}="No",1,0)' for c in resp_coords),
        )
        ws.cell(
            row=out,
            column=5 + len(POSTS) * 3,
            value=f'=IF({no_count.coordinate}>=2,"Theme","")',
        )
    else:
        ws.cell(row=out, column=3 + len(POSTS) * 3, value=None)
        ws.cell(
            row=out,
            column=5 + len(POSTS) * 3,
            value=f'=IF({finding_count.coordinate}>=2,"Theme","")',
        )
    style_body(ws, out, 1, headers_len)
    return out + 1


def _findings_section_row(ws, out: int, headers_len: int, title: str) -> int:
    ws.cell(row=out, column=1, value=title).font = BOLD
    for col in range(1, headers_len + 1):
        ws.cell(row=out, column=col).fill = SECTION
        ws.cell(row=out, column=col).border = BOX
    return out + 1


def build_findings(wb, layouts: list[dict]):
    """Side-by-side findings matrix: checklist + H1/H2/H3, Response/Finding/Class per post."""
    if "Findings" in wb.sheetnames:
        del wb["Findings"]
    # Place after the last post sheet (before Actions / Note Mapping when present)
    post_indexes = [wb.sheetnames.index(p) for p in POSTS if p in wb.sheetnames]
    if post_indexes:
        idx = max(post_indexes) + 1
    elif "Actions" in wb.sheetnames:
        idx = wb.sheetnames.index("Actions")
    elif "Note Mapping" in wb.sheetnames:
        idx = wb.sheetnames.index("Note Mapping")
    else:
        idx = len(wb.sheetnames)
    ws = wb.create_sheet("Findings", idx)

    criteria = _criterion_rows(wb, layouts[0])
    # Fixed columns + 3 per post + theme helpers
    headers = ["ID", "Audit criterion"]
    for post in POSTS:
        headers.extend([f"{post} Response", f"{post} Finding", f"{post} Classification"])
    headers.extend(["No count", "Finding count", "Cross-site"])

    ws.column_dimensions["A"].width = 8
    ws.column_dimensions["B"].width = 48
    for i in range(3, 3 + len(POSTS) * 3):
        # Response / Classification narrow; Finding wider
        offset = (i - 3) % 3
        ws.column_dimensions[get_column_letter(i)].width = 36 if offset == 1 else 12
    for i, width in enumerate([10, 12, 12]):
        ws.column_dimensions[get_column_letter(3 + len(POSTS) * 3 + i)].width = width

    ws["A1"] = "Findings across posts (live from post sheets)"
    ws["A1"].font = TITLE
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
    ws["A2"] = (
        "Do not type here. Edit on the post sheets. Checklist Cross-site = Theme when ≥2 posts answered No; "
        "H1/H2/H3 Cross-site = Theme when ≥2 posts have text in that slot (aligned by item number)."
    )
    ws["A2"].alignment = WRAP
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers))
    ws.row_dimensions[2].height = 40

    header_row = 3
    style_header(ws, header_row, headers)
    ws.freeze_panes = "C4"

    # Checklist IDs must match across posts; row numbers may differ so resolve per post.
    id_to_row: dict[str, list[int | None]] = {cid: [] for cid, _, _ in criteria}
    for layout in layouts:
        by_id = {cid: row for cid, _, row in _criterion_rows(wb, layout)}
        for cid in id_to_row:
            id_to_row[cid].append(by_id.get(cid))

    out = header_row + 1
    out = _findings_section_row(ws, out, len(headers), "Checklist")
    for cid, text, _ in criteria:
        refs = [("C", "E", "F", row) for row in id_to_row[cid]]
        out = _write_findings_matrix_row(
            ws, out, len(headers), cid, text, post_refs=refs, theme_on_no=True
        )

    def h_slot_refs(
        start_key: str,
        end_key: str,
        resp: str | None,
        finding: str | None,
        cls: str | None,
    ) -> list[list[tuple[str | None, str | None, str | None, int | None]]]:
        counts = [lay[end_key] - lay[start_key] + 1 for lay in layouts]
        max_n = max(counts) if counts else 0
        slots: list[list[tuple[str | None, str | None, str | None, int | None]]] = []
        for i in range(max_n):
            refs: list[tuple[str | None, str | None, str | None, int | None]] = []
            for lay in layouts:
                src = lay[start_key] + i
                if src <= lay[end_key]:
                    refs.append((resp, finding, cls, src))
                else:
                    refs.append((None, None, None, None))
            slots.append(refs)
        return slots

    # H1: Response = linked ref (C), Finding = B, Classification = F
    out = _findings_section_row(ws, out, len(headers), "H1. Opportunities / findings not on the checklist")
    for i, refs in enumerate(h_slot_refs("h1_start", "h1_end", "C", "B", "F"), start=1):
        out = _write_findings_matrix_row(
            ws, out, len(headers), f"H1-{i}", f"H1 item {i}", post_refs=refs, theme_on_no=False
        )

    # H2: Finding = practice (B); no response/classification
    out = _findings_section_row(ws, out, len(headers), "H2. Good practices")
    for i, refs in enumerate(h_slot_refs("h2_start", "h2_end", None, "B", None), start=1):
        out = _write_findings_matrix_row(
            ws,
            out,
            len(headers),
            f"H2-{i}",
            f"H2 good practice {i}",
            post_refs=refs,
            theme_on_no=False,
        )

    # H3: Finding = issue (B), Classification = F
    out = _findings_section_row(ws, out, len(headers), "H3. Other issues (facilities, welfare, fire safety)")
    for i, refs in enumerate(h_slot_refs("h3_start", "h3_end", None, "B", "F"), start=1):
        out = _write_findings_matrix_row(
            ws, out, len(headers), f"H3-{i}", f"H3 item {i}", post_refs=refs, theme_on_no=False
        )

    last = out - 1
    if last >= header_row + 1:
        last_letter = get_column_letter(len(headers))
        ws.auto_filter.ref = f"A{header_row}:{last_letter}{last}"
        for p in range(len(POSTS)):
            letter = get_column_letter(3 + p * 3 + 2)
            for value, fill in [("Major NC", RED), ("Minor NC", ORANGE), ("OFI", BLUE), ("OBS", PURPLE), ("C", GREEN)]:
                ws.conditional_formatting.add(
                    f"{letter}{header_row + 1}:{letter}{last}",
                    CellIsRule(operator="equal", formula=[f'"{value}"'], fill=fill),
                )
        theme_letter = get_column_letter(len(headers))
        ws.conditional_formatting.add(
            f"{theme_letter}{header_row + 1}:{theme_letter}{last}",
            CellIsRule(operator="equal", formula=['"Theme"'], fill=ORANGE),
        )


def build_actions(wb, layouts: list[dict]):
    """Consolidated Actions sheet linked by formula to each post sheet (no static dump)."""
    if "Actions" in wb.sheetnames:
        del wb["Actions"]
    # Place before Note Mapping when present
    idx = wb.sheetnames.index("Note Mapping") if "Note Mapping" in wb.sheetnames else len(wb.sheetnames)
    ws = wb.create_sheet("Actions", idx)
    for i, w in enumerate(ACTIONS_WIDTHS, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    ws["A1"] = "Corrective actions (live from post sheets)"
    ws["A1"].font = TITLE
    ws.merge_cells("A1:J1")
    ws["A2"] = (
        "Do not type here. Edit Corrective action / Recommendation / Interim control, Owner, "
        "Target date and Status on the post sheets (ODD, STP, KMS, GCS). This register updates "
        "via formulas. Filter the Corrective action column to hide blank rows."
    )
    ws["A2"].alignment = WRAP
    ws.merge_cells("A2:J2")
    ws.row_dimensions[2].height = 40

    header_row = 3
    style_header(ws, header_row, ACTIONS_HEADERS)
    ws.freeze_panes = "A4"

    out = header_row + 1
    for post, layout in zip(POSTS, layouts):
        post_ws = wb[post]
        for kind, src_row, cols in _actions_source_rows(post_ws, layout):
            gate = _cell(post, cols["gate"], src_row)
            if kind == "checklist":
                ref_expr = _cell(post, cols["ref"], src_row)
            elif kind == "h1":
                ref_expr = f'"H1-"&{_cell(post, cols["ref"], src_row)}'
            else:
                ref_expr = f'"H3-"&{_cell(post, cols["ref"], src_row)}'

            values = [
                _if_filled(gate, f'"{post}"'),
                _if_filled(gate, ref_expr),
                _if_filled(gate, _cell(post, cols["finding"], src_row)),
                _if_filled(gate, _cell(post, cols["classification"], src_row)),
                _if_filled(gate, _cell(post, cols["risk"], src_row)),
                _if_filled(gate, _cell(post, cols["action"], src_row)),
                _if_filled(gate, _cell(post, cols["owner"], src_row)),
                _if_filled(gate, _cell(post, cols["target"], src_row)),
                _if_filled(gate, _cell(post, cols["status"], src_row)),
                "",  # close-out evidence is tracked on post I2 / in the app, not on criterion rows
            ]
            for col, val in enumerate(values, start=1):
                ws.cell(row=out, column=col, value=val if val != "" else None)
            style_body(ws, out, 1, len(ACTIONS_HEADERS))
            out += 1

    last = out - 1
    if last >= header_row + 1:
        ws.auto_filter.ref = f"A{header_row}:J{last}"
        for value, fill in [("Major NC", RED), ("Minor NC", ORANGE), ("OFI", BLUE), ("OBS", PURPLE), ("C", GREEN)]:
            ws.conditional_formatting.add(
                f"D{header_row + 1}:D{last}",
                CellIsRule(operator="equal", formula=[f'"{value}"'], fill=fill),
            )
        for value, fill in [("Critical", RED), ("Medium", ORANGE), ("Low", BLUE)]:
            ws.conditional_formatting.add(
                f"E{header_row + 1}:E{last}",
                CellIsRule(operator="equal", formula=[f'"{value}"'], fill=fill),
            )


def build_note_mapping(wb):
    ws = wb.create_sheet("Note Mapping")
    ws["A1"] = "Where each original audit note was placed"
    ws["A1"].font = TITLE
    widths = [8, 6, 60, 22, 16, 70]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w
    style_header(ws, 3, ["Post", "#", "Original note (as written)", "Placed at", "Draft classification", "Draft finding"])
    r = 4
    for post, notes in ORIGINAL_NOTES.items():
        for i, note in enumerate(notes, start=1):
            hits = []
            for f in FINDINGS.get(post, []):
                if note in f["notes"]:
                    hits.append((f["id"], f["cls"], f["finding"]))
            for n, it in enumerate(H1_ITEMS.get(post, []), start=1):
                if note in it["notes"]:
                    hits.append((f"H1 item {n}", it["cls"], it["finding"]))
            for n, it in enumerate(H3_ITEMS.get(post, []), start=1):
                if note in it["notes"]:
                    hits.append((f"H3 item {n}", it["cls"], it["issue"]))
            if not hits:
                raise ValueError(f"Unmapped note for {post}: {note}")
            ws.cell(row=r, column=1, value=post)
            ws.cell(row=r, column=2, value=i)
            ws.cell(row=r, column=3, value=note)
            ws.cell(row=r, column=4, value=", ".join(h[0] for h in hits))
            ws.cell(row=r, column=5, value=" / ".join(dict.fromkeys(h[1] for h in hits)))
            ws.cell(row=r, column=6, value="\n".join(dict.fromkeys(h[2] for h in hits)))
            style_body(ws, r, 1, 6)
            r += 1
    ws.freeze_panes = "A4"
    ws.auto_filter.ref = f"A3:F{r - 1}"


def layouts_from_workbook(wb) -> list[dict]:
    """Recover post layout ranges from an existing workbook (for injecting Actions)."""
    layouts = []
    for post in POSTS:
        ws = wb[post]
        crit_start = None
        crit_end = None
        h1_start = h1_end = h2_start = h2_end = h3_start = h3_end = status_row = None
        for row in range(1, (ws.max_row or 1) + 1):
            a = ws.cell(row=row, column=1).value
            b = ws.cell(row=row, column=2).value
            if isinstance(a, str):
                if CRITERION_ID_RE.match(a):
                    if crit_start is None:
                        crit_start = row
                    crit_end = row
                elif a.startswith("H1."):
                    h1_start = row + 2  # title, header, then data
                elif a.startswith("H2."):
                    # Skip blank spacer above H2 title
                    h1_end = row - 1
                    while h1_end > (h1_start or 0) and ws.cell(row=h1_end, column=1).value in (None, ""):
                        h1_end -= 1
                    h2_start = row + 2
                elif a.startswith("H3."):
                    h2_end = row - 1
                    while h2_end > (h2_start or 0) and ws.cell(row=h2_end, column=1).value in (None, ""):
                        h2_end -= 1
                    h3_start = row + 2
                elif a.startswith("I1."):
                    h3_end = row - 1
                    while h3_end > (h3_start or 0) and ws.cell(row=h3_end, column=1).value in (None, ""):
                        h3_end -= 1
            if isinstance(b, str) and b == "Overall status":
                status_row = row
        required = (crit_start, crit_end, h1_start, h1_end, h2_start, h2_end, h3_start, h3_end)
        if None in required:
            raise ValueError(f"Could not recover layout ranges for post {post}")
        layouts.append(
            dict(
                crit_start=crit_start,
                crit_end=crit_end,
                h1_start=h1_start,
                h1_end=h1_end,
                h2_start=h2_start,
                h2_end=h2_end,
                h3_start=h3_start,
                h3_end=h3_end,
                status_row=status_row,
            )
        )
    return layouts


def _ensure_instruction_rows(ins) -> None:
    """Make sure Instructions lists Findings (6) and Actions (7) with Note Mapping as 8."""
    labels = {
        r: ins.cell(row=r, column=1).value
        for r in range(1, (ins.max_row or 1) + 1)
        if isinstance(ins.cell(row=r, column=1).value, str)
    }
    has_findings = any(str(v).strip() == "6. Findings" for v in labels.values())
    has_actions = any(str(v).strip() in {"6. Actions", "7. Actions"} for v in labels.values())

    summary_row = next((r for r, v in labels.items() if v == "5. Summary"), None)
    if summary_row is None:
        return

    if not has_findings:
        insert_at = summary_row + 1
        ins.insert_rows(insert_at)
        ins.cell(row=insert_at, column=1, value="6. Findings").font = BOLD
        ins.cell(
            row=insert_at,
            column=2,
            value=(
                "Side-by-side findings for every post: checklist criteria plus H1 / H2 / H3 slots. "
                "Response / Finding / Classification columns per post. Cross-site marks checklist Nos "
                "at ≥2 posts, or H items filled at ≥2 posts. Edit on the post sheets only — this sheet is formula-linked."
            ),
        )
        # refresh label map after insert
        labels = {
            r: ins.cell(row=r, column=1).value
            for r in range(1, (ins.max_row or 1) + 1)
            if isinstance(ins.cell(row=r, column=1).value, str)
        }
        has_actions = any(str(v).strip() in {"6. Actions", "7. Actions"} for v in labels.values())

    if not has_actions:
        findings_row = next((r for r, v in labels.items() if str(v).strip() == "6. Findings"), summary_row)
        insert_at = findings_row + 1
        ins.insert_rows(insert_at)
        ins.cell(row=insert_at, column=1, value="7. Actions").font = BOLD
        ins.cell(
            row=insert_at,
            column=2,
            value=(
                "Live register of corrective actions pulled by formula from each post sheet "
                "(checklist H, H1 recommendations, H3 interim controls). Edit actions on the "
                "post sheets only — this sheet updates automatically. Use the filter to hide blank rows."
            ),
        )

    for r in range(1, (ins.max_row or 1) + 1):
        label = ins.cell(row=r, column=1).value
        if label == "6. Actions":
            ins.cell(row=r, column=1, value="7. Actions")
        elif label in {"6. Note Mapping", "7. Note Mapping"}:
            ins.cell(row=r, column=1, value="8. Note Mapping")


def inject_actions_sheet(path: Path) -> None:
    """Add or replace formula Findings + Actions sheets without wiping post data."""
    wb = load_workbook(path)
    layouts = layouts_from_workbook(wb)
    build_findings(wb, layouts)
    build_actions(wb, layouts)
    if "Instructions" in wb.sheetnames:
        _ensure_instruction_rows(wb["Instructions"])
    wb.save(path)


def main(argv: list[str] | None = None):
    global FINDINGS, H1_ITEMS, H3_ITEMS, ORIGINAL_NOTES

    parser = argparse.ArgumentParser(description="Build the FAP audit Excel workbook.")
    parser.add_argument(
        "--empty",
        action="store_true",
        help="Blank template: omit note-seeded draft findings, H1/H3 drafts, and Note Mapping.",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output .xlsx path (default: FAP Audit Workbook.xlsx, or … v1.xlsx with --empty).",
    )
    args = parser.parse_args(argv)

    if args.empty:
        FINDINGS = {}
        H1_ITEMS = {}
        H3_ITEMS = {}
        ORIGINAL_NOTES = {}

    out = args.output or (OUTPUT_EMPTY if args.empty else OUTPUT)
    sections = parse_protocol()
    wb = Workbook()
    build_instructions(wb)
    build_audit_details(wb)
    layouts = [build_post_sheet(wb, post, sections) for post in POSTS]
    build_summary(wb, sections, layouts[0])
    if not args.empty and ORIGINAL_NOTES:
        build_note_mapping(wb)
    build_findings(wb, layouts)
    build_actions(wb, layouts)
    wb.save(out)
    count = sum(len(items) for _, items in sections)
    kind = "empty v1 template" if args.empty else "workbook"
    print(
        f"Saved {out.name} ({kind}): {len(sections)} sections, {count} criteria per post, "
        "Findings + Actions sheets linked by formula."
    )


if __name__ == "__main__":
    main()