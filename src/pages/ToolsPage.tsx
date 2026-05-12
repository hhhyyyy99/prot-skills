import { useEffect, useState } from 'react';
import { ScanLine, FolderOpen } from 'lucide-react';
import { getTools, detectTools, toggleTool } from '../api';
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
  const { toast } = useToast();

  const refresh = () => {
    setLoading(true);
    setError(null);
    getTools()
      .then(setTools)
      .catch((e: unknown) => setError(String((e as Error).message ?? e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getTools()
      .then(setTools)
      .catch((e: unknown) => setError(String((e as Error).message ?? e)))
      .finally(() => setLoading(false));
  }, []);

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

  // TODO: invoke('open_path', { path })
  const openPath = (path: string) => {
    console.log('open_path', path);
  };

  const toggleToolHandler = (id: string, next: boolean) => {
    setPendingToggleId(id);
    const prev = tools.map(t => ({ ...t }));
    setTools(ts => ts.map(t => (t.id === id ? { ...t, is_enabled: next } : t)));
    toggleTool(id, next)
      .catch((e: unknown) => {
        setTools(prev);
        const msg = String((e as Error).message ?? e);
        toast({ variant: 'error', title: 'Toggle failed', description: msg });
      })
      .finally(() => setPendingToggleId(null));
  };

  const detectedCount = tools.filter(t => t.is_detected).length;
  const enabledCount = tools.filter(t => t.is_enabled).length;

  return (
    <>
      <WorkspaceHeader
        title="Tools"
        meta={`${detectedCount} detected · ${enabledCount} enabled`}
        primaryActions={[
          <Button key="redetect" variant="primary" size="sm" leadingIcon={<ScanLine size={14} />} loading={detecting} onClick={redetect}>Re-detect</Button>,
        ]}
      />
      <main className="px-8 py-4 overflow-y-auto flex-1">
        {error && <div className="mb-4"><InlineError title="Failed to load tools" details={error} onRetry={refresh} /></div>}
        {loading && !tools.length && (
          <ul>{Array.from({ length: 4 }).map((_, i) => <ListRow key={i} id={`skeleton-${i}`} primary="" loading />)}</ul>
        )}
        {!loading && !tools.length && !error && (
          <EmptyState title="No tools detected" description="Click Re-detect or set a custom path" primaryAction={{ label: 'Re-detect', onClick: redetect }} />
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
                trailing={<IconButton icon={<FolderOpen size={16} />} aria-label="Open path" variant="subtle" size="sm" onClick={() => openPath(t.config_path)} />}
              />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
