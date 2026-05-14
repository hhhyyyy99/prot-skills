import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { FolderOpen, RefreshCw, Search, Trash2, X } from 'lucide-react';
import {
  getSkillLinks,
  getSkills,
  getTools,
  openFolder,
  setAllSkillToolLinks,
  setSkillToolLink,
  uninstallSkill,
} from '../api';
import { filterSkills } from '../lib/filter';
import { useToast } from '../hooks/useToast';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { useI18n } from '../shell/LanguageProvider';
import { TextField } from '../components/primitives/TextField';
import { Switch } from '../components/primitives/Switch';
import { Badge } from '../components/primitives/Badge';
import { Button } from '../components/primitives/Button';
import { IconButton } from '../components/primitives/IconButton';
import { ListRow } from '../components/patterns/ListRow';
import { InlineError } from '../components/patterns/InlineError';
import { EmptyState } from '../components/patterns/EmptyState';
import { FilterPills } from '../components/patterns/FilterPills';
import { StatsStrip } from '../components/patterns/StatsStrip';
import type { AITool, Skill, SkillLink } from '../types';

type LinkFilter = 'all' | 'linked' | 'unlinked';

const LOCAL_SOURCE = 'local';

function isLocalSource(sourceType: string) {
  return sourceType.trim().toLowerCase() === LOCAL_SOURCE;
}

