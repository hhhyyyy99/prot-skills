import type { AITool } from '../types';

type ToolIconDefinition = {
  slug: string;
  aliases: string[];
  invertInDark?: boolean;
};

type ResolvedToolIcon = {
  slug: string;
  src: string;
  invertInDark: boolean;
  label: string;
};

const CDN_BASE = 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons';

const TOOL_ICON_DEFINITIONS: ToolIconDefinition[] = [
  { slug: 'claude', aliases: ['claude', 'anthropic', 'claude-code', 'claudecode'] },
  { slug: 'openai', aliases: ['openai', 'codex', 'chatgpt', 'gpt'], invertInDark: true },
  { slug: 'gemini', aliases: ['gemini', 'google-gemini', 'bard'] },
  { slug: 'cursor', aliases: ['cursor'] },
  { slug: 'windsurf', aliases: ['windsurf', 'codeium'] },
  { slug: 'qwen', aliases: ['qwen', 'tongyi'] },
  { slug: 'trae', aliases: ['trae'] },
  { slug: 'kiro', aliases: ['kiro'] },
  { slug: 'openrouter', aliases: ['openrouter', 'open-router'] },
];

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildCandidates(tool: Pick<AITool, 'id' | 'name'>) {
  const raw = [tool.id, tool.name].filter(Boolean);
  const normalized = raw.map(normalizeText).filter(Boolean);
  return Array.from(new Set([...raw.map((value) => value.toLowerCase()), ...normalized]));
}

export function resolveToolIcon(tool: Pick<AITool, 'id' | 'name'>): ResolvedToolIcon | null {
  const candidates = buildCandidates(tool);
  const match = TOOL_ICON_DEFINITIONS.find((definition) => (
    definition.aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      return candidates.some((candidate) => candidate === alias || candidate === normalizedAlias);
    })
  ));

  if (!match) return null;

  return {
    slug: match.slug,
    src: `${CDN_BASE}/${match.slug}.svg`,
    invertInDark: Boolean(match.invertInDark),
    label: tool.name,
  };
}

export function getToolInitial(tool: Pick<AITool, 'name'>) {
  return tool.name.trim().slice(0, 1).toUpperCase() || '?';
}
