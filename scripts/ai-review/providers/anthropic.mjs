import { normalizeReviewResult } from "../result.mjs";
import Anthropic from "@anthropic-ai/sdk";
import { parseModelJson } from "./parse-json.mjs";

function isRetryableError(error) {
  if (error?.status === 429 || error?.status === 529) return true;
  const code = error?.cause?.code || error?.code;
  return ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "UND_ERR_SOCKET"].includes(code);
}

function extractContent(response) {
  // Standard Anthropic format: content[].type === "text"
  const textBlock = response.content?.find((item) => item.type === "text");
  if (textBlock?.text) {
    return textBlock.text;
  }

  // Some Anthropic-compatible APIs return content as a plain string
  if (typeof response.content === "string") {
    return response.content;
  }

  // Some APIs (e.g. DeepSeek) return extended thinking blocks without a
  // separate text block. Extract from the last thinking block as fallback.
  const thinkingBlocks = response.content?.filter(
    (item) => item.type === "thinking" && typeof item.thinking === "string",
  );
  if (thinkingBlocks?.length > 0) {
    const lastThinking = thinkingBlocks[thinkingBlocks.length - 1].thinking;
    console.warn("No text block in response; using thinking block content as fallback");
    return lastThinking;
  }

  // Debug: dump structure to help diagnose incompatible APIs
  console.error("Unexpected response structure:", JSON.stringify(response, null, 2).slice(0, 2000));
  return null;
}

export async function generateAnthropicReview({
  apiKey,
  baseUrl,
  model,
  systemPrompt,
  userPrompt,
  minConfidence,
}) {
  const client = new Anthropic({
    apiKey,
    baseURL: baseUrl,
    timeout: 120_000,
  });

  const maxRetries = 3;
  let response;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
}
