import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router';

import { useQueryClient } from '@tanstack/react-query';
import {
    Check,
    ChevronDown,
    Clapperboard,
    Download,
    Loader2,
    Play,
    Star,
    Users,
    X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    type AnimeInformation,
    type EpisodeInformation,
    type EpisodeWithStatus,
    type Platform,
    type Resolution,
    commands,
    events,
} from '@/types/bindings';

const RESOLUTIONS: { value: Resolution; label: string }[] = [
    { value: 'P360', label: '360p' },
    { value: 'P480', label: '480p' },
    { value: 'P720', label: '720p' },
];

type DownloadStatus = 'idle' | 'queued' | 'downloading' | 'cancelling' | 'done' | 'error';

type DownloadState = {
    status: DownloadStatus;
    downloaded?: number;
    total?: number;
    error?: string;
};

function formatBytes(bytes?: number) {
    if (bytes == null) return null;
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function downloadKey(episodeName: string, resolution: Resolution) {
    return `${episodeName}::${resolution}`;
}

export default () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { anime } = useParams<{ anime: string }>();

    const [info, setInfo] = useState<AnimeInformation | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [platform, setPlatform] = useState<Platform | null>(null);

    const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
    const [doneOverrides, setDoneOverrides] = useState<Record<string, boolean>>({});

    const [openEpisodes, setOpenEpisodes] = useState<Record<string, boolean>>({});

    const [batchDialogOpen, setBatchDialogOpen] = useState(false);
    const [batchResolution, setBatchResolution] = useState<Resolution>('P360');
    const [batchPlatform, setBatchPlatform] = useState<Platform | null>(null);
    const [batchDownloading, setBatchDownloading] = useState(false);

    const animeFolder = useMemo(() => anime ?? '', [anime]);

    useEffect(() => {
        commands.getPlatforms().then(list => {
            setPlatforms(list);
            setPlatform(prev => prev ?? list[0] ?? null);
            setBatchPlatform(prev => prev ?? list[0] ?? null);
        });
    }, []);

    useEffect(() => {
        if (!anime) return;
        let mounted = true;
        (async () => {
            setLoading(true);
            const res = await commands.getAnimeInformation(anime);
            if (!mounted) return;
            if (res.status === 'ok') {
                setInfo(res.data);
            } else {
                setLoadError(res.error);
            }
            setLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, [anime]);

    useEffect(() => {
        let active = true;
        const unlisten: (() => void)[] = [];

        Promise.all([
            events.downloadInfo.listen(({ payload }) => {
                const key = downloadKey(payload.id, payload.resolution);
                setDownloads(prev => ({
                    ...prev,
                    [key]: {
                        status: 'downloading',
                        downloaded: 0,
                        total: payload.total_size ?? undefined,
                    },
                }));
            }),
            events.downloadProgress.listen(({ payload }) => {
                const key = downloadKey(payload.id, payload.resolution);
                setDownloads(prev => ({
                    ...prev,
                    [key]: {
                        ...prev[key],
                        status: 'downloading',
                        downloaded: payload.downloaded ?? prev[key]?.downloaded,
                        total: payload.total ?? prev[key]?.total,
                    },
                }));
            }),
            events.downloadDone.listen(({ payload }) => {
                const key = downloadKey(payload.id, payload.resolution);
                setDownloads(prev => ({ ...prev, [key]: { status: 'done' } }));
                setDoneOverrides(prev => ({ ...prev, [key]: true }));
            }),
            events.downloadError.listen(({ payload }) => {
                const key = downloadKey(payload.id, payload.resolution);
                setDownloads(prev => ({
                    ...prev,
                    [key]: { status: 'error', error: payload.message },
                }));
            }),
            events.downloadCancelled.listen(({ payload }) => {
                const key = downloadKey(payload.id, payload.resolution);
                setDownloads(prev => ({ ...prev, [key]: { status: 'idle' } }));
            }),
        ]).then(fns => {
            if (active) {
                unlisten.push(...fns);
            } else {
                fns.forEach(fn => fn());
            }
        });

        return () => {
            active = false;
            unlisten.forEach(fn => fn());
        };
    }, []);

    function isDownloaded(episode: EpisodeWithStatus, resolution: Resolution) {
        return (
            episode.downloaded_resolutions.includes(resolution) ||
            !!doneOverrides[downloadKey(episode.info.name, resolution)]
        );
    }

    function hasActiveDownload(episode: EpisodeWithStatus) {
        return RESOLUTIONS.some(r => {
            const status = downloads[downloadKey(episode.info.name, r.value)]?.status;
            return (
                status === 'downloading' || status === 'queued' || status === 'cancelling'
            );
        });
    }

    async function handleDownloadOne(
        episode: EpisodeInformation,
        resolution: Resolution,
    ) {
        if (!info || !platform) return;

        await commands.saveAnimeInformation(animeFolder, info);

        const key = downloadKey(episode.name, resolution);
        setDownloads(prev => ({ ...prev, [key]: { status: 'queued' } }));

        const res = await commands.downloadEpisode(
            animeFolder,
            episode,
            resolution,
            platform,
        );

        if (res.status === 'ok') {
            queryClient.invalidateQueries({ queryKey: ['anime-library'] });
        }

        if (res.status === 'error') {
            setDownloads(prev => ({
                ...prev,
                [key]: { status: 'error', error: res.error },
            }));
        }
    }

    async function handleCancel(episodeName: string, resolution: Resolution) {
        const key = downloadKey(episodeName, resolution);
        setDownloads(prev => ({
            ...prev,
            [key]: { ...prev[key], status: 'cancelling' },
        }));
        await commands.cancelDownload(episodeName, resolution);
    }

    function openBatchDialog() {
        setBatchResolution('P360');
        setBatchPlatform(platform ?? platforms[0] ?? null);
        setBatchDialogOpen(true);
    }

    async function handleConfirmDownloadAll() {
        if (!info || !batchPlatform) return;

        setBatchDialogOpen(false);
        setBatchDownloading(true);

        await commands.saveAnimeInformation(animeFolder, info);

        const targets = info.episodes.filter(ep => !isDownloaded(ep, batchResolution));

        setDownloads(prev => {
            const next = { ...prev };
            targets.forEach(ep => {
                next[downloadKey(ep.info.name, batchResolution)] = { status: 'queued' };
            });
            return next;
        });

        const res = await commands.downloadEpisodes(
            animeFolder,
            targets.map(ep => ep.info),
            batchResolution,
            batchPlatform,
        );

        if (res.status === 'ok') {
            queryClient.invalidateQueries({ queryKey: ['anime-library'] });
        }

        setBatchDownloading(false);
    }

    if (loading) {
        return (
            <Loader2 className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground' />
        );
    }

    if (loadError || !info) {
        return (
            <div className='mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground'>
                {loadError ?? 'Anime tidak ditemukan'}
            </div>
        );
    }

    return (
        <div className='mx-auto w-full max-w-5xl px-6 py-10 pb-16'>
            <div className='mb-8 flex gap-5'>
                <img
                    src={info.image_url}
                    alt={info.judul}
                    className='h-56 w-40 shrink-0 rounded-lg border border-border object-cover'
                />
                <div className='flex flex-col gap-2'>
                    <h1
                        className='text-2xl font-semibold leading-tight text-foreground'
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        {info.judul}
                    </h1>
                    <p className='text-sm text-muted-foreground/70'>{info.japanese}</p>

                    <div className='mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                            <Star className='h-3.5 w-3.5 text-primary' />
                            {info.score}
                        </span>
                        <span>{info.tipe}</span>
                        <span>{info.status}</span>
                        <span>{info.tanggal_rilis}</span>
                        <span className='flex items-center gap-1'>
                            <Clapperboard className='h-3.5 w-3.5' />
                            {info.studio}
                        </span>
                        <span className='flex items-center gap-1'>
                            <Users className='h-3.5 w-3.5' />
                            {info.produser}
                        </span>
                    </div>

                    <div className='mt-2 flex flex-wrap gap-1.5'>
                        {info.genres.map(genre => (
                            <Badge
                                key={genre.name}
                                variant='link'
                                className='text-xs font-normal border-border cursor-pointer'
                                onClick={() => navigate(`/otakudesu/genre/${genre.name}`)}
                            >
                                {genre.display}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            <Card className='mb-6'>
                <CardContent className='space-y-2 text-sm leading-relaxed text-muted-foreground'>
                    {info.sinopsis.map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                    ))}
                </CardContent>
            </Card>

            <div className='mb-4 flex flex-wrap items-center gap-3'>
                <Select
                    value={platform ?? ''}
                    onValueChange={v => setPlatform(v as Platform)}
                >
                    <SelectTrigger className='w-28 text-xs'>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {platforms.map(p => (
                            <SelectItem key={p} value={p}>
                                {p}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    size='sm'
                    disabled={batchDownloading}
                    onClick={openBatchDialog}
                    className='ml-auto h-8 gap-1.5 px-3 text-xs font-medium'
                >
                    {batchDownloading ? (
                        <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                        <Download className='h-3.5 w-3.5' />
                    )}
                    Unduh Semua Episode
                </Button>
            </div>

            <Card className='p-0'>
                <CardHeader className='pb-2 pt-6 px-6'>
                    <CardTitle className='text-sm font-medium'>Episode</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                    {info.episodes.map((episode, i) => {
                        const active = hasActiveDownload(episode);
                        const open = openEpisodes[episode.info.name] ?? false;

                        return (
                            <Collapsible
                                key={episode.info.name}
                                open={open}
                                onOpenChange={o =>
                                    setOpenEpisodes(prev => ({
                                        ...prev,
                                        [episode.info.name]: o,
                                    }))
                                }
                                className={i === 0 ? '' : 'border-t border-border'}
                            >
                                <CollapsibleTrigger asChild>
                                    <div className='flex items-center gap-4 px-6 py-3 cursor-pointer'>
                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-sm text-foreground'>
                                                {episode.info.name}
                                            </p>
                                            <p className='text-xs text-muted-foreground/70'>
                                                {episode.info.date}
                                            </p>
                                        </div>

                                        {active && (
                                            <span className='flex items-center gap-1.5 text-xs text-primary'>
                                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                Sedang mengunduh
                                            </span>
                                        )}

                                        <Button
                                            size='icon'
                                            variant='ghost'
                                            className='h-7 w-7 shrink-0 text-muted-foreground hover:bg-transparent'
                                        >
                                            <ChevronDown
                                                className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : 'rotate-0'}`}
                                            />
                                        </Button>
                                    </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <div className='flex flex-wrap gap-2 px-6 pb-4 pt-0'>
                                        {RESOLUTIONS.map(r => {
                                            const key = downloadKey(
                                                episode.info.name,
                                                r.value,
                                            );
                                            const state = downloads[key];
                                            const downloaded = isDownloaded(
                                                episode,
                                                r.value,
                                            );

                                            const percent =
                                                state?.downloaded != null && state?.total
                                                    ? Math.min(
                                                          100,
                                                          Math.round(
                                                              (state.downloaded /
                                                                  state.total) *
                                                                  100,
                                                          ),
                                                      )
                                                    : null;

                                            if (downloaded) {
                                                return (
                                                    <Button
                                                        key={r.value}
                                                        size='sm'
                                                        variant='outline'
                                                        onClick={() =>
                                                            navigate(
                                                                `/library/anime/${animeFolder}/${episode.info.name.replace(' ', '_')}/${r.value}`,
                                                            )
                                                        }
                                                        className='h-8 gap-1.5 px-3 text-xs border-primary text-primary hover:bg-primary/10'
                                                    >
                                                        <Check className='h-3.5 w-3.5' />
                                                        {r.label}
                                                    </Button>
                                                );
                                            }

                                            if (
                                                state?.status === 'downloading' ||
                                                state?.status === 'queued' ||
                                                state?.status === 'cancelling'
                                            ) {
                                                return (
                                                    <div
                                                        key={r.value}
                                                        className='flex items-center gap-2 rounded-md border border-border px-3 py-1.5'
                                                    >
                                                        <span className='text-xs font-medium text-foreground'>
                                                            {r.label}
                                                        </span>

                                                        {state.status === 'queued' ? (
                                                            <span className='flex items-center gap-1.5 text-xs text-muted-foreground/70'>
                                                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                                Menunggu
                                                            </span>
                                                        ) : (
                                                            <div className='flex items-center gap-2'>
                                                                <div className='h-1.5 w-20 rounded-full bg-muted'>
                                                                    <div
                                                                        className='h-1.5 rounded-full bg-primary transition-all'
                                                                        style={{
                                                                            width:
                                                                                percent !=
                                                                                null
                                                                                    ? `${percent}%`
                                                                                    : '30%',
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className='whitespace-nowrap text-xs font-mono text-muted-foreground'>
                                                                    {state.total != null
                                                                        ? `${formatBytes(state.downloaded) ?? '0 KB'} / ${formatBytes(state.total)}`
                                                                        : (formatBytes(
                                                                              state.downloaded,
                                                                          ) ??
                                                                          'Menghitung...')}
                                                                    {percent != null && (
                                                                        <span className='text-muted-foreground/70'>
                                                                            {' '}
                                                                            ({percent}%)
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <Button
                                                            size='icon'
                                                            variant='ghost'
                                                            disabled={
                                                                state.status ===
                                                                'cancelling'
                                                            }
                                                            onClick={() =>
                                                                handleCancel(
                                                                    episode.info.name,
                                                                    r.value,
                                                                )
                                                            }
                                                            className='h-6 w-6 shrink-0 text-muted-foreground hover:bg-transparent'
                                                        >
                                                            {state.status ===
                                                            'cancelling' ? (
                                                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                            ) : (
                                                                <X className='h-3.5 w-3.5' />
                                                            )}
                                                        </Button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={r.value}
                                                    className='flex items-center gap-2'
                                                >
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        disabled={!platform}
                                                        onClick={() =>
                                                            handleDownloadOne(
                                                                episode.info,
                                                                r.value,
                                                            )
                                                        }
                                                        className='h-8 gap-1.5 px-3 text-xs border-border text-muted-foreground'
                                                    >
                                                        <Download className='h-3.5 w-3.5' />
                                                        {r.label}
                                                    </Button>
                                                    {state?.status === 'error' && (
                                                        <span className='text-xs text-destructive'>
                                                            {state.error}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <Button
                                            size='sm'
                                            variant='destructive'
                                            onClick={() =>
                                                navigate(
                                                    '/otakudesu/episode/' +
                                                        episode.info.url,
                                                )
                                            }
                                            className='h-8 gap-1.5 px-3 text-xs border-border bg-destructive/50 hover:bg-destructive/75 text-foreground/80 hover:text-foreground'
                                        >
                                            <Play className='h-3.5 w-3.5' />
                                            Stream
                                        </Button>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </CardContent>
            </Card>

            <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unduh Semua Episode</DialogTitle>
                    </DialogHeader>

                    <div className='flex flex-col gap-4 py-2'>
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs text-muted-foreground'>
                                Resolusi
                            </label>
                            <Select
                                value={batchResolution}
                                onValueChange={v => setBatchResolution(v as Resolution)}
                            >
                                <SelectTrigger className='w-full text-xs'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RESOLUTIONS.map(r => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs text-muted-foreground'>
                                Platform
                            </label>
                            <Select
                                value={batchPlatform ?? ''}
                                onValueChange={v => setBatchPlatform(v as Platform)}
                            >
                                <SelectTrigger className='w-full text-xs'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {platforms.map(p => (
                                        <SelectItem key={p} value={p}>
                                            {p}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant='ghost'
                            onClick={() => setBatchDialogOpen(false)}
                            className='text-muted-foreground'
                        >
                            Batal
                        </Button>
                        <Button
                            disabled={!batchPlatform}
                            onClick={handleConfirmDownloadAll}
                        >
                            Mulai Unduh
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
