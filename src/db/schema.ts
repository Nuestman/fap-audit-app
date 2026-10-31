import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | string }>({
  dataType: () => "bytea",
  toDriver: (value) => `\\x${value.toString("hex")}`,
  fromDriver: (value) =>
    typeof value === "string" ? Buffer.from(value.replace(/^\\x/, ""), "hex") : value,
});

export const answerEnum = pgEnum("answer", ["yes", "no", "na"]);
export const classificationEnum = pgEnum("classification", [
  "major_nc",
  "minor_nc",
  "ofi",
  "obs",
  "c",
]);
export const auditStatusEnum = pgEnum("audit_status", ["draft", "in_progress", "final"]);
export const actionStatusEnum = pgEnum("action_status", ["open", "in_progress", "closed"]);
export const extraKindEnum = pgEnum("extra_kind", ["h1", "h3"]);
export const overallStatusEnum = pgEnum("overall_status", [
  "satisfactory",
  "satisfactory_with_improvements",
  "unsatisfactory",
]);
export const pinStatusEnum = pgEnum("pin_status", ["active", "expired", "unknown"]);
export const fapStaffModelEnum = pgEnum("fap_staff_model", ["global", "site_assigned"]);

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------- protocol template

export const protocolVersion = pgTable("protocol_version", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  effectiveDate: date("effective_date"),
  isActive: boolean("is_active").notNull().default(true),
  centralQuestion: text("central_question"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const protocolSection = pgTable(
  "protocol_section",
  {
    id: serial("id").primaryKey(),
    versionId: integer("version_id")
      .notNull()
      .references(() => protocolVersion.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    sort: integer("sort").notNull(),
  },
  (t) => [uniqueIndex("protocol_section_version_code").on(t.versionId, t.code)],
);

export const protocolItem = pgTable(
  "protocol_item",
  {
    id: serial("id").primaryKey(),
    sectionId: integer("section_id")
      .notNull()
      .references(() => protocolSection.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    text: text("text").notNull(),
    sort: integer("sort").notNull(),
  },
  (t) => [uniqueIndex("protocol_item_section_code").on(t.sectionId, t.code)],
);

export type TableColumnType = "text" | "number" | "time" | "yesno" | "oknotna";
export type TableColumn = { key: string; label: string; type: TableColumnType };

export const protocolTable = pgTable(
  "protocol_table",
  {
    id: serial("id").primaryKey(),
    sectionId: integer("section_id")
      .notNull()
      .references(() => protocolSection.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    rowHeader: text("row_header").notNull(),
    columns: jsonb("columns").$type<TableColumn[]>().notNull(),
    sort: integer("sort").notNull(),
  },
  (t) => [uniqueIndex("protocol_table_section_code").on(t.sectionId, t.code)],
);

export const protocolTableRow = pgTable("protocol_table_row", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id")
    .notNull()
    .references(() => protocolTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  sort: integer("sort").notNull(),
});

// ---------------------------------------------------------------- audits

export const site = pgTable("site", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  location: text("location"),
  active: boolean("active").notNull().default(true),
});

/** Directory of auditors — used for lead/team and action owners. Names are snapshotted as text elsewhere. */
export const auditor = pgTable("auditor", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  organization: text("organization"),
  jobTitle: text("job_title"),
  email: text("email"),
  phone: text("phone"),
  employeeNumber: text("employee_number"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** FAP staff directory — staff on duty and action owners. Optional site assignment for site_assigned model. */
export const fapStaff = pgTable("fap_staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  organization: text("organization"),
  jobTitle: text("job_title"),
  email: text("email"),
  phone: text("phone"),
  employeeNumber: text("employee_number"),
  qualification: text("qualification"),
  pinStatus: pinStatusEnum("pin_status").notNull().default("unknown"),
  pinExpiresOn: date("pin_expires_on"),
  siteId: integer("site_id").references(() => site.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Singleton app settings (always id = 1). */
export const appConfig = pgTable("app_config", {
  id: integer("id").primaryKey().default(1),
  fapStaffModel: fapStaffModelEnum("fap_staff_model").notNull().default("global"),
  updatedAt: updatedAt(),
});

/** App-owned profile extras for a Neon Auth user (avatar + optional contact fields). */
export const userProfile = pgTable("user_profile", {
  userId: text("user_id").primaryKey(),
  jobTitle: text("job_title"),
  organisation: text("organisation"),
  phone: text("phone"),
  avatarData: bytea("avatar_data"),
  avatarMimeType: text("avatar_mime_type"),
  updatedAt: updatedAt(),
});

export const audit = pgTable("audit", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  period: text("period"),
  protocolVersionId: integer("protocol_version_id")
    .notNull()
    .references(() => protocolVersion.id),
  leadAuditor: text("lead_auditor"),
  auditors: text("auditors"),
  status: auditStatusEnum("status").notNull().default("in_progress"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  executiveSummary: text("executive_summary"),
  scopeNotes: text("scope_notes"),
  limitations: text("limitations"),
  conclusion: text("conclusion"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAt(),
});

export const auditPost = pgTable(
  "audit_post",
  {
    id: serial("id").primaryKey(),
    auditId: integer("audit_id")
      .notNull()
      .references(() => audit.id, { onDelete: "cascade" }),
    siteId: integer("site_id")
      .notNull()
      .references(() => site.id),
    auditDate: date("audit_date"),
    shift: text("shift"),
    staffOnDuty: text("staff_on_duty"),
    ambulanceUnits: text("ambulance_units"),
    overallStatus: overallStatusEnum("overall_status"),
    keyStrengths: text("key_strengths"),
    keyRisks: text("key_risks"),
    recommendation: text("recommendation"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("audit_post_audit_site").on(t.auditId, t.siteId)],
);

export const itemResponse = pgTable(
  "item_response",
  {
    id: serial("id").primaryKey(),
    auditPostId: integer("audit_post_id")
      .notNull()
      .references(() => auditPost.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => protocolItem.id),
    answer: answerEnum("answer"),
    evidence: text("evidence"),
    finding: text("finding"),
    classification: classificationEnum("classification"),
    originalNote: text("original_note"),
    updatedBy: text("updated_by"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("item_response_post_item").on(t.auditPostId, t.itemId)],
);

export const extraFinding = pgTable("extra_finding", {
  id: serial("id").primaryKey(),
  auditPostId: integer("audit_post_id")
    .notNull()
    .references(() => auditPost.id, { onDelete: "cascade" }),
  kind: extraKindEnum("kind").notNull(),
  finding: text("finding"),
  linkedRef: text("linked_ref"),
  evidence: text("evidence"),
  consequence: text("consequence"),
  interimControl: text("interim_control"),
  classification: classificationEnum("classification"),
  originalNote: text("original_note"),
  sort: integer("sort").notNull().default(0),
  updatedBy: text("updated_by"),
  updatedAt: updatedAt(),
});

export const goodPractice = pgTable("good_practice", {
  id: serial("id").primaryKey(),
  auditPostId: integer("audit_post_id")
    .notNull()
    .references(() => auditPost.id, { onDelete: "cascade" }),
  practice: text("practice"),
  evidence: text("evidence"),
  value: text("value"),
  replication: text("replication"),
  sort: integer("sort").notNull().default(0),
  updatedAt: updatedAt(),
});

export const tableEntry = pgTable(
  "table_entry",
  {
    id: serial("id").primaryKey(),
    auditPostId: integer("audit_post_id")
      .notNull()
      .references(() => auditPost.id, { onDelete: "cascade" }),
    rowId: integer("row_id")
      .notNull()
      .references(() => protocolTableRow.id),
    values: jsonb("values").$type<Record<string, string>>().notNull().default({}),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("table_entry_post_row").on(t.auditPostId, t.rowId)],
);

export const correctiveAction = pgTable("corrective_action", {
  id: serial("id").primaryKey(),
  itemResponseId: integer("item_response_id").references(() => itemResponse.id, {
    onDelete: "cascade",
  }),
  extraFindingId: integer("extra_finding_id").references(() => extraFinding.id, {
    onDelete: "cascade",
  }),
  action: text("action"),
  owner: text("owner"),
  targetDate: date("target_date"),
  priority: integer("priority"),
  status: actionStatusEnum("status").notNull().default("open"),
  closeoutEvidence: text("closeout_evidence"),
  closedAt: date("closed_at"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAt(),
});

export const attachment = pgTable("attachment", {
  id: serial("id").primaryKey(),
  auditPostId: integer("audit_post_id")
    .notNull()
    .references(() => auditPost.id, { onDelete: "cascade" }),
  itemResponseId: integer("item_response_id").references(() => itemResponse.id, {
    onDelete: "cascade",
  }),
  extraFindingId: integer("extra_finding_id").references(() => extraFinding.id, {
    onDelete: "cascade",
  }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  caption: text("caption"),
  data: bytea("data").notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const signOff = pgTable("sign_off", {
  id: serial("id").primaryKey(),
  auditPostId: integer("audit_post_id")
    .notNull()
    .references(() => auditPost.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  name: text("name"),
  signedDate: date("signed_date"),
  sort: integer("sort").notNull().default(0),
});

// ---------------------------------------------------------------- relations

export const protocolVersionRelations = relations(protocolVersion, ({ many }) => ({
  sections: many(protocolSection),
}));
export const protocolSectionRelations = relations(protocolSection, ({ one, many }) => ({
  version: one(protocolVersion, {
    fields: [protocolSection.versionId],
    references: [protocolVersion.id],
  }),
  items: many(protocolItem),
  tables: many(protocolTable),
}));
export const protocolItemRelations = relations(protocolItem, ({ one }) => ({
  section: one(protocolSection, {
    fields: [protocolItem.sectionId],
    references: [protocolSection.id],
  }),
}));
export const protocolTableRelations = relations(protocolTable, ({ one, many }) => ({
  section: one(protocolSection, {
    fields: [protocolTable.sectionId],
    references: [protocolSection.id],
  }),
  rows: many(protocolTableRow),
}));
export const protocolTableRowRelations = relations(protocolTableRow, ({ one }) => ({
  table: one(protocolTable, { fields: [protocolTableRow.tableId], references: [protocolTable.id] }),
}));
export const auditRelations = relations(audit, ({ one, many }) => ({
  protocolVersion: one(protocolVersion, {
    fields: [audit.protocolVersionId],
    references: [protocolVersion.id],
  }),
  posts: many(auditPost),
}));
export const auditPostRelations = relations(auditPost, ({ one, many }) => ({
  audit: one(audit, { fields: [auditPost.auditId], references: [audit.id] }),
  site: one(site, { fields: [auditPost.siteId], references: [site.id] }),
  responses: many(itemResponse),
  extraFindings: many(extraFinding),
  goodPractices: many(goodPractice),
  tableEntries: many(tableEntry),
  signOffs: many(signOff),
}));
export const itemResponseRelations = relations(itemResponse, ({ one, many }) => ({
  auditPost: one(auditPost, { fields: [itemResponse.auditPostId], references: [auditPost.id] }),
  item: one(protocolItem, { fields: [itemResponse.itemId], references: [protocolItem.id] }),
  actions: many(correctiveAction),
}));
export const extraFindingRelations = relations(extraFinding, ({ one, many }) => ({
  auditPost: one(auditPost, { fields: [extraFinding.auditPostId], references: [auditPost.id] }),
  actions: many(correctiveAction),
}));
export const correctiveActionRelations = relations(correctiveAction, ({ one }) => ({
  itemResponse: one(itemResponse, {
    fields: [correctiveAction.itemResponseId],
    references: [itemResponse.id],
  }),
  extraFinding: one(extraFinding, {
    fields: [correctiveAction.extraFindingId],
    references: [extraFinding.id],
  }),
}));
export const goodPracticeRelations = relations(goodPractice, ({ one }) => ({
  auditPost: one(auditPost, { fields: [goodPractice.auditPostId], references: [auditPost.id] }),
}));
export const tableEntryRelations = relations(tableEntry, ({ one }) => ({
  auditPost: one(auditPost, { fields: [tableEntry.auditPostId], references: [auditPost.id] }),
  row: one(protocolTableRow, { fields: [tableEntry.rowId], references: [protocolTableRow.id] }),
}));
export const signOffRelations = relations(signOff, ({ one }) => ({
  auditPost: one(auditPost, { fields: [signOff.auditPostId], references: [auditPost.id] }),
}));

export type Answer = (typeof answerEnum.enumValues)[number];
export type Classification = (typeof classificationEnum.enumValues)[number];
export type ActionStatus = (typeof actionStatusEnum.enumValues)[number];
export type OverallStatus = (typeof overallStatusEnum.enumValues)[number];
export type AuditStatus = (typeof auditStatusEnum.enumValues)[number];
export type ExtraKind = (typeof extraKindEnum.enumValues)[number];
export type PinStatus = (typeof pinStatusEnum.enumValues)[number];
export type FapStaffModel = (typeof fapStaffModelEnum.enumValues)[number];