export function MySkillsPage() {
  const { t } = useI18n();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tools, setTools] = useState<AITool[]>([]);
  const [linksBySkill, setLinksBySkill] = useState<Record<string, SkillLink[]>>({});
  const [q, setQ] = useState('');
  const [sourceType, setSourceType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [confirmSkillId, setConfirmSkillId] = useState<string | null>(null);
  const [syncSkillId, setSyncSkillId] = useState<string | null>(null);
  const [toolQuery, setToolQuery] = useState('');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all');
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getSkills(), getTools()])
      .then(async ([nextSkills, nextTools]) => {
        setSkills(nextSkills);
        setTools(nextTools);

        const linkEntries = await Promise.all(
          nextSkills.map(async (skill) => {
            try {
              const links = await getSkillLinks(skill.id);
              return [skill.id, links] as const;
            } catch (e) {
              toast({
                variant: 'error',
                title: t('mySkills.error.links'),
                description: String((e as Error).message ?? e),
              });
              return [skill.id, []] as const;
            }
          })
        );
        setLinksBySkill(Object.fromEntries(linkEntries));
      })
      .catch((e: unknown) => setError(String((e as Error).message ?? e)))
      .finally(() => setLoading(false));
  }, [toast, t]);

  useEffect(() => { refresh(); }, [refresh, refreshTick]);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  const visible = useMemo(() => filterSkills(skills, q, sourceType), [skills, q, sourceType]);
  const enabledCount = useMemo(() => skills.filter(s => s.is_enabled).length, [skills]);
  const linkCount = useMemo(
    () => Object.values(linksBySkill).reduce((sum, links) => sum + links.filter(link => link.is_active).length, 0),
    [linksBySkill]
  );
  const enabledTools = useMemo(() => tools.filter(tool => tool.is_enabled), [tools]);
  const syncSkill = useMemo(() => skills.find(skill => skill.id === syncSkillId) ?? null, [skills, syncSkillId]);

  const sourceOptions = useMemo(() => {
    const types = [...new Set(skills.map(s => s.source_type).filter(type => !isLocalSource(type)))];
    return [{ value: 'all', label: t('mySkills.filters.all') }, ...types.map(type => ({ value: type, label: type }))];
  }, [skills, t]);
  const showSourceFilters = sourceOptions.length > 1;

  const getActiveLinks = useCallback((skillId: string) => {
    return (linksBySkill[skillId] ?? []).filter(link => link.is_active);
  }, [linksBySkill]);

  const isToolLinked = useCallback((skillId: string, toolId: string) => {
    return getActiveLinks(skillId).some(link => link.tool_id === toolId);
  }, [getActiveLinks]);

  const isLinkedToAllEnabledTools = useCallback((skillId: string) => {
    return enabledTools.length > 0 && enabledTools.every(tool => isToolLinked(skillId, tool.id));
  }, [enabledTools, isToolLinked]);

  const handleOpenFolder = useCallback((skill: Skill) => {
    openFolder(skill.local_path).catch((e: unknown) => {
      toast({
        variant: 'error',
        title: t('mySkills.error.openFolder'),
        description: String((e as Error).message ?? e),
      });
    });
  }, [toast, t]);

  const confirmUninstall = useCallback((skill: Skill) => {
    if (confirmSkillId !== skill.id) {
      setConfirmSkillId(skill.id);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmSkillId(null), 3000);
      return;
    }

    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmSkillId(null);
    uninstallSkill(skill.id)
      .then(() => {
        setSkills(ss => ss.filter(s => s.id !== skill.id));
        setLinksBySkill(current => {
          const next = { ...current };
          delete next[skill.id];
          return next;
        });
        if (syncSkillId === skill.id) setSyncSkillId(null);
      })
      .catch((e: unknown) => {
        toast({ variant: 'error', title: t('mySkills.error.uninstall'), description: String((e as Error).message ?? e) });
      });
  }, [confirmSkillId, syncSkillId, toast, t]);

  const openSyncDialog = useCallback((skillId: string) => {
    setSyncSkillId(skillId);
    setToolQuery('');
    setLinkFilter('all');
  }, []);

  const closeSyncDialog = useCallback(() => setSyncSkillId(null), []);

  const toggleToolLink = useCallback((skill: Skill, tool: AITool, active: boolean) => {
    const prev = linksBySkill;
    const previousLinks = prev[skill.id] ?? [];
    const optimisticLink: SkillLink = {
      id: Date.now(),
      skill_id: skill.id,
      tool_id: tool.id,
      link_path: `${tool.config_path}/${tool.skills_subdir}/${skill.id}`,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setLinksBySkill(current => {
      const existing = current[skill.id] ?? [];
      const nextLinks = active
        ? [...existing.filter(link => link.tool_id !== tool.id), optimisticLink]
        : existing.filter(link => link.tool_id !== tool.id);
      return { ...current, [skill.id]: nextLinks };
    });

    setSkillToolLink(skill.id, tool.id, active)
      .then((link) => {
        setLinksBySkill(current => {
          const existing = current[skill.id] ?? [];
          const nextLinks = active && link
            ? [...existing.filter(item => item.tool_id !== tool.id), link]
            : existing.filter(item => item.tool_id !== tool.id);
          return { ...current, [skill.id]: nextLinks };
        });
        toast({
          variant: 'success',
          title: active
            ? t('mySkills.toast.linked', { skill: skill.name, tool: tool.name })
            : t('mySkills.toast.unlinked', { tool: tool.name }),
        });
      })
      .catch((e: unknown) => {
        setLinksBySkill(current => ({ ...current, [skill.id]: previousLinks }));
        toast({
          variant: 'error',
          title: t('mySkills.error.linkUpdate'),
          description: String((e as Error).message ?? e),
        });
      });
  }, [linksBySkill, toast, t]);

  const setAllToolLinks = useCallback((skill: Skill, active: boolean) => {
    const prev = linksBySkill;
    const optimisticLinks = active
      ? enabledTools.map((tool, index): SkillLink => ({
        id: Date.now() + index,
        skill_id: skill.id,
        tool_id: tool.id,
        link_path: `${tool.config_path}/${tool.skills_subdir}/${skill.id}`,
        is_active: true,
        created_at: new Date().toISOString(),
      }))
      : [];

    setLinksBySkill(current => ({ ...current, [skill.id]: optimisticLinks }));

    setAllSkillToolLinks(skill.id, active)
      .then((links) => {
        setLinksBySkill(current => ({ ...current, [skill.id]: links }));
        toast({
          variant: 'success',
          title: active ? t('mySkills.toast.linkedAll') : t('mySkills.toast.unlinkedAll'),
        });
      })
      .catch((e: unknown) => {
        setLinksBySkill(prev);
        toast({
          variant: 'error',
          title: t('mySkills.error.linkUpdate'),
          description: String((e as Error).message ?? e),
        });
      });
  }, [enabledTools, linksBySkill, toast, t]);

  const renderSkillSubtitle = (skill: Skill) => {
    const parts = [
      isLocalSource(skill.source_type) ? null : skill.source_type,
      skill.metadata?.version,
      skill.metadata?.description,
    ].filter(Boolean);

    return parts.length > 0
      ? <span className="text-12 text-text-tertiary truncate">{parts.join(' · ')}</span>
      : undefined;
  };

  const renderBody = () => {
    if (error) return <div className="compact-card"><InlineError title={t('mySkills.error.load')} details={error} onRetry={refresh} /></div>;
    if (loading && !skills.length) return <ul>{Array.from({ length: 8 }).map((_, i) => <ListRow key={i} id={`skeleton-${i}`} primary="" loading />)}</ul>;
    if (!loading && skills.length === 0) return <div className="compact-card"><EmptyState title={t('mySkills.empty.installed')} description={t('mySkills.empty.installed.description')} /></div>;
    if (!loading && skills.length > 0 && visible.length === 0) return <div className="compact-card"><EmptyState title={t('mySkills.empty.matches')} description={t('mySkills.empty.matches.description')} primaryAction={{ label: t('mySkills.empty.matches.clear'), onClick: () => { setQ(''); setSourceType('all'); } }} /></div>;
    return (
      <ul role="rowgroup">
        {visible.map(skill => (
          <li key={skill.id}>
            <ListRow
              id={skill.id}
              primary={<span className="text-14 text-text-primary">{skill.name}</span>}
              secondary={renderSkillSubtitle(skill)}
              trailing={
                <span className="flex items-center gap-2">
                  <IconButton
                    icon={<FolderOpen size={16} />}
                    aria-label={t('mySkills.aria.openFolder', { name: skill.name })}
                    variant="subtle"
                    size="sm"
                    onClick={() => handleOpenFolder(skill)}
                  />
                  <IconButton
                    icon={<Trash2 size={15} />}
                    aria-label={t('mySkills.aria.uninstall', { name: skill.name })}
                    title={confirmSkillId === skill.id ? t('mySkills.confirmUninstall') : t('mySkills.uninstall')}
                    variant="subtle"
                    size="sm"
                    className="text-danger hover:text-danger"
                    onClick={() => confirmUninstall(skill)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openSyncDialog(skill.id)}
                    aria-label={t('mySkills.aria.syncTargets', { name: skill.name })}
                  >
                    {t('mySkills.syncTargets')}
                  </Button>
                  <Switch
                    checked={isLinkedToAllEnabledTools(skill.id)}
                    onChange={(next) => setAllToolLinks(skill, next)}
                    aria-label={t('mySkills.aria.syncAllTargets', { name: skill.name })}
                    disabled={enabledTools.length === 0 || !skill.is_enabled}
                  />
                </span>
              }
              selected={syncSkillId === skill.id}
            />
          </li>
        ))}
      </ul>
    );
  };

  const filterOptions = [
    { value: 'all', label: t('mySkills.sync.allTools') },
    { value: 'linked', label: t('mySkills.sync.linked') },
    { value: 'unlinked', label: t('mySkills.sync.unlinked') },
  ];

  const modalTools = useMemo(() => {
    if (!syncSkill) return [];
    const query = toolQuery.trim().toLowerCase();
    return enabledTools
      .filter(tool => {
        const linked = isToolLinked(syncSkill.id, tool.id);
        if (linkFilter === 'linked' && !linked) return false;
        if (linkFilter === 'unlinked' && linked) return false;
        if (!query) return true;
        return `${tool.name} ${tool.id} ${tool.config_path}`.toLowerCase().includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [enabledTools, isToolLinked, linkFilter, syncSkill, toolQuery]);

  const renderToolRows = () => {
    if (!syncSkill) return null;
    return modalTools.map(tool => {
      const linked = isToolLinked(syncSkill.id, tool.id);
      return (
        <div key={tool.id} className="grid min-h-[58px] grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-border-subtle px-3 py-2 first:border-t-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-border-subtle bg-surface-raised text-12 font-bold text-text-secondary">
            {tool.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-13 font-semibold text-text-primary">{tool.name}</span>
              {linked && <Badge variant="success">{t('mySkills.sync.linked')}</Badge>}
            </span>
            <span className="block truncate text-12 text-text-tertiary">{tool.config_path}/{tool.skills_subdir}/{syncSkill.id}</span>
          </span>
          <Switch
            checked={linked}
            onChange={(next) => toggleToolLink(syncSkill, tool, next)}
            aria-label={t('mySkills.aria.linkTool', { skill: syncSkill.name, tool: tool.name })}
          />
        </div>
      );
    });
  };

  return (
    <>
      <WorkspaceHeader
        title={t('nav.mySkills')}
        meta={t('mySkills.meta', { visible: visible.length, total: skills.length, enabled: enabledCount })}
        search={<div className="w-[240px]"><TextField type="search" size="sm" leadingIcon={<Search size={14} />} value={q} onChange={setQ} placeholder={t('mySkills.searchPlaceholder')} /></div>}
        primaryActions={[<IconButton key="r" icon={<RefreshCw size={16} />} aria-label={t('mySkills.refresh')} onClick={() => setRefreshTick(tick => tick + 1)} variant="subtle" size="sm" />]}
      />
      <main className="app-content">
        <StatsStrip
          items={[
            { label: t('mySkills.stats.enabled'), value: enabledCount, accent: true },
            { label: t('mySkills.stats.links'), value: linkCount },
            { label: t('discovery.stats.tools'), value: enabledTools.length },
          ]}
        />
        {showSourceFilters && <FilterPills options={sourceOptions} value={sourceType} onChange={setSourceType} ariaLabel={t('mySkills.filters.aria')} />}
        <div className="section-kicker">{t('mySkills.section.all', { count: skills.length })}</div>
        {renderBody()}
      </main>
      {syncSkill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/30 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t('mySkills.sync.title', { name: syncSkill.name })}
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeSyncDialog(); }}
          onKeyDown={(event) => { if (event.key === 'Escape') closeSyncDialog(); }}
        >
          <section className="flex max-h-[calc(100vh-56px)] w-[min(860px,calc(100vw-48px))] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-overlay">
            <header className="flex items-start justify-between gap-4 border-b border-border-subtle p-5">
              <div>
                <h2 className="text-16 font-bold text-text-primary">{t('mySkills.sync.title', { name: syncSkill.name })}</h2>
                <p className="mt-1 text-12 text-text-tertiary">{t('mySkills.sync.subtitle')}</p>
              </div>
              <IconButton icon={<X size={16} />} aria-label={t('common.close')} onClick={closeSyncDialog} />
            </header>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-surface-raised/70 p-4">
              <FilterPills options={filterOptions} value={linkFilter} onChange={(value) => setLinkFilter(value as LinkFilter)} ariaLabel={t('mySkills.sync.allTools')} />
              <div className="w-[240px] max-w-full">
                <TextField type="search" size="sm" leadingIcon={<Search size={14} />} value={toolQuery} onChange={setToolQuery} placeholder={t('mySkills.sync.searchTools')} />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <section>
                <div className="mb-2 flex items-center justify-between text-11 font-semibold uppercase tracking-[0.07em] text-text-tertiary">
                  <span>{t('mySkills.sync.enabledTools')}</span>
                  <span>{t('mySkills.sync.totalTools', { count: modalTools.length })}</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
                  {modalTools.length > 0
                    ? renderToolRows()
                    : <div className="p-6 text-center text-13 text-text-tertiary">{t('mySkills.empty.matches')}</div>}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
