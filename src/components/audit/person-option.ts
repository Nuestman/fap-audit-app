/** Shared shape for PersonPicker options (auditors, FAP staff, or both). */
export type PersonOption = {
  id: number;
  /** Value stored on the audit / action (plain name). */
  name: string;
  /** Richer dropdown / checkbox label. */
  label?: string;
  group?: string;
  siteId?: number | null;
};

export function personLabel(parts: {
  name: string;
  jobTitle?: string | null;
  organization?: string | null;
}): string {
  const bits = [parts.name];
  if (parts.jobTitle?.trim()) bits.push(parts.jobTitle.trim());
  let label = bits.join(" — ");
  if (parts.organization?.trim()) label += ` (${parts.organization.trim()})`;
  return label;
}

export function asOwnerPeople(
  auditors: { id: number; name: string; label?: string }[],
  staff: { id: number; name: string; label?: string; siteId?: number | null }[],
): PersonOption[] {
  return [
    ...auditors.map((p) => ({ id: p.id, name: p.name, label: p.label, group: "Auditor" })),
    ...staff.map((p) => ({
      id: p.id,
      name: p.name,
      label: p.label,
      group: "FAP staff",
      siteId: p.siteId ?? null,
    })),
  ];
}

/** When staff model is site_assigned, keep staff for this site (plus unassigned). */
export function filterStaffForSite(
  staff: PersonOption[],
  siteId: number | null | undefined,
  model: "global" | "site_assigned",
): PersonOption[] {
  if (model !== "site_assigned" || siteId == null) return staff;
  return staff.filter((p) => p.siteId == null || p.siteId === siteId);
}
