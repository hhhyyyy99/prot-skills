import { type ReactNode, useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { useTheme } from '../shell/ThemeProvider';
import { useI18n } from '../shell/LanguageProvider';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/primitives/Button';
import { Select } from '../components/primitives/Select';
import { Badge } from '../components/primitives/Badge';
import { getSkillsDirPath, openFolder } from '../api';
import { languageOptions, type Language } from '../lib/i18n';
import appIcon from '../../assets/icon.png';
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
  const { language, setLanguage, t } = useI18n();
  const { toast } = useToast();
  const appName = import.meta.env.VITE_APP_NAME;
  const appVersion = import.meta.env.VITE_APP_VERSION;
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
        title: t('settings.openFolder.error'),
        description: String((e as { message?: string })?.message ?? e),
      });
    }
  };

  return (
    <>
      <WorkspaceHeader title={t('nav.settings')} />
      <main className="app-content">
        <section className="settings-group">
          <div className="settings-group-title">{t('settings.appearance')}</div>
          <SettingRow
            label={t('settings.theme')}
            helper={t('settings.theme.helper')}
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
                    {t(`theme.${option}`)}
                  </button>
                ))}
              </div>
            }
          />
        </section>

        <section className="settings-group">
          <div className="settings-group-title">{t('settings.general')}</div>
            <SettingRow
              label={t('settings.language')}
              control={<Select<Language> options={languageOptions} value={language} onChange={setLanguage} />}
            />
        </section>

        <section className="settings-group">
          <div className="settings-group-title">{t('settings.sources')}</div>
            <SettingRow
              label={t('settings.skillSources')}
              control={<input disabled className="h-[30px] rounded-sm border border-border-subtle bg-surface-raised px-2 text-13" />}
              badge={<Badge>{t('settings.comingSoon')}</Badge>}
            />
        </section>

        <section className="settings-group">
          <div className="settings-group-title">{t('settings.storage')}</div>
            <SettingRow
              label={t('settings.skillsFolder')}
              control={
                <code className="block max-w-[220px] truncate font-mono text-12 text-text-tertiary">
                  {pathError ? '—' : skillsPath || t('common.loading')}
                </code>
              }
              helper={pathError ? t('settings.skillsFolder.error', { error: pathError }) : t('settings.skillsFolder.helper')}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<FolderOpen size={14} />}
                  onClick={handleOpenFolder}
                  disabled={!skillsPath || !!pathError}
                >
                  {t('common.openFolder')}
                </Button>
              }
            />
            <SettingRow
              label={t('settings.metadataDb')}
              helper={t('settings.metadataDb.helper')}
              control={
                <code className="block max-w-[220px] truncate font-mono text-12 text-text-tertiary">
                  ~/.prot-skills/metadata.db
                </code>
              }
            />
        </section>

        <section className="settings-group">
          <div className="settings-group-title">{t('settings.about')}</div>
          <a href="https://github.com/hhhyyyy99/prot-skills" target="_blank" rel="noopener noreferrer" className="settings-row text-14 text-text-primary hover:bg-surface-raised">{t('settings.github')}</a>
          <a href="https://github.com/hhhyyyy99/prot-skills#readme" target="_blank" rel="noopener noreferrer" className="settings-row text-14 text-text-primary hover:bg-surface-raised">{t('settings.documentation')}</a>

        </section>

        <div className="compact-card mb-4 flex items-center gap-3">
          <img src={appIcon} alt={appName} className="h-10 w-10 shrink-0 rounded-md" />
          <div>
            <p className="text-15 font-bold text-text-primary">{appName}</p>
            <p className="mt-0.5 text-12 text-text-tertiary">
              {t('settings.version', { version: appVersion, build: import.meta.env.VITE_BUILD_TIME ?? 'dev' })}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
