import Anthropic from "@anthropic-ai/sdk";
import { normalizeReviewResult } from "../result.ts";
import { parseModelJson } from "./parse-json.ts";
import type { ReviewProvider } from "../types.ts";

function isRetryableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    status?: number;
    cause?: { code?: string };
    code?: string;
  };
  if (candidate.status === 429 || candidate.status === 529) return true;
  const code = candidate.cause?.code || candidate.code;
  return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "UND_ERR_SOCKET"].includes(
    String(code),
  );
}

function extractContent(response: Anthropic.Messages.Message) {
  const textBlock = response.content.find((item) => item.type === "text");
  if (textBlock && "text" in textBlock && typeof textBlock.text === "string") {
    return textBlock.text;
  }

  if (typeof response.content === "string") {
    return response.content;
  }

  const thinkingBlocks = response.content.filter(
    (item): item is Anthropic.ThinkingBlock =>
      item.type === "thinking" && "thinking" in item && typeof item.thinking === "string",
  );
  if (thinkingBlocks.length > 0) {
    const lastThinking = thinkingBlocks[thinkingBlocks.length - 1].thinking;
    console.warn("No text block in response; using thinking block content as fallback");
    return lastThinking;
  }

  console.error("Unexpected response structure:", JSON.stringify(response, null, 2).slice(0, 2000));
  return null;
}

export const generateAnthropicReview: ReviewProvider = async ({
  apiKey,
  baseUrl,
  model,
  systemPrompt,
  userPrompt,
  minConfidence,
}) => {
  const client = new Anthropic({
    apiKey,
    baseURL: baseUrl,
    timeout: 120_000,
  });

  const maxRetries = 3;
  let response: Anthropic.Messages.Message | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      const delay = 1000 * 2 ** (attempt - 1);
      console.warn(`Retrying model call (attempt ${attempt}/${maxRetries}) after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      response = await client.messages.create({
        model,
        max_tokens: 16384,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      break;
    } catch (error) {
      if (attempt < maxRetries && isRetryableError(error)) {
        continue;
      }
      throw error;
    }
  }

  if (!response) {
    throw new Error("Anthropic review response was not received");
  }

  const content = extractContent(response);
  if (typeof content !== "string") {
    throw new Error("Anthropic review response did not include JSON content");
  }

  try {
    return normalizeReviewResult(parseModelJson(content), {
      minConfidence,
    });
  } catch (error) {
    console.error("Raw model response (first 2000 chars):", content.slice(0, 2000));
    throw error;
  }
};
