import { normalizeReviewResult } from "../result.mjs";
import { resolveOpenAIEndpoint } from "./url.mjs";

export async function generateOpenAIReview({ apiKey, baseUrl, model, systemPrompt, userPrompt }) {
  const response = await fetch(resolveOpenAIEndpoint(baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI review request failed with ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI review response did not include JSON content");
  }

  return normalizeReviewResult(JSON.parse(content));
}
