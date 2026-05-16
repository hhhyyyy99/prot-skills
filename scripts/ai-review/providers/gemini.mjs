import { normalizeReviewResult } from "../result.mjs";

export async function generateGeminiReview({ apiKey, baseUrl, model, systemPrompt, userPrompt }) {
  const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini review request failed with ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== "string") {
    throw new Error("Gemini review response did not include JSON content");
  }

  return normalizeReviewResult(JSON.parse(content));
}
