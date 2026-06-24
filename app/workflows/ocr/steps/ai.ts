/* eslint-disable @typescript-eslint/no-explicit-any */
import { type OcrModel } from "@/db";
import { getModelId } from "@/lib/provider-mapping";
import { decodeToon } from "@/lib/toon-parser";
import { tryDecodeToonWithRepair } from "@/lib/toon-repair";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { DurableAgent } from "@workflow/ai/agent";
import { stepCountIs, createGateway } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import sharp from "sharp";
import { FatalError, fetch, getStepMetadata, RetryableError } from "workflow";
import { OCR_VISION_MODEL } from "../models";
import { buildOcrSystemPrompt } from "../prompts";
import { buildToonTools } from "../tools";
import type { OcrPageResult } from "../types";

const predefinedProvider = {
  gateway: {
    caching: "auto",
  },
};

const OCR_DEBUG_LOG_LIMIT = 12000;

function withGoogleGeminiOcrDefaults(
  actualModelId: string,
  providerId: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (providerId !== "google") {
    return config;
  }

  const existingThinkingConfig =
    typeof config.thinkingConfig === "object" && config.thinkingConfig !== null
      ? (config.thinkingConfig as Record<string, unknown>)
      : {};
  const isGemini25 = actualModelId.includes("gemini-2.5");
  const isGemini31 = actualModelId.includes("gemini-3.1");

  if (!isGemini25 && !isGemini31) {
    return config;
  }

  return {
    ...config,
    // OCR needs deterministic text output. Gemini can spend the whole budget
    // on hidden reasoning and return empty text through Vercel Gateway.
    thinkingConfig: {
      ...(isGemini25 ? { thinkingBudget: 0 } : { thinkingLevel: "minimal" }),
      ...existingThinkingConfig,
    },
  };
}

function truncateForLog(value: unknown, limit = OCR_DEBUG_LOG_LIMIT): string {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!text) return "";
  return text.length > limit
    ? `${text.slice(0, limit)}\n... [truncated ${text.length - limit} chars]`
    : text;
}

function logOcrDebug(label: string, payload: unknown): void {
  console.log(`[OCR Debug] ${label}\n${truncateForLog(payload)}`);
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return {
    name: "Error",
    message: String(err),
  };
}

function deserializeError(serialized: any) {
  if (!serialized) return undefined;
  let err: Error;
  if (serialized.name === "FatalError") {
    err = new FatalError(serialized.message);
  } else if (serialized.name === "RetryableError") {
    err = new RetryableError(serialized.message);
  } else {
    err = new Error(serialized.message);
    err.name = serialized.name;
  }
  err.stack = serialized.stack;
  return err;
}

function getRetryDelay(error: any, attempt: number): number {
  let delayMs: number | undefined = undefined;

  // Try to extract retry-after headers
  const getHeader = (name: string): string | undefined => {
    try {
      return (
        error.responseHeaders?.get?.(name) ||
        error.headers?.get?.(name) ||
        error.response?.headers?.get?.(name) ||
        error.responseHeaders?.[name] ||
        error.headers?.[name] ||
        error.response?.headers?.[name]
      );
    } catch {
      return undefined;
    }
  };

  const retryAfterMs = getHeader("retry-after-ms");
  if (retryAfterMs) {
    const ms = parseInt(retryAfterMs, 10);
    if (!isNaN(ms)) {
      delayMs = ms;
    }
  }

  if (delayMs === undefined) {
    const retryAfter = getHeader("retry-after");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        delayMs = seconds * 1000;
      } else {
        const dateMs = Date.parse(retryAfter);
        if (!isNaN(dateMs)) {
          delayMs = Math.max(0, dateMs - Date.now());
        }
      }
    }
  }

  // Fallback to default backoff calculation: 15s + (attempt - 1) * 10s
  if (delayMs === undefined || delayMs <= 0) {
    delayMs = 15000 + (attempt - 1) * 10000;
  }

  return delayMs;
}

