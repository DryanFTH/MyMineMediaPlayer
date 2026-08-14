import { useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router';

import { ArrowDownAZ, ArrowUpZA, Layers, Loader2, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { type GenreInformation, commands } from '@/types/bindings';

type SortDir = 'asc' | 'desc';

export default () => {
    const navigate = useNavigate();

    const [genres, setGenres] = useState<GenreInformation[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [query, setQuery] = useState('');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const list = await commands.getGenreList();
                if (!mounted) return;
                setGenres(list);
            } catch {
                if (!mounted) return;
                setLoadError('Gagal memuat daftar genre');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredGenres = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? genres.filter(
                  g =>
                      g.display.toLowerCase().includes(q) ||
                      g.name.toLowerCase().includes(q),
              )
            : genres;

        return [...filtered].sort((a, b) =>
            sortDir === 'asc'
                ? a.display.localeCompare(b.display)
                : b.display.localeCompare(a.display),
        );
    }, [genres, query, sortDir]);

    const grouped = useMemo(() => {
        const groups: { letter: string; items: GenreInformation[] }[] = [];
        for (const genre of filteredGenres) {
            const letter = genre.display[0]?.toUpperCase() ?? '#';
            const last = groups[groups.length - 1];
            if (last && last.letter === letter) {
                last.items.push(genre);
            } else {
                groups.push({ letter, items: [genre] });
            }
        }
        return groups;
    }, [filteredGenres]);

    const alphabet = useMemo(() => grouped.map(g => g.letter), [grouped]);

    function scrollToLetter(letter: string) {
        document
            .getElementById(`genre-letter-${letter}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (loading) {
        return (
            <Loader2 className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground' />
        );
    }

    if (loadError) {
        return (
            <div className='mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground'>
                {loadError}
            </div>
        );
    }

    return (
        <div className='mx-auto flex w-full max-w-5xl gap-6 px-6 py-10 pb-16'>
            <div className='min-w-0 flex-1'>
                <div className='mb-6 flex flex-col gap-1.5'>
                    <h1
                        className='text-2xl font-semibold leading-tight text-foreground'
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        Genre
                    </h1>
                    <p className='text-sm text-muted-foreground/70'>
                        Pilih genre untuk melihat daftar anime
                    </p>
                </div>

                <div className='mb-6 flex items-center gap-2'>
                    <div className='relative flex-1'>
                        <Search className='absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                        <Input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder='Cari genre...'
                            className='h-9 pl-9 pr-9 text-sm'
                        />
                        {query && (
                            <Button
                                size='icon'
                                variant='ghost'
                                onClick={() => setQuery('')}
                                className='absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:bg-transparent'
                            >
                                <X className='h-3.5 w-3.5' />
                            </Button>
                        )}
                    </div>

                    <Button
                        size='icon'
                        variant='outline'
                        onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                        className='h-9 w-9 shrink-0 text-muted-foreground'
                        title={sortDir === 'asc' ? 'A-Z' : 'Z-A'}
                    >
                        {sortDir === 'asc' ? (
                            <ArrowDownAZ className='h-3.5 w-3.5' />
                        ) : (
                            <ArrowUpZA className='h-3.5 w-3.5' />
                        )}
                    </Button>
                </div>

                <div className='mb-4 flex items-center gap-2 text-xs text-muted-foreground'>
                    <Badge variant='outline' className='font-normal'>
                        {filteredGenres.length} genre
                    </Badge>
                    {query && <span>hasil untuk "{query}"</span>}
                </div>

                {filteredGenres.length === 0 ? (
                    <div className='py-16 text-center text-sm text-muted-foreground'>
                        Tidak ada genre yang cocok dengan "{query}"
                    </div>
                ) : (
                    <div className='flex flex-col gap-6'>
                        {grouped.map(group => (
                            <div key={group.letter} id={`genre-letter-${group.letter}`}>
                                <p className='mb-2 text-xs font-medium text-muted-foreground/70'>
                                    {group.letter}
                                </p>
                                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
                                    {group.items.map(genre => (
                                        <Card
                                            key={genre.name}
                                            onClick={() =>
                                                navigate(`/otakudesu/genre/${genre.name}`)
                                            }
                                            className='group cursor-pointer border-border transition-colors hover:border-primary'
                                        >
                                            <CardContent className='flex items-center gap-2.5 px-4 py-3.5'>
                                                <Layers className='h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary' />
                                                <span className='truncate text-sm text-foreground'>
                                                    {genre.display}
                                                </span>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!query && alphabet.length > 3 && (
                <div className='sticky top-10 hidden h-fit shrink-0 flex-col gap-0.5 lg:flex'>
                    {alphabet.map(letter => (
                        <button
                            key={letter}
                            onClick={() => scrollToLetter(letter)}
                            className='w-5 text-center text-[10px] font-medium text-muted-foreground/60 transition-colors hover:text-primary'
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
