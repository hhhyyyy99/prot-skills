import { generateAnthropicReview } from "./anthropic.mjs";
import { generateGeminiReview } from "./gemini.mjs";
import { generateOpenAIReview } from "./openai.mjs";

const DEFAULT_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
};

const PROVIDER_CLIENTS = {
  openai: generateOpenAIReview,
  anthropic: generateAnthropicReview,
  gemini: generateGeminiReview,
};

export function validateProviderConfig(config) {
  if (!config.model || !config.apiKey || !config.baseUrl) {
    throw new Error("AI review configuration is incomplete");
  }
}

export function getProviderConfig(env) {
  const provider = env.AI_REVIEW_PROVIDER;
  if (!Object.hasOwn(PROVIDER_CLIENTS, provider)) {
    throw new Error(`Unsupported AI review provider: ${provider}`);
  }

  return {
    provider,
    model: env.AI_REVIEW_MODEL || "",
    apiKey: env.AI_REVIEW_API_KEY || "",
    baseUrl: env.AI_REVIEW_BASE_URL || DEFAULT_BASE_URLS[provider],
  };
}

export function resolveProviderClient(config) {
  return PROVIDER_CLIENTS[config.provider];
}