function getAiModel(
  modelId: string,
  config: Record<string, unknown> = {},
  fileHash?: string | null,
  userId?: string | null,
): { model: string | (() => Promise<LanguageModelV3>); providerConfig: any } {
  if (modelId.startsWith("@vercel/")) {
    const actualModelId = modelId.slice("@vercel/".length);
    const [providerId] = actualModelId.split("/");

    const gateway = createGateway({
      apiKey: !userId
        ? process.env.AI_GATEWAY_API_KEY_FREE
        : process.env.AI_GATEWAY_API_KEY,
    });

    const providerSpecificConfig = withGoogleGeminiOcrDefaults(
      actualModelId,
      providerId,
      config,
    );

    return {
      model: async () => gateway(actualModelId),
      providerConfig: { ...predefinedProvider, [providerId]: providerSpecificConfig },
    };
  }

  if (modelId.startsWith("@nvidia/")) {
    const actualModelId = modelId.slice("@nvidia/".length);
    const provider = createOpenAICompatible({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      name: "nim",
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    return {
      model: async () => provider.chatModel(getModelId(actualModelId)),
      providerConfig: { ...predefinedProvider },
    };
  }

  if (modelId.startsWith("@sumopod/")) {
    const actualModelId = modelId.slice("@sumopod/".length);
    const provider = createOpenAICompatible({
      apiKey: process.env.SUMOPOD_API_KEY,
      name: "sumopod",
      baseURL: "https://ai.sumopod.com/v1",
      fetch: async (input, init) => {
        await logAiRequest("Sumopod final request", input, init);
        return fetch(input, init);
      },
    });

    return {
      model: async () => provider.chatModel(getModelId(actualModelId)),
      providerConfig: { ...predefinedProvider },
    };
  }

  const actualModelId = modelId.replace(/^@cf\//, "");
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN environment variables",
    );
  }

  const gateway = createWorkersAI({
    accountId,
    gateway: { id: "iventday" },
    apiKey: apiToken,
  });

  return {
    model: async () =>
      gateway(actualModelId, {
        sessionAffinity: fileHash || undefined,
        ...config,
      }),
    providerConfig: predefinedProvider,
  };
}

async function fetchImageData(
  pageBlobUrl: string,
  options: { forceJpeg?: boolean } = {},
): Promise<{ base64: string; mediaType: string; byteLength: number }> {
  const imageResponse = await fetch(pageBlobUrl);
  if (!imageResponse.ok) {
    throw new Error(
      `Failed to fetch page image: ${imageResponse.status} ${imageResponse.statusText}`,
    );
  }

  const sourceBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const imageBuffer = options.forceJpeg
    ? await sharp(sourceBuffer).jpeg({ quality: 92 }).toBuffer()
    : sourceBuffer;
  const mediaType = options.forceJpeg
    ? "image/jpeg"
    : imageResponse.headers.get("content-type") || "image/png";
  return {
    base64: imageBuffer.toString("base64"),
    mediaType,
    byteLength: imageBuffer.byteLength,
  };
}

function buildImageContentPart(
  modelId: string,
  imageData: { base64: string; mediaType: string },
  pageBlobUrl: string,
): any {
  if (modelId.startsWith("@sumopod/")) {
    // OpenAI-compatible provider maps image file parts to final image_url payloads.
    return {
      type: "file",
      data: imageData.base64,
      mediaType: imageData.mediaType,
    };
  }

  if (modelId.startsWith("@vercel/")) {
    return {
      type: "image",
      image: new URL(pageBlobUrl),
    };
  }

  return {
    type: "image",
    image: imageData.base64,
    mediaType: imageData.mediaType,
  };
}

function sanitizeAiRequestBody(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAiRequestBody);
  if (!value || typeof value !== "object") return value;

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(input)) {
    if (key === "url" && typeof child === "string" && child.startsWith("data:image/")) {
      output[key] = `${child.slice(0, child.indexOf(",") + 1)}[base64:${child.length}]`;
    } else if ((key === "data" || key === "image") && typeof child === "string" && child.length > 500) {
      output[key] = `[base64:${child.length}]`;
    } else {
      output[key] = sanitizeAiRequestBody(child);
    }
  }
  return output;
}

async function logAiRequest(label: string, input: RequestInfo | URL, init?: RequestInit): Promise<void> {
  try {
    const url = input instanceof Request ? input.url : input.toString();
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const body = init?.body ?? (input instanceof Request ? await input.clone().text() : undefined);
    let parsedBody: unknown = body;
    if (typeof body === "string") {
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = body;
      }
    }
    logOcrDebug(label, {
      method,
      url,
      body: sanitizeAiRequestBody(parsedBody),
    });
  } catch (error) {
    logOcrDebug(`${label} logging failed`, error instanceof Error ? error.message : String(error));
  }
}

