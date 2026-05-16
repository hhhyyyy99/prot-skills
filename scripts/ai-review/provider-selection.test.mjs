import { describe, expect, it } from "vitest";
import {
  getProviderConfig,
  resolveProviderClient,
  validateProviderConfig,
} from "./providers/index.mjs";

describe("ai review provider config", () => {
  it("builds OpenAI provider config from environment", () => {
    const config = getProviderConfig({
      AI_REVIEW_PROVIDER: "openai",
      AI_REVIEW_MODEL: "gpt-4.1-mini",
      AI_REVIEW_API_KEY: "openai-key",
    });

    expect(config).toEqual({
      provider: "openai",
      model: "gpt-4.1-mini",
      apiKey: "openai-key",
      baseUrl: "https://api.openai.com/v1",
    });
  });

  it("builds Anthropic provider config from environment", () => {
    const config = getProviderConfig({
      AI_REVIEW_PROVIDER: "anthropic",
      AI_REVIEW_MODEL: "claude-3-7-sonnet-latest",
      AI_REVIEW_API_KEY: "anthropic-key",
    });

    expect(config).toEqual({
      provider: "anthropic",
      model: "claude-3-7-sonnet-latest",
      apiKey: "anthropic-key",
      baseUrl: "https://api.anthropic.com/v1",
    });
  });

  it("builds Gemini provider config from environment", () => {
    const config = getProviderConfig({
      AI_REVIEW_PROVIDER: "gemini",
      AI_REVIEW_MODEL: "gemini-2.5-pro",
      AI_REVIEW_API_KEY: "gemini-key",
    });

    expect(config).toEqual({
      provider: "gemini",
      model: "gemini-2.5-pro",
      apiKey: "gemini-key",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    });
  });

  it("rejects unknown providers", () => {
    expect(() =>
      getProviderConfig({
        AI_REVIEW_PROVIDER: "unknown",
        AI_REVIEW_MODEL: "x",
        AI_REVIEW_API_KEY: "key",
      }),
    ).toThrow("Unsupported AI review provider");
  });

  it("rejects missing model and api key", () => {
    expect(() =>
      validateProviderConfig({
        provider: "openai",
        model: "",
        apiKey: "",
        baseUrl: "https://api.openai.com/v1",
      }),
    ).toThrow("AI review configuration is incomplete");
  });

  it("resolves a provider client for each supported protocol", () => {
    expect(
      resolveProviderClient({
        provider: "openai",
        model: "gpt-4.1-mini",
        apiKey: "key",
        baseUrl: "https://api.openai.com/v1",
      }).name,
    ).toBe("generateOpenAIReview");

    expect(
      resolveProviderClient({
        provider: "anthropic",
        model: "claude-3-7-sonnet-latest",
        apiKey: "key",
        baseUrl: "https://api.anthropic.com/v1",
      }).name,
    ).toBe("generateAnthropicReview");

    expect(
      resolveProviderClient({
        provider: "gemini",
        model: "gemini-2.5-pro",
        apiKey: "key",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      }).name,
    ).toBe("generateGeminiReview");
  });
});
