import { useState } from 'react';
import { Search } from 'lucide-react';
import { WorkspaceHeader } from '../shell/WorkspaceHeader';
import { TextField } from '../components/primitives/TextField';
import { EmptyState } from '../components/patterns/EmptyState';

export function DiscoveryPage() {
  const [q, setQ] = useState('');

  return (
    <>
      <WorkspaceHeader
        title="Discovery"
        meta="Browse and install community Skills"
        search={<div className="w-[240px]"><TextField type="search" size="sm" leadingIcon={<Search size={14} />} value={q} onChange={setQ} placeholder="Search Skills" /></div>}
      />
      <main className="px-8 py-12 overflow-y-auto flex-1">
        {q ? (
          <EmptyState
            title={`No results for "${q}"`}
            description="Discovery is under construction."
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
