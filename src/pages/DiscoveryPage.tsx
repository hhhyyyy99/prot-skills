import { useState } from 'react';
import { Search } from 'lucide-react';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { useI18n } from '../shell/LanguageProvider';
import { TextField } from '../components/primitives/TextField';
import { Badge } from '../components/primitives/Badge';
import { Button } from '../components/primitives/Button';
import { FilterPills } from '../components/patterns/FilterPills';
import { StatsStrip } from '../components/patterns/StatsStrip';
import { EmptyState } from '../components/patterns/EmptyState';

const DISCOVERY_SKILLS = [
  {
    name: 'Frontend Design',
    source: 'Cursor',
    variant: 'success' as const,
    description: 'Create distinctive production-grade frontend interfaces with bold aesthetics.',
    meta: 'v2.1 · 2.3k uses',
  },
  {
    name: 'Code Review',
    source: 'Claude',
    variant: 'warning' as const,
    description: 'Systematic code review surfacing architectural issues, security vulnerabilities, and quality gaps.',
    meta: 'v1.8 · 4.1k uses',
  },
  {
    name: 'System Debugging',
    source: 'Trae',
    variant: 'accent' as const,
    description: 'Root cause analysis and systematic debugging methodology for complex production issues.',
    meta: 'v3.0 · 1.8k uses',
  },
  {
    name: 'API Integration',
    source: 'Kiro',
    variant: 'success' as const,
    description: 'Design, build, and integrate REST and GraphQL APIs with proper error handling.',
    meta: 'v1.5 · 3.2k uses',
  },
  {
    name: 'Brainstorming',
    source: 'Cursor',
    variant: 'success' as const,
    description: 'Structured ideation and creative problem-solving with lateral thinking frameworks.',
    meta: 'v4.1 · 6.3k uses',
  },
  {
    name: 'Security Audit',
    source: 'Claude',
    variant: 'warning' as const,
    description: 'OWASP-based security review with vulnerability detection and threat modeling.',
    meta: 'v1.3 · 1.5k uses',
  },
];

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'Cursor', label: 'Cursor' },
  { value: 'Claude', label: 'Claude' },
  { value: 'Trae', label: 'Trae' },
  { value: 'Kiro', label: 'Kiro' },
] as const;

export function DiscoveryPage() {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [source, setSource] = useState<(typeof FILTERS)[number]['value']>('all');
  const [imported, setImported] = useState<string | null>(null);

  const visible = DISCOVERY_SKILLS.filter(skill => {
    const matchesQuery = `${skill.name} ${skill.description}`.toLowerCase().includes(q.toLowerCase());
    const matchesSource = source === 'all' || skill.source === source;
    return matchesQuery && matchesSource;
  });

  const handleImport = (name: string) => {
    setImported(name);
    window.setTimeout(() => setImported(null), 2000);
  };

  return (
    <>
      <WorkspaceHeader
        title={t('nav.discovery')}
        meta={t('discovery.meta')}
        search={<div className="w-[240px]"><TextField type="search" size="sm" leadingIcon={<Search size={14} />} value={q} onChange={setQ} placeholder={t('discovery.searchPlaceholder')} /></div>}
      />
      <main className="app-content">
        <StatsStrip
          items={[
            { label: t('discovery.stats.skills'), value: 47 },
            { label: t('discovery.stats.tools'), value: 12, accent: true },
            { label: t('discovery.stats.inLibrary'), value: 8 },
          ]}
        />

        <FilterPills options={FILTERS} value={source} onChange={setSource} ariaLabel={t('discovery.filters.aria')} />

        <div className="section-kicker">{t('discovery.section.availableSkills')}</div>

        {visible.length > 0 ? (
          <div>
            {visible.map(skill => (
              <article key={skill.name} className="compact-card mb-2">
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <h2 className="text-15 font-semibold text-text-primary">{skill.name}</h2>
                  <Badge variant={skill.variant}>{skill.source}</Badge>
                </div>
                <p className="mb-3 text-13 leading-5 text-text-secondary">{skill.description}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-12 text-text-tertiary">{skill.meta}</span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleImport(skill.name)}
                    className={imported === skill.name ? 'bg-accent text-accent-fg hover:bg-accent-hover' : 'bg-text-primary text-surface hover:bg-text-secondary'}
                  >
                    {imported === skill.name ? t('common.imported') : t('common.import')}
                  </Button>
                </div>
              </article>
            ))}
            {!q && source === 'all' && (
              <div className="compact-card mt-4">
                <EmptyState
                  title={t('discovery.empty.title')}
                  description={t('discovery.empty.ready')}
                  secondaryAction={{ label: t('discovery.empty.openSkills'), href: 'https://skills.sh', external: true }}
                />
              </div>
            )}
          </div>
        ) : q ? (
          <EmptyState
            title={t('discovery.noResults.title', { query: q })}
            description={t('discovery.noResults.description')}
            primaryAction={{ label: t('discovery.noResults.clear'), onClick: () => setQ('') }}
            secondaryAction={{ label: t('discovery.empty.openSkills'), href: 'https://skills.sh', external: true }}
          />
        ) : (
          <EmptyState
            title={t('discovery.empty.title')}
            description={t('discovery.empty.construction')}
            secondaryAction={{ label: t('discovery.empty.openSkills'), href: 'https://skills.sh', external: true }}
          />
        )}
      </main>
    </>
  );
}
