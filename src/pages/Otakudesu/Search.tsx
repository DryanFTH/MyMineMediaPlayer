import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router';

import { ImageOff, Loader2, Search as SearchIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type SearchAnime, commands } from '@/types/bindings';

export default () => {
    const navigate = useNavigate();

    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<SearchAnime[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 400);
        return () => clearTimeout(timeout);
    }, [query]);

    useEffect(() => {
        if (!debouncedQuery) {
            setResults([]);
            setSearched(false);
            setError(null);
            return;
        }

        let mounted = true;
        (async () => {
            setLoading(true);
            setError(null);
            const res = await commands.searchAnime(debouncedQuery);
            if (!mounted) return;
            if (res.status === 'ok') {
                setResults(res.data);
            } else {
                setError(res.error);
                setResults([]);
            }
            setSearched(true);
            setLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, [debouncedQuery]);

    return (
        <div className='mx-auto w-full max-w-5xl px-6 py-10'>
            <div className='mb-8'>
                <h1 className='text-xl font-semibold leading-tight text-foreground'>
                    Cari Anime
                </h1>
                <p className='text-xs text-muted-foreground'>
                    Temukan anime berdasarkan judul
                </p>
            </div>

            <div className='relative mb-8'>
                <SearchIcon className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70' />
                <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder='Ketik judul anime...'
                    className='border-border bg-card pl-9 text-sm text-foreground'
                />
            </div>

            {loading && (
                <div className='flex justify-center py-16'>
                    <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                </div>
            )}

            {!loading && error && (
                <div className='rounded-lg border border-primary/20 bg-card px-4 py-3 text-sm text-foreground'>
                    {error}
                </div>
            )}

            {!loading && !error && searched && results.length === 0 && (
                <div className='py-16 text-center text-sm text-muted-foreground/70'>
                    Tidak ada anime ditemukan
                </div>
            )}

            {!loading && !error && results.length > 0 && (
                <div className='grid gap-4 sm:grid-cols-3 lg:grid-cols-4'>
                    {results.map(anime => {
                        const isCompleted = anime.status.toLowerCase() === 'completed';

                        return (
                            <Card
                                key={anime.anime_name}
                                className='group cursor-pointer overflow-hidden border-border bg-card pt-0 duration-300 hover:border-primary/40'
                                onClick={() =>
                                    navigate('/otakudesu/anime/' + anime.anime_name)
                                }
                            >
                                <div className='relative aspect-3/4 w-full overflow-hidden bg-background'>
                                    {anime.image_url ? (
                                        <img
                                            src={anime.image_url}
                                            alt={anime.judul}
                                            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                                            loading='lazy'
                                        />
                                    ) : (
                                        <div className='flex h-full items-center justify-center'>
                                            <ImageOff className='h-6 w-6 text-muted-foreground/70' />
                                        </div>
                                    )}
                                </div>
                                <CardContent className='space-y-2 p-3'>
                                    <h3 className='line-clamp-2 text-sm font-medium text-foreground'>
                                        {anime.judul}
                                    </h3>
                                    <Badge
                                        variant='outline'
                                        className={cn(
                                            'text-[10px]',
                                            isCompleted
                                                ? 'border-primary/30 text-primary'
                                                : 'border-amber-400/30 text-amber-400',
                                        )}
                                    >
                                        {anime.status}
                                    </Badge>
                                    <div className='flex flex-wrap gap-1'>
                                        {anime.genre.map(g => (
                                            <Badge
                                                key={g.name}
                                                variant='secondary'
                                                className='bg-background text-[10px] text-muted-foreground'
                                            >
                                                {g.display}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
