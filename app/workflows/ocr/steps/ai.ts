import type { OcrModel } from "@/db";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { decode, encode } from "@toon-format/toon";
import { DurableAgent } from "@workflow/ai/agent";
import { stepCountIs } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { getWritable } from "workflow";
import { stopHook } from "../hooks";
import { OCR_TEXT_MODEL, OCR_VISION_MODEL } from "../models";
import {
  buildMergeSystemPrompt,
  buildOcrSystemPrompt,
  buildRepairSystemPrompt,
} from "../prompts";
import { buildFixToonTool, buildMergeTools } from "../tools";
import type { OcrPageResult } from "../types";

const predefinedProvider = {
  google: {
    // thinkingConfig: {
    //   thinkingLevel: "low",
    // },
  } satisfies GoogleGenerativeAIProviderOptions,
};

function getAiModel(
  modelId: string,
  config: any = {},
  fileHash?: string | null,
): { model: string | (() => Promise<LanguageModelV3>), providerConfig: any } {
  if (modelId.startsWith("@vercel/")) {
    const actualModelId = modelId.slice("@vercel/".length);
    const [providerId] = actualModelId.split("/");

    return {
      model: actualModelId,
      providerConfig: { ...predefinedProvider, [providerId]: config },
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
    model: async () => gateway(actualModelId, {
      sessionAffinity: fileHash || undefined,
      ...config,
    }),
    providerConfig: predefinedProvider,
  };
}

export async function fetchPageImageBase64(pageBlobUrl: string): Promise<string> {
  "use step";
  const imageResponse = await fetch(pageBlobUrl);
  if (!imageResponse.ok) {
    throw new Error(
      `Failed to fetch page image: ${imageResponse.status} ${imageResponse.statusText}`,
    );
  }
  const imageArrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(imageArrayBuffer).toString("base64");
}

export async function runOcrOnPage(
  pageBlobUrl: string,
  pageNumber: number,
  jobId: string,
  fileHash: string | null,
  ocrModelConfig?: OcrModel,
  stopState?: { current: boolean },
): Promise<OcrPageResult & { log: string }> {
  try {
    console.log(
      `[Step] runOcrOnPage started for jobId: ${jobId}, page: ${pageNumber}`,
    );
    const modelId = ocrModelConfig?.modelId ?? OCR_VISION_MODEL;
    const temperature = ocrModelConfig?.temperature;
    const maxTokens = ocrModelConfig?.maxOutputTokens;
    const config = ocrModelConfig?.config ?? {};

    const { model, providerConfig } = getAiModel(modelId, config, fileHash);
    const startedAt = "N/A";

    const base64Image = await fetchPageImageBase64(pageBlobUrl);

    const agent = new DurableAgent({
      model: model as any,
      instructions: buildOcrSystemPrompt(),
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
      writable: getWritable({ namespace: 'ocr-run' }),
      prepareStep: () => {
        if (stopState?.current) return { toolChoice: "none" };
        return {};
      },
    });

    const steps = streamRes.steps;
    const lastStep = steps[steps.length - 1];
    const rawToon = lastStep?.text || "";
    let inputTokens = steps.reduce((acc, step) => acc + (step.usage?.inputTokens ?? 0), 0);
    let outputTokens = steps.reduce((acc, step) => acc + (step.usage?.outputTokens ?? 0), 0);
    let finishReason = lastStep?.finishReason ?? "";

    let data: Record<string, unknown> = {};
    let parseError: string | null = null;
    let attempts = 1;

    try {
      const trimmed = rawToon.trim();
      data =
        trimmed === "empty: true"
          ? { empty: true }
          : (decode(trimmed) as Record<string, unknown>);
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
      data = { raw_text: rawToon, parse_error: true, error: parseError };
    }

    const log = [
      `[${startedAt}] OCR started — model: ${modelId}`,
      `[N/A] Raw response: ${rawToon}`,
      `[N/A] OCR complete — finish_reason: ${finishReason} (Attempts: ${attempts})`,
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
        totalTokens: inputTokens + outputTokens,
      },
      finishReason,
      log,
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
    const msg = e?.message || '';
    const status = e?.status || e?.statusCode;
    if (status === 429 || msg.includes('429') || msg.includes('Too Many Requests') || msg.toLowerCase().includes('rate limit')) {
      throw new Error("Rate limited by AI provider (429). Please try again later.");
    }
    throw error;
  }
}

export async function repairOcrPageData(
  pageResult: OcrPageResult,
  jobId: string,
  fileHash: string | null,
  ocrModelConfig?: OcrModel,
  stopState?: { current: boolean },
): Promise<OcrPageResult & { log: string }> {
  try {
    const { pageNumber, rawToon, data: initialData } = pageResult;
    console.log(
      `[Step] repairOcrPageData started for jobId: ${jobId}, page: ${pageNumber}`,
    );
    const parseError = initialData.error as string | undefined;
    const startedAt = "N/A";
    let attempts = 1;

    const modelId = OCR_TEXT_MODEL;
    const temperature = ocrModelConfig?.temperature;
    const maxTokens = ocrModelConfig?.maxOutputTokens;
    const config = ocrModelConfig?.config ?? {};

    const { model: fixModel, providerConfig } = getAiModel(
      modelId,
      config,
      fileHash,
    );
    let fixedData: Record<string, unknown> | null = null;

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason = "";

    const currentToon = () => rawToon;
    const agent = new DurableAgent({
      model: fixModel,
      instructions: buildRepairSystemPrompt(),
      temperature,
      providerOptions: providerConfig,
      maxOutputTokens: maxTokens,
      tools: {
        patch_invalid_toon: buildFixToonTool(currentToon, (d) => {
          fixedData = d;
        }),
      },
    });

    const streamRes = await agent.stream({
      messages: [
        {
          role: "user",
          content: `The following TOON data has a syntax error:\n\n\`\`\`\n${rawToon}\n\`\`\`\n\nError: ${parseError || "Unknown error"}\n\nPlease apply patches to fix it.`,
        },
      ],
      stopWhen: stepCountIs(10),
      writable: getWritable({ namespace: 'ocr-repair' }),
      prepareStep: () => {
        if (stopState?.current) return { toolChoice: "none" };
        return {};
      },
    });

    const steps = streamRes.steps;

    for (const step of steps) {
      inputTokens += step.usage.inputTokens ?? 0;
      outputTokens += step.usage.outputTokens ?? 0;
      finishReason = step.finishReason;
      attempts++;
    }

    let data: Record<string, unknown>;
    let finalError: string | null = null;
    if (fixedData) {
      data = fixedData;
    } else {
      data = {
        raw_text: rawToon,
        parse_error: true,
        error: "Failed to repair",
      };
      finalError = "Failed to repair";
    }

    const log = [
      `[${startedAt}] Repair started — model: ${modelId}`,
      `[N/A] Raw response: ${rawToon}`,
      `[N/A] Repair complete — finish_reason: ${finishReason} (Repair attempts: ${attempts - 1})`,
      `[N/A] Repair Tokens — input: ${inputTokens}, output: ${outputTokens}`,
      finalError
        ? `[N/A] Repair failed: ${finalError}`
        : `[N/A] TOON repaired successfully`,
    ].join("\n");

    const result = {
      ...pageResult,
      data,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      finishReason,
      log,
    };
    console.log(
      `[Step] repairOcrPageData completed for jobId: ${jobId}, page: ${pageNumber}`,
    );
    return result;
  } catch (error) {
    console.error(
      `🔥 Error in repairOcrPageData step (page ${pageResult.pageNumber}) for jobId: ${jobId}`,
      error,
    );
    const e = error as any;
    const msg = e?.message || '';
    const status = e?.status || e?.statusCode;
    if (status === 429 || msg.includes('429') || msg.includes('Too Many Requests') || msg.toLowerCase().includes('rate limit')) {
      throw new Error("Rate limited by AI provider (429). Please try again later.");
    }
    throw error;
  }
}

export async function mergePageData(
  pages: OcrPageResult[],
  jobId: string,
  fileHash: string | null,
  ocrModelConfig?: OcrModel,
  stopState?: { current: boolean },
): Promise<{ merged: Record<string, unknown>; usage: any; log: string }> {
  try {
    console.log(
      `[Step] mergePageData started for ${pages.length} pages for jobId: ${jobId}`,
    );
    if (pages.length === 0) {
      console.log(
        `[Step] mergePageData skipped (no pages) for jobId: ${jobId}`,
      );
      return { merged: {}, usage: undefined, log: "No pages to merge" };
    }

    const modelId = OCR_TEXT_MODEL;
    const temperature = ocrModelConfig?.temperature;
    const maxTokens = ocrModelConfig?.maxOutputTokens;
    const config = ocrModelConfig?.config ?? {};

    const { model, providerConfig } = getAiModel(modelId, config, fileHash);
    const startedAt = "N/A";

    let merged = pages[0].data;
    const subsequentPages = pages
      .slice(1)
      .map((p) => `### Page ${p.pageNumber}\n\`\`\`\n${encode(p.data)}\n\`\`\``)
      .join("\n\n");

    const systemPrompt = `${buildMergeSystemPrompt()}

The initial merged data (from Page 1) is currently:
\`\`\`
${encode(merged)}
\`\`\`

You will receive the data for subsequent pages.`;

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason = "";
    let rawResponse = "";

    let pendingPatchToon = "";
    const getPendingPatch = () => pendingPatchToon;
    const setPendingPatch = (val: string) => { pendingPatchToon = val; };

    const agent = new DurableAgent({
      model: model as any,
      instructions: systemPrompt,
      providerOptions: providerConfig,
      temperature,
      maxOutputTokens: maxTokens,
      tools: {
        ...buildMergeTools(
          getPendingPatch,
          setPendingPatch,
          () => merged,
          (val) => {
            merged = val;
          },
        ),
      },
    });

    const streamRes = await agent.stream({
      messages: [
        {
          role: "user",
          content: `Here are the subsequent pages to merge:\n\n${subsequentPages}`,
        },
      ],
      stopWhen: stepCountIs(pages.length + 10),
      writable: getWritable({ namespace: 'ocr-merge' }),
      prepareStep: () => {
        if (stopState?.current) return { toolChoice: "none" };
        return {};
      },
    });

    const steps = streamRes.steps;

    for (const step of steps) {
      inputTokens += step.usage.inputTokens ?? 0;
      outputTokens += step.usage.outputTokens ?? 0;
      finishReason = step.finishReason;
      rawResponse += step.text + "\n";
    }

    const log = [
      `[${startedAt}] Merge started — ${pages.length} pages — model: ${modelId}`,
      `[N/A] Raw response: ${rawResponse}`,
      `[N/A] Merge complete — finish_reason: ${finishReason}`,
      `[N/A] Tokens — input: ${inputTokens}, output: ${outputTokens}`,
      `[N/A] Merged JSON generated via TOON tool calls loop`,
    ].join("\n");

    console.log(`[Step] mergePageData completed for jobId: ${jobId}`);
    return {
      merged,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        finishReason,
        rawResponse,
      },
      log,
    };
  } catch (error) {
    console.error(`🔥 Error in mergePageData step for jobId: ${jobId}`, error);
    const e = error as any;
    const msg = e?.message || '';
    const status = e?.status || e?.statusCode;
    if (status === 429 || msg.includes('429') || msg.includes('Too Many Requests') || msg.toLowerCase().includes('rate limit')) {
      throw new Error("Rate limited by AI provider (429). Please try again later.");
    }
    throw error;
  }
}
