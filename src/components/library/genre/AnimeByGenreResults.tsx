import { useEffect, useState } from 'react';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SortingMethod, commands } from '@/types/bindings';

import { AnimeResultCard } from './AnimeResultCard';
import { PaginationBar } from './PaginationBar';

const RESULTS_PER_PAGE = 12;

const RESULT_SORT_OPTIONS: { value: SortingMethod; label: string }[] = [
    { value: 'recently_modified', label: 'Terbaru Diubah' },
    { value: 'oldest_modified', label: 'Terlama Diubah' },
    { value: 'recently_added', label: 'Baru ditambahkan' },
    { value: 'oldest_added', label: 'Lama ditambahkan' },
    { value: 'release_date_desc', label: 'Tanggal rilis terbaru' },
    { value: 'release_date_asc', label: 'Tanggal rilis terlama' },
    { value: 'title_asc', label: 'Judul A-Z' },
    { value: 'title_desc', label: 'Judul Z-A' },
];

function EmptySelectionState() {
    return (
        <div className='flex flex-col items-center gap-1 py-16 text-center text-sm text-muted-foreground'>
            <p>Pilih genre di atas untuk mulai melihat anime</p>
            <p className='text-xs text-muted-foreground/60'>
                Bisa pilih lebih dari satu genre sekaligus
            </p>
        </div>
    );
}

export function AnimeByGenreResults({
    selectedGenreIds,
}: {
    selectedGenreIds: number[];
}) {
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<SortingMethod>('recently_modified');

    // reset ke halaman 1 tiap kali kombinasi genre berubah
    useEffect(() => {
        setPage(1);
    }, [selectedGenreIds.join(',')]);

    const { data, isLoading, isFetching, isError, error } = useQuery({
        queryKey: ['anime-by-genre-library', selectedGenreIds, page, sort],
        queryFn: async () => {
            const result = await commands.getAnimesByGenreLibrary(
                page,
                RESULTS_PER_PAGE,
                sort,
                selectedGenreIds,
            );
            if (result.status === 'error') throw new Error(result.error);
            return result.data;
        },
        enabled: selectedGenreIds.length > 0,
        placeholderData: keepPreviousData,
    });

    if (selectedGenreIds.length === 0) {
        return <EmptySelectionState />;
    }

    const animes = data?.animes ?? [];
    const maxPage = data?.last_page ?? 1;
    const currentPage = data?.current_page ?? page;
    const total = data?.total ?? 0;

    function goToPage(next: number) {
        if (next < 1 || next === currentPage) return;
        if (maxPage && next > maxPage) return;
        setPage(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <div>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    <Badge variant='outline' className='font-normal'>
                        {total} anime • Halaman {currentPage} / {maxPage}
                    </Badge>
                    {isFetching && !isLoading && (
                        <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                    )}
                </div>

                <Select value={sort} onValueChange={v => setSort(v as SortingMethod)}>
                    <SelectTrigger className='h-8 w-47.5 text-xs'>
                        <SelectValue placeholder='Urutkan' />
                    </SelectTrigger>
                    <SelectContent>
                        {RESULT_SORT_OPTIONS.map(opt => (
                            <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className='text-xs'
                            >
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className='flex justify-center py-16'>
                    <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                </div>
            ) : isError ? (
                <div className='py-16 text-center text-sm text-muted-foreground'>
                    {error instanceof Error ? error.message : 'Gagal memuat anime'}
                </div>
            ) : animes.length === 0 ? (
                <div className='py-16 text-center text-sm text-muted-foreground'>
                    Tidak ada anime yang cocok dengan genre yang dipilih
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
                    {animes.map(anime => (
                        <AnimeResultCard key={anime.id} anime={anime} />
                    ))}
                </div>
            )}

            <PaginationBar
                currentPage={currentPage}
                maxPage={maxPage}
                isFetching={isFetching}
                onGoToPage={goToPage}
            />
        </div>
    );
}
