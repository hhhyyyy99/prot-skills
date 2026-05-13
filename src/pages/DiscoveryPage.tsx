import { useState } from 'react';
import { Search } from 'lucide-react';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
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
        title="Discovery"
        meta="Browse and import community Skills"
        search={<div className="w-[240px]"><TextField type="search" size="sm" leadingIcon={<Search size={14} />} value={q} onChange={setQ} placeholder="Search Skills" /></div>}
      />
      <main className="app-content">
        <StatsStrip
          items={[
            { label: 'skills', value: 47 },
            { label: 'tools', value: 12, accent: true },
            { label: 'in library', value: 8 },
          ]}
        />

        <FilterPills options={FILTERS} value={source} onChange={setSource} ariaLabel="Discovery source filters" />

        <div className="section-kicker">Available Skills</div>

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
                    {imported === skill.name ? 'Imported' : 'Import'}
                  </Button>
                </div>
              </article>
            ))}
            {!q && source === 'all' && (
              <div className="compact-card mt-4">
                <EmptyState
                  title="No Skills yet"
                  description="Discovery is ready for imports. Browse community Skills on skills.sh in the meantime."
                  secondaryAction={{ label: 'Open skills.sh', href: 'https://skills.sh', external: true }}
                />
              </div>
            )}
          </div>
        ) : q ? (
          <EmptyState
            title={`No results for "${q}"`}
            description="Try another keyword or source filter."
            primaryAction={{ label: 'Clear search', onClick: () => setQ('') }}
            secondaryAction={{ label: 'Open skills.sh', href: 'https://skills.sh', external: true }}
          />
        ) : (
          <EmptyState
            title="No Skills yet"
            description="Discovery is under construction. Browse community Skills on skills.sh in the meantime."
            secondaryAction={{ label: 'Open skills.sh', href: 'https://skills.sh', external: true }}
          />
        )}
      </main>
    </>
  );
}
