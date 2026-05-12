import { useEffect, useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { getTools, scanLocalSkills, migrateLocalSkill } from '../api';
import { useToast } from '../hooks/useToast';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { Button } from '../components/primitives/Button';
import { Select } from '../components/primitives/Select';
import { Checkbox } from '../components/primitives/Checkbox';
import { Badge } from '../components/primitives/Badge';
import { ListRow } from '../components/patterns/ListRow';
import { EmptyState } from '../components/patterns/EmptyState';
import { middleEllipsis } from '../lib/truncate';
import type { AITool, LocalSkill } from '../types';

export function MigratePage() {
  const [allTools, setAllTools] = useState<AITool[]>([]);
  const [toolId, setToolId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [skills, setSkills] = useState<LocalSkill[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, 'idle' | 'success' | 'error'>>({});
  const { toast } = useToast();

  const detectedTools = allTools.filter(t => t.is_detected);

  useEffect(() => {
    getTools()
      .then(data => {
        setAllTools(data);
        const detected = data.filter(t => t.is_detected);
        if (detected.length > 0) setToolId(detected[0].id);
      })
      .catch(e => toast({ variant: 'error', title: String((e as Error).message ?? e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scan = async () => {
    if (!toolId) return;
    setScanning(true);
    setSelected(new Set());
    try {
      const data = await scanLocalSkills(toolId);
      setSkills(data);
      const status: Record<string, 'idle'> = {};
      data.forEach(s => { status[s.path] = 'idle'; });
      setRowStatus(status);
    } catch (e) {
      toast({ variant: 'error', title: String((e as Error).message ?? e) });
    } finally {
      setScanning(false);
    }
  };

  const toggleSelected = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === skills.length) setSelected(new Set());
    else setSelected(new Set(skills.map(s => s.path)));
  };

  const migrateSelected = async () => {
    setMigrating(true);
    setProgress({ done: 0, total: selected.size });
    let success = 0, fail = 0, done = 0;
    const nextStatus = { ...rowStatus };
    for (const path of selected) {
      try {
        const s = skills.find(sk => sk.path === path);
        const skillId = s!.name.toLowerCase().replace(/\s+/g, '-');
        await migrateLocalSkill(path, skillId);
        nextStatus[path] = 'success';
        success++;
      } catch {
        nextStatus[path] = 'error';
        fail++;
      } finally {
        done++;
        setProgress({ done, total: selected.size });
        setRowStatus({ ...nextStatus });
      }
    }
    toast({ variant: fail === 0 ? 'success' : 'info', title: `Migrated ${success}, failed ${fail}`, durationMs: 6000 });
    setProgress(null);
    setMigrating(false);
    if (success > 0) scan();
  };

  const retry = async (path: string) => {
    const s = skills.find(sk => sk.path === path);
    const skillId = s!.name.toLowerCase().replace(/\s+/g, '-');
    try {
      await migrateLocalSkill(path, skillId);
      setRowStatus(prev => ({ ...prev, [path]: 'success' }));
      toast({ variant: 'success', title: `Migrated ${s!.name}`, durationMs: 6000 });
    } catch {
      setRowStatus(prev => ({ ...prev, [path]: 'error' }));
      toast({ variant: 'error', title: `Failed to migrate ${s!.name}` });
    }
  };

  return (
    <>
      <WorkspaceHeader title="Migrate" meta="Import Skills from a detected tool's folder" />
      <main className="px-8 py-4 overflow-y-auto flex-1">
        <div className="flex items-center gap-3 pb-4">
          <Select
            size="sm"
            value={toolId}
            options={detectedTools.length ? detectedTools.map(t => ({ value: t.id, label: t.name })) : [{ value: '__none__', label: 'No detected tools' }]}
            onChange={setToolId}
            placeholder="Select a tool"
            disabled={detectedTools.length === 0}
          />
          <Button variant="primary" size="sm" leadingIcon={<Search size={14} />} loading={scanning} disabled={!toolId} onClick={scan}>Scan</Button>
          {!toolId && <span className="text-13 text-text-tertiary">Select a detected tool first. Go to Tools to detect.</span>}
        </div>

        {skills.length > 0 && selected.size > 0 && (
          <div className="sticky top-0 z-10 bg-canvas/80 backdrop-blur-sm py-2 mb-2 flex items-center gap-3 border-b border-border-subtle">
            <Checkbox checked={selected.size === skills.length ? true : (selected.size === 0 ? false : 'indeterminate')} onChange={toggleAll} label="Select all" />
            <span className="text-13 text-text-secondary">Selected {selected.size}</span>
            <div className="ml-auto flex gap-2">
              <Button variant="primary" size="sm" leadingIcon={<ArrowRight size={14} />} loading={migrating} onClick={migrateSelected}>Migrate selected ({selected.size})</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </div>
        )}

        {progress && <div className="text-13 text-text-secondary mb-2">Migrating {progress.done}/{progress.total}…</div>}

        {skills.length === 0 && !scanning && toolId && (
          <EmptyState title="No local Skills found" description="The tool folder is empty or not readable" />
        )}

        {skills.length > 0 && (
          <ul role="rowgroup" className="divide-y divide-border-subtle border-t border-border-subtle">
            {skills.map(s => (
              <ListRow
                key={s.path}
                id={s.path}
                leading={<Checkbox checked={selected.has(s.path)} onChange={() => toggleSelected(s.path)} aria-label={`Select ${s.name}`} />}
                primary={<span className="text-14 text-text-primary">{s.name}</span>}
                meta={[
                  <code key="p" className="font-mono text-12 text-text-secondary">{middleEllipsis(s.path, 48)}</code>,
                  s.is_symlink ? <Badge key="sym" variant="warning">Symlink</Badge> : null,
                  rowStatus[s.path] === 'error' ? <Badge key="err" variant="danger">Failed</Badge> : null,
                ].filter(Boolean) as React.ReactNode[]}
                trailing={rowStatus[s.path] === 'error' ? <Button variant="ghost" size="sm" onClick={() => retry(s.path)}>Retry</Button> : undefined}
              />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
