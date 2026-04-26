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



export const ocrModels = pgTable("ocr_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default("vercel"),
  modelId: text("model_id").notNull(),
  temperature: real("temperature").notNull().default(0.3),
  maxOutputTokens: integer("max_output_tokens").notNull().default(4096),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: jobStatusEnum("status").notNull().default("pending"),
    filename: text("filename").notNull(),
    fileSize: integer("file_size").notNull(),
    fileHash: text("file_hash"),
    pdfBlobUrl: text("pdf_blob_url").notNull(),
    ocrModelId: uuid("ocr_model_id").references(() => ocrModels.id, { onDelete: "set null" }),
    workflowRunId: text("workflow_run_id"),
    totalPages: integer("total_pages"),
    jsonSchema: text("json_schema"),
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

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobPage = typeof jobPages.$inferSelect;
export type JobResult = typeof jobResults.$inferSelect;
export type OcrModel = typeof ocrModels.$inferSelect;
export type NewOcrModel = typeof ocrModels.$inferInsert;

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull()
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id)
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
	updatedAt: timestamp("updated_at").notNull()
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at")
});

export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  dailyScanLimit: integer("daily_scan_limit").notNull().default(20),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
