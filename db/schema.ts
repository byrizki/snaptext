import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const scanQuotaTypeEnum = pgEnum("scan_quota_type", ["user", "global", "registered"]);

export const resetPeriodEnum = pgEnum("reset_period", ["daily", "monthly"]);

export const ocrModels = pgTable("ocr_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default("vercel"),
  modelId: text("model_id").notNull(),
  temperature: real("temperature").notNull().default(0.3),
  maxOutputTokens: integer("max_output_tokens").notNull().default(4096),
  inputPrice: real("input_price").notNull().default(0),
  outputPrice: real("output_price").notNull().default(0),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    status: jobStatusEnum("status").notNull().default("pending"),
    filename: text("filename").notNull(),
    fileSize: integer("file_size").notNull(),
    fileHash: text("file_hash"),
    pdfBlobUrl: text("pdf_blob_url").notNull(),
    ocrModelId: uuid("ocr_model_id").references(() => ocrModels.id, { onDelete: "set null" }),
    workflowRunId: text("workflow_run_id"),
    totalPages: integer("total_pages"),
    jsonSchema: text("json_schema"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_status_idx").on(t.status)]
);

export const jobPages = pgTable(
  "job_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    pageBlobUrl: text("page_blob_url"),
    toonOutput: text("toon_output"),
    parsedData: jsonb("parsed_data"),
    model: text("model"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    secondModelInput: integer("second_model_input"),
    secondModelOutput: integer("second_model_output"),
    finishReason: text("finish_reason"),
    log: text("log"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("job_pages_job_id_idx").on(t.jobId),
    index("job_pages_job_page_idx").on(t.jobId, t.pageNumber),
  ]
);

export const jobResults = pgTable(
  "job_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" })
      .unique(),
    mergedData: jsonb("merged_data"),
    model: text("model"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    secondModelInput: integer("second_model_input"),
    secondModelOutput: integer("second_model_output"),
    finishReason: text("finish_reason"),
    rawResponse: text("raw_response"),
    log: text("log"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("job_results_job_id_idx").on(t.jobId)]
);

/**
 * scan_quotas: replaces adminSettings.dailyScanLimit
 *
 * type='global'  → applies to unauthenticated (anonymous) users; userId is null
 * type='user'    → per-user quota; userId references the user row
 *
 * count          → default daily scan limit (fallback)
 * modelLimits    → { [modelId]: number } — per-model overrides
 */
export const scanQuotas = pgTable(
  "scan_quotas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: scanQuotaTypeEnum("type").notNull().default("global"),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    count: integer("count").notNull().default(20),
    resetPeriod: resetPeriodEnum("reset_period").notNull().default("daily"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("scan_quotas_type_idx").on(t.type),
    index("scan_quotas_user_id_idx").on(t.userId),
  ]
);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobPage = typeof jobPages.$inferSelect;
export type JobResult = typeof jobResults.$inferSelect;
export type OcrModel = typeof ocrModels.$inferSelect;
export type NewOcrModel = typeof ocrModels.$inferInsert;
export type User = typeof user.$inferSelect;
export type ScanQuota = typeof scanQuotas.$inferSelect;
export type NewScanQuota = typeof scanQuotas.$inferInsert;
