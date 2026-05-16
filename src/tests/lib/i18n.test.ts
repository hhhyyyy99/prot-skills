import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n";

describe("translate", () => {
  it("returns Simplified Chinese messages and interpolates values", () => {
    expect(translate("zh-CN", "mySkills.meta", { visible: 2, total: 5, enabled: 1 })).toBe(
      "2 / 5 · 已启用 1",
    );
  });

  it("falls back to English when a key is missing in the active language", () => {
    expect(translate("zh-CN", "test.onlyEnglish")).toBe("English fallback");
  });
});
