import { useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router';

import { convertFileSrc } from '@tauri-apps/api/core';
import {
    AlertTriangle,
    Calendar,
    Check,
    Clapperboard,
    ExternalLink,
    Loader2,
    Trash2,
    Users,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    type LibraryAnimeInformation,
    type Resolution,
    commands,
} from '@/types/bindings';

const RESOLUTIONS: { value: Resolution; label: string }[] = [
    { value: 'P360', label: '360p' },
    { value: 'P480', label: '480p' },
    { value: 'P720', label: '720p' },
];

function resKey(episodeName: string, resolution: Resolution) {
    return `${episodeName}::${resolution}`;
}

export default () => {
    const navigate = useNavigate();
    const { anime } = useParams<{ anime: string }>();

    const [data, setData] = useState<LibraryAnimeInformation | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [removing, setRemoving] = useState<Record<string, boolean>>({});
    const [pendingDelete, setPendingDelete] = useState<{
        episodeName: string;
        resolution: Resolution;
    } | null>(null);

    const [notAvailableOpen, setNotAvailableOpen] = useState(false);

    async function loadData() {
        if (!anime) return;
        setLoading(true);
        const res = await commands.getLibraryAnimeInformation(anime);
        if (res.status === 'ok') {
            setData(res.data);
            setLoadError(null);
        } else {
            setLoadError(res.error);
        }
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, [anime]);

    function handleAvailableClick(episodeName: string, resolution: Resolution) {
        navigate(`/library/anime/${anime}/${episodeName}/${resolution}`);
    }

    function handleUnavailableClick() {
        setNotAvailableOpen(true);
    }

    function goToOtakudesu() {
        if (notAvailableOpen) setNotAvailableOpen(false);
        navigate(`/otakudesu/anime/${anime}`);
    }

    async function confirmRemove() {
        if (!anime || !pendingDelete) return;
        const { episodeName, resolution } = pendingDelete;
        const key = resKey(episodeName, resolution);

        setPendingDelete(null);
        setRemoving(prev => ({ ...prev, [key]: true }));

        const res = await commands.libraryRemoveEpisode(anime, episodeName, resolution);

        if (res.status === 'ok') {
            setData(prev =>
                prev
                    ? {
                          ...prev,
                          episodes: prev.episodes.map(ep =>
                              ep.name === episodeName
                                  ? {
                                        ...ep,
                                        resolutions: ep.resolutions.filter(
                                            r => r !== resolution,
                                        ),
                                    }
                                  : ep,
                          ),
                      }
                    : prev,
            );
        }

        setRemoving(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }

    if (loading) {
        return (
            <Loader2 className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground' />
        );
    }

    if (loadError || !data) {
        return (
            <div className='mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground'>
                {loadError ?? 'Anime tidak ditemukan di library'}
            </div>
        );
    }

    const { anime: animeInfo, episodes } = data;

    return (
        <div className='mx-auto w-full max-w-5xl px-6 py-10 pb-16'>
            <div className='mb-8 flex gap-5'>
                <img
                    src={convertFileSrc(animeInfo.image_file)}
                    alt={animeInfo.judul}
                    className='h-56 w-40 shrink-0 rounded-lg border border-border object-cover'
                />
                <div className='flex flex-col gap-2'>
                    <h1
                        className='text-2xl font-semibold leading-tight text-foreground'
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        {animeInfo.judul}
                    </h1>
                    {animeInfo.japanese && (
                        <p className='text-sm text-muted-foreground/70'>
                            {animeInfo.japanese}
                        </p>
                    )}

                    <div className='mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                        {animeInfo.tanggal_rilis && (
                            <span className='flex items-center gap-1'>
                                <Calendar className='h-3.5 w-3.5' />
                                {animeInfo.tanggal_rilis}
                            </span>
                        )}
                        {animeInfo.studio && (
                            <span className='flex items-center gap-1'>
                                <Clapperboard className='h-3.5 w-3.5' />
                                {animeInfo.studio}
                            </span>
                        )}
                        {animeInfo.produser && (
                            <span className='flex items-center gap-1'>
                                <Users className='h-3.5 w-3.5' />
                                {animeInfo.produser}
                            </span>
                        )}
                    </div>

                    {animeInfo.genres.length > 0 && (
                        <div className='mt-2 flex flex-wrap gap-1.5'>
                            {animeInfo.genres.map(genre => (
                                <Badge
                                    key={genre.id}
                                    variant='secondary'
                                    className='text-xs font-normal'
                                >
                                    {genre.name}
                                </Badge>
                            ))}
                        </div>
                    )}

                    <Button
                        variant='outline'
                        size='sm'
                        onClick={goToOtakudesu}
                        className='mt-3 w-fit gap-1.5 text-xs'
                    >
                        <ExternalLink className='h-3.5 w-3.5' />
                        Ke Halaman Otakudesu
                    </Button>
                </div>
            </div>

            <Card className='p-0'>
                <CardHeader className='pb-2 pt-6 px-6'>
                    <CardTitle className='text-sm font-medium'>Episode</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                    {episodes.length === 0 && (
                        <p className='px-6 py-6 text-sm text-muted-foreground'>
                            Belum ada episode yang diunduh.
                        </p>
                    )}

                    {episodes.map((episode, i) => (
                        <div
                            key={episode.name}
                            className={`flex flex-wrap items-center gap-3 px-6 py-3 ${i === 0 ? '' : 'border-t border-border'}`}
                        >
                            <p className='min-w-0 flex-1 truncate text-sm text-foreground'>
                                {episode.name.replace('_', ' ')}
                            </p>

                            <div className='flex flex-wrap gap-2'>
                                {RESOLUTIONS.map(r => {
                                    const available = episode.resolutions.includes(
                                        r.value,
                                    );
                                    const key = resKey(episode.name, r.value);
                                    const isRemoving = removing[key];

                                    if (available) {
                                        return (
                                            <div
                                                key={r.value}
                                                className='flex items-center overflow-hidden rounded-md border border-primary'
                                            >
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    disabled={isRemoving}
                                                    onClick={() =>
                                                        handleAvailableClick(
                                                            episode.name,
                                                            r.value,
                                                        )
                                                    }
                                                    className='h-8 gap-1.5 rounded-none px-3 text-xs text-primary hover:bg-primary/10'
                                                >
                                                    <Check className='h-3.5 w-3.5' />
                                                    {r.label}
                                                </Button>
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    disabled={isRemoving}
                                                    onClick={() =>
                                                        setPendingDelete({
                                                            episodeName: episode.name,
                                                            resolution: r.value,
                                                        })
                                                    }
                                                    className='h-8 w-8 rounded-none border-l border-primary text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                                                >
                                                    {isRemoving ? (
                                                        <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                    ) : (
                                                        <Trash2 className='h-3.5 w-3.5' />
                                                    )}
                                                </Button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <Button
                                            key={r.value}
                                            size='sm'
                                            variant='outline'
                                            onClick={handleUnavailableClick}
                                            className='h-8 gap-1.5 px-3 text-xs border-border text-muted-foreground/50'
                                        >
                                            {r.label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Dialog open={notAvailableOpen} onOpenChange={setNotAvailableOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            <AlertTriangle className='h-4 w-4 text-muted-foreground' />
                            Episode Belum Tersedia
                        </DialogTitle>
                        <DialogDescription>
                            Resolusi ini belum diunduh untuk episode tersebut. Unduh
                            terlebih dahulu dari halaman anime di Otakudesu.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            variant='ghost'
                            onClick={() => setNotAvailableOpen(false)}
                            className='text-muted-foreground'
                        >
                            Tutup
                        </Button>
                        <Button onClick={goToOtakudesu} className='gap-1.5'>
                            <ExternalLink className='h-3.5 w-3.5' />
                            Ke Halaman Anime
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={open => !open && setPendingDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Episode?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingDelete && (
                                <>
                                    File{' '}
                                    <span className='font-medium text-foreground'>
                                        {pendingDelete.episodeName.replace('_', ' ')}
                                    </span>{' '}
                                    pada resolusi{' '}
                                    <span className='font-medium text-foreground'>
                                        {
                                            RESOLUTIONS.find(
                                                r => r.value === pendingDelete.resolution,
                                            )?.label
                                        }
                                    </span>{' '}
                                    akan dihapus secara permanen dari penyimpanan.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemove}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
