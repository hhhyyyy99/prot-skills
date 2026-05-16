import { generateAnthropicReview } from "./anthropic.ts";
import { generateOpenAIReview } from "./openai.ts";
import type { AIReviewEnv, ProviderConfig, ProviderName, ReviewProvider } from "../types.ts";

const DEFAULT_BASE_URLS: Record<ProviderName, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
};

const PROVIDER_CLIENTS: Record<ProviderName, ReviewProvider> = {
  openai: generateOpenAIReview,
  anthropic: generateAnthropicReview,
};

export function validateProviderConfig(config: ProviderConfig) {
  if (!config.model || !config.apiKey || !config.baseUrl) {
    throw new Error("AI review configuration is incomplete");
  }
}

export function getProviderConfig(env: AIReviewEnv): ProviderConfig {
  const provider = env.AI_REVIEW_PROVIDER;
  if (provider !== "openai" && provider !== "anthropic") {
    throw new Error(`Unsupported AI review provider: ${provider}`);
  }

  return {
    provider,
    model: env.AI_REVIEW_MODEL || "",
    apiKey: env.AI_REVIEW_API_KEY || "",
    baseUrl: env.AI_REVIEW_BASE_URL || DEFAULT_BASE_URLS[provider],
  };
}

export function resolveProviderClient(config: ProviderConfig) {
  return PROVIDER_CLIENTS[config.provider];
}
