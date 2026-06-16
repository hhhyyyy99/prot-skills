import { lstat, mkdir, mkdtemp, readlink, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { syncAgentSkills } from "../sync-agent-skills.ts";

async function writeSkill(rootDir: string, name: string) {
  const skillDir = path.join(rootDir, ".agents", "skills", name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    ["---", `name: ${name}`, "description: Fixture skill.", "---", "", `# ${name}`, ""].join("\n"),
  );
}

describe("syncAgentSkills", () => {
  it("creates Claude skill symlinks for repository agent skills", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "sync-agent-skills-"));
    await writeSkill(rootDir, "release-version");

    const result = await syncAgentSkills({ rootDir });

    expect(result.inSync).toBe(false);
    expect(result.changed.map((change) => change.name)).toEqual(["release-version"]);
    expect(result.conflicts).toEqual([]);

    const linkPath = path.join(rootDir, ".claude", "skills", "release-version");
    const stat = await lstat(linkPath);
    expect(stat.isSymbolicLink()).toBe(true);
    expect(await readlink(linkPath)).toBe("../../.agents/skills/release-version");
  });

  it("reports drift without creating links in check mode", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "sync-agent-skills-"));
    await writeSkill(rootDir, "submit-pr");

    const result = await syncAgentSkills({ rootDir, check: true });

    expect(result.inSync).toBe(false);
    expect(result.changed.map((change) => change.name)).toEqual(["submit-pr"]);

    await expect(lstat(path.join(rootDir, ".claude", "skills", "submit-pr"))).rejects.toMatchObject(
      {
        code: "ENOENT",
      },
    );
  });

  it("does not overwrite existing non-symlink Claude skills", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "sync-agent-skills-"));
    await writeSkill(rootDir, "release-tag");
    const existingSkillDir = path.join(rootDir, ".claude", "skills", "release-tag");
    await mkdir(existingSkillDir, { recursive: true });
    await writeFile(path.join(existingSkillDir, "SKILL.md"), "# Existing\n");

    const result = await syncAgentSkills({ rootDir });

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].name).toBe("release-tag");
    expect(result.conflicts[0].reason).toContain("already exists and is not a symlink");
  });

  it("reports symlinks that point to a different target", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "sync-agent-skills-"));
    await writeSkill(rootDir, "release-publish");
    const claudeSkillDir = path.join(rootDir, ".claude", "skills");
    await mkdir(claudeSkillDir, { recursive: true });
    await writeFile(path.join(rootDir, "other-target"), "");
    await symlink("../../other-target", path.join(claudeSkillDir, "release-publish"));

    const result = await syncAgentSkills({ rootDir });

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].name).toBe("release-publish");
    expect(result.conflicts[0].reason).toContain("expected ../../.agents/skills/release-publish");
  });

  it("removes stale Claude symlinks that point into repository agent skills", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "sync-agent-skills-"));
    const claudeSkillDir = path.join(rootDir, ".claude", "skills");
    await mkdir(claudeSkillDir, { recursive: true });
    await symlink("../../.agents/skills/old-skill", path.join(claudeSkillDir, "old-skill"));

    const result = await syncAgentSkills({ rootDir });

    expect(result.changed).toEqual([
      {
        action: "remove",
        linkPath: path.join(claudeSkillDir, "old-skill"),
        name: "old-skill",
      },
    ]);
    await expect(lstat(path.join(claudeSkillDir, "old-skill"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("reports stale managed links in check mode without deleting them", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "sync-agent-skills-"));
    const claudeSkillDir = path.join(rootDir, ".claude", "skills");
    await mkdir(claudeSkillDir, { recursive: true });
    await symlink("../../.agents/skills/old-skill", path.join(claudeSkillDir, "old-skill"));

    const result = await syncAgentSkills({ rootDir, check: true });

    expect(result.changed.map((change) => `${change.action}:${change.name}`)).toEqual([
      "remove:old-skill",
    ]);
    expect((await lstat(path.join(claudeSkillDir, "old-skill"))).isSymbolicLink()).toBe(true);
  });

  it("keeps Claude symlinks that do not point into repository agent skills", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "sync-agent-skills-"));
    const claudeSkillDir = path.join(rootDir, ".claude", "skills");
    await mkdir(claudeSkillDir, { recursive: true });
    await writeFile(path.join(rootDir, "external-skill"), "");
    await symlink("../../external-skill", path.join(claudeSkillDir, "external-skill"));

    const result = await syncAgentSkills({ rootDir });

    expect(result.inSync).toBe(true);
    expect(result.changed).toEqual([]);
    expect(await readlink(path.join(claudeSkillDir, "external-skill"))).toBe(
      "../../external-skill",
    );
  });

  it("ignores entries without a SKILL.md", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "sync-agent-skills-"));
    await mkdir(path.join(rootDir, ".agents", "skills", "README-only"), { recursive: true });

    const result = await syncAgentSkills({ rootDir });

    expect(result.inSync).toBe(true);
    expect(result.changed).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });
});
