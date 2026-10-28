import type { SupplementaryTableSeed } from "./types";

export const SUPPLEMENTARY_TABLES: SupplementaryTableSeed[] = [
  {
    sectionCode: "A",
    code: "A2",
    title: "Audit evidence sources",
    rowHeader: "Evidence source",
    columns: [
      { key: "reviewed", label: "Reviewed?", type: "yesno" },
      { key: "comments", label: "Comments / reference", type: "text" },
    ],
    rows: [
      "Policies / SOPs",
      "Staff roster / duty schedule",
      "Training records",
      "Clinical records / registers",
      "Drug / controlled medicine records",
      "Equipment checklists",
      "Ambulance readiness records",
      "Emergency drill reports",
      "Referral / transfer records",
      "Incident / near-miss reports",
    ],
  },
  {
    sectionCode: "B",
    code: "B2",
    title: "Activity data to review",
    rowHeader: "Indicator",
    columns: [
      { key: "previous", label: "Previous 3 months", type: "number" },
      { key: "current", label: "Current 3 months", type: "number" },
      { key: "comment", label: "Comment", type: "text" },
    ],
    rows: [
      "Total first-aid presentations",
      "Occupational injuries",
      "Medical/non-occupational cases",
      "Emergency referrals",
      "Ambulance transfers",
      "Cardiac arrest/AED events",
      "Heat-related cases",
      "Major trauma cases",
      "Repeat presentations",
    ],
  },
  {
    sectionCode: "D",
    code: "D2",
    title: "Response-time audit",
    rowHeader: "Event / case",
    columns: [
      { key: "callReceived", label: "Call received", type: "time" },
      { key: "teamArrival", label: "Team/ambulance arrival", type: "time" },
      { key: "departScene", label: "Departure scene", type: "time" },
      { key: "hospitalArrival", label: "Hospital arrival", type: "time" },
      { key: "handover", label: "Handover complete", type: "time" },
    ],
    rows: ["Case 1", "Case 2", "Case 3", "Drill"],
  },
  {
    sectionCode: "E",
    code: "E2",
    title: "Sample records reviewed",
    rowHeader: "Record type",
    columns: [
      { key: "sampleSize", label: "Sample size", type: "number" },
      { key: "issues", label: "Issues noted", type: "text" },
    ],
    rows: [
      "First-aid presentations",
      "Occupational injury cases",
      "Emergency referrals",
      "Ambulance transfers",
      "Medication records",
      "Incident/near-miss reports",
    ],
  },
  {
    sectionCode: "G",
    code: "G2",
    title: "Ambulance daily readiness spot-checks",
    rowHeader: "Check",
    columns: [
      { key: "result", label: "Result", type: "oknotna" },
      { key: "comments", label: "Comments", type: "text" },
    ],
    rows: [
      "Fuel / vehicle status",
      "Oxygen / cylinder pressure",
      "AED / monitor",
      "Suction",
      "Airway / BVM",
      "Trauma kit",
      "Medicines / expiry",
      "Stretcher / restraints",
      "Communication",
      "PPE / infection control",
    ],
  },
];

export const SIGN_OFF_ROLES = [
  "Lead Auditor",
  "Occupational Health / Medical Lead",
  "First Aid Post / Clinic Lead",
  "HSE Representative",
  "Mine Management Representative",
];

export const SITES = [
  { code: "ODD", name: "ODD First Aid Post" },
  { code: "STP", name: "STP First Aid Post" },
  { code: "KMS", name: "KMS First Aid Post" },
  { code: "GCS", name: "GCS First Aid Post" },
];
