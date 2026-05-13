import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Search, RefreshCw, MoreHorizontal } from 'lucide-react';
import { getSkills, toggleSkill, uninstallSkill } from '../api';
import { filterSkills } from '../lib/filter';
import { useToast } from '../hooks/useToast';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { DetailPanel } from '../shell/DetailPanel';
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
import type { Skill } from '../types';

export function MySkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [q, setQ] = useState('');
  const [sourceType, setSourceType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [confirmMode, setConfirmMode] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    getSkills()
      .then(setSkills)
      .catch((e: unknown) => setError(String((e as Error).message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh, refreshTick]);

  const visible = useMemo(() => filterSkills(skills, q, sourceType), [skills, q, sourceType]);
  const enabledCount = useMemo(() => skills.filter(s => s.is_enabled).length, [skills]);
  const selectedSkill = useMemo(() => skills.find(s => s.id === selectedId) ?? null, [skills, selectedId]);

  const sourceOptions = useMemo(() => {
    const types = [...new Set(skills.map(s => s.source_type))];
    return [{ value: 'all', label: 'All' }, ...types.map(t => ({ value: t, label: t }))];
  }, [skills]);

  const toggleSkillHandler = useCallback((id: string, next: boolean) => {
    const prev = skills.map(s => ({ ...s }));
    setSkills(ss => ss.map(s => (s.id === id ? { ...s, is_enabled: next } : s)));
    toggleSkill(id, next).catch((e: unknown) => {
      setSkills(prev);
      toast({ variant: 'error', title: 'Toggle failed', description: String((e as Error).message ?? e) });
    });
  }, [skills, toast]);

  const confirmUninstall = useCallback(() => {
    if (!confirmMode) {
      setConfirmMode(true);
      confirmTimer.current = setTimeout(() => setConfirmMode(false), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmMode(false);
    if (!selectedId) return;
    const id = selectedId;
    uninstallSkill(id)
      .then(() => {
        setSkills(ss => ss.filter(s => s.id !== id));
        setSelectedId(null);
      })
      .catch((e: unknown) => {
        toast({ variant: 'error', title: 'Uninstall failed', description: String((e as Error).message ?? e) });
      });
  }, [confirmMode, selectedId, toast]);

  // Reset confirm mode when selection changes
  useEffect(() => { setConfirmMode(false); }, [selectedId]);

  const renderBody = () => {
    if (error) return <div className="compact-card"><InlineError title="Failed to load Skills" details={error} onRetry={refresh} /></div>;
    if (loading && !skills.length) return <ul>{Array.from({ length: 8 }).map((_, i) => <ListRow key={i} id={`skeleton-${i}`} primary="" loading />)}</ul>;
    if (!loading && skills.length === 0) return <div className="compact-card"><EmptyState title="No Skills installed" description="Install from Discovery or migrate from a local tool" /></div>;
    if (!loading && skills.length > 0 && visible.length === 0) return <div className="compact-card"><EmptyState title="No matches" description="Try a different keyword or clear filters" primaryAction={{ label: 'Clear filters', onClick: () => { setQ(''); setSourceType('all'); } }} /></div>;
    return (
      <ul role="rowgroup">
        {visible.map(skill => (
          <li key={skill.id} onClick={() => setSelectedId(skill.id)} className="cursor-pointer">
            <ListRow
              id={skill.id}
              leading={<Switch checked={skill.is_enabled} onChange={(v) => toggleSkillHandler(skill.id, v)} aria-label={`Toggle ${skill.name}`} />}
              primary={<span className="text-14 text-text-primary">{skill.name}</span>}
              secondary={skill.metadata?.description ? <span className="text-12 text-text-secondary truncate">{skill.metadata.description}</span> : undefined}
              meta={[
                <Badge key="src" variant="neutral">{skill.source_type}</Badge>,
                skill.metadata?.version ? <span key="v" className="text-12 text-text-tertiary">{skill.metadata.version}</span> : null,
              ].filter(Boolean) as readonly React.ReactNode[]}
              trailing={<IconButton icon={<MoreHorizontal size={16} />} aria-label="Actions" variant="subtle" size="sm" />}
              selected={selectedId === skill.id}
              onSelect={() => setSelectedId(skill.id)}
            />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <WorkspaceHeader
        title="My Skills"
        meta={`${visible.length} of ${skills.length} · ${enabledCount} enabled`}
        search={<div className="w-[240px]"><TextField type="search" size="sm" leadingIcon={<Search size={14} />} value={q} onChange={setQ} placeholder="Search skills" /></div>}
        primaryActions={[<IconButton key="r" icon={<RefreshCw size={16} />} aria-label="Refresh" onClick={() => setRefreshTick(t => t + 1)} variant="subtle" size="sm" />]}
      />
      <div className="flex flex-1 min-h-0">
        <main className="app-content">
          <StatsStrip
            items={[
              { label: 'enabled', value: enabledCount, accent: true },
              { label: 'disabled', value: Math.max(skills.length - enabledCount, 0) },
              { label: 'sources', value: Math.max(sourceOptions.length - 1, 0) },
            ]}
          />
          <FilterPills options={sourceOptions} value={sourceType} onChange={setSourceType} ariaLabel="Installed skill filters" />
          <div className="section-kicker">All Skills · {skills.length}</div>
          {renderBody()}
        </main>
        {selectedSkill && (
          <div className="w-[400px] shrink-0 h-full">
            <DetailPanel
              open={selectedSkill !== null}
              onClose={() => setSelectedId(null)}
              title={selectedSkill.name}
              footer={
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm">Open folder</Button>
                  <Button variant="danger" size="sm" onClick={confirmUninstall}>{confirmMode ? 'Confirm uninstall' : 'Uninstall'}</Button>
                </div>
              }
            >
              <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-13">
                {selectedSkill.metadata?.author && <><dt className="text-text-secondary">Author</dt><dd className="text-text-primary">{selectedSkill.metadata.author}</dd></>}
                {selectedSkill.metadata?.description && <><dt className="text-text-secondary">Description</dt><dd className="text-text-primary">{selectedSkill.metadata.description}</dd></>}
                {selectedSkill.metadata?.tags && selectedSkill.metadata.tags.length > 0 && <><dt className="text-text-secondary">Tags</dt><dd className="text-text-primary">{selectedSkill.metadata.tags.join(', ')}</dd></>}
                <dt className="text-text-secondary">Local path</dt><dd className="text-text-primary break-all">{selectedSkill.local_path}</dd>
                <dt className="text-text-secondary">Installed at</dt><dd className="text-text-primary">{selectedSkill.installed_at}</dd>
                <dt className="text-text-secondary">Updated at</dt><dd className="text-text-primary">{selectedSkill.updated_at}</dd>
              </dl>
            </DetailPanel>
          </div>
        )}
      </div>
    </>
  );
}
