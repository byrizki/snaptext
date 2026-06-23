export const getProviderPrefixedModelId = (
  provider: string,
  modelId: string,
) => {
  if (provider === "vercel") return `@vercel/${modelId}`;
  if (provider === "cloudflare") return `@cf/${modelId}`;
  if (provider === "nvidia") return `@nvidia/${modelId}`;
  if (provider === "sumopod") return `@sumopod/${modelId}`;
  return modelId;
};

export const getModelId = (modelId: string) => {
  if (modelId.startsWith("@vercel/")) return modelId.substring("@vercel/".length);
  if (modelId.startsWith("@cf/")) return modelId.substring("@cf/".length);
  if (modelId.startsWith("@nvidia/")) return modelId.substring("@nvidia/".length);
  if (modelId.startsWith("@sumopod/")) return modelId.substring("@sumopod/".length);
  return modelId;
};
