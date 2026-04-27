/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OcrModel } from "@/db";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { decodeToon } from "@/lib/toon-parser";
import { DurableAgent } from "@workflow/ai/agent";
import { stepCountIs } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { getStepMetadata, getWritable, RetryableError } from "workflow";
import { OCR_VISION_MODEL } from "../models";
import { buildOcrSystemPrompt } from "../prompts";
import type { OcrPageResult } from "../types";
import { buildToonTools } from "../tools";
import { dbSaveLlmLogsBatch, dbSaveOcrPageResult } from "./db";
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getModelId } from "@/lib/provider-mapping";

const predefinedProvider = {
  google: {
    // thinkingConfig: {
    //   thinkingLevel: "low",
    // },
  } satisfies GoogleGenerativeAIProviderOptions,
};

function getAiModel(
  modelId: string,
  config: Record<string, unknown> = {},
  fileHash?: string | null,
): { model: string | (() => Promise<LanguageModelV3>); providerConfig: any } {
  if (modelId.startsWith("@vercel/")) {
    const actualModelId = modelId.slice("@vercel/".length);
    const [providerId] = actualModelId.split("/");

    return {
      model: actualModelId,
      providerConfig: { ...predefinedProvider, [providerId]: config },
    };
  }

  if (modelId.startsWith("@nvidia/")) {
    const actualModelId = modelId.slice("@nvidia/".length);
    const provider = createOpenAICompatible({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      name: 'nim',
      baseURL: 'https://integrate.api.nvidia.com/v1',
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

async function fetchImageBase64(pageBlobUrl: string): Promise<string> {
  const imageResponse = await fetch(pageBlobUrl);
  if (!imageResponse.ok) {
    throw new Error(
      `Failed to fetch page image: ${imageResponse.status} ${imageResponse.statusText}`,
    );
  }
  return Buffer.from(await imageResponse.arrayBuffer()).toString("base64");
}


export async function runOcrOnPage(
  pageBlobUrl: string,
  pageNumber: number,
  jobId: string,
  fileHash: string | null,
  ocrModelConfig?: OcrModel,
  stopState?: { current: boolean },
  toonSchemaTemplate?: string,
): Promise<OcrPageResult & { log: string; llmLogs: any[]; internalError?: any }> {
  "use step";
  const llmLogs: any[] = [];
  try {
    console.log(
      `[Step] runOcrOnPage started for jobId: ${jobId}, page: ${pageNumber}`,
    );

    const base64Image = await fetchImageBase64(pageBlobUrl);

    const modelId = ocrModelConfig?.modelId ?? OCR_VISION_MODEL;
    const temperature = ocrModelConfig?.temperature;
    const maxTokens = ocrModelConfig?.maxOutputTokens;
    const config = ocrModelConfig?.config ?? {};

    const { model, providerConfig } = getAiModel(modelId, config, fileHash);
    console.log(`[Workflow] Using model: ${modelId}, config: ${JSON.stringify(providerConfig)}`);
    const startedAt = "N/A";

    const agent = new DurableAgent({
      model: model as any,
      instructions: buildOcrSystemPrompt(toonSchemaTemplate),
      temperature,
      maxOutputTokens: maxTokens,
      providerOptions: providerConfig,
    });

    const streamRes = await agent.stream({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: base64Image,
              mediaType: "image/png",
            },
            {
              type: "text",
              text: `Extract all data from this document page (page ${pageNumber}) and output it in TOON format as instructed.`,
            },
          ],
        },
      ],
      stopWhen: stepCountIs(1),
      writable: getWritable({ namespace: `ocr-run-${pageNumber}` }),
      prepareStep: () => {
        if (stopState?.current) return { toolChoice: "none" };
        return {};
      },
      onStepFinish: async (event) => {
        console.log("onStepFinish", event.text, JSON.stringify(event.toolCalls ?? {}));
        llmLogs.push({
          stepName: "ocr_page",
          model: modelId,
          usage: {
            promptTokens: event.usage.inputTokens ?? 0,
            completionTokens: event.usage.outputTokens ?? 0,
            totalTokens: event.usage.totalTokens ?? 0,
          },
          pageNumber,
          rawResponse: event.reasoningText ||  event.text || (event.toolCalls ? JSON.stringify(event.toolCalls) : ""),
        });
      },
    });

    const steps = streamRes.steps;
    const lastStep = steps[steps.length - 1];
    const inputTokens = steps.reduce((acc, step) => acc + (step.usage?.inputTokens ?? 0), 0);
    const outputTokens = steps.reduce((acc, step) => acc + (step.usage?.outputTokens ?? 0), 0);
    const totalTokens = steps.reduce((acc, step) => acc + (step.usage?.totalTokens ?? 0), 0);
    const finishReason = lastStep?.finishReason ?? "";

    console.log(
      `[Agent] Stream finished. Steps: ${steps.length}, Tokens: ${totalTokens} (In: ${inputTokens}, Out: ${outputTokens}), Reason: ${finishReason}`,
    );

    const rawToon = lastStep?.text || "";

    if (finishReason === "length") {
      const truncationMsg = `Output was truncated by the model (max tokens reached). The TOON is incomplete and cannot be decoded. Increase maxOutputTokens or split the page.`;
      console.warn(`[OCR] Truncated output on page ${pageNumber} for jobId: ${jobId}`);
      return {
        pageNumber,
        pageBlobUrl,
        rawToon,
        data: { parse_error: true, truncation_error: true, error: truncationMsg },
        model: modelId,
        usage: { promptTokens: inputTokens, completionTokens: outputTokens, totalTokens },
        finishReason,
        log: `[N/A] TRUNCATED: ${truncationMsg}`,
        llmLogs,
      };
    }

    let rawToon_decoded: Record<string, unknown>;
    let parseError: string | null = null;
    try {
      const trimmed = rawToon.trim();
      rawToon_decoded =
        trimmed === "empty: true"
          ? { empty: true }
          : (decodeToon(trimmed) as Record<string, unknown>);
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
      console.error("[OCR Error] TOON decode failed:", err);
      rawToon_decoded = { raw_text: rawToon, parse_error: true, error: parseError };
    }

    const data = rawToon_decoded;

    const log = [
      `[${startedAt}] OCR started — model: ${modelId}`,
      `[N/A] Raw response: ${rawToon}`,
      `[N/A] OCR complete — finish_reason: ${finishReason} (Steps: ${steps.length})`,
      `[N/A] Tokens — input: ${inputTokens}, output: ${outputTokens}`,
      parseError
        ? `[N/A] TOON parse error: ${parseError}`
        : `[N/A] TOON decoded successfully`,
    ].join("\n");

    const result = {
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
      msg.includes("429") ||
      msg.includes("Too Many Requests") ||
      msg.toLowerCase().includes("rate limit")
    ) {
      const { attempt } = getStepMetadata();
      const delayMs = 30000 + (attempt - 1) * 10000;
      throw new RetryableError(
        "Rate limited by AI provider (429). Please try again later.",
        { retryAfter: `${delayMs}ms` },
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
      internalError: error,
    };
  }
}

export async function repairOcrPage(
  pageBlobUrl: string,
  pageNumber: number,
  jobId: string,
  fileHash: string | null,
  brokenToon: string,
  errorMsg: string,
  ocrModelConfig?: OcrModel,
  stopState?: { current: boolean },
  toonSchemaTemplate?: string,
): Promise<OcrPageResult & { log: string; llmLogs: any[]; internalError?: any }> {
  "use step";
  const llmLogs: any[] = [];
  try {
    console.log(
      `[Step] repairOcrPage started for jobId: ${jobId}, page: ${pageNumber}`,
    );
    const base64Image = await fetchImageBase64(pageBlobUrl);

    const modelId = ocrModelConfig?.modelId ?? OCR_VISION_MODEL;
    const temperature = ocrModelConfig?.temperature;
    const maxTokens = ocrModelConfig?.maxOutputTokens;
    const config = ocrModelConfig?.config ?? {};

    const { model, providerConfig } = getAiModel(modelId, config, fileHash);
    const startedAt = "N/A";

    let parsedResult: { rawToon: string; data: Record<string, unknown> } | null = null;
    let parseError: string | null = null;

    const toonTools = buildToonTools((rawToon, data) => {
      parsedResult = { rawToon, data };
      parseError = null;
    }, stopState, brokenToon);

    const agent = new DurableAgent({
      model: model as any,
      instructions: buildOcrSystemPrompt(toonSchemaTemplate),
      temperature,
      maxOutputTokens: maxTokens,
      providerOptions: providerConfig,
      tools: toonTools,
    });

    const streamRes = await agent.stream({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: base64Image,
              mediaType: "image/png",
            },
            {
              type: "text",
              text: [
                `A TOON extraction failed validation. Your job is to fix it and call validate_toon with the COMPLETE corrected TOON.`,
                ``,
                `ERROR: ${errorMsg}`,
                ``,
                `BROKEN TOON:`,
                `\`\`\``,
                brokenToon,
                `\`\`\``,
                ``,
                `INSTRUCTIONS:`,
                `1. Identify the broken line(s) based on the error message.`,
                `2. Fix ONLY the broken part — preserve all other lines exactly as-is.`,
                `3. Call validate_toon with the COMPLETE corrected TOON. Do NOT call patch_toon first.`,
                `4. If validate_toon still fails, THEN use patch_toon to surgically fix the remaining issue.`,
              ].join("\n"),
            },
          ],
        },
      ],
      stopWhen: stepCountIs(6),
      writable: getWritable({ namespace: `ocr-repair-${pageNumber}` }),
      prepareStep: () => {
        if (stopState?.current) return { toolChoice: "none" };
        return {};
      },
      onStepFinish: async (event) => {
        llmLogs.push({
          stepName: "ocr_repair",
          model: modelId,
          usage: {
            promptTokens: event.usage.inputTokens ?? 0,
            completionTokens: event.usage.outputTokens ?? 0,
            totalTokens: event.usage.totalTokens ?? 0,
          },
          pageNumber,
          rawResponse: event.text || (event.toolCalls ? JSON.stringify(event.toolCalls) : ""),
        });
      },
    });

    const steps = streamRes.steps;
    const lastStep = steps[steps.length - 1];
    const inputTokens = steps.reduce((acc, step) => acc + (step.usage?.inputTokens ?? 0), 0);
    const outputTokens = steps.reduce((acc, step) => acc + (step.usage?.outputTokens ?? 0), 0);
    const totalTokens = steps.reduce((acc, step) => acc + (step.usage?.totalTokens ?? 0), 0);
    const finishReason = lastStep?.finishReason ?? "";

    console.log(
      `[Agent] Repair stream finished. Steps: ${steps.length}, Tokens: ${totalTokens} (In: ${inputTokens}, Out: ${outputTokens}), Reason: ${finishReason}`,
    );

    let rawToon: string;
    let data: Record<string, unknown>;

    if (parsedResult) {
      console.log(`[OCR Repair] Captured via tool callback`);
      rawToon = (parsedResult as { rawToon: string; data: Record<string, unknown> }).rawToon;
      data = (parsedResult as { rawToon: string; data: Record<string, unknown> }).data;
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
      msg.includes("429") ||
      msg.includes("Too Many Requests") ||
      msg.includes("rate_limit") ||
      msg.toLowerCase().includes("rate limit")
    ) {
      const { attempt } = getStepMetadata();
      const delayMs = 30000 + (attempt - 1) * 10000;
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
      internalError: error,
    };
  }
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
  ocrModelConfig?: OcrModel,
  stopState?: { current: boolean },
  toonSchemaTemplate?: string,
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

  try {
    console.log(
      `[Step] Running OCR on page ${pageNumber} using image for jobId: ${jobId}`,
    );
    let { llmLogs, internalError, ...result } = await runOcrOnPage(
      pageBlobUrl,
      pageNumber,
      jobId,
      fileHash,
      ocrModelConfig,
      stopState,
      toonSchemaTemplate,
    );

    if (result.data.parse_error && !internalError && !result.data.truncation_error) {
      if (stopState?.current) {
        console.log(`[Step] Skipping repair — stop requested (page ${pageNumber}, jobId: ${jobId})`);
      } else {
      console.log(`[Step] OCR failed validation on page ${pageNumber}, calling repairOcrPage for jobId: ${jobId}`);
      const repairResponse = await repairOcrPage(
        pageBlobUrl,
        pageNumber,
        jobId,
        fileHash,
        result.rawToon,
        result.data.error as string,
        ocrModelConfig,
        stopState,
        toonSchemaTemplate,
      );

      // Merge logs
      llmLogs = [...(llmLogs || []), ...(repairResponse.llmLogs || [])];
      
      const { llmLogs: _repairLogs, internalError: repairInternalError, ...repairedResult } = repairResponse;
      result = repairedResult;
      internalError = repairInternalError;
      } // end else (not stopped)
    } // end if (parse_error)

    await dbSaveOcrPageResult(jobId, pageNumber, result);

    if (llmLogs && llmLogs.length > 0) {
      await dbSaveLlmLogsBatch(jobId, llmLogs);
    }

    if (internalError) {
      throw internalError;
    }

    return result;
  } catch (error: any) {
    throw error;
  }
}
