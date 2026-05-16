import { describe, expect, it } from "vitest";
import { parseModelJson } from "./parse-json.mjs";

describe("parseModelJson", () => {
  it("parses raw JSON", () => {
    expect(parseModelJson('{"summary":"LGTM","findings":[]}')).toEqual({
      summary: "LGTM",
      findings: [],
    });
  });

  it("parses fenced JSON", () => {
    expect(parseModelJson('```json\n{"summary":"LGTM","findings":[]}\n```')).toEqual({
      summary: "LGTM",
      findings: [],
    });
  });

  it("extracts JSON wrapped in explanatory text", () => {
    expect(
      parseModelJson('Here is the review:\n{"summary":"LGTM","findings":[]}\n\nDone.'),
    ).toEqual({ summary: "LGTM", findings: [] });
  });

  it("extracts JSON from fenced block with surrounding text", () => {
    expect(
      parseModelJson('Review results:\n```json\n{"summary":"ok","findings":[]}\n```\nEnd.'),
    ).toEqual({ summary: "ok", findings: [] });
  });

  it("rejects invalid content", () => {
    expect(() => parseModelJson("not json")).toThrow("Model response did not contain valid JSON");
  });
});
