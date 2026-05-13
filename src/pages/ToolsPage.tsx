import { useEffect, useState } from 'react';
import { ScanLine, FolderOpen, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { getTools, detectTools, toggleTool, openFolder, updateToolPath, addTool, deleteTool } from '../api';
import { useToast } from '../hooks/useToast';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { useI18n } from '../shell/LanguageProvider';
import { Button } from '../components/primitives/Button';
import { Switch } from '../components/primitives/Switch';
import { Badge } from '../components/primitives/Badge';
import { Tooltip } from '../components/primitives/Tooltip';
import { IconButton } from '../components/primitives/IconButton';
import { ListRow } from '../components/patterns/ListRow';
import { InlineError } from '../components/patterns/InlineError';
import { EmptyState } from '../components/patterns/EmptyState';
import { StatsStrip } from '../components/patterns/StatsStrip';
import { middleEllipsis } from '../lib/truncate';
import type { AITool } from '../types';

export function ToolsPage() {
  const { t } = useI18n();
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setPendingToggleId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPath, setEditPath] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const { toast } = useToast();

  const refresh = () => {
    setLoading(true);
    setError(null);
    getTools()
      .then(setTools)
      .catch((e: unknown) => setError(String((e as Error).message ?? e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const redetect = () => {
    setDetecting(true);
    detectTools()
      .then(setTools)
      .catch((e: unknown) => {
        const msg = String((e as Error).message ?? e);
        setError(msg);
        toast({ variant: 'error', title: t('tools.error.detect'), description: msg });
      })
      .finally(() => setDetecting(false));
  };

  const handleOpenFolder = (path: string) => {
    openFolder(path).catch((e: unknown) => {
      toast({ variant: 'error', title: t('tools.error.openFolder'), description: String((e as Error).message ?? e) });
    });
  };

  const toggleToolHandler = (id: string, next: boolean) => {
    setPendingToggleId(id);
    const prev = tools.map(t => ({ ...t }));
    setTools(ts => ts.map(t => (t.id === id ? { ...t, is_enabled: next } : t)));
    toggleTool(id, next)
      .catch((e: unknown) => {
        setTools(prev);
        toast({ variant: 'error', title: t('tools.error.toggle'), description: String((e as Error).message ?? e) });
      })
      .finally(() => setPendingToggleId(null));
  };

  const startEdit = (tool: AITool) => {
    setEditingId(tool.id);
    setEditPath(tool.custom_path || tool.config_path);
  };

  const saveEdit = (id: string) => {
    updateToolPath(id, editPath)
      .then(() => {
        setTools(ts => ts.map(t => t.id === id ? { ...t, config_path: editPath, custom_path: editPath } : t));
        setEditingId(null);
        toast({ variant: 'success', title: t('tools.toast.pathUpdated') });
      })
      .catch((e: unknown) => toast({ variant: 'error', title: t('tools.error.update'), description: String((e as Error).message ?? e) }));
  };

  const handleDelete = (tool: AITool) => {
    deleteTool(tool.id)
      .then(() => {
        setTools(ts => ts.filter(x => x.id !== tool.id));
        toast({ variant: 'success', title: t('tools.toast.deleted', { name: tool.name }) });
      })
      .catch((e: unknown) => toast({ variant: 'error', title: t('tools.error.delete'), description: String((e as Error).message ?? e) }));
  };

  const handleAdd = () => {
    if (!newName.trim() || !newPath.trim()) return;
    const id = newName.trim().toLowerCase().replace(/\s+/g, '-');
    addTool(id, newName.trim(), newPath.trim())
      .then((tool) => {
        setTools(ts => [...ts, tool]);
        setShowAdd(false);
        setNewName('');
        setNewPath('');
        toast({ variant: 'success', title: t('tools.toast.added', { name: tool.name }) });
      })
      .catch((e: unknown) => toast({ variant: 'error', title: t('tools.error.add'), description: String((e as Error).message ?? e) }));
  };

  const detectedCount = tools.filter(t => t.is_detected).length;
  const enabledCount = tools.filter(t => t.is_enabled).length;

  return (
    <>
      <WorkspaceHeader
        title={t('nav.tools')}
        meta={t('tools.meta', { detected: detectedCount, enabled: enabledCount })}
        primaryActions={[
          <Button key="add" variant="secondary" size="sm" leadingIcon={<Plus size={14} />} onClick={() => setShowAdd(true)}>{t('common.add')}</Button>,
          <Button key="redetect" variant="primary" size="sm" leadingIcon={<ScanLine size={14} />} loading={detecting} onClick={redetect}>{t('tools.scan')}</Button>,
        ]}
      />
      <main className="app-content">
        <StatsStrip
          items={[
            { label: t('tools.stats.detected'), value: detectedCount, accent: true },
            { label: t('tools.stats.enabled'), value: enabledCount },
            { label: t('tools.stats.total'), value: tools.length },
          ]}
        />

        <div className="section-kicker">{t('tools.section.detected', { count: tools.length })}</div>

        {error && <div className="compact-card mb-4"><InlineError title={t('tools.error.load')} details={error} onRetry={refresh} /></div>}

        {showAdd && (
          <div className="compact-card mb-4 flex flex-col gap-3">
            <p className="text-14 font-medium text-text-primary">{t('tools.form.title')}</p>
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-sm border border-border-subtle bg-surface px-3 py-1.5 text-14 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t('tools.form.namePlaceholder')}
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <input
                className="flex-[2] rounded-sm border border-border-subtle bg-surface px-3 py-1.5 font-mono text-14 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={t('tools.form.pathPlaceholder')}
                value={newPath}
                onChange={e => setNewPath(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setShowAdd(false); setNewName(''); setNewPath(''); }}>{t('common.cancel')}</Button>
              <Button variant="primary" size="sm" onClick={handleAdd} disabled={!newName.trim() || !newPath.trim()}>{t('tools.form.add')}</Button>
            </div>
          </div>
        )}

        {loading && !tools.length && (
          <ul>{Array.from({ length: 4 }).map((_, i) => <ListRow key={i} id={`skeleton-${i}`} primary="" loading />)}</ul>
        )}
        {!loading && !tools.length && !error && (
          <div className="compact-card"><EmptyState title={t('tools.empty.title')} description={t('tools.empty.description')} primaryAction={{ label: t('tools.scan'), onClick: redetect }} /></div>
        )}
        {tools.length > 0 && (
          <ul role="rowgroup">
            {tools.map(tool => (
              <ListRow
                key={tool.id}
                id={tool.id}
                leading={<Switch checked={tool.is_enabled} onChange={(v) => toggleToolHandler(tool.id, v)} disabled={!tool.is_detected} aria-label={t('tools.aria.toggle', { name: tool.name })} />}
                primary={<span className="text-14 text-text-primary">{tool.name}</span>}
                meta={[
                  <Badge key="b" variant={tool.is_detected ? 'success' : 'neutral'}>{tool.is_detected ? t('tools.badge.detected') : t('tools.badge.notFound')}</Badge>,
                  <Tooltip key="p" content={tool.config_path}><code className="font-mono text-12 text-text-secondary">{middleEllipsis(tool.config_path, 40)}</code></Tooltip>,
                ]}
                trailing={
                  editingId === tool.id ? (
                    <span className="flex items-center gap-1" onMouseDown={e => e.preventDefault()}>
                      <input
                        className="px-2 py-0.5 text-12 font-mono rounded border border-border-subtle bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary w-64"
                        value={editPath}
                        onChange={e => setEditPath(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(tool.id); if (e.key === 'Escape') setEditingId(null); }}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                      />
                      <IconButton icon={<Check size={14} />} aria-label={t('common.save')} variant="subtle" size="sm" onClick={() => saveEdit(tool.id)} />
                      <IconButton icon={<X size={14} />} aria-label={t('common.cancel')} variant="subtle" size="sm" onClick={() => setEditingId(null)} />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <IconButton icon={<Pencil size={14} />} aria-label={t('tools.aria.editPath')} variant="subtle" size="sm" onClick={() => startEdit(tool)} />
                      <IconButton icon={<FolderOpen size={16} />} aria-label={t('tools.aria.openPath')} variant="subtle" size="sm" onClick={() => handleOpenFolder(tool.config_path)} />
                      <IconButton icon={<Trash2 size={14} />} aria-label={t('tools.aria.deleteTool')} variant="subtle" size="sm" onClick={() => handleDelete(tool)} />
                    </span>
                  )
                }
              />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
