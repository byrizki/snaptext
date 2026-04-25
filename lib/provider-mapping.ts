export const getProviderPrefixedModelId = (
  provider: string,
  modelId: string,
) => {
  if (provider === "vercel") return `@vercel/${modelId}`;
  if (provider === "cloudflare") return `@cf/${modelId}`;
  return modelId;
};

export const getModelId = (modelId: string) => {
  if (modelId.startsWith("@vercel/")) return modelId.substring("@vercel/".length);
  if (modelId.startsWith("@cf/")) return modelId.substring("@cf/".length);
  return modelId;
};
