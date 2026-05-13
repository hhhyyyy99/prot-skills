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
    <div className="settings-row">
      <div className="min-w-0">
        <div className="text-14 text-text-primary">{label}</div>
        {helper && <p className="mt-0.5 max-w-[320px] truncate text-12 text-text-tertiary">{helper}</p>}
      </div>
      <div className="inline-flex shrink-0 items-center gap-2">
        {control}
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
      <main className="app-content">
        <section className="settings-group">
          <div className="settings-group-title">Appearance</div>
          <SettingRow
            label="Theme"
            helper="Follow system, or force a theme"
            control={
              <div className="flex gap-1.5">
                {(['light', 'dark', 'system'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    className={[
                      'h-[30px] rounded-sm border px-3 text-12 font-medium transition-colors duration-fast',
                      preference === option
                        ? 'border-text-primary bg-text-primary text-surface'
                        : 'border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary',
                    ].join(' ')}
                    onClick={() => setPreference(option as ThemePreference)}
                  >
                    {option[0].toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            }
          />
        </section>

        <section className="settings-group">
          <div className="settings-group-title">General</div>
            <SettingRow
              label="Language"
              control={<Select options={[{ value: 'en', label: 'English' }]} value="en" disabled onChange={() => {}} />}
              badge={<Badge>coming soon</Badge>}
            />
        </section>

        <section className="settings-group">
          <div className="settings-group-title">Sources</div>
            <SettingRow
              label="Skill sources"
              control={<input disabled className="h-[30px] rounded-sm border border-border-subtle bg-surface-raised px-2 text-13" />}
              badge={<Badge>coming soon</Badge>}
            />
        </section>

        <section className="settings-group">
          <div className="settings-group-title">Storage</div>
            <SettingRow
              label="Skills folder"
              control={
                <code className="block max-w-[220px] truncate font-mono text-12 text-text-tertiary">
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
            <SettingRow
              label="Metadata DB"
              helper="Local application metadata"
              control={
                <code className="block max-w-[220px] truncate font-mono text-12 text-text-tertiary">
                  ~/.prot-skills/metadata.db
                </code>
              }
            />
        </section>

        <section className="settings-group">
          <div className="settings-group-title">About</div>
          <a href="#github" className="settings-row text-14 text-text-primary hover:bg-surface-raised">GitHub</a>
          <a href="#docs" className="settings-row text-14 text-text-primary hover:bg-surface-raised">Documentation</a>
          <a href="#licenses" className="settings-row text-14 text-text-primary hover:bg-surface-raised">Licenses</a>
        </section>

        <div className="compact-card mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-text-primary text-surface">
            PS
          </div>
          <div>
            <p className="text-15 font-bold text-text-primary">Prot Skills</p>
            <p className="mt-0.5 text-12 text-text-tertiary">Version 0.1.0 · Build {import.meta.env.VITE_BUILD_TIME ?? 'dev'}</p>
          </div>
        </div>
      </main>
    </>
  );
}
