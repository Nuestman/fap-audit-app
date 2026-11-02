export const CHANGE_ENTITIES = [
  "item_response",
  "extra_finding",
  "corrective_action",
  "audit_post",
  "good_practice",
  "table_entry",
] as const;

export type ChangeEntity = (typeof CHANGE_ENTITIES)[number];
export type ChangeAction = "insert" | "update" | "delete";
export type ChangeSource = "ui" | "import" | "system";
export type FieldChange = { from: unknown; to: unknown };
export type ChangeMap = Record<string, FieldChange>;
