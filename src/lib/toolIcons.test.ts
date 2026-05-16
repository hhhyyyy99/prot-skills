import { describe, expect, it } from "vitest";
import { resolveToolIcon } from "./toolIcons";
import type { AITool } from "../types";

const BUILTIN_TOOLS = [
  { id: "cursor", name: "Cursor" },
  { id: "trae", name: "Trae" },
  { id: "trae-cn", name: "Trae CN" },
  { id: "claude", name: "Claude" },
  { id: "kiro", name: "Kiro" },
  { id: "codex", name: "Codex" },
  { id: "opencode", name: "OpenCode" },
  { id: "windsurf", name: "Windsurf" },
  { id: "aider", name: "Aider" },
  { id: "continue", name: "Continue" },
  { id: "codeium", name: "Codeium" },
] as const;

function makeTool(overrides: Partial<AITool> = {}): AITool {
  return {
    id: "test-tool",
    name: "Test Tool",
    config_path: "/tmp/test-tool",
    skills_subdir: "skills",
    is_detected: true,
    is_enabled: true,
    ...overrides,
  };
}

describe("resolveToolIcon", () => {
  it("resolves icons for every built-in tool id", () => {
    for (const tool of BUILTIN_TOOLS) {
      expect(resolveToolIcon(makeTool(tool)), tool.id).not.toBeNull();
    }
  });

  it("maps trae-cn to the trae icon", () => {
    const resolved = resolveToolIcon(makeTool({ id: "trae-cn", name: "Trae CN" }));

    expect(resolved).toMatchObject({
      slug: "trae",
      label: "Trae CN",
    });
    expect(resolved?.src).toContain("/trae.svg");
  });

  it("matches opencode by id", () => {
    const resolved = resolveToolIcon(makeTool({ id: "opencode", name: "OpenCode" }));

    expect(resolved).toMatchObject({
      slug: "opencode",
      label: "OpenCode",
    });
    expect(resolved?.src).toContain("/opencode.svg");
  });

  it("uses a bundled local asset for kiro", () => {
    const resolved = resolveToolIcon(makeTool({ id: "kiro", name: "Kiro" }));

    expect(resolved).toMatchObject({
      slug: "kiro",
      label: "Kiro",
    });
    expect(resolved?.src).toContain("/src/assets/tool-icons/kiro.svg");
  });

  it("uses a bundled local asset for aider and continue", () => {
    const aiderResolved = resolveToolIcon(makeTool({ id: "aider", name: "Aider" }));
    const continueResolved = resolveToolIcon(makeTool({ id: "continue", name: "Continue" }));

    expect(aiderResolved?.src).toContain("/src/assets/tool-icons/aider.svg");
    expect(continueResolved?.src).toContain("/src/assets/tool-icons/continue.png");
  });
});
