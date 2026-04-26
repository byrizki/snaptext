import { OCR_TEXT_MODEL, OCR_VISION_MODEL } from "./app/workflows/ocr/models.ts";
import { VERCEL_AI_GATEWAY_PRICING } from "./lib/constants.ts";

const job = { provider: 'vercel', modelId: 'google/gemini-2.5-flash-lite' };
// Wait, when ocrModels is set, provider might be 'vercel', modelId might be 'google/gemini-2.5-flash-lite'
// The visionModelId calculation:
const visionModelId = (job.provider ? `@${job.provider}/` : '') + (job.modelId || OCR_VISION_MODEL.split('/').slice(1).join('/'));
console.log("visionModelId:", visionModelId);
console.log("OCR_TEXT_MODEL:", OCR_TEXT_MODEL);

const visionPricing = VERCEL_AI_GATEWAY_PRICING[visionModelId as keyof typeof VERCEL_AI_GATEWAY_PRICING] || { input: 0, output: 0 };
const textPricing = VERCEL_AI_GATEWAY_PRICING[OCR_TEXT_MODEL as keyof typeof VERCEL_AI_GATEWAY_PRICING] || { input: 0, output: 0 };

console.log("visionPricing:", visionPricing);
console.log("textPricing:", textPricing);

// if provider is null and modelId is null:
const job2 = { provider: null, modelId: null };
const visionModelId2 = (job2.provider ? `@${job2.provider}/` : '') + (job2.modelId || OCR_VISION_MODEL.split('/').slice(1).join('/'));
console.log("visionModelId2:", visionModelId2);
const visionPricing2 = VERCEL_AI_GATEWAY_PRICING[visionModelId2 as keyof typeof VERCEL_AI_GATEWAY_PRICING] || { input: 0, output: 0 };
console.log("visionPricing2:", visionPricing2);
