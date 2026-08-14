import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router';

import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    BookmarkX,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Download,
    Film,
    ListChecks,
    Loader2,
    Settings,
    Star,
    Trash2,
    X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    type AnimeOngoingInfo,
    type Platform,
    type Resolution,
    type SeasonalAnime,
    type Weekday,
    commands,
    events,
} from '@/types/bindings';

const RESOLUTIONS: { value: Resolution; label: string }[] = [
    { value: 'P360', label: '360p' },
    { value: 'P480', label: '480p' },
    { value: 'P720', label: '720p' },
];

const RESOLUTION_LABEL: Record<Resolution, string> = {
    P360: '360p',
    P480: '480p',
    P720: '720p',
};

const WEEKDAY_LABEL_ID: Record<Weekday, string> = {
    Monday: 'Senin',
    Tuesday: 'Selasa',
    Wednesday: 'Rabu',
    Thursday: 'Kamis',
    Friday: 'Jumat',
    Saturday: 'Sabtu',
    Sunday: 'Minggu',
};

const WEEKDAY_TO_SEASONAL_KEY: Record<Weekday, keyof SeasonalAnime> = {
    Monday: 'monday',
    Tuesday: 'tuesday',
    Wednesday: 'wednesday',
    Thursday: 'thursday',
    Friday: 'friday',
    Saturday: 'saturday',
    Sunday: 'sunday',
};

const DAY_NAME_TO_WEEKDAY: Record<string, Weekday> = {
    senin: 'Monday',
    selasa: 'Tuesday',
    rabu: 'Wednesday',
    kamis: 'Thursday',
    jumat: 'Friday',
    sabtu: 'Saturday',
    minggu: 'Sunday',
};

