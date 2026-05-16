import { normalizeReviewResult } from "../result.mjs";
import Anthropic from "@anthropic-ai/sdk";
import { parseModelJson } from "./parse-json.mjs";

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

  // Fallback: grab any content block that has text-like data
  const anyBlock = response.content?.[0];
  if (anyBlock && typeof anyBlock.text === "string") {
    return anyBlock.text;
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

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0.1,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

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
