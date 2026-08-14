import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Clapperboard,
    Film,
    Info,
    Loader2,
    Star,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { type AnimeListInfo, type Season, commands } from '@/types/bindings';

const SEASON_ORDER: Season[] = ['Winter', 'Spring', 'Summer', 'Fall'];

function getCurrentSeason(): { season: Season; year: number } {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();

    let season: Season;
    if (month <= 1 || month === 11) season = 'Winter';
    else if (month <= 4) season = 'Spring';
    else if (month <= 7) season = 'Summer';
    else season = 'Fall';

    return { season, year };
}

function getPageRange(current: number, max: number): (number | 'ellipsis')[] {
    const delta = 1;
    const range: (number | 'ellipsis')[] = [];
    const left = Math.max(2, current - delta);
    const right = Math.min(max - 1, current + delta);

    range.push(1);
    if (left > 2) range.push('ellipsis');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < max - 1) range.push('ellipsis');
    if (max > 1) range.push(max);

    return range;
}

const MIN_YEAR = 2000;

export default () => {
    const navigate = useNavigate();
    const initial = useMemo(() => getCurrentSeason(), []);

    const [season, setSeason] = useState<Season>(initial.season);
    const [year, setYear] = useState<number>(initial.year);
    const [page, setPage] = useState(1);
    const [jumpValue, setJumpValue] = useState('');
    const [selectedAnime, setSelectedAnime] = useState<AnimeListInfo | null>(null);

    const { data: seasons } = useQuery({
        queryKey: ['seasons'],
        queryFn: async () => commands.getSeasons(),
        staleTime: Infinity,
    });

    const { data, isLoading, isFetching, isError, error } = useQuery({
        queryKey: ['season-animes', season, year, page],
        queryFn: async () => {
            const result = await commands.getSeasonAnimes(season, year, page);
            if (result.status === 'error') {
                throw new Error(result.error);
            }
            return result.data;
        },
        placeholderData: keepPreviousData,
    });

    const animes = data?.animes ?? [];
    const maxPage = data?.max_page ?? 1;
    const currentPage = data?.current_page ?? page;

    const availableSeasons = useMemo(() => {
        if (!seasons || seasons.length === 0) return SEASON_ORDER;
        return SEASON_ORDER.filter(s => seasons.includes(s));
    }, [seasons]);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const list: number[] = [];
        for (let y = currentYear + 1; y >= MIN_YEAR; y--) list.push(y);
        return list;
    }, []);

    const pageRange = useMemo(
        () => getPageRange(currentPage, maxPage),
        [currentPage, maxPage],
    );

    function handleSeasonChange(value: string) {
        setSeason(value as Season);
        setPage(1);
        setJumpValue('');
    }

    function handleYearChange(value: string) {
        setYear(Number(value));
        setPage(1);
        setJumpValue('');
    }

    function goToPage(next: number) {
        if (next < 1 || next === currentPage) return;
        if (maxPage && next > maxPage) return;
        setPage(next);
        setJumpValue('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleJumpSubmit() {
        const parsed = Number(jumpValue);
        if (!Number.isInteger(parsed)) {
            setJumpValue('');
            return;
        }
        goToPage(parsed);
    }

    return (
        <div className='mx-auto w-full max-w-5xl px-6 py-10 pb-16'>
            <div className='mb-6 flex flex-col gap-1.5'>
                <h1
                    className='text-2xl font-semibold leading-tight text-foreground'
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    Anime per Musim
                </h1>
                <p className='text-sm text-muted-foreground/70'>
                    Daftar anime berdasarkan musim dan tahun rilis
                </p>
            </div>

            <div className='mb-6 flex flex-wrap items-center gap-2'>
                <Select value={season} onValueChange={handleSeasonChange}>
                    <SelectTrigger className='w-36'>
                        <SelectValue placeholder='Musim' />
                    </SelectTrigger>
                    <SelectContent>
                        {availableSeasons.map(s => (
                            <SelectItem key={s} value={s}>
                                {s}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={String(year)} onValueChange={handleYearChange}>
                    <SelectTrigger className='w-28'>
                        <SelectValue placeholder='Tahun' />
                    </SelectTrigger>
                    <SelectContent className='max-h-64'>
                        {years.map(y => (
                            <SelectItem key={y} value={String(y)}>
                                {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Badge variant='outline' className='ml-auto font-normal'>
                    Halaman {currentPage} / {maxPage}
                </Badge>
                {isFetching && !isError && (
                    <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                )}
            </div>

            {isError ? (
                <div className='flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground'>
                    <AlertCircle className='h-5 w-5' />
                    {error instanceof Error ? error.message : 'Gagal memuat daftar anime'}
                </div>
            ) : isLoading ? (
                <div className='flex justify-center py-16'>
                    <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                </div>
            ) : animes.length === 0 ? (
                <div className='py-16 text-center text-sm text-muted-foreground'>
                    Tidak ada anime pada musim ini
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
                    {animes.map(anime => (
                        <Card
                            key={anime.anime_name}
                            onClick={() =>
                                navigate(`/otakudesu/anime/${anime.anime_name}`)
                            }
                            className='group cursor-pointer overflow-hidden border-border pt-0 transition-colors hover:border-primary'
                        >
                            <div className='relative aspect-3/4 w-full overflow-hidden bg-muted'>
                                {anime.image_url ? (
                                    <img
                                        src={anime.image_url}
                                        alt={anime.judul}
                                        className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                                        loading='lazy'
                                    />
                                ) : (
                                    <div className='flex h-full w-full items-center justify-center'>
                                        <Film className='h-6 w-6 text-muted-foreground' />
                                    </div>
                                )}
                                {anime.score && (
                                    <div className='absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm'>
                                        <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                                        {anime.score}
                                    </div>
                                )}

                                <Button
                                    size='sm'
                                    variant='secondary'
                                    onClick={e => {
                                        e.stopPropagation();
                                        setSelectedAnime(anime);
                                    }}
                                    className='absolute bottom-2 left-2 right-2 h-7 gap-1.5 bg-black/70 text-xs text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 hover:text-white group-hover:opacity-100'
                                >
                                    <Info className='h-3.5 w-3.5' />
                                    Detail
                                </Button>
                            </div>
                            <CardContent className='flex flex-col gap-1 px-3 py-3'>
                                <p className='line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary'>
                                    {anime.judul}
                                </p>
                                <p className='truncate text-xs text-muted-foreground/70'>
                                    {anime.studio || anime.musim_rilis}
                                </p>
                                <div className='flex flex-wrap gap-1'>
                                    {anime.genres.map(g => (
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
                    ))}
                </div>
            )}

            {!isError && maxPage > 1 && (
                <div className='mt-8 flex flex-col items-center gap-3'>
                    <div className='flex items-center gap-1'>
                        <Button
                            size='icon'
                            variant='outline'
                            disabled={currentPage <= 1 || isFetching}
                            onClick={() => goToPage(1)}
                            className='h-8 w-8'
                            title='Halaman pertama'
                        >
                            <ChevronsLeft className='h-4 w-4' />
                        </Button>
                        <Button
                            size='icon'
                            variant='outline'
                            disabled={currentPage <= 1 || isFetching}
                            onClick={() => goToPage(currentPage - 1)}
                            className='h-8 w-8'
                        >
                            <ChevronLeft className='h-4 w-4' />
                        </Button>

                        {pageRange.map((p, i) =>
                            p === 'ellipsis' ? (
                                <span
                                    key={`ellipsis-${i}`}
                                    className='px-1.5 text-xs text-muted-foreground'
                                >
                                    …
                                </span>
                            ) : (
                                <Button
                                    key={p}
                                    size='icon'
                                    variant={p === currentPage ? 'default' : 'outline'}
                                    disabled={isFetching}
                                    onClick={() => goToPage(p)}
                                    className='h-8 w-8 text-xs'
                                >
                                    {p}
                                </Button>
                            ),
                        )}

                        <Button
                            size='icon'
                            variant='outline'
                            disabled={currentPage >= maxPage || isFetching}
                            onClick={() => goToPage(currentPage + 1)}
                            className='h-8 w-8'
                        >
                            <ChevronRight className='h-4 w-4' />
                        </Button>
                        <Button
                            size='icon'
                            variant='outline'
                            disabled={currentPage >= maxPage || isFetching}
                            onClick={() => goToPage(maxPage)}
                            className='h-8 w-8'
                            title='Halaman terakhir'
                        >
                            <ChevronsRight className='h-4 w-4' />
                        </Button>
                    </div>

                    <div className='flex items-center gap-2'>
                        <span className='text-xs text-muted-foreground/70'>
                            Ke halaman
                        </span>
                        <Input
                            value={jumpValue}
                            onChange={e =>
                                setJumpValue(e.target.value.replace(/[^0-9]/g, ''))
                            }
                            onKeyDown={e => e.key === 'Enter' && handleJumpSubmit()}
                            placeholder={String(currentPage)}
                            className='h-8 w-16 text-center text-xs'
                            inputMode='numeric'
                        />
                        <Button
                            size='sm'
                            variant='outline'
                            disabled={!jumpValue || isFetching}
                            onClick={handleJumpSubmit}
                            className='h-8 text-xs'
                        >
                            Go
                        </Button>
                    </div>
                </div>
            )}

            <Dialog
                open={!!selectedAnime}
                onOpenChange={open => !open && setSelectedAnime(null)}
            >
                <DialogContent className='max-h-[85vh] max-w-lg overflow-hidden'>
                    {selectedAnime && (
                        <>
                            <DialogHeader>
                                <DialogTitle className='pr-6 text-left leading-snug'>
                                    {selectedAnime.judul}
                                </DialogTitle>
                            </DialogHeader>

                            <div className='flex gap-4'>
                                <div className='w-28 shrink-0 overflow-hidden rounded-md bg-muted'>
                                    {selectedAnime.image_url ? (
                                        <img
                                            src={selectedAnime.image_url}
                                            alt={selectedAnime.judul}
                                            className='aspect-3/4 w-full object-cover'
                                        />
                                    ) : (
                                        <div className='flex aspect-3/4 w-full items-center justify-center'>
                                            <Film className='h-6 w-6 text-muted-foreground' />
                                        </div>
                                    )}
                                </div>

                                <div className='flex min-w-0 flex-1 flex-col gap-2 text-xs text-muted-foreground'>
                                    {selectedAnime.score && (
                                        <div className='flex items-center gap-1.5'>
                                            <Star className='h-3.5 w-3.5 fill-yellow-400 text-yellow-400' />
                                            <span className='text-foreground'>
                                                {selectedAnime.score}
                                            </span>
                                        </div>
                                    )}
                                    {selectedAnime.studio && (
                                        <div className='flex items-center gap-1.5'>
                                            <Clapperboard className='h-3.5 w-3.5 shrink-0' />
                                            <span className='truncate'>
                                                {selectedAnime.studio}
                                            </span>
                                        </div>
                                    )}
                                    {selectedAnime.musim_rilis && (
                                        <div className='flex items-center gap-1.5'>
                                            <Calendar className='h-3.5 w-3.5 shrink-0' />
                                            <span className='truncate'>
                                                {selectedAnime.musim_rilis}
                                            </span>
                                        </div>
                                    )}

                                    {selectedAnime.genres.length > 0 && (
                                        <div className='flex flex-wrap gap-1 pt-1'>
                                            {selectedAnime.genres.map(g => (
                                                <Badge
                                                    key={g.name}
                                                    variant='link'
                                                    className='font-normal text-xs cursor-pointer'
                                                    onClick={() => {
                                                        navigate(
                                                            `/otakudesu/genre/${g.name}`,
                                                        );

                                                        setSelectedAnime(null);
                                                    }}
                                                >
                                                    {g.display}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedAnime.sinopsis.length > 0 && (
                                <ScrollArea className='max-h-40 pr-3'>
                                    <div className='flex flex-col gap-2 text-sm text-muted-foreground'>
                                        {selectedAnime.sinopsis.map((paragraph, i) => (
                                            <p key={i} className='leading-relaxed'>
                                                {paragraph}
                                            </p>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}

                            <Button
                                onClick={() =>
                                    navigate(
                                        `/otakudesu/anime/${selectedAnime.anime_name}`,
                                    )
                                }
                                className='w-full'
                            >
                                Buka halaman anime
                            </Button>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
