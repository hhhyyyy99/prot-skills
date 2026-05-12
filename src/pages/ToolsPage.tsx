import { useEffect, useState } from 'react';
import { ScanLine, FolderOpen, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { getTools, detectTools, toggleTool, openFolder, updateToolPath, addTool, deleteTool } from '../api';
import { useToast } from '../hooks/useToast';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { Button } from '../components/primitives/Button';
import { Switch } from '../components/primitives/Switch';
import { Badge } from '../components/primitives/Badge';
import { Tooltip } from '../components/primitives/Tooltip';
import { IconButton } from '../components/primitives/IconButton';
import { ListRow } from '../components/patterns/ListRow';
import { InlineError } from '../components/patterns/InlineError';
import { EmptyState } from '../components/patterns/EmptyState';
import { middleEllipsis } from '../lib/truncate';
import type { AITool } from '../types';

export function ToolsPage() {
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
        toast({ variant: 'error', title: 'Detection failed', description: msg });
      })
      .finally(() => setDetecting(false));
  };

  const handleOpenFolder = (path: string) => {
    openFolder(path).catch((e: unknown) => {
      toast({ variant: 'error', title: 'Failed to open folder', description: String((e as Error).message ?? e) });
    });
  };

  const toggleToolHandler = (id: string, next: boolean) => {
    setPendingToggleId(id);
    const prev = tools.map(t => ({ ...t }));
    setTools(ts => ts.map(t => (t.id === id ? { ...t, is_enabled: next } : t)));
    toggleTool(id, next)
      .catch((e: unknown) => {
        setTools(prev);
        toast({ variant: 'error', title: 'Toggle failed', description: String((e as Error).message ?? e) });
      })
      .finally(() => setPendingToggleId(null));
  };

  const startEdit = (t: AITool) => {
    setEditingId(t.id);
    setEditPath(t.custom_path || t.config_path);
  };

  const saveEdit = (id: string) => {
    updateToolPath(id, editPath)
      .then(() => {
        setTools(ts => ts.map(t => t.id === id ? { ...t, config_path: editPath, custom_path: editPath } : t));
        setEditingId(null);
        toast({ variant: 'success', title: 'Path updated' });
      })
      .catch((e: unknown) => toast({ variant: 'error', title: 'Update failed', description: String((e as Error).message ?? e) }));
  };

  const handleDelete = (t: AITool) => {
    deleteTool(t.id)
      .then(() => {
        setTools(ts => ts.filter(x => x.id !== t.id));
        toast({ variant: 'success', title: `Deleted ${t.name}` });
      })
      .catch((e: unknown) => toast({ variant: 'error', title: 'Delete failed', description: String((e as Error).message ?? e) }));
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
        toast({ variant: 'success', title: `Added ${tool.name}` });
      })
      .catch((e: unknown) => toast({ variant: 'error', title: 'Add failed', description: String((e as Error).message ?? e) }));
  };

  const detectedCount = tools.filter(t => t.is_detected).length;
  const enabledCount = tools.filter(t => t.is_enabled).length;

  return (
    <>
      <WorkspaceHeader
        title="Tools"
        meta={`${detectedCount} detected · ${enabledCount} enabled`}
        primaryActions={[
          <Button key="add" variant="secondary" size="sm" leadingIcon={<Plus size={14} />} onClick={() => setShowAdd(true)}>Add</Button>,
          <Button key="redetect" variant="primary" size="sm" leadingIcon={<ScanLine size={14} />} loading={detecting} onClick={redetect}>Scan tools</Button>,
        ]}
      />
      <main className="px-8 py-4 overflow-y-auto flex-1">
        {error && <div className="mb-4"><InlineError title="Failed to load tools" details={error} onRetry={refresh} /></div>}

        {showAdd && (
          <div className="mb-4 p-4 border border-border-subtle rounded-lg bg-surface-secondary flex flex-col gap-3">
            <p className="text-14 font-medium text-text-primary">Add New Tool</p>
            <div className="flex gap-3">
              <input
                className="flex-1 px-3 py-1.5 text-14 rounded border border-border-subtle bg-surface-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                placeholder="Name (e.g. MyTool)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <input
                className="flex-[2] px-3 py-1.5 text-14 rounded border border-border-subtle bg-surface-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary font-mono"
                placeholder="Config path (e.g. ~/.mytool)"
                value={newPath}
                onChange={e => setNewPath(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setShowAdd(false); setNewName(''); setNewPath(''); }}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleAdd} disabled={!newName.trim() || !newPath.trim()}>Add Tool</Button>
            </div>
          </div>
        )}

        {loading && !tools.length && (
          <ul>{Array.from({ length: 4 }).map((_, i) => <ListRow key={i} id={`skeleton-${i}`} primary="" loading />)}</ul>
        )}
        {!loading && !tools.length && !error && (
          <EmptyState title="No agent tools detected" description="Scan this device for installed agent tools or add a custom tool" primaryAction={{ label: 'Scan tools', onClick: redetect }} />
        )}
        {tools.length > 0 && (
          <ul role="rowgroup" className="divide-y divide-border-subtle border-t border-border-subtle">
            {tools.map(t => (
              <ListRow
                key={t.id}
                id={t.id}
                leading={<Switch checked={t.is_enabled} onChange={(v) => toggleToolHandler(t.id, v)} disabled={!t.is_detected} aria-label={`Toggle ${t.name}`} />}
                primary={<span className="text-14 text-text-primary">{t.name}</span>}
                meta={[
                  <Badge key="b" variant={t.is_detected ? 'success' : 'neutral'}>{t.is_detected ? 'Detected' : 'Not found'}</Badge>,
                  <Tooltip key="p" content={t.config_path}><code className="font-mono text-12 text-text-secondary">{middleEllipsis(t.config_path, 40)}</code></Tooltip>,
                ]}
                trailing={
                  editingId === t.id ? (
                    <span className="flex items-center gap-1" onMouseDown={e => e.preventDefault()}>
                      <input
                        className="px-2 py-0.5 text-12 font-mono rounded border border-border-subtle bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary w-64"
                        value={editPath}
                        onChange={e => setEditPath(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(t.id); if (e.key === 'Escape') setEditingId(null); }}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                      />
                      <IconButton icon={<Check size={14} />} aria-label="Save" variant="subtle" size="sm" onClick={() => saveEdit(t.id)} />
                      <IconButton icon={<X size={14} />} aria-label="Cancel" variant="subtle" size="sm" onClick={() => setEditingId(null)} />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <IconButton icon={<Pencil size={14} />} aria-label="Edit path" variant="subtle" size="sm" onClick={() => startEdit(t)} />
                      <IconButton icon={<FolderOpen size={16} />} aria-label="Open path" variant="subtle" size="sm" onClick={() => handleOpenFolder(t.config_path)} />
                      <IconButton icon={<Trash2 size={14} />} aria-label="Delete tool" variant="subtle" size="sm" onClick={() => handleDelete(t)} />
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
