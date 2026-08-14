import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate, useParams } from 'react-router';

import { useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    PlayCircle,
    Radio,
    X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    type EpisodeInformation,
    type EpisodeStreamingInformation,
    type Mirror,
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

type MirrorLinkState =
    | { status: 'loading' }
    | { status: 'done'; url: string }
    | { status: 'error'; error: string };

type DownloadStatus = 'idle' | 'queued' | 'downloading' | 'cancelling' | 'done' | 'error';

type DownloadState = {
    status: DownloadStatus;
    downloaded?: number;
    total?: number;
    error?: string;
};

function formatEpisodeName(name: string) {
    return name.replace(/_/g, ' ');
}

function formatBytes(bytes?: number) {
    if (bytes == null) return null;
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function mirrorKey(resolution: string, mirror: Mirror) {
    return `${resolution}::${mirror.name}::${mirror.data.id}::${mirror.data.i}`;
}

function extractEpisodeNumber(name: string): number | null {
    const match = name.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
}

export default () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { episode: episodeParam } = useParams<{ episode: string }>();

    const [data, setData] = useState<EpisodeStreamingInformation | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
    const [activeMirrorKey, setActiveMirrorKey] = useState('default');

    const [mirrorNonce, setMirrorNonce] = useState<string | null>(null);
    const [mirrorLinks, setMirrorLinks] = useState<Record<string, MirrorLinkState>>({});

    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [platform, setPlatform] = useState<Platform | null>(null);
    const [downloads, setDownloads] = useState<
        Partial<Record<Resolution, DownloadState>>
    >({});

    const currentEpisodeNameRef = useRef<string | null>(null);

    useEffect(() => {
        commands.getPlatforms().then(list => {
            setPlatforms(list);
            setPlatform(prev => prev ?? list[0] ?? null);
        });
    }, []);

    useEffect(() => {
        if (!episodeParam) return;
        let cancelled = false;

        setLoading(true);
        setLoadError(null);
        setData(null);
        setActiveVideoUrl(null);
        setActiveMirrorKey('default');
        setMirrorNonce(null);
        setMirrorLinks({});
        setDownloads({});

        const episodeUrl = decodeURIComponent(episodeParam);

        commands.getEpisodeStreaming(episodeUrl).then(res => {
            if (cancelled) return;
            if (res.status === 'ok') {
                setData(res.data);
                setActiveVideoUrl(res.data.default_mirror);
                currentEpisodeNameRef.current = res.data.episode_information.name;
            } else {
                setLoadError(res.error);
            }
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [episodeParam]);

    useEffect(() => {
        let active = true;
        const unlisten: (() => void)[] = [];

        Promise.all([
            events.downloadInfo.listen(({ payload }) => {
                if (payload.id !== currentEpisodeNameRef.current) return;
                setDownloads(prev => ({
                    ...prev,
                    [payload.resolution]: {
                        status: 'downloading',
                        downloaded: 0,
                        total: payload.total_size ?? undefined,
                    },
                }));
            }),
            events.downloadProgress.listen(({ payload }) => {
                if (payload.id !== currentEpisodeNameRef.current) return;
                setDownloads(prev => ({
                    ...prev,
                    [payload.resolution]: {
                        ...prev[payload.resolution],
                        status: 'downloading',
                        downloaded:
                            payload.downloaded ?? prev[payload.resolution]?.downloaded,
                        total: payload.total ?? prev[payload.resolution]?.total,
                    },
                }));
            }),
            events.downloadDone.listen(({ payload }) => {
                if (payload.id !== currentEpisodeNameRef.current) return;
                setDownloads(prev => ({
                    ...prev,
                    [payload.resolution]: { status: 'done' },
                }));
                queryClient.invalidateQueries({ queryKey: ['anime-library'] });
            }),
            events.downloadError.listen(({ payload }) => {
                if (payload.id !== currentEpisodeNameRef.current) return;
                setDownloads(prev => ({
                    ...prev,
                    [payload.resolution]: { status: 'error', error: payload.message },
                }));
            }),
            events.downloadCancelled.listen(({ payload }) => {
                if (payload.id !== currentEpisodeNameRef.current) return;
                setDownloads(prev => ({
                    ...prev,
                    [payload.resolution]: { status: 'idle' },
                }));
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
    }, [queryClient]);

    const sortedEpisodes = useMemo(() => {
        if (!data) return [];
        const withNumbers = data.episodes.map(ep => ({
            ep,
            num: extractEpisodeNumber(ep.name),
        }));
        const allHaveNumbers = withNumbers.every(x => x.num !== null);
        if (!allHaveNumbers) return data.episodes; // fallback, jangan sort kalau ga bisa dipercaya

        return [...withNumbers].sort((a, b) => a.num! - b.num!).map(x => x.ep);
    }, [data]);

    const currentIndex = useMemo(() => {
        if (!data) return -1;

        let index = sortedEpisodes.findIndex(
            ep => ep.url === data.episode_information.url,
        );

        return index >= 0 ? index : sortedEpisodes.length - 1;
    }, [data]);

    const prevEpisode =
        data && currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : undefined;
    const nextEpisode =
        data && currentIndex >= 0 && currentIndex < sortedEpisodes.length - 1
            ? sortedEpisodes[currentIndex + 1]
            : undefined;

    function goToEpisode(episode: EpisodeInformation | undefined) {
        if (!episode) return;
        navigate(`/otakudesu/episode/${encodeURIComponent(episode.url)}`);
    }

    function selectDefaultMirror() {
        if (!data) return;
        setActiveVideoUrl(data.default_mirror);
        setActiveMirrorKey('default');
    }

    async function resolveMirror(resolution: string, mirror: Mirror) {
        const key = mirrorKey(resolution, mirror);
        setMirrorLinks(prev => ({ ...prev, [key]: { status: 'loading' } }));

        const res = await commands.getMirrorLink(mirror.data, mirrorNonce);

        if (res.status === 'ok') {
            setMirrorLinks(prev => ({
                ...prev,
                [key]: { status: 'done', url: res.data.url },
            }));
            setMirrorNonce(prev => prev ?? res.data.nonce);
            setActiveVideoUrl(res.data.url);
            setActiveMirrorKey(key);
        } else {
            setMirrorLinks(prev => ({
                ...prev,
                [key]: { status: 'error', error: res.error },
            }));
        }
    }

    async function handleDownload(resolution: Resolution) {
        if (!data || !platform) return;

        setDownloads(prev => ({ ...prev, [resolution]: { status: 'queued' } }));

        const res = await commands.downloadEpisode(
            data.anime_folder,
            data.episode_information,
            resolution,
            platform,
        );

        if (res.status === 'error') {
            setDownloads(prev => ({
                ...prev,
                [resolution]: { status: 'error', error: res.error },
            }));
        }
    }

    async function handleCancel(resolution: Resolution) {
        if (!data) return;
        setDownloads(prev => ({
            ...prev,
            [resolution]: { ...prev[resolution], status: 'cancelling' },
        }));
        await commands.cancelDownload(data.episode_information.name, resolution);
    }

    if (loading) {
        return (
            <Loader2 className='absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground' />
        );
    }

    if (loadError || !data) {
        return (
            <div className='mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground'>
                {loadError ?? 'Episode tidak ditemukan'}
            </div>
        );
    }

    return (
        <div className='mx-auto w-full max-w-5xl px-6 py-10 pb-16'>
            <div className='mb-6 flex items-center gap-3'>
                <Button
                    size='icon'
                    variant='ghost'
                    className='h-8 w-8 shrink-0 text-muted-foreground'
                    onClick={() => navigate(`/otakudesu/anime/${data.anime_folder}`)}
                >
                    <ArrowLeft className='h-4 w-4' />
                </Button>

                <div className='min-w-0 flex-1'>
                    <button
                        type='button'
                        onClick={() => navigate(`/otakudesu/anime/${data.anime_folder}`)}
                        className='block truncate text-left text-xs text-muted-foreground hover:text-foreground hover:underline'
                    >
                        {data.anime_name}
                    </button>
                    <h1
                        className='truncate text-xl font-semibold leading-tight text-foreground'
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        {formatEpisodeName(data.episode_information.name)}
                    </h1>
                </div>

                <div className='flex shrink-0 items-center gap-1.5'>
                    <Button
                        size='icon'
                        variant='outline'
                        disabled={!prevEpisode}
                        onClick={() => goToEpisode(prevEpisode)}
                        className='h-8 w-8'
                    >
                        <ChevronLeft className='h-3.5 w-3.5' />
                    </Button>
                    <Button
                        size='icon'
                        variant='outline'
                        disabled={!nextEpisode}
                        onClick={() => goToEpisode(nextEpisode)}
                        className='h-8 w-8'
                    >
                        <ChevronRight className='h-3.5 w-3.5' />
                    </Button>
                    {currentIndex >= 0 && (
                        <Badge
                            variant='secondary'
                            className='ml-1 hidden font-normal sm:inline-flex'
                        >
                            Episode {currentIndex + 1} / {sortedEpisodes.length}
                        </Badge>
                    )}
                </div>
            </div>

            <div className='mb-6 aspect-video w-full overflow-hidden rounded-lg border border-border bg-black'>
                {activeVideoUrl ? (
                    <iframe
                        key={activeVideoUrl}
                        src={activeVideoUrl}
                        title={`${data.anime_name} - ${formatEpisodeName(data.episode_information.name)}`}
                        className='h-full w-full'
                        allow='autoplay; fullscreen; picture-in-picture'
                        allowFullScreen
                        referrerPolicy='no-referrer'
                    />
                ) : (
                    <div className='flex h-full items-center justify-center'>
                        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                    </div>
                )}
            </div>

            <div className='grid gap-6 md:grid-cols-2'>
                <Card>
                    <CardHeader className='pb-2'>
                        <CardTitle className='flex items-center gap-1.5 text-sm font-medium'>
                            <Radio className='h-3.5 w-3.5' />
                            Mirror Streaming
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col gap-3'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <span className='w-16 shrink-0 text-xs text-muted-foreground'>
                                Default
                            </span>
                            <Button
                                size='sm'
                                variant={
                                    activeMirrorKey === 'default' ? 'default' : 'outline'
                                }
                                onClick={selectDefaultMirror}
                                className='h-7 gap-1.5 px-2.5 text-xs'
                            >
                                <PlayCircle className='h-3.5 w-3.5' />
                                Mirror Utama
                            </Button>
                        </div>

                        {data.mirrors.map(group => (
                            <div
                                key={group.resolution}
                                className='flex flex-wrap items-start gap-2'
                            >
                                <span className='mt-1 w-16 shrink-0 text-xs text-muted-foreground'>
                                    {group.resolution}
                                </span>
                                <div className='flex flex-1 flex-wrap gap-2'>
                                    {group.mirrors.map(mirror => {
                                        const key = mirrorKey(group.resolution, mirror);
                                        const state = mirrorLinks[key];
                                        const active = activeMirrorKey === key;

                                        return (
                                            <div
                                                key={key}
                                                className='flex flex-col items-start gap-1'
                                            >
                                                <Button
                                                    size='sm'
                                                    variant={
                                                        active ? 'default' : 'outline'
                                                    }
                                                    disabled={state?.status === 'loading'}
                                                    onClick={() =>
                                                        resolveMirror(
                                                            group.resolution,
                                                            mirror,
                                                        )
                                                    }
                                                    className='h-7 gap-1.5 px-2.5 text-xs'
                                                >
                                                    {state?.status === 'loading' && (
                                                        <Loader2 className='h-3 w-3 animate-spin' />
                                                    )}
                                                    {mirror.name}
                                                </Button>
                                                {state?.status === 'error' && (
                                                    <span className='text-[10px] text-destructive'>
                                                        {state.error}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='pb-2'>
                        <CardTitle className='text-sm font-medium'>
                            Daftar Episode
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='max-h-72 overflow-y-auto p-0'>
                        {sortedEpisodes.map((ep, i) => {
                            const active = ep.url === data.episode_information.url;

                            return (
                                <button
                                    key={ep.url}
                                    type='button'
                                    onClick={() => goToEpisode(ep)}
                                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                                        i === 0 ? '' : 'border-t border-border'
                                    } ${
                                        active
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-foreground hover:bg-muted/50'
                                    }`}
                                >
                                    <span className='w-7 shrink-0 text-xs text-muted-foreground'>
                                        {i + 1}
                                    </span>
                                    <span className='truncate'>
                                        {formatEpisodeName(ep.name)}
                                    </span>
                                    {active && (
                                        <PlayCircle className='ml-auto h-3.5 w-3.5 shrink-0' />
                                    )}
                                </button>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>

            <Card className='mt-6'>
                <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-medium'>
                        Unduh Episode Ini
                    </CardTitle>
                </CardHeader>
                <CardContent className='flex flex-col gap-4'>
                    <div className='flex items-center gap-2'>
                        <span className='text-xs text-muted-foreground'>Platform</span>
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
                    </div>

                    <div className='flex flex-wrap gap-2'>
                        {RESOLUTIONS.map(r => {
                            const state = downloads[r.value];
                            const percent =
                                state?.downloaded != null && state?.total
                                    ? Math.min(
                                          100,
                                          Math.round(
                                              (state.downloaded / state.total) * 100,
                                          ),
                                      )
                                    : null;

                            if (state?.status === 'done') {
                                return (
                                    <Button
                                        key={r.value}
                                        size='sm'
                                        variant='outline'
                                        disabled
                                        className='h-8 gap-1.5 px-3 text-xs border-primary text-primary'
                                    >
                                        <Check className='h-3.5 w-3.5' />
                                        {r.label} selesai
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
                                                                percent != null
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
                                                          ) ?? 'Menghitung...')}
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
                                            disabled={state.status === 'cancelling'}
                                            onClick={() => handleCancel(r.value)}
                                            className='h-6 w-6 shrink-0 text-muted-foreground hover:bg-transparent'
                                        >
                                            {state.status === 'cancelling' ? (
                                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                            ) : (
                                                <X className='h-3.5 w-3.5' />
                                            )}
                                        </Button>
                                    </div>
                                );
                            }

                            return (
                                <div key={r.value} className='flex items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        disabled={!platform}
                                        onClick={() => handleDownload(r.value)}
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