const WEEKDAY_BY_JS_DAY: Weekday[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

function parseWeekday(day: string): Weekday | null {
    const normalized = day.toLowerCase().replace(/[^a-z]/g, '');
    return DAY_NAME_TO_WEEKDAY[normalized] ?? null;
}

function getTodayWeekday(): Weekday {
    return WEEKDAY_BY_JS_DAY[new Date().getDay()];
}

function findSeasonalDay(
    animeId: string,
    seasonal?: SeasonalAnime | null,
): Weekday | null {
    if (!seasonal) return null;
    for (const day of Object.keys(WEEKDAY_TO_SEASONAL_KEY) as Weekday[]) {
        const key = WEEKDAY_TO_SEASONAL_KEY[day];
        if (seasonal[key]?.includes(animeId)) return day;
    }
    return null;
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

function formatBytes(bytes?: number) {
    if (bytes == null) return null;
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

type DownloadTaskStatus = 'queued' | 'downloading' | 'done' | 'error' | 'cancelled';

type DownloadTask = {
    taskId: string;
    animeId: string;
    episodeName: string;
    resolution: Resolution;
    completed: boolean;
    status: DownloadTaskStatus;
    downloaded?: number;
    total?: number;
    errorMessage?: string;
};

function renderTaskProgress(task: DownloadTask) {
    if (task.status === 'queued') {
        return (
            <span className='flex items-center gap-1.5 text-xs text-muted-foreground/70'>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                Menunggu
            </span>
        );
    }

    if (task.status === 'downloading') {
        const percent =
            task.downloaded != null && task.total
                ? Math.min(100, Math.round((task.downloaded / task.total) * 100))
                : null;

        return (
            <div className='flex items-center gap-2'>
                <div className='h-1.5 w-24 rounded-full bg-muted'>
                    <div
                        className='h-1.5 rounded-full bg-primary transition-all'
                        style={{ width: percent != null ? `${percent}%` : '30%' }}
                    />
                </div>
                <span className='whitespace-nowrap text-xs font-mono text-muted-foreground'>
                    {task.total != null
                        ? `${formatBytes(task.downloaded) ?? '0 KB'} / ${formatBytes(task.total)}`
                        : (formatBytes(task.downloaded) ?? 'Menghitung...')}
                    {percent != null && (
                        <span className='text-muted-foreground/70'> ({percent}%)</span>
                    )}
                </span>
            </div>
        );
    }

    if (task.status === 'done') {
        return (
            <span className='flex items-center gap-1.5 text-xs text-primary'>
                <Check className='h-3.5 w-3.5' />
                Selesai
            </span>
        );
    }

    if (task.status === 'cancelled') {
        return <span className='text-xs text-muted-foreground/70'>Dibatalkan</span>;
    }

    return (
        <span className='text-xs text-destructive'>{task.errorMessage ?? 'Gagal'}</span>
    );
}

export default () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [jumpValue, setJumpValue] = useState('');

    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [platform, setPlatform] = useState<Platform | null>(null);
    const [resolution, setResolution] = useState<Resolution>('P360');

    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
    const [seasonalPendingIds, setSeasonalPendingIds] = useState<Set<string>>(new Set());
    const [cancellingTaskIds, setCancellingTaskIds] = useState<Set<string>>(new Set());

    const [seasonalDialogOpen, setSeasonalDialogOpen] = useState(false);
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);

    const [tasks, setTasks] = useState<DownloadTask[]>([]);
    const pendingQueueRef = useRef<Map<string, string[]>>(new Map());
    const activeTaskRef = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        commands.getPlatforms().then(list => {
            setPlatforms(list);
            setPlatform(prev => prev ?? list[0] ?? null);
        });
    }, []);

    const { data, isLoading, isFetching, isError, error } = useQuery({
        queryKey: ['ongoing-anime', page],
        queryFn: async () => {
            const result = await commands.getOngoingAnime(page);
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

    const { data: seasonalData } = useQuery({
        queryKey: ['seasonal-anime'],
        queryFn: async () => {
            const result = await commands.getSeasonalAnime();
            if (result.status === 'error') {
                throw new Error(result.error);
            }
            return result.data;
        },
    });

    const todayWeekday = getTodayWeekday();
    const todaySeasonalKey = WEEKDAY_TO_SEASONAL_KEY[todayWeekday];
    const todaySeasonalList = seasonalData?.[todaySeasonalKey] ?? [];
    const hasAnySeasonalFavorite = (
        Object.keys(WEEKDAY_TO_SEASONAL_KEY) as Weekday[]
    ).some(day => (seasonalData?.[WEEKDAY_TO_SEASONAL_KEY[day]]?.length ?? 0) > 0);

    function reportError(err: unknown) {
        setGlobalError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }

    const addSeasonalMutation = useMutation({
        mutationFn: async ({ day, anime }: { day: Weekday; anime: string }) => {
            const infoRes = await commands.getAnimeInformation(anime);

            if (infoRes.status === 'error') throw new Error(infoRes.error);

            const saveRes = await commands.saveAnimeInformation(anime, infoRes.data);

            if (saveRes.status === 'ok') {
                queryClient.invalidateQueries({ queryKey: ['anime-library'] });
            }

            const res = await commands.addSeasonalAnimeByDay(day, anime);

            if (res.status === 'error') throw new Error(res.error);
        },
        onMutate: ({ anime }) => setSeasonalPendingIds(prev => new Set(prev).add(anime)),
        onError: reportError,
        onSettled: (_d, _e, { anime }) =>
            setSeasonalPendingIds(prev => {
                const next = new Set(prev);
                next.delete(anime);
                return next;
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seasonal-anime'] }),
    });

    const removeSeasonalMutation = useMutation({
        mutationFn: async ({ day, anime }: { day: Weekday; anime: string }) => {
            const res = await commands.removeSeasonalAnimeByDay(day, anime);
            if (res.status === 'error') throw new Error(res.error);
        },
        onMutate: ({ anime }) => setSeasonalPendingIds(prev => new Set(prev).add(anime)),
        onError: reportError,
        onSettled: (_d, _e, { anime }) =>
            setSeasonalPendingIds(prev => {
                const next = new Set(prev);
                next.delete(anime);
                return next;
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seasonal-anime'] }),
    });

    const clearSeasonalMutation = useMutation({
        mutationFn: async () => {
            const res = await commands.clearSeasonalAnime();
            if (res.status === 'error') throw new Error(res.error);
        },
        onError: reportError,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['seasonal-anime'] });
            setClearConfirmOpen(false);
        },
    });

    const downloadTodayMutation = useMutation({
        mutationFn: async () => {
            if (!platform) throw new Error('Pilih platform terlebih dahulu');

            const seasonal = queryClient.getQueryData<SeasonalAnime>(['seasonal-anime']);
            const todayKey = WEEKDAY_TO_SEASONAL_KEY[getTodayWeekday()];
            const targets = seasonal?.[todayKey] ?? [];

            if (targets.length === 0)
                throw new Error('Tidak ada favorit musiman untuk hari ini');

            const res = await commands.downloadLatestEpisodes(
                targets,
                resolution,
                platform,
            );

            if (res.status === 'ok') {
                queryClient.invalidateQueries({ queryKey: ['anime-library'] });
            }

            if (res.status === 'error') throw new Error(res.error);
        },
        onError: reportError,
    });

    const downloadLatestMutation = useMutation({
        mutationFn: async (anime: AnimeOngoingInfo) => {
            if (!platform) throw new Error('Pilih platform terlebih dahulu');

            const infoRes = await commands.getAnimeInformation(anime.anime_name);

            if (infoRes.status === 'error') throw new Error(infoRes.error);

            await commands.saveAnimeInformation(anime.anime_name, infoRes.data);

            const res = await commands.downloadLatestEpisode(
                anime.anime_name,
                resolution,
                platform,
            );

            if (res.status === 'ok') {
                queryClient.invalidateQueries({ queryKey: ['anime-library'] });
            }

            if (res.status === 'error') throw new Error(res.error);

            return res.data;
        },
        onMutate: anime => setDownloadingIds(prev => new Set(prev).add(anime.anime_name)),
        onError: reportError,
        onSettled: (_d, _e, anime) =>
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(anime.anime_name);
                return next;
            }),
    });

    function handleToggleSeasonal(
        anime: AnimeOngoingInfo,
        isFav: boolean,
        currentDay: Weekday | null,
    ) {
        if (isFav) {
            if (!currentDay) return;
            removeSeasonalMutation.mutate({ day: currentDay, anime: anime.anime_name });
        } else {
            const weekday = parseWeekday(anime.day);
            if (!weekday) return;
            addSeasonalMutation.mutate({ day: weekday, anime: anime.anime_name });
        }
    }

    const cancelTaskMutation = useMutation({
        mutationFn: async (task: DownloadTask) => {
            const res = await commands.cancelDownload(task.episodeName, task.resolution);
            if (res.status === 'error') throw new Error(res.error);
        },
        onMutate: task => setCancellingTaskIds(prev => new Set(prev).add(task.taskId)),
        onError: reportError,
        onSettled: (_d, _e, task) =>
            setCancellingTaskIds(prev => {
                const next = new Set(prev);
                next.delete(task.taskId);
                return next;
            }),
    });

    useEffect(() => {
        let active = true;
        const unlistenFns: (() => void)[] = [];

        function updateTask(taskId: string, patch: Partial<DownloadTask>) {
            setTasks(prev =>
                prev.map(t => (t.taskId === taskId ? { ...t, ...patch } : t)),
            );
        }

        function takeTaskIdForTerminalEvent(id: string): string | undefined {
            const activeId = activeTaskRef.current.get(id);
            if (activeId) {
                activeTaskRef.current.delete(id);
                return activeId;
            }
            const queue = pendingQueueRef.current.get(id);
            if (queue && queue.length > 0) {
                return queue.shift();
            }
            return undefined;
        }

        Promise.all([
            events.downloadAnimeInfo.listen(({ payload }) => {
                const taskId = `${payload.anime_id}::${payload.episode.name}::${payload.resolution}::${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

                const newTask: DownloadTask = {
                    taskId,
                    animeId: payload.anime_id,
                    episodeName: payload.episode.name,
                    resolution: payload.resolution,
                    completed: payload.completed,
                    status: 'queued',
                };
                setTasks(prev => [newTask, ...prev].slice(0, 50));

                const queue = pendingQueueRef.current.get(payload.episode.name) ?? [];
                queue.push(taskId);
                pendingQueueRef.current.set(payload.episode.name, queue);
            }),
            events.downloadAnimeError.listen(({ payload }) => {
                const taskId = takeTaskIdForTerminalEvent(payload.episode.name);
                if (!taskId) return;
                updateTask(taskId, { status: 'error', errorMessage: payload.message });
            }),
            events.downloadInfo.listen(({ payload }) => {
                const queue = pendingQueueRef.current.get(payload.id);
                if (!queue || queue.length === 0) return;
                const taskId = queue.shift()!;
                activeTaskRef.current.set(payload.id, taskId);
                updateTask(taskId, {
                    status: 'downloading',
                    total: payload.total_size ?? undefined,
                    downloaded: 0,
                });
            }),
            events.downloadProgress.listen(({ payload }) => {
                const taskId = activeTaskRef.current.get(payload.id);
                if (!taskId) return;
                updateTask(taskId, {
                    downloaded: payload.downloaded ?? undefined,
                    total: payload.total ?? undefined,
                });
            }),
            events.downloadDone.listen(({ payload }) => {
                const taskId = takeTaskIdForTerminalEvent(payload.id);
                if (!taskId) return;
                updateTask(taskId, { status: 'done' });
            }),
            events.downloadError.listen(({ payload }) => {
                const taskId = takeTaskIdForTerminalEvent(payload.id);
                if (!taskId) return;
                updateTask(taskId, { status: 'error', errorMessage: payload.message });
            }),
            events.downloadCancelled.listen(({ payload }) => {
                const taskId = takeTaskIdForTerminalEvent(payload.id);
                if (!taskId) return;
                updateTask(taskId, { status: 'cancelled' });
            }),
        ]).then(fns => {
            if (active) {
                unlistenFns.push(...fns);
            } else {
                fns.forEach(fn => fn());
            }
        });

        return () => {
            active = false;
            unlistenFns.forEach(fn => fn());
        };
    }, []);

    if (isLoading) {
        return (
            <Loader2 className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground' />
        );
    }

    if (isError) {
        return (
            <div className='mx-auto flex max-w-4xl flex-col items-center gap-2 px-6 py-16 text-sm text-muted-foreground'>
                <AlertCircle className='h-5 w-5' />
                {error instanceof Error
                    ? error.message
                    : 'Gagal memuat daftar anime ongoing'}
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
                    Anime Ongoing
                </h1>
                <p className='text-sm text-muted-foreground/70'>
                    Daftar anime yang sedang tayang musim ini
                </p>
            </div>

            {globalError && (
                <div className='mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive'>
                    <AlertCircle className='h-3.5 w-3.5 shrink-0' />
                    <span className='flex-1'>{globalError}</span>
                    <Button
                        size='icon'
                        variant='ghost'
                        className='h-5 w-5 text-destructive hover:bg-transparent'
                        onClick={() => setGlobalError(null)}
                    >
                        <X className='h-3.5 w-3.5' />
                    </Button>
                </div>
            )}

            <div className='mb-4 flex flex-wrap items-center gap-3'>
                <Select
                    value={resolution}
                    onValueChange={v => setResolution(v as Resolution)}
                >
                    <SelectTrigger className='w-24 text-xs'>
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

                <Badge variant='outline' className='ml-auto font-normal'>
                    Halaman {currentPage} / {maxPage}
                </Badge>
                {isFetching && !isLoading && (
                    <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                )}
            </div>

            <Card className='mb-6'>
                <CardContent className='flex flex-wrap items-center gap-3 py-4'>
                    <div className='flex items-center gap-2 text-sm text-foreground'>
                        <CalendarDays className='h-4 w-4 text-primary' />
                        Favorit musiman hari {WEEKDAY_LABEL_ID[todayWeekday]}
                        <Badge variant='secondary'>{todaySeasonalList.length}</Badge>
                    </div>

                    <div className='ml-auto flex flex-wrap items-center gap-2'>
                        <Button
                            size='sm'
                            variant='ghost'
                            className='h-8 gap-1.5 text-xs text-muted-foreground'
                            onClick={() => navigate('/settings')}
                        >
                            <Settings className='h-3.5 w-3.5' />
                            Atur Hari di Pengaturan
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            className='h-8 gap-1.5 text-xs'
                            onClick={() => setSeasonalDialogOpen(true)}
                        >
                            <ListChecks className='h-3.5 w-3.5' />
                            Kelola Favorit
                        </Button>
                        <Button
                            size='sm'
                            className='h-8 gap-1.5 text-xs'
                            disabled={
                                todaySeasonalList.length === 0 ||
                                !platform ||
                                downloadTodayMutation.isPending
                            }
                            onClick={() => downloadTodayMutation.mutate()}
                        >
                            {downloadTodayMutation.isPending ? (
                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            ) : (
                                <Download className='h-3.5 w-3.5' />
                            )}
                            Unduh Favorit Hari Ini
                        </Button>
                        <Button
                            size='sm'
                            variant='destructive'
                            className='h-8 gap-1.5 text-xs'
                            disabled={!hasAnySeasonalFavorite}
                            onClick={() => setClearConfirmOpen(true)}
                        >
                            <Trash2 className='h-3.5 w-3.5' />
                            Hapus Semua
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className='mb-8 p-0'>
                <CardHeader className='flex-row items-center justify-between pb-2 pt-6 px-6'>
                    <CardTitle className='text-sm font-medium'>Progres Unduhan</CardTitle>
                    {tasks.length > 0 && (
                        <Button
                            size='sm'
                            variant='ghost'
                            className='h-7 text-xs text-muted-foreground'
                            onClick={() =>
                                setTasks(prev =>
                                    prev.filter(
                                        t =>
                                            t.status === 'downloading' ||
                                            t.status === 'queued',
                                    ),
                                )
                            }
                        >
                            Bersihkan selesai
                        </Button>
                    )}
                </CardHeader>
                <CardContent className='p-0'>
                    {tasks.length === 0 ? (
                        <div className='px-6 py-8 text-center text-sm text-muted-foreground'>
                            Belum ada unduhan berjalan
                        </div>
                    ) : (
                        <ScrollArea className='max-h-80'>
                            {tasks.map((task, i) => {
                                const seasonalDay = task.completed
                                    ? findSeasonalDay(task.animeId, seasonalData)
                                    : null;

                                return (
                                    <div
                                        key={task.taskId}
                                        className={`flex flex-wrap items-center gap-3 px-6 py-3 ${i === 0 ? '' : 'border-t border-border'}`}
                                    >
                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-sm text-foreground'>
                                                {task.animeId}
                                                <span className='text-muted-foreground/70'>
                                                    {' '}
                                                    &middot; {task.episodeName}
                                                </span>
                                            </p>
                                            <p className='text-xs text-muted-foreground/70'>
                                                {RESOLUTION_LABEL[task.resolution]}
                                            </p>
                                        </div>

                                        <div className='flex flex-col items-end gap-1'>
                                            <div className='pr-2.5'>
                                                {renderTaskProgress(task)}
                                            </div>
                                            {seasonalDay && (
                                                <div className='flex gap-1 items-center'>
                                                    <span className='text-xs'>
                                                        Anime sudah tamat
                                                    </span>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        className='h-7 gap-1.5 text-xs'
                                                        onClick={() =>
                                                            removeSeasonalMutation.mutate(
                                                                {
                                                                    day:
                                                                        seasonalDay ??
                                                                        'Monday',
                                                                    anime: task.animeId,
                                                                },
                                                            )
                                                        }
                                                    >
                                                        <BookmarkX className='h-3.5 w-3.5' />
                                                        Hapus Favorit
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {(task.status === 'queued' ||
                                            task.status === 'downloading') && (
                                            <Button
                                                size='icon'
                                                variant='ghost'
                                                disabled={cancellingTaskIds.has(
                                                    task.taskId,
                                                )}
                                                onClick={() =>
                                                    cancelTaskMutation.mutate(task)
                                                }
                                                className='h-7 w-7 shrink-0 text-muted-foreground hover:bg-transparent'
                                            >
                                                {cancellingTaskIds.has(task.taskId) ? (
                                                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                                ) : (
                                                    <X className='h-3.5 w-3.5' />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {animes.length === 0 ? (
                <div className='py-16 text-center text-sm text-muted-foreground'>
                    Tidak ada anime ongoing pada halaman ini
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
                    {animes.map(anime => {
                        const naturalWeekday = parseWeekday(anime.day);
                        const actualSeasonalDay = findSeasonalDay(
                            anime.anime_name,
                            seasonalData,
                        );
                        const isSeasonalFav = actualSeasonalDay !== null;
                        const isDownloading = downloadingIds.has(anime.anime_name);
                        const isSeasonalPending = seasonalPendingIds.has(
                            anime.anime_name,
                        );

                        return (
                            <Card
                                key={anime.anime_name}
                                className='group overflow-hidden border-border pt-0 transition-colors hover:border-primary'
                            >
                                <div
                                    onClick={() =>
                                        navigate(`/otakudesu/anime/${anime.anime_name}`)
                                    }
                                    className='relative aspect-3/4 w-full cursor-pointer overflow-hidden bg-muted'
                                >
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

                                    {anime.latest_episode && (
                                        <div className='absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm'>
                                            {anime.latest_episode}
                                        </div>
                                    )}
                                    <div className='absolute left-2 top-2 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground backdrop-blur-sm'>
                                        {anime.day}
                                    </div>
                                </div>

                                <CardContent className='flex-1 flex flex-col justify-start gap-2 px-3 pt-1'>
                                    <p
                                        onClick={() =>
                                            navigate(
                                                `/otakudesu/anime/${anime.anime_name}`,
                                            )
                                        }
                                        className='line-clamp-2 cursor-pointer text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary'
                                    >
                                        {anime.judul}
                                    </p>
                                    <p className='truncate text-xs text-muted-foreground/70'>
                                        {anime.date}
                                    </p>

                                    <div className='flex-1 flex items-end gap-1.5 pt-4'>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            className='h-7 flex-1 gap-1 text-xs'
                                            disabled={!platform || isDownloading}
                                            onClick={() =>
                                                downloadLatestMutation.mutate(anime)
                                            }
                                        >
                                            {isDownloading ? (
                                                <Loader2 className='h-3 w-3 animate-spin' />
                                            ) : (
                                                <Download className='h-3 w-3' />
                                            )}
                                            Unduh
                                        </Button>

                                        <Button
                                            size='icon'
                                            variant='outline'
                                            title={
                                                isSeasonalFav
                                                    ? `Hapus favorit musiman (hari ${WEEKDAY_LABEL_ID[actualSeasonalDay as Weekday]})`
                                                    : naturalWeekday
                                                      ? 'Tambah favorit musiman'
                                                      : 'Hari tidak dikenali'
                                            }
                                            disabled={
                                                isSeasonalPending ||
                                                (!isSeasonalFav && !naturalWeekday)
                                            }
                                            onClick={() =>
                                                handleToggleSeasonal(
                                                    anime,
                                                    isSeasonalFav,
                                                    actualSeasonalDay,
                                                )
                                            }
                                            className={`h-7 w-7 shrink-0 ${isSeasonalFav ? 'border-primary text-primary' : 'text-muted-foreground'}`}
                                        >
                                            {isSeasonalPending ? (
                                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                            ) : (
                                                <Star
                                                    className={`h-3.5 w-3.5 ${isSeasonalFav ? 'fill-primary' : ''}`}
                                                />
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
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

            <Dialog open={seasonalDialogOpen} onOpenChange={setSeasonalDialogOpen}>
                <DialogContent className='max-h-[85vh] max-w-lg overflow-hidden'>
                    <DialogHeader>
                        <DialogTitle>Favorit Musiman</DialogTitle>
                    </DialogHeader>

                    <p className='text-xs text-muted-foreground/70'>
                        Ingin memindahkan anime ke hari lain?{' '}
                        <button
                            type='button'
                            onClick={() => {
                                setSeasonalDialogOpen(false);
                                navigate('/settings');
                            }}
                            className='text-primary underline-offset-2 hover:underline'
                        >
                            Buka halaman Pengaturan
                        </button>
                        .
                    </p>

                    <ScrollArea className='max-h-[55vh] pr-3'>
                        <div className='flex flex-col gap-4'>
                            {(Object.keys(WEEKDAY_TO_SEASONAL_KEY) as Weekday[]).map(
                                day => {
                                    const key = WEEKDAY_TO_SEASONAL_KEY[day];
                                    const list = seasonalData?.[key] ?? [];
                                    if (list.length === 0) return null;

                                    return (
                                        <div key={day} className='flex flex-col gap-1.5'>
                                            <p className='text-xs font-medium text-muted-foreground'>
                                                {WEEKDAY_LABEL_ID[day]}
                                            </p>
                                            <div className='flex flex-col gap-1'>
                                                {list.map(animeName => (
                                                    <div
                                                        key={animeName}
                                                        className='flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5'
                                                    >
                                                        <span className='truncate text-sm text-foreground'>
                                                            {animeName}
                                                        </span>
                                                        <Button
                                                            size='icon'
                                                            variant='ghost'
                                                            className='h-6 w-6 shrink-0 text-muted-foreground hover:bg-transparent'
                                                            onClick={() =>
                                                                removeSeasonalMutation.mutate(
                                                                    {
                                                                        day,
                                                                        anime: animeName,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <X className='h-3.5 w-3.5' />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                },
                            )}

                            {!hasAnySeasonalFavorite && (
                                <p className='py-6 text-center text-sm text-muted-foreground'>
                                    Belum ada favorit musiman
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus semua favorit musiman?</DialogTitle>
                    </DialogHeader>
                    <p className='text-sm text-muted-foreground'>
                        Tindakan ini akan menghapus seluruh anime favorit musiman di semua
                        hari dan tidak dapat dibatalkan.
                    </p>
                    <DialogFooter>
                        <Button
                            variant='ghost'
                            onClick={() => setClearConfirmOpen(false)}
                            className='text-muted-foreground'
                        >
                            Batal
                        </Button>
                        <Button
                            variant='destructive'
                            disabled={clearSeasonalMutation.isPending}
                            onClick={() => clearSeasonalMutation.mutate()}
                        >
                            {clearSeasonalMutation.isPending && (
                                <Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
                            )}
                            Hapus Semua
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
