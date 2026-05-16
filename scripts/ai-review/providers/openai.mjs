import { normalizeReviewResult } from "../result.mjs";
import OpenAI from "openai";

export async function generateOpenAIReview({ apiKey, baseUrl, model, systemPrompt, userPrompt }) {
  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
  });

  const response = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI review response did not include JSON content");
  }

  return normalizeReviewResult(JSON.parse(content));
}
