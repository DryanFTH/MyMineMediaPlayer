import { useMemo, useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { Genre } from '@/types/bindings';

import { GenreChip } from './GenreChip';
import { GenreSearchInput } from './GenreSearchInput';

const COLLAPSED_MAX_HEIGHT = 92;

export function GenrePicker({
    genres,
    selectedIds,
    onToggle,
}: {
    genres: Genre[];
    selectedIds: Set<number>;
    onToggle: (genre: Genre) => void;
}) {
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(false);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = q ? genres.filter(g => g.name.toLowerCase().includes(q)) : genres;
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }, [genres, query]);

    return (
        <div className='mb-6 rounded-lg border border-border bg-card/40 p-3'>
            <div className='mb-2.5 flex items-center justify-between gap-3'>
                <span className='text-xs font-medium text-muted-foreground'>
                    Genre{' '}
                    <span className='text-muted-foreground/50'>({filtered.length})</span>
                </span>
                <GenreSearchInput query={query} onQueryChange={setQuery} />
            </div>

            {filtered.length === 0 ? (
                <div className='py-4 text-center text-xs text-muted-foreground'>
                    Tidak ada genre yang cocok dengan "{query}"
                </div>
            ) : (
                <div
                    className='overflow-hidden transition-[max-height] duration-300 ease-in-out'
                    style={{ maxHeight: expanded ? 999 : COLLAPSED_MAX_HEIGHT }}
                >
                    <div className='flex flex-wrap gap-1.5'>
                        {filtered.map(genre => (
                            <GenreChip
                                key={genre.id}
                                genre={genre}
                                selected={selectedIds.has(genre.id)}
                                onToggle={onToggle}
                            />
                        ))}
                    </div>
                </div>
            )}

            {filtered.length > 0 && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className='mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary'
                >
                    {expanded ? (
                        <>
                            <ChevronUp className='h-3 w-3' /> Tampilkan lebih sedikit
                        </>
                    ) : (
                        <>
                            <ChevronDown className='h-3 w-3' /> Tampilkan semua
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