export async function runOcrOnPage(
  pageBlobUrl: string,
  pageNumber: number,
  jobId: string,
  fileHash: string | null,
  ocrModelConfig?: OcrModel,
  toonSchemaTemplate?: string,
  userId?: string | null,
): Promise<
  OcrPageResult & { log: string; llmLogs: any[]; internalError?: any }
> {
  "use step";
  const llmLogs: any[] = [];
  const { attempt } = getStepMetadata();
  try {
    console.log(
      `[Step] runOcrOnPage started for jobId: ${jobId}, page: ${pageNumber} (attempt: ${attempt})`,
    );

    const modelId = ocrModelConfig?.modelId ?? OCR_VISION_MODEL;
    const isInterfaze = modelId.includes("interfaze");
    const imageData = isInterfaze
      ? null
      : await fetchImageData(pageBlobUrl, { forceJpeg: modelId.startsWith("@sumopod/") });
    const temperature = ocrModelConfig?.temperature;
    const maxTokens = ocrModelConfig?.maxOutputTokens;
    const config = ocrModelConfig?.config ?? {};

    const { model, providerConfig } = getAiModel(
      modelId,
      config,
      fileHash,
      userId,
    );
    console.log(
      `[Workflow] Using model: ${modelId}, config: ${JSON.stringify(providerConfig)}`,
    );
    const startedAt = "N/A";
    const instructions = buildOcrSystemPrompt(toonSchemaTemplate);
    const schemaReminder = toonSchemaTemplate
      ? "\n\nImportant: schema keys are destination fields, not exact labels to find. If the page has any visible table/list of prices, fees, tariffs, room charges, services, or rates, map it into the schema and do not return empty."
      : "";
    const userInstruction = isInterfaze
      ? `[DOCUMENT_URL]: ${pageBlobUrl}\n\nExtract all data from this document page (page ${pageNumber}) and output it in TOON format as instructed.${schemaReminder}`
      : `Extract all data from this document page (page ${pageNumber}) and output it in TOON format as instructed.${schemaReminder}`;

    console.log(
      `[OCR Debug] Starting page extraction jobId=${jobId} page=${pageNumber} schema=${toonSchemaTemplate ? "yes" : "no"} model=${modelId} attempt=${attempt}`,
    );
    logOcrDebug("System instructions", instructions);
    logOcrDebug("User instruction", userInstruction);
    if (imageData) {
      logOcrDebug("Image payload", {
        pageBlobUrl,
        mediaType: imageData.mediaType,
        byteLength: imageData.byteLength,
        base64Length: imageData.base64.length,
        contentPartType: modelId.startsWith("@sumopod/") ? "image_url" : "image",
        imageTransport: modelId.startsWith("@vercel/") ? "url" : "base64",
        dataUrlPrefix: `data:${imageData.mediaType};base64,`,
      });
    }
    if (toonSchemaTemplate) {
      logOcrDebug("TOON schema template", toonSchemaTemplate);
    }

    llmLogs.push({
      stepName: "ocr_prompt",
      model: modelId,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      pageNumber,
      rawResponse: JSON.stringify({
        systemInstructions: instructions,
        userInstruction,
        schemaTemplate: toonSchemaTemplate,
        model: modelId,
        providerConfig,
      }),
    });

    const agent = new DurableAgent({
      model: model as any,
      instructions,
      temperature,
      maxOutputTokens: maxTokens,
      providerOptions: providerConfig,
    });

    const streamRes = await agent.stream({
      messages: [
        {
          role: "user",
          content: isInterfaze
            ? [
                {
                  type: "text",
                  text: userInstruction,
                },
              ]
            : [
                buildImageContentPart(modelId, imageData!, pageBlobUrl),
                {
                  type: "text",
                  text: userInstruction,
                },
              ],
        },
      ],
      stopWhen: stepCountIs(1),
      writable: new WritableStream({ write() {} }),
      onStepFinish: async (event) => {
        logOcrDebug("Step finish", {
          jobId,
          pageNumber,
          model: modelId,
          finishReason: event.finishReason,
          usage: event.usage,
          text: event.text,
          reasoningText: event.reasoningText,
          toolCalls: event.toolCalls,
        });
        llmLogs.push({
          stepName: "ocr_page",
          model: modelId,
          usage: {
            promptTokens: event.usage.inputTokens ?? 0,
            completionTokens: event.usage.outputTokens ?? 0,
            totalTokens: event.usage.totalTokens ?? 0,
          },
          pageNumber,
          rawResponse:
            event.reasoningText ||
            event.text ||
            (event.toolCalls ? JSON.stringify(event.toolCalls) : ""),
        });
      },
    });

    const steps = streamRes.steps;
    const lastStep = steps[steps.length - 1];
    const inputTokens = steps.reduce(
      (acc, step) => acc + (step.usage?.inputTokens ?? 0),
      0,
    );
    const outputTokens = steps.reduce(
      (acc, step) => acc + (step.usage?.outputTokens ?? 0),
      0,
    );
    const totalTokens = steps.reduce(
      (acc, step) => acc + (step.usage?.totalTokens ?? 0),
      0,
    );
    const finishReason = lastStep?.finishReason ?? "";

    console.log(
      `[Agent] Stream finished. Steps: ${steps.length}, Tokens: ${totalTokens} (In: ${inputTokens}, Out: ${outputTokens}), Reason: ${finishReason}`,
    );

    const rawToon = lastStep?.text || "";
    logOcrDebug("Raw OCR response", {
      jobId,
      pageNumber,
      finishReason,
      rawToon,
    });

    if (finishReason === "length") {
      const truncationMsg = `Output was truncated by the model (max tokens reached). The TOON is incomplete and cannot be decoded. Increase maxOutputTokens or split the page.`;
      console.warn(
        `[OCR] Truncated output on page ${pageNumber} for jobId: ${jobId}`,
      );
      return {
        pageNumber,
        pageBlobUrl,
        rawToon,
        data: {
          parse_error: true,
          truncation_error: true,
          error: truncationMsg,
        },
        model: modelId,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens,
        },
        finishReason,
        log: `[N/A] TRUNCATED: ${truncationMsg}`,
        llmLogs,
      };
    }

    let rawToonDecoded: Record<string, unknown>;
    let canonicalRawToon = rawToon;
    let parseError: string | null = null;
    let deterministicRepairLog: string[] = [];
    try {
      const decoded = tryDecodeToonWithRepair(rawToon, toonSchemaTemplate);
      rawToonDecoded = decoded.data;
      canonicalRawToon = decoded.rawToon;
      deterministicRepairLog = decoded.repairLog;
      if (decoded.repaired) {
        logOcrDebug("TOON deterministic repair applied", {
          jobId,
          pageNumber,
          repairLog: deterministicRepairLog,
          repairedToon: canonicalRawToon,
        });
      }
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
      console.error("[OCR Error] TOON decode failed:", err);
      logOcrDebug("TOON parse failure context", {
        jobId,
        pageNumber,
        parseError,
        rawToon,
        schemaTemplate: toonSchemaTemplate,
      });
      rawToonDecoded = {
        raw_text: rawToon,
        parse_error: true,
        error: parseError,
      };
    }

    const data = rawToonDecoded;

    const log = [
      `[${startedAt}] OCR started — model: ${modelId}`,
      `[N/A] Raw response: ${rawToon}`,
      deterministicRepairLog.length > 0
        ? `[N/A] Repaired response: ${canonicalRawToon}`
        : null,
      `[N/A] OCR complete — finish_reason: ${finishReason} (Steps: ${steps.length})`,
      `[N/A] Tokens — input: ${inputTokens}, output: ${outputTokens}`,
      deterministicRepairLog.length > 0
        ? `[N/A] TOON deterministic repair: ${deterministicRepairLog.join("; ")}`
        : null,
      parseError
        ? `[N/A] TOON parse error: ${parseError}`
        : `[N/A] TOON decoded successfully`,
    ].filter(Boolean).join("\n");

    const result = {
      pageNumber,
      pageBlobUrl,
      rawToon: canonicalRawToon,
      data,
      model: modelId,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens,
      },
      finishReason,
      log,
      llmLogs,
    };

    console.log(
      `[Step] runOcrOnPage completed for jobId: ${jobId}, page: ${pageNumber}`,
    );
    return result;
  } catch (error) {
    console.error(
      `🔥 Error in runOcrOnPage step (page ${pageNumber}) for jobId: ${jobId}`,
      error,
    );
    const e = error as any;
    const msg = e?.message || "";
    const status = e?.status || e?.statusCode;
    if (
      status === 429 ||
      status === 503 ||
      msg.includes("429") ||
      msg.includes("503") ||
      msg.includes("Too Many Requests") ||
      msg.toLowerCase().includes("rate limit") ||
      msg.toLowerCase().includes("service unavailable")
    ) {
      const { attempt } = getStepMetadata();
      const delayMs = getRetryDelay(error, attempt);
      throw new RetryableError(
        "Rate limited by AI provider (429). Please try again later.",
        { retryAfter: `${delayMs}ms` }
      );
    }

    return {
      pageNumber,
      pageBlobUrl,
      rawToon: "",
      data: { parse_error: true, error: msg },
      model: ocrModelConfig?.modelId ?? "unknown",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: "error",
      log: `[Error] ${msg}`,
      llmLogs,
      internalError: serializeError(error),
    };
  }
}

