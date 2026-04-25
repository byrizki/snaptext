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
} from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const ocrModelTierEnum = pgEnum("ocr_model_tier", [
  "nano",
  "flash",
  "pro",
  "max",
]);

export const ocrModels = pgTable("ocr_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  tier: ocrModelTierEnum("tier").notNull().default("flash"),
  provider: text("provider").notNull().default("vercel"),
  modelId: text("model_id").notNull(),
  temperature: real("temperature").notNull().default(0.3),
  maxOutputTokens: integer("max_output_tokens").notNull().default(4096),
  config: jsonb("config").$type<any>().notNull().default({}),
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
