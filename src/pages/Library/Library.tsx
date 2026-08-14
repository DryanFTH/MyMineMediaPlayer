import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router';

import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
    AlertCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Clapperboard,
    Film,
    Loader2,
    Trash2,
} from 'lucide-react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type Anime, type SortingMethod, commands } from '@/types/bindings';

const PER_PAGE = 12;

const SORT_OPTIONS: { value: SortingMethod; label: string }[] = [
    { value: 'recently_modified', label: 'Terbaru Diubah' },
    { value: 'oldest_modified', label: 'Terlama Diubah' },
    { value: 'recently_added', label: 'Baru ditambahkan' },
    { value: 'oldest_added', label: 'Lama ditambahkan' },
    { value: 'release_date_desc', label: 'Tanggal rilis terbaru' },
    { value: 'release_date_asc', label: 'Tanggal rilis terlama' },
    { value: 'title_asc', label: 'Judul A-Z' },
    { value: 'title_desc', label: 'Judul Z-A' },
];

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

export default () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<SortingMethod>('recently_modified');
    const [jumpValue, setJumpValue] = useState('');
    const [animeToDelete, setAnimeToDelete] = useState<Anime | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const { data, isLoading, isFetching, isError, error } = useQuery({
        queryKey: ['anime-library', page, sort],
        queryFn: async () => {
            const result = await commands.getPaginateAnimesLibrary(page, PER_PAGE, sort);
            if (result.status === 'error') {
                throw new Error(result.error);
            }
            return result.data;
        },
        placeholderData: keepPreviousData,
    });

    const deleteMutation = useMutation({
        mutationFn: async (folderName: string) => {
            const result = await commands.libraryRemoveAnime(folderName);
            if (result.status === 'error') {
                throw new Error(result.error);
            }
            return result.data;
        },
        onSuccess: () => {
            setAnimeToDelete(null);
            setDeleteError(null);
            queryClient.invalidateQueries({ queryKey: ['anime-library'] });
        },
        onError: err => {
            setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus anime');
        },
    });

    const animes = data?.animes ?? [];
    const maxPage = data?.last_page ?? 1;
    const currentPage = data?.current_page ?? page;
    const total = data?.total ?? 0;

    const pageRange = useMemo(
        () => getPageRange(currentPage, maxPage),
        [currentPage, maxPage],
    );

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

    function handleSortChange(value: SortingMethod) {
        setSort(value);
        setPage(1);
        setJumpValue('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleDeleteClick(e: React.MouseEvent, anime: Anime) {
        e.stopPropagation();
        setDeleteError(null);
        setAnimeToDelete(anime);
    }

    function handleConfirmDelete() {
        if (!animeToDelete?.folder_name) return;
        deleteMutation.mutate(animeToDelete.folder_name);
    }

    function handleDialogOpenChange(open: boolean) {
        if (!open && !deleteMutation.isPending) {
            setAnimeToDelete(null);
            setDeleteError(null);
        }
    }

    if (isLoading) {
        return (
            <Loader2 className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground' />
        );
    }

    if (isError) {
        return (
            <div className='mx-auto flex max-w-4xl flex-col items-center gap-2 px-6 py-16 text-sm text-muted-foreground'>
                <AlertCircle className='h-5 w-5' />
                {error instanceof Error ? error.message : 'Gagal memuat library anime'}
            </div>
        );
    }

    return (
        <div className='mx-auto w-full max-w-5xl px-6 py-10 pb-16'>
            <div className='mb-6 flex flex-col gap-1.5'>
                <h1
                    className='text-2xl font-semibold leading-tight text-foreground'
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    Library
                </h1>
                <p className='text-sm text-muted-foreground/70'>
                    Koleksi anime yang sudah kamu simpan
                </p>
            </div>

            <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    <Badge variant='outline' className='font-normal'>
                        {total} anime • Halaman {currentPage} / {maxPage}
                    </Badge>
                    {isFetching && !isLoading && (
                        <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                    )}
                </div>

                <Select value={sort} onValueChange={handleSortChange}>
                    <SelectTrigger className='h-8 w-47.5 text-xs'>
                        <SelectValue placeholder='Urutkan' />
                    </SelectTrigger>
                    <SelectContent>
                        {SORT_OPTIONS.map(opt => (
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

            {animes.length === 0 ? (
                <div className='py-16 text-center text-sm text-muted-foreground'>
                    Library masih kosong
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
                    {animes.map((anime: Anime) => (
                        <Card
                            key={anime.id}
                            onClick={() =>
                                anime.folder_name &&
                                navigate(`/library/anime/${anime.folder_name}`)
                            }
                            className='group relative cursor-pointer overflow-hidden border-border pt-0 transition-colors hover:border-primary'
                        >
                            <Button
                                size='icon'
                                variant='destructive'
                                onClick={e => handleDeleteClick(e, anime)}
                                className={cn(
                                    'absolute top-2 right-2 z-10',
                                    'flex items-center justify-center',
                                    'cursor-pointer',
                                    'h-8 w-8 bg-card hover:bg-card hover:scale-105 rounded-md',
                                    'opacity-0 shadow-md transition-opacity duration-300 group-hover:opacity-100',
                                )}
                                title='Hapus dari library'
                            >
                                <Trash2 className='h-3.5 w-3.5' />
                            </Button>

                            <div className='relative aspect-3/4 w-full overflow-hidden bg-muted'>
                                {anime.image_file ? (
                                    <img
                                        src={convertFileSrc(anime.image_file)}
                                        alt={anime.image_file}
                                        className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                                        loading='lazy'
                                    />
                                ) : (
                                    <div className='flex h-full w-full items-center justify-center'>
                                        <Film className='h-6 w-6 text-muted-foreground' />
                                    </div>
                                )}
                            </div>
                            <CardContent className='flex flex-col gap-1 px-3 py-3'>
                                <p className='line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary'>
                                    {anime.judul}
                                </p>

                                <div className='flex flex-col gap-0.5 text-xs text-muted-foreground/70'>
                                    {anime.studio && (
                                        <span className='flex items-center gap-1 truncate'>
                                            <Clapperboard className='h-3 w-3 shrink-0' />
                                            {anime.studio}
                                        </span>
                                    )}
                                    {anime.tanggal_rilis && (
                                        <span className='flex items-center gap-1 truncate'>
                                            <Calendar className='h-3 w-3 shrink-0' />
                                            {anime.tanggal_rilis}
                                        </span>
                                    )}
                                </div>

                                {anime.genres.length > 0 && (
                                    <div className='flex flex-wrap gap-1 pt-1'>
                                        {anime.genres.map(g => (
                                            <Badge
                                                key={g.id}
                                                variant='secondary'
                                                className='bg-background text-[10px] text-muted-foreground'
                                            >
                                                {g.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {maxPage > 1 && (
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
                        <input
                            value={jumpValue}
                            onChange={e =>
                                setJumpValue(e.target.value.replace(/[^0-9]/g, ''))
                            }
                            onKeyDown={e => e.key === 'Enter' && handleJumpSubmit()}
                            placeholder={String(currentPage)}
                            className='h-8 w-16 rounded-md border border-input bg-transparent px-2 text-center text-xs shadow-xs'
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

            <AlertDialog
                open={animeToDelete !== null}
                onOpenChange={handleDialogOpenChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus anime dari library?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {animeToDelete
                                ? `"${animeToDelete.judul}" akan dihapus dari library. Tindakan ini tidak bisa dibatalkan.`
                                : ''}
                            {deleteError && (
                                <span className='mt-2 block text-destructive'>
                                    {deleteError}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={deleteMutation.isPending}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                'Hapus'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
