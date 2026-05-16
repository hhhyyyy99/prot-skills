export function parseModelJson(content) {
  if (typeof content !== "string") {
    throw new Error("Model response did not include JSON content");
  }

  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (!fencedMatch) {
      throw new Error("Model response did not contain valid JSON");
    }

    return JSON.parse(fencedMatch[1].trim());
  }
}