runOcrOnPage.maxRetries = 5;

export async function repairOcrPage(
  pageBlobUrl: string,
  pageNumber: number,
  jobId: string,
  fileHash: string | null,
  brokenToon: string,
  errorMsg: string,
  ocrModelConfig?: OcrModel,
  toonSchemaTemplate?: string,
  userId?: string | null,
  repairModelConfig?: OcrModel,
): Promise<
  OcrPageResult & { log: string; llmLogs: any[]; internalError?: any }
> {
  "use step";
  const llmLogs: any[] = [];
  const { attempt } = getStepMetadata();
  try {
    console.log(
      `[Step] repairOcrPage started for jobId: ${jobId}, page: ${pageNumber} (attempt: ${attempt})`,
    );

    const modelId = repairModelConfig?.modelId ?? "@vercel/google/gemini-2.5-flash-lite-preview-09-2025";
    const isInterfaze = modelId.includes("interfaze");
    const imageData = isInterfaze
      ? null
      : await fetchImageData(pageBlobUrl, { forceJpeg: modelId.startsWith("@sumopod/") });
    const temperature = repairModelConfig ? repairModelConfig.temperature : ocrModelConfig?.temperature;
    const maxTokens = repairModelConfig ? repairModelConfig.maxOutputTokens : ocrModelConfig?.maxOutputTokens;
    const config = repairModelConfig ? (repairModelConfig.config ?? {}) : (ocrModelConfig?.config ?? {});

    const { model, providerConfig } = getAiModel(
      modelId,
      config,
      fileHash,
      userId,
    );
    const startedAt = "N/A";
    const instructions = buildOcrSystemPrompt(toonSchemaTemplate);

    console.log(
      `[OCR Debug] Starting page repair jobId=${jobId} page=${pageNumber} schema=${toonSchemaTemplate ? "yes" : "no"} model=${modelId} attempt=${attempt}`,
    );
    logOcrDebug("Repair system instructions", instructions);
    logOcrDebug("Repair input", {
      errorMsg,
      brokenToon,
      schemaTemplate: toonSchemaTemplate,
    });
    if (imageData) {
      logOcrDebug("Repair image payload", {
        pageBlobUrl,
        mediaType: imageData.mediaType,
        byteLength: imageData.byteLength,
        base64Length: imageData.base64.length,
        contentPartType: modelId.startsWith("@sumopod/") ? "image_url" : "image",
        imageTransport: modelId.startsWith("@vercel/") ? "url" : "base64",
        dataUrlPrefix: `data:${imageData.mediaType};base64,`,
      });
    }

    llmLogs.push({
      stepName: "ocr_repair_prompt",
      model: modelId,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      pageNumber,
      rawResponse: JSON.stringify({
        systemInstructions: instructions,
        errorMsg,
        brokenToon,
        schemaTemplate: toonSchemaTemplate,
        model: modelId,
        providerConfig,
      }),
    });

    let parsedResult: {
      rawToon: string;
      data: Record<string, unknown>;
    } | null = null;
    let parseError: string | null = null;

    const toonTools = buildToonTools(
      (rawToon, data) => {
        parsedResult = { rawToon, data };
        parseError = null;
      },
      brokenToon,
    );

    const agent = new DurableAgent({
      model: model as any,
      instructions,
      temperature,
      maxOutputTokens: maxTokens,
      providerOptions: providerConfig,
      tools: toonTools,
    });

    const streamRes = await agent.stream({
      messages: [
        {
          role: "user",
          content: isInterfaze
            ? [
                {
                  type: "text",
                  text: [
                    `[DOCUMENT_URL]: ${pageBlobUrl}`,
                    ``,
                    `A TOON extraction failed validation. Your job is to fix it by patching the broken parts.`,
                    ``,
                    `ERROR: ${errorMsg}`,
                    ``,
                    `BROKEN TOON:`,
                    `\`\`\``,
                    brokenToon,
                    `\`\`\``,
                    ``,
                    `REPAIR INSTRUCTIONS:`,
                    `1. Read the error message carefully — it tells you the exact key, row, and expected vs actual column count.`,
                    `2. For a "column mismatch" error:`,
                    `   a. Count the headers declared in {…} for that key. That is the expected column count C.`,
                    `   b. Count the comma-separated values in the failing row (remember: quoted values like "a, b" count as ONE value).`,
                    `   c. If the row has too many values, look at the image to find which cell contains an unquoted comma and wrap it in double quotes.`,
                    `   d. If the header count is wrong, fix the {…} header list to match the actual image column count.`,
                    `3. For a "row count" error: count ALL rows in the image table and update [N] to the correct number.`,
                    `4. Call patch_toon with the minimal search string (1–2 lines). The search MUST exactly match the current TOON text.`,
                    `5. patch_toon will re-validate after each patch. Repeat until it returns success: true.`,
                    `6. Do NOT submit the same patch twice if it already failed — diagnose the next error instead.`,
                  ].join("\n"),
                },
              ]
            : [
                buildImageContentPart(modelId, imageData!, pageBlobUrl),
                {
                  type: "text",
                  text: [
                    `A TOON extraction failed validation. Your job is to fix it by patching the broken parts.`,
                    ``,
                    `ERROR: ${errorMsg}`,
                    ``,
                    `BROKEN TOON:`,
                    `\`\`\``,
                    brokenToon,
                    `\`\`\``,
                    ``,
                    `REPAIR INSTRUCTIONS:`,
                    `1. Read the error message carefully — it tells you the exact key, row, and expected vs actual column count.`,
                    `2. For a "column mismatch" error:`,
                    `   a. Count the headers declared in {…} for that key. That is the expected column count C.`,
                    `   b. Count the comma-separated values in the failing row (remember: quoted values like "a, b" count as ONE value).`,
                    `   c. If the row has too many values, look at the image to find which cell contains an unquoted comma and wrap it in double quotes.`,
                    `   d. If the header count is wrong, fix the {…} header list to match the actual image column count.`,
                    `3. For a "row count" error: count ALL rows in the image table and update [N] to the correct number.`,
                    `4. Call patch_toon with the minimal search string (1–2 lines). The search MUST exactly match the current TOON text.`,
                    `5. patch_toon will re-validate after each patch. Repeat until it returns success: true.`,
                    `6. Do NOT submit the same patch twice if it already failed — diagnose the next error instead.`,
                  ].join("\n"),
                },
              ],
        },
      ],
      stopWhen: stepCountIs(30),
      writable: new WritableStream({ write() {} }),
      onStepFinish: async (event) => {
        logOcrDebug("Repair step finish", {
          jobId,
          pageNumber,
          model: modelId,
          finishReason: event.finishReason,
          usage: event.usage,
          text: event.text,
          toolCalls: event.toolCalls,
        });
 
        llmLogs.push({
          stepName: "ocr_repair",
          model: modelId,
          usage: {
            promptTokens: event.usage.inputTokens ?? 0,
            completionTokens: event.usage.outputTokens ?? 0,
            totalTokens: event.usage.totalTokens ?? 0,
          },
          pageNumber,
          rawResponse:
            event.text ||
            (event.toolCalls ? JSON.stringify(event.toolCalls) : ""),
        });
      },
    });

    const steps = streamRes.steps;
    const lastStep = steps[steps.length - 1];
    const inputTokens = steps.reduce(
      (acc, step) => acc + (step.usage?.inputTokens ?? 0),
      0,
    );
    const outputTokens = steps.reduce(
      (acc, step) => acc + (step.usage?.outputTokens ?? 0),
      0,
    );
    const totalTokens = steps.reduce(
      (acc, step) => acc + (step.usage?.totalTokens ?? 0),
      0,
    );
    const finishReason = lastStep?.finishReason ?? "";

    console.log(
      `[Agent] Repair stream finished. Steps: ${steps.length}, Tokens: ${totalTokens} (In: ${inputTokens}, Out: ${outputTokens}), Reason: ${finishReason}`,
    );

    let rawToon: string;
    let data: Record<string, unknown>;

    if (parsedResult) {
      console.log(`[OCR Repair] Captured via tool callback`);
      rawToon = (
        parsedResult as { rawToon: string; data: Record<string, unknown> }
      ).rawToon;
      data = (
        parsedResult as { rawToon: string; data: Record<string, unknown> }
      ).data;
    } else {
      console.log(`[OCR Repair] Falling back to manual decode`);
      rawToon = lastStep?.text || brokenToon;
      try {
        const trimmed = rawToon.trim();
        data =
          trimmed === "empty: true"
            ? { empty: true }
            : (decodeToon(trimmed) as Record<string, unknown>);
      } catch (err) {
        parseError = err instanceof Error ? err.message : String(err);
        data = { raw_text: rawToon, parse_error: true, error: parseError };
      }
    }

    logOcrDebug("Raw repair response", {
      jobId,
      pageNumber,
      finishReason,
      rawToon,
      parsedViaTool: Boolean(parsedResult),
      parseError,
    });

    const log = [
      `[${startedAt}] OCR Repair started — model: ${modelId}`,
      `[N/A] Repair complete — finish_reason: ${finishReason} (Steps: ${steps.length})`,
      `[N/A] Tokens — input: ${inputTokens}, output: ${outputTokens}`,
      parseError
        ? `[N/A] TOON repair parse error: ${parseError}`
        : `[N/A] TOON repaired successfully`,
    ].join("\n");

    return {
      pageNumber,
      pageBlobUrl,
      rawToon,
      data,
      model: modelId,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens,
      },
      finishReason,
      log,
      llmLogs,
    };
  } catch (error) {
    console.error(
      `🔥 Error in repairOcrPage step (page ${pageNumber}) for jobId: ${jobId}`,
      error,
    );
    const e = error as any;
    const msg = e?.message || "";
    const status = e?.status || e?.statusCode;
    if (
      status === 429 ||
      status === 503 ||
      msg.includes("429") ||
      msg.includes("503") ||
      msg.includes("Too Many Requests") ||
      msg.includes("rate_limit") ||
      msg.toLowerCase().includes("rate limit") ||
      msg.toLowerCase().includes("service unavailable")
    ) {
      const { attempt } = getStepMetadata();
      const delayMs = getRetryDelay(error, attempt);
      throw new RetryableError(
        "Rate limited by AI provider (429). Please try again later.",
        { retryAfter: `${delayMs}ms` },
      );
    }

    return {
      pageNumber,
      pageBlobUrl,
      rawToon: brokenToon,
      data: { parse_error: true, error: msg },
      model: ocrModelConfig?.modelId ?? "unknown",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: "error",
      log: `[Error] ${msg}`,
      llmLogs,
      internalError: serializeError(error),
    };
  }
}

