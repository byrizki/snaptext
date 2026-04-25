import { decode, encode } from "@toon-format/toon";
import { stepCountIs, streamText } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { GoogleLanguageModelOptions } from '@ai-sdk/google';
import { MistralLanguageModelOptions } from '@ai-sdk/mistral';

import {
  OCR_MODEL_MAX_TOKENS,
  OCR_MODEL_TEMPERATURE,
  OCR_TEXT_MODEL,
  OCR_VISION_MODEL
} from "../models";
import {
  buildMergeSystemPrompt,
  buildOcrSystemPrompt,
  buildRepairSystemPrompt,
} from "../prompts";
import { buildFixToonTool, buildMergeTools } from "../tools";
import type { OcrPageResult } from "../types";

const providerOptions = {
  mistral: {
    // reasoningEffort: 'none',
  } satisfies MistralLanguageModelOptions,
  google: {
    thinkingConfig: {
      thinkingLevel: "low",
    },
  } satisfies GoogleLanguageModelOptions,
};

function getAiModel(modelId: string, fileHash?: string | null) {
  if (modelId.startsWith("@vercel/")) {
    return modelId.replace("@vercel/","");
  }

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

  return gateway(modelId, {
    chat_template_kwargs: {
      enable_thinking: false,
    },
    reasoning_effort: "low",
    sessionAffinity: fileHash || undefined
  });
}

export async function runOcrOnPage(
  pageBlobUrl: string,
  pageNumber: number,
  jobId: string,
  fileHash: string | null
): Promise<OcrPageResult & { log: string }> {
  "use step";
  try {
    console.log(`[Step] runOcrOnPage started for jobId: ${jobId}, page: ${pageNumber}`);
    const model = getAiModel(OCR_VISION_MODEL, fileHash);
    const startedAt = new Date().toISOString();

    const imageResponse = await fetch(pageBlobUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch page image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const processedImageBuffer = Buffer.from(imageArrayBuffer);

    const stream = streamText({
      model,
      system: buildOcrSystemPrompt(),
      temperature: OCR_MODEL_TEMPERATURE,
      maxOutputTokens: OCR_MODEL_MAX_TOKENS,
      providerOptions,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: processedImageBuffer, mediaType: "image/png" },
            {
              type: "text",
              text: `Extract all data from this document page (page ${pageNumber}) and output it in TOON format as instructed.`,
            },
          ],
        },
      ],
    });

    const rawToon = await stream.text;
    const usage = await stream.usage;
    let finishReason = (await stream.finishReason) ?? "";

    let inputTokens = usage.inputTokens ?? 0;
    let outputTokens = usage.outputTokens ?? 0;

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
      `[${startedAt}] OCR started — model: ${OCR_VISION_MODEL}`,
      `[${new Date().toISOString()}] OCR complete — finish_reason: ${finishReason} (Attempts: ${attempts})`,
      `[${new Date().toISOString()}] Tokens — input: ${inputTokens}, output: ${outputTokens}`,
      parseError
        ? `[${new Date().toISOString()}] TOON parse error: ${parseError}`
        : `[${new Date().toISOString()}] TOON decoded successfully`,
    ].join("\n");

    const result = {
      pageNumber,
      pageBlobUrl,
      rawToon,
      data,
      model: OCR_VISION_MODEL,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      finishReason,
      log,
    };
    console.log(`[Step] runOcrOnPage completed for jobId: ${jobId}, page: ${pageNumber}`);
    return result;
  } catch (error) {
    console.error(
      `🔥 Error in runOcrOnPage step (page ${pageNumber}) for jobId: ${jobId}`,
      error,
    );
    throw error;
  }
}

