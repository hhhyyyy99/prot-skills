import type { AITool } from '../types';
import aiderIcon from '../assets/tool-icons/aider.svg';
import continueIcon from '../assets/tool-icons/continue.png';
import kiroIcon from '../assets/tool-icons/kiro.svg';

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
const LOCAL_ICON_SOURCES: Record<string, string> = {
  aider: aiderIcon,
  continue: continueIcon,
  kiro: kiroIcon,
};

const TOOL_ICON_DEFINITIONS: ToolIconDefinition[] = [
  { slug: 'claude', aliases: ['claude', 'anthropic', 'claude-code', 'claudecode'] },
  { slug: 'openai', aliases: ['openai', 'codex', 'chatgpt', 'gpt'], invertInDark: true },
  { slug: 'gemini', aliases: ['gemini', 'google-gemini', 'bard'] },
  { slug: 'cursor', aliases: ['cursor'] },
  { slug: 'windsurf', aliases: ['windsurf', 'codeium'] },
  { slug: 'qwen', aliases: ['qwen', 'tongyi'] },
  { slug: 'trae', aliases: ['trae', 'trae-cn', 'traecn'] },
  { slug: 'aider', aliases: ['aider'] },
  { slug: 'continue', aliases: ['continue'] },
  { slug: 'kiro', aliases: ['kiro'] },
  { slug: 'opencode', aliases: ['opencode', 'open-code'] },
  { slug: 'openrouter', aliases: ['openrouter', 'open-router'] },
];

const CDN_ICON_SLUGS = new Set([
  'claude',
  'openai',
  'gemini',
  'cursor',
  'windsurf',
  'qwen',
  'trae',
  'opencode',
  'openrouter',
]);

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
  const localSrc = LOCAL_ICON_SOURCES[match.slug];
  if (!localSrc && !CDN_ICON_SLUGS.has(match.slug)) return null;

  return {
    slug: match.slug,
    src: localSrc ?? `${CDN_BASE}/${match.slug}.svg`,
    invertInDark: Boolean(match.invertInDark),
    label: tool.name,
  };
}

export function getToolInitial(tool: Pick<AITool, 'name'>) {
  return tool.name.trim().slice(0, 1).toUpperCase() || '?';
}
