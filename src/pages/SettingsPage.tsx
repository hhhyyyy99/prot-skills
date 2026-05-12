import { type ReactNode, useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { useTheme } from '../shell/ThemeProvider';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/primitives/Button';
import { Select } from '../components/primitives/Select';
import { Badge } from '../components/primitives/Badge';
import { getSkillsDirPath, openFolder } from '../api';
import type { ThemePreference } from '../lib/theme';

interface SettingRowProps {
  label: string;
  control: ReactNode;
  helper?: string;
  action?: ReactNode;
  badge?: ReactNode;
}

function SettingRow({ label, control, helper, action, badge }: SettingRowProps) {
  return (
    <div className="grid grid-cols-[200px_1fr_auto] gap-4 items-start py-3 border-b border-border-subtle">
      <span className="text-13 text-text-primary">{label}</span>
      <div>
        {control}
        {helper && <p className="text-12 text-text-tertiary mt-1">{helper}</p>}
      </div>
      <div className="inline-flex gap-2 items-center">
        {action}
        {badge}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const { toast } = useToast();
  const [skillsPath, setSkillsPath] = useState<string>('');
  const [pathError, setPathError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSkillsDirPath()
      .then((p) => {
        if (!cancelled) setSkillsPath(p);
      })
      .catch((e) => {
        if (!cancelled) setPathError(String((e as { message?: string })?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenFolder = async () => {
    if (!skillsPath) return;
    try {
      await openFolder(skillsPath);
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Failed to open folder',
        description: String((e as { message?: string })?.message ?? e),
      });
    }
  };

  return (
    <>
      <WorkspaceHeader title="Settings" />
      <div className="px-8 py-6 space-y-8">
        <section>
          <h2 className="text-16 font-semibold text-text-primary mb-2">General</h2>
          <div className="divide-y divide-border-subtle border-t border-border-subtle">
            <SettingRow
              label="Language"
              control={<Select options={[{ value: 'en', label: 'English' }]} value="en" disabled onChange={() => {}} />}
              badge={<Badge>coming soon</Badge>}
            />
          </div>
        </section>

        <section>
          <h2 className="text-16 font-semibold text-text-primary mb-2">Sources</h2>
          <div className="divide-y divide-border-subtle border-t border-border-subtle">
            <SettingRow
              label="Skill sources"
              control={<input disabled className="h-7 rounded-md border border-border-default px-2 text-13 bg-surface-raised" />}
              badge={<Badge>coming soon</Badge>}
            />
          </div>
        </section>

        <section>
          <h2 className="text-16 font-semibold text-text-primary mb-2">Storage</h2>
          <div className="divide-y divide-border-subtle border-t border-border-subtle">
            <SettingRow
              label="Skills folder"
              control={
                <code className="font-mono text-13 text-text-primary break-all">
                  {pathError ? '—' : skillsPath || 'Loading…'}
                </code>
              }
              helper={pathError ? `Failed to read path: ${pathError}` : 'Managed by the app. Skills you install or migrate are stored here.'}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<FolderOpen size={14} />}
                  onClick={handleOpenFolder}
                  disabled={!skillsPath || !!pathError}
                >
                  Open folder
                </Button>
              }
            />
          </div>
        </section>

        <section>
          <h2 className="text-16 font-semibold text-text-primary mb-2">Appearance</h2>
          <div className="divide-y divide-border-subtle border-t border-border-subtle">
            <SettingRow
              label="Theme"
              control={
                <Select
                  options={[
                    { value: 'system', label: 'System' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                  value={preference}
                  onChange={(v) => setPreference(v as ThemePreference)}
                />
              }
              helper="Follow system, or force a theme"
            />
          </div>
        </section>

        <section>
          <h2 className="text-16 font-semibold text-text-primary mb-2">About</h2>
          <div className="border-t border-border-subtle pt-3 space-y-1 text-13 text-text-secondary">
            <p>AI Skills Manager</p>
            <p>Version 0.1.0</p>
            <p>Build: {import.meta.env.VITE_BUILD_TIME ?? 'dev'}</p>
            <p><a href="#licenses" className="text-accent underline-offset-2 hover:underline">Licenses</a></p>
          </div>
        </section>
      </div>
    </>
  );
}