export async function repairOcrPageData(
  pageResult: OcrPageResult,
  jobId: string,
  fileHash: string | null
): Promise<OcrPageResult & { log: string }> {
  "use step";

  try {
    const { pageNumber, rawToon, data: initialData } = pageResult;
    console.log(`[Step] repairOcrPageData started for jobId: ${jobId}, page: ${pageNumber}`);
    const parseError = initialData.error as string | undefined;
    const startedAt = new Date().toISOString();
    let attempts = 1;

    const fixModel = getAiModel(OCR_TEXT_MODEL, fileHash);
    let fixedData: Record<string, unknown> | null = null;

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason = "";

    const stream = streamText({
      model: fixModel,
      system: buildRepairSystemPrompt(),
      temperature: OCR_MODEL_TEMPERATURE,
      maxOutputTokens: OCR_MODEL_MAX_TOKENS,
      providerOptions,
      messages: [
        {
          role: "user",
          content: `The following TOON data has a syntax error:\n\n\`\`\`\n${rawToon}\n\`\`\`\n\nError: ${parseError || "Unknown error"}\n\nPlease apply patches to fix it.`,
        },
      ],
      stopWhen: stepCountIs(50),
      tools: {
        patch_invalid_toon: buildFixToonTool(rawToon, (d) => {
          fixedData = d;
        }),
      },
    });

    const steps = await stream.steps;

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
      data = { raw_text: rawToon, parse_error: true, error: "Failed to repair" };
      finalError = "Failed to repair";
    }

    const log = [
      `[${startedAt}] Repair started — model: ${OCR_TEXT_MODEL}`,
      `[${new Date().toISOString()}] Repair complete — finish_reason: ${finishReason} (Repair attempts: ${attempts - 1})`,
      `[${new Date().toISOString()}] Repair Tokens — input: ${inputTokens}, output: ${outputTokens}`,
      finalError
        ? `[${new Date().toISOString()}] Repair failed: ${finalError}`
        : `[${new Date().toISOString()}] TOON repaired successfully`,
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
    console.log(`[Step] repairOcrPageData completed for jobId: ${jobId}, page: ${pageNumber}`);
    return result;
  } catch (error) {
    console.error(
      `🔥 Error in repairOcrPageData step (page ${pageResult.pageNumber}) for jobId: ${jobId}`,
      error,
    );
    throw error;
  }
}

export async function mergePageData(
  pages: OcrPageResult[],
  jobId: string,
  fileHash: string | null
): Promise<{ merged: Record<string, unknown>; usage: any; log: string }> {
  "use step";

  try {
    console.log(`[Step] mergePageData started for ${pages.length} pages for jobId: ${jobId}`);
    if (pages.length === 0) {
      console.log(`[Step] mergePageData skipped (no pages) for jobId: ${jobId}`);
      return { merged: {}, usage: undefined, log: "No pages to merge" };
    }

    const model = getAiModel(OCR_TEXT_MODEL, fileHash);
    const startedAt = new Date().toISOString();

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

    const stream = streamText({
      model,
      system: systemPrompt,
      temperature: OCR_MODEL_TEMPERATURE,
      maxOutputTokens: OCR_MODEL_MAX_TOKENS,
      providerOptions,
      messages: [
        {
          role: "user",
          content: `Here are the subsequent pages to merge:\n\n${subsequentPages}`,
        },
      ],
      stopWhen: stepCountIs(pages.length + 3),
      tools: {
        ...buildMergeTools(
          () => merged,
          (val) => {
            merged = val;
          },
        ),
      },
    });

    const steps = await stream.steps;

    for (const step of steps) {
      inputTokens += step.usage.inputTokens ?? 0;
      outputTokens += step.usage.outputTokens ?? 0;
      finishReason = step.finishReason;
      rawResponse += step.text + "\n";
    }

    const log = [
      `[${startedAt}] Merge started — ${pages.length} pages — model: ${OCR_TEXT_MODEL}`,
      `[${new Date().toISOString()}] Merge complete — finish_reason: ${finishReason}`,
      `[${new Date().toISOString()}] Tokens — input: ${inputTokens}, output: ${outputTokens}`,
      `[${new Date().toISOString()}] Merged JSON generated via TOON tool calls loop`,
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
    throw error;
  }
}