repairOcrPage.maxRetries = 5;

function getSortedCandidates(
  candidates: OcrModel[],
  rotationMode: string,
  pageNumber: number
): OcrModel[] {
  if (candidates.length <= 1) {
    return candidates;
  }

  // Stable sort by ID first to have a consistent base ordering
  const baseList = [...candidates].sort((a, b) => a.id.localeCompare(b.id));

  if (rotationMode === "random") {
    // Fisher-Yates shuffle
    const shuffled = [...baseList];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  if (rotationMode === "priority-weighted") {
    // Math.random() ** (1 / priority) descending
    const scored = baseList.map((m) => ({
      model: m,
      score: Math.pow(Math.random(), 1 / Math.max(1, m.priority ?? 1)),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.model);
  }

  // Fallback / "round-robin"
  // Start offset at (pageNumber - 1) % baseList.length
  const n = baseList.length;
  const startIndex = Math.max(0, pageNumber - 1) % n;
  return baseList.slice(startIndex).concat(baseList.slice(0, startIndex));
}

export async function processOcrPage(
  page: {
    pageNumber: number;
    pageBlobUrl: string;
    parsedData?: Record<string, unknown> | null;
    toonOutput?: string | null;
    model?: string | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
    finishReason?: string | null;
  },
  jobId: string,
  fileHash: string | null,
  ocrModelsList: OcrModel[],
  rotationMode: string,
  repairModelConfig?: OcrModel,
  toonSchemaTemplate?: string,
  userId?: string | null,
): Promise<OcrPageResult | null> {
  const { pageNumber, pageBlobUrl } = page;

  if (!pageBlobUrl) return null;

  if (page.parsedData) {
    return {
      pageNumber,
      pageBlobUrl,
      rawToon: page.toonOutput ?? "",
      data: page.parsedData,
      model: page.model ?? "",
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason: page.finishReason ?? "",
    };
  }

  // Get sorted candidates list based on rotation mode and page number
  const candidates = getSortedCandidates(ocrModelsList, rotationMode, pageNumber);

  if (candidates.length === 0) {
    throw new Error("No OCR models available for processing");
  }

  let lastError: any = null;
  let lastFailedResult: any = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidateModel = candidates[i];
    console.log(
      `[Workflow] Attempting OCR on page ${pageNumber} using candidate ${i + 1}/${candidates.length}: ${candidateModel.name} (Model ID: ${candidateModel.modelId}, Provider: ${candidateModel.provider})`
    );

    let llmLogs: any[] = [];
    let internalError: any = null;
    let result: any = null;

    try {
      // 1. Run OCR step
      const ocrResponse = await runOcrOnPage(
        pageBlobUrl,
        pageNumber,
        jobId,
        fileHash,
        candidateModel,
        toonSchemaTemplate,
        userId,
      );

      llmLogs = ocrResponse.llmLogs || [];
      internalError = ocrResponse.internalError;

      const { llmLogs: _, internalError: __, ...re } = ocrResponse;
      result = re;

      // If there is an internalError in OCR, throw to trigger fallback
      if (internalError) {
        throw deserializeError(internalError);
      }

      // 2. If parsing failed, attempt repair step
      if (
        result.data.parse_error &&
        !result.data.truncation_error
      ) {
        console.log(
          `[Step] OCR failed validation on page ${pageNumber} with model ${candidateModel.modelId}. calling repairOcrPage for jobId: ${jobId}`,
        );
        const repairResponse = await repairOcrPage(
          pageBlobUrl,
          pageNumber,
          jobId,
          fileHash,
          result.rawToon,
          result.data.error as string,
          candidateModel,
          toonSchemaTemplate,
          userId,
          repairModelConfig,
        );

        // Merge logs
        llmLogs = [...llmLogs, ...(repairResponse.llmLogs || [])];

        const {
          llmLogs: _repairLogs,
          internalError: repairInternalError,
          ...repairedResult
        } = repairResponse;

        result = repairedResult;
        internalError = repairInternalError;

        if (internalError) {
          throw deserializeError(internalError);
        }
      }

      // 3. Check if we still have a parse_error after all extraction and repair attempts
      if (result.data.parse_error) {
        throw new Error(result.data.error || "TOON extraction validation and repair failed");
      }

      // If we got here, this candidate model succeeded. Persist it during workflow finalization.
      console.log(`[Workflow] OCR on page ${pageNumber} succeeded using model ${candidateModel.modelId}`);
      return { ...result, llmLogs };

    } catch (err: any) {
      console.warn(
        `⚠️ OCR candidate ${candidateModel.name} (Model ID: ${candidateModel.modelId}) failed on page ${pageNumber}: ${err.message || err}`
      );
      lastError = err;
      
      // Store the failed result so we can write the last candidate's attempt if all fail
      if (result) {
        lastFailedResult = result;
      } else {
        lastFailedResult = {
          pageNumber,
          pageBlobUrl,
          rawToon: "",
          data: { parse_error: true, error: err.message || String(err) },
          model: candidateModel.modelId,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: "error",
          log: `[Error] ${err.message || String(err)}`,
        };
      }
      
      // Defer log persistence to workflow finalization to keep scan steps DB-light.
      if (llmLogs && llmLogs.length > 0) {
        lastFailedResult = {
          ...lastFailedResult,
          llmLogs: [...(lastFailedResult?.llmLogs || []), ...llmLogs],
        };
      }
    }
  }

  console.error(`🔥 All OCR model candidates exhausted on page ${pageNumber} for jobId: ${jobId}`);
  throw lastError || new Error(`All OCR model candidates exhausted on page ${pageNumber}`);
}
