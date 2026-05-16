import { normalizeReviewResult } from "../result.mjs";
import Anthropic from "@anthropic-ai/sdk";

export async function generateAnthropicReview({
  apiKey,
  baseUrl,
  model,
  systemPrompt,
  userPrompt,
}) {
  const client = new Anthropic({
    apiKey,
    baseURL: baseUrl,
  });

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0.1,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content?.find((item) => item.type === "text")?.text;
  if (typeof content !== "string") {
    throw new Error("Anthropic review response did not include JSON content");
  }

  return normalizeReviewResult(JSON.parse(content));
}
