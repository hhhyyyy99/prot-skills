import { lstat, mkdir, readlink, symlink, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootFromScript = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type SyncAgentSkillsOptions = {
  rootDir?: string;
  check?: boolean;
};

type SkillLinkChange = {
  name: string;
  action: "create" | "remove";
  linkPath: string;
  targetPath?: string;
};

type SkillLinkConflict = {
  name: string;
  linkPath: string;
  reason: string;
};

function relativeLabel(rootDir: string, filePath: string) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

async function pathExists(filePath: string) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function skillNameFromPath(skillPath: string) {
  return path.basename(skillPath);
}

function assertInsideRoot(rootDir: string, filePath: string) {
  const relative = path.relative(rootDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${filePath} is outside ${rootDir}`);
  }
}

async function listAgentSkillDirs(agentSkillsDir: string) {
  if (!(await pathExists(agentSkillsDir))) return [];

  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(agentSkillsDir, { withFileTypes: true });
  const skillDirs = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) return undefined;
      const skillDir = path.join(agentSkillsDir, entry.name);
      return (await pathExists(path.join(skillDir, "SKILL.md"))) ? skillDir : undefined;
    }),
  );

  return skillDirs
    .filter((skillDir): skillDir is string => Boolean(skillDir))
    .toSorted((left, right) => skillNameFromPath(left).localeCompare(skillNameFromPath(right)));
}

async function listStaleClaudeSkillLinks({
  rootDir,
  agentSkillsDir,
  claudeSkillDir,
  skillNames,
}: {
  rootDir: string;
  agentSkillsDir: string;
  claudeSkillDir: string;
  skillNames: Set<string>;
}) {
  if (!(await pathExists(claudeSkillDir))) return [];

  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(claudeSkillDir, { withFileTypes: true });
  const staleLinks = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isSymbolicLink() || skillNames.has(entry.name)) return undefined;

      const linkPath = path.join(claudeSkillDir, entry.name);
      const targetPath = await readlink(linkPath);
      const absoluteTarget = path.resolve(claudeSkillDir, targetPath);
      const relativeToAgentSkills = path.relative(agentSkillsDir, absoluteTarget);
      const pointsToAgentSkills =
        relativeToAgentSkills !== "" &&
        !relativeToAgentSkills.startsWith("..") &&
        !path.isAbsolute(relativeToAgentSkills);

      if (!pointsToAgentSkills) return undefined;
      assertInsideRoot(rootDir, linkPath);

      return {
        name: entry.name,
        action: "remove" as const,
        linkPath,
      };
    }),
  );

  return staleLinks
    .filter((change): change is SkillLinkChange => Boolean(change))
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

async function inspectClaudeSkillLink({
  rootDir,
  skillDir,
  claudeSkillDir,
}: {
  rootDir: string;
  skillDir: string;
  claudeSkillDir: string;
}): Promise<{ change?: SkillLinkChange; conflict?: SkillLinkConflict }> {
  const name = skillNameFromPath(skillDir);
  const linkPath = path.join(claudeSkillDir, name);
  const targetPath = path.relative(path.dirname(linkPath), skillDir);

  assertInsideRoot(rootDir, linkPath);
  assertInsideRoot(rootDir, skillDir);

  try {
    const stat = await lstat(linkPath);
    if (!stat.isSymbolicLink()) {
      return {
        conflict: {
          name,
          linkPath,
          reason: `${relativeLabel(rootDir, linkPath)} already exists and is not a symlink`,
        },
      };
    }

    const currentTarget = await readlink(linkPath);
    const currentAbsoluteTarget = path.resolve(path.dirname(linkPath), currentTarget);
    const expectedAbsoluteTarget = path.resolve(skillDir);
    if (currentAbsoluteTarget === expectedAbsoluteTarget) return {};

    return {
      conflict: {
        name,
        linkPath,
        reason: `${relativeLabel(rootDir, linkPath)} points to ${currentTarget}, expected ${targetPath}`,
      },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  return {
    change: {
      name,
      action: "create",
      linkPath,
      targetPath,
    },
  };
}

export async function syncAgentSkills({
  rootDir = rootFromScript,
  check = false,
}: SyncAgentSkillsOptions = {}) {
  const agentSkillsDir = path.join(rootDir, ".agents", "skills");
  const claudeSkillDir = path.join(rootDir, ".claude", "skills");
  const skillDirs = await listAgentSkillDirs(agentSkillsDir);
  const skillNames = new Set(skillDirs.map(skillNameFromPath));
  const changes: SkillLinkChange[] = [];
  const conflicts: SkillLinkConflict[] = [];

  for (const skillDir of skillDirs) {
    // eslint-disable-next-line eslint/no-await-in-loop -- sequential filesystem checks keep conflicts readable
    const result = await inspectClaudeSkillLink({ rootDir, skillDir, claudeSkillDir });
    if (result.conflict) conflicts.push(result.conflict);
    if (result.change) changes.push(result.change);
  }

  changes.push(
    ...(await listStaleClaudeSkillLinks({
      rootDir,
      agentSkillsDir,
      claudeSkillDir,
      skillNames,
    })),
  );

  if (conflicts.length > 0) {
    return {
      changed: changes,
      conflicts,
      inSync: false,
    };
  }

  if (!check && changes.length > 0) {
    await mkdir(claudeSkillDir, { recursive: true });
    await Promise.all(
      changes.map(async (change) => {
        if (change.action === "create" && change.targetPath) {
          await symlink(change.targetPath, change.linkPath, "dir");
        } else if (change.action === "remove") {
          await unlink(change.linkPath);
        }
      }),
    );
  }

  return {
    changed: changes,
    conflicts,
    inSync: changes.length === 0,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const result = await syncAgentSkills({ check });

  if (result.conflicts.length > 0) {
    for (const conflict of result.conflicts) {
      console.error(`Skill link conflict for ${conflict.name}: ${conflict.reason}`);
    }
    process.exitCode = 1;
  } else if (result.inSync) {
    console.log("Agent skills are in sync.");
  } else if (check) {
    console.error(
      `Agent skills are out of sync: ${result.changed.map((change) => change.name).join(", ")}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`Synced agent skills: ${result.changed.map((change) => change.name).join(", ")}`);
  }
}
