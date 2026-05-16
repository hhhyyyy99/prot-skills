import { describe, expect, it } from "vitest";
import { resolveAnthropicEndpoint, resolveOpenAIEndpoint } from "./url.mjs";

describe("provider endpoint resolution", () => {
  it("appends the OpenAI chat completions path for base URLs", () => {
    expect(resolveOpenAIEndpoint("https://api.openai.com/v1")).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
  });

  it("keeps a full OpenAI chat completions URL unchanged", () => {
    expect(resolveOpenAIEndpoint("https://gateway.example.com/chat/completions")).toBe(
      "https://gateway.example.com/chat/completions",
    );
  });

  it("appends the Anthropic messages path for base URLs", () => {
    expect(resolveAnthropicEndpoint("https://api.anthropic.com/v1")).toBe(
      "https://api.anthropic.com/v1/messages",
    );
  });

  it("keeps a full Anthropic messages URL unchanged", () => {
    expect(resolveAnthropicEndpoint("https://api.minimaxi.com/anthropic/messages")).toBe(
      "https://api.minimaxi.com/anthropic/messages",
    );
  });
});
