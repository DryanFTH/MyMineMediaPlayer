import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate, useParams } from 'react-router';

import { convertFileSrc } from '@tauri-apps/api/core';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import AnimeVideoPlayer from '@/components/MediaPlayer/AnimeVideoPlayer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    type LibraryAnimeInformation,
    type LibraryEpisodeInformation,
    type Resolution,
    commands,
} from '@/types/bindings';

const RESOLUTIONS: { value: Resolution; label: string }[] = [
    { value: 'P360', label: '360p' },
    { value: 'P480', label: '480p' },
    { value: 'P720', label: '720p' },
];
300;

function isResolution(value: string | undefined): value is Resolution {
    return value === 'P360' || value === 'P480' || value === 'P720';
}

function formatEpisodeName(name: string) {
    return name.replace(/_/g, ' ');
}

function resolveResolutionFor(
    episode: LibraryEpisodeInformation,
    preferred: Resolution | null,
) {
    if (preferred && episode.resolutions.includes(preferred)) return preferred;
    return episode.resolutions[0] ?? null;
}

export default () => {
    const navigate = useNavigate();
    const { anime, episode, resolution } = useParams<{
        anime: string;
        episode: string;
        resolution: string;
    }>();

    const [data, setData] = useState<LibraryAnimeInformation | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [videoLoading, setVideoLoading] = useState(true);
    const [videoError, setVideoError] = useState<string | null>(null);

    const playerRef = useRef<HTMLVideoElement>(null);

    const activeResolution = isResolution(resolution) ? resolution : null;

    useEffect(() => {
        if (!anime) return;
        let cancelled = false;

        setLoading(true);
        commands.getLibraryAnimeInformation(anime).then(res => {
            if (cancelled) return;
            if (res.status === 'ok') {
                setData(res.data);
                setLoadError(null);
            } else {
                setLoadError(res.error);
            }
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [anime]);

    useEffect(() => {
        if (!anime || !episode || !activeResolution) return;
        let cancelled = false;

        setVideoLoading(true);
        setVideoError(null);
        setVideoSrc(null);

        commands.getVideoPath(anime, episode, activeResolution).then(res => {
            if (cancelled) return;
            if (res.status === 'ok') {
                setVideoSrc(res.data);
            } else {
                setVideoError(res.error);
            }
            setVideoLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [anime, episode, activeResolution]);

    const episodeIndex = useMemo(() => {
        if (!data || !episode) return -1;
        return data.episodes.findIndex(ep => ep.name === episode);
    }, [data, episode]);

    const currentEpisode = episodeIndex >= 0 ? data?.episodes[episodeIndex] : undefined;
    const prevEpisode = episodeIndex > 0 ? data?.episodes[episodeIndex - 1] : undefined;
    const nextEpisode =
        data && episodeIndex >= 0 && episodeIndex < data.episodes.length - 1
            ? data.episodes[episodeIndex + 1]
            : undefined;

    function goTo(episodeName: string, res: Resolution) {
        navigate(`/library/anime/${anime}/${episodeName}/${res}`);
    }

    function goToEpisode(target: LibraryEpisodeInformation | undefined) {
        if (!target) return;
        const res = resolveResolutionFor(target, activeResolution);
        if (!res) return;
        goTo(target.name, res);
    }

    function handleEpisodeSelect(episodeName: string) {
        goToEpisode(data?.episodes.find(ep => ep.name === episodeName));
    }

    if (loading) {
        return (
            <Loader2 className='absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground' />
        );
    }

    if (loadError || !data) {
        return (
            <div className='mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground'>
                {loadError ?? 'Anime tidak ditemukan di library'}
            </div>
        );
    }

    if (!episode || !activeResolution || !currentEpisode) {
        return (
            <div className='mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground'>
                Episode tidak ditemukan di library.
            </div>
        );
    }

    const { anime: animeInfo } = data;
    const resolutionLabel = RESOLUTIONS.find(r => r.value === activeResolution)?.label;

    return (
        <div className='flex h-full min-h-0 flex-col'>
            <div className='flex shrink-0 items-center gap-3 border-b border-border bg-card/40 px-4 py-2.5 md:px-6'>
                <Button
                    size='icon'
                    variant='ghost'
                    className='h-8 w-8 shrink-0 text-muted-foreground'
                    onClick={() => navigate(`/library/anime/${anime}`)}
                >
                    <ArrowLeft className='h-4 w-4' />
                </Button>

                <img
                    src={convertFileSrc(animeInfo.image_file)}
                    alt={animeInfo.judul}
                    className='h-9 w-7 shrink-0 rounded-sm border border-border object-cover'
                />

                <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium text-foreground'>
                        {animeInfo.judul}
                    </p>
                    <p className='truncate text-xs text-muted-foreground'>
                        {formatEpisodeName(currentEpisode.name)}
                        <span className='mx-1.5 text-muted-foreground/40'>•</span>
                        {resolutionLabel}
                    </p>
                </div>

                <Badge
                    variant='secondary'
                    className='hidden shrink-0 font-normal sm:inline-flex'
                >
                    Episode {episodeIndex + 1} / {data.episodes.length}
                </Badge>
            </div>

            <div className='min-h-0 flex-1 bg-black'>
                {videoError ? (
                    <div className='flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground'>
                        {videoError}
                    </div>
                ) : videoLoading || !videoSrc ? (
                    <div className='flex h-full items-center justify-center'>
                        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                    </div>
                ) : (
                    <AnimeVideoPlayer
                        key={videoSrc}
                        ref={playerRef}
                        src={videoSrc}
                        title={`${animeInfo.judul} - ${formatEpisodeName(currentEpisode.name)}`}
                        onEnded={() => goToEpisode(nextEpisode)}
                    />
                )}
            </div>

            <div className='shrink-0 border-t border-border px-4 py-3 md:px-6'>
                <div className='flex flex-wrap items-center gap-2'>
                    <Button
                        size='sm'
                        variant='outline'
                        disabled={!prevEpisode}
                        onClick={() => goToEpisode(prevEpisode)}
                        className='h-8 gap-1.5 px-3 text-xs'
                    >
                        <ChevronLeft className='h-3.5 w-3.5' />
                        Sebelumnya
                    </Button>

                    <Select value={episode} onValueChange={handleEpisodeSelect}>
                        <SelectTrigger className='h-8 min-w-40 flex-1 text-xs sm:w-55 sm:flex-none'>
                            <SelectValue placeholder='Pilih episode' />
                        </SelectTrigger>
                        <SelectContent>
                            {data.episodes.map(ep => (
                                <SelectItem
                                    key={ep.name}
                                    value={ep.name}
                                    className='text-xs'
                                >
                                    {formatEpisodeName(ep.name)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        size='sm'
                        variant='outline'
                        disabled={!nextEpisode}
                        onClick={() => goToEpisode(nextEpisode)}
                        className='h-8 gap-1.5 px-3 text-xs'
                    >
                        Berikutnya
                        <ChevronRight className='h-3.5 w-3.5' />
                    </Button>

                    <div className='ml-auto flex items-center gap-1.5'>
                        {RESOLUTIONS.filter(r =>
                            currentEpisode.resolutions.includes(r.value),
                        ).map(r => (
                            <Button
                                key={r.value}
                                size='sm'
                                variant={
                                    r.value === activeResolution ? 'default' : 'outline'
                                }
                                onClick={() => goTo(episode, r.value)}
                                className='h-8 px-2.5 text-xs'
                            >
                                {r.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
