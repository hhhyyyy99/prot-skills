export function parseModelJson(content) {
  if (typeof content !== "string") {
    throw new Error("Model response did not include JSON content");
  }

  const trimmed = content.trim();

  // 1. Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Try fenced code block
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {}
  }

  // 3. Try extracting the first top-level JSON object or array
  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {}
  }

  throw new Error("Model response did not contain valid JSON");
}
