import { normalizeReviewResult } from "../result.mjs";

export async function generateAnthropicReview({
  apiKey,
  baseUrl,
  model,
  systemPrompt,
  userPrompt,
}) {
  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic review request failed with ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.content?.find((item) => item.type === "text")?.text;
  if (typeof content !== "string") {
    throw new Error("Anthropic review response did not include JSON content");
  }

  return normalizeReviewResult(JSON.parse(content));
}
