import { type LanguageModel } from "ai";
import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";
import { buildSchemaAgentSystemPrompt } from "../prompts";
import { buildSchemaTools } from "../tools";
import { OCR_VISION_MODEL } from "../../ocr/models";
import { createWorkersAI } from "workers-ai-provider";

const predefinedProvider = {
  "vercel-ai-gateway": {
    gatewayUrl: "https://ai-gateway.workflow.run/v1/18165/snaptext",
    apiKey: process.env.AI_GATEWAY_API_KEY,
  },
};

function getAiModel(
  modelId: string,
  config: Record<string, unknown> = {},
  fileHash?: string | null,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): { model: string | (() => Promise<LanguageModel>), providerConfig: any } {
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
      "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN"
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

export async function runSchemaGenerationAgent(
  jobId: string,
  pages: Array<{ pageNumber: number; pageBlobUrl: string }>,
  fileHash: string | null
): Promise<string> {
  "use step";
  console.log(`[Step] runSchemaGenerationAgent started for jobId: ${jobId}`);

  // Use Gemini Flash 2.5 natively via the text/vision model setup
  const { model, providerConfig } = getAiModel(OCR_VISION_MODEL, {}, fileHash);

  let currentSchema = "{}";

  const getPageImage = (num: number) => pages.find((p) => p.pageNumber === num)?.pageBlobUrl;

  const tools = buildSchemaTools(
    getPageImage,
    () => currentSchema,
    (s) => { currentSchema = s; }
  );

  const agent = new DurableAgent({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: model as any,
    instructions: buildSchemaAgentSystemPrompt(pages.length),
    temperature: 0.2,
    providerOptions: providerConfig,
    tools,
  });

  const streamRes = await agent.stream({
    messages: [
      {
        role: "user",
        content: `Start by reading page 1 of the document. Build the JSON schema iteratively and stop when done.`,
      },
    ],
    writable: getWritable({ namespace: 'schema-gen' }),
    stopWhen: (stepRes) => {
      if (stepRes.steps.length >= 15) return true;

      const lastStep = stepRes.steps[stepRes.steps.length - 1];
      // Stop if the last step didn't make any tool calls (the agent just replied with text)
      if (!lastStep.toolCalls || lastStep.toolCalls.length === 0) {
        return true;
      }
      return false;
    },
  });

  // Exhaust the stream to complete it
  for (const _step of streamRes.steps) {
    // iterate
  }

  const resultSchema = currentSchema;

  try {
    JSON.parse(resultSchema);
    return resultSchema;
  } catch (_err) {
    return "{}";
  }
}
