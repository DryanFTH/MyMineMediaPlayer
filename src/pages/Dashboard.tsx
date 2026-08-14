import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router';

import { useMutation, useQuery } from '@tanstack/react-query';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    Clapperboard,
    Film,
    Loader2,
    RefreshCw,
    Tags,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    BarShapeProps,
    CartesianGrid,
    Rectangle,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type Anime, commands } from '@/types/bindings';

const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div>
            <h2
                className='text-lg font-semibold leading-tight text-foreground'
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
                {title}
            </h2>
            <p className='text-xs text-muted-foreground/70'>{subtitle}</p>
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return <div className='py-10 text-center text-sm text-muted-foreground'>{label}</div>;
}

function AnimeCard({ anime, onClick }: { anime: Anime; onClick: () => void }) {
    return (
        <Card
            onClick={onClick}
            className='group relative cursor-pointer overflow-hidden border-border pt-0 transition-colors hover:border-primary'
        >
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
            </CardContent>
        </Card>
    );
}

export default () => {
    const navigate = useNavigate();
    const [randomPick, setRandomPick] = useState<Anime[] | null>(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['dashboard-data'],
        queryFn: async () => {
            const result = await commands.getDashboardData();
            if (result.status === 'error') {
                throw new Error(result.error);
            }
            return result.data;
        },
    });

    // isi random pick lokal sekali dari data awal, biar reroll gak
    // ikut refetch stats/recently-change/genre chart
    useEffect(() => {
        if (data && randomPick === null) {
            setRandomPick(data.random_pick);
        }
    }, [data, randomPick]);

    const rerollMutation = useMutation({
        mutationFn: async () => {
            const result = await commands.getDashboardData();
            if (result.status === 'error') {
                throw new Error(result.error);
            }
            return result.data.random_pick;
        },
        onSuccess: picks => setRandomPick(picks),
    });

    function goToAnime(anime: Anime) {
        if (anime.folder_name) {
            navigate(`/library/anime/${anime.folder_name}`);
        }
    }

    if (isLoading) {
        return (
            <Loader2 className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground' />
        );
    }

    if (isError || !data) {
        return (
            <div className='mx-auto flex max-w-4xl flex-col items-center gap-2 px-6 py-16 text-sm text-muted-foreground'>
                <AlertCircle className='h-5 w-5' />
                {error instanceof Error ? error.message : 'Gagal memuat dashboard'}
            </div>
        );
    }

    const picks = randomPick ?? data.random_pick;

    return (
        <div className='mx-auto w-full max-w-5xl px-6 py-10 pb-16'>
            <div className='mb-8 flex flex-col gap-1.5'>
                <h1
                    className='text-2xl font-semibold leading-tight text-foreground'
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    Dashboard
                </h1>
                <p className='text-sm text-muted-foreground/70'>
                    Ringkasan koleksi anime kamu
                </p>
            </div>

            <div className='flex flex-col gap-12'>
                <section>
                    <div className='grid grid-cols-2 gap-3 sm:max-w-md'>
                        <Card className='border-border'>
                            <CardContent className='flex items-center gap-3 px-4 py-4'>
                                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
                                    <Film className='h-4.5 w-4.5' />
                                </div>
                                <div className='flex flex-col'>
                                    <span className='text-lg font-semibold leading-none text-foreground'>
                                        {data.dashboard_stats.total_anime}
                                    </span>
                                    <span className='text-xs text-muted-foreground/70'>
                                        Total Anime
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className='border-border'>
                            <CardContent className='flex items-center gap-3 px-4 py-4'>
                                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
                                    <Tags className='h-4.5 w-4.5' />
                                </div>
                                <div className='flex flex-col'>
                                    <span className='text-lg font-semibold leading-none text-foreground'>
                                        {data.dashboard_stats.total_genre}
                                    </span>
                                    <span className='text-xs text-muted-foreground/70'>
                                        Total Genre
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section>
                    <div className='mb-4 flex items-center justify-between gap-3'>
                        <SectionHeading
                            title='Perubahan Terbaru'
                            subtitle='Anime yang folder-nya baru saja berubah'
                        />
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => navigate('/library')}
                            className='shrink-0 gap-1.5 text-xs'
                        >
                            Lihat Selengkapnya
                            <ArrowRight className='h-3.5 w-3.5' />
                        </Button>
                    </div>

                    {data.recently_change.length === 0 ? (
                        <EmptyState label='Belum ada perubahan folder' />
                    ) : (
                        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
                            {data.recently_change.map(anime => (
                                <AnimeCard
                                    key={anime.id}
                                    anime={anime}
                                    onClick={() => goToAnime(anime)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <div className='mb-4 flex items-center justify-between gap-3'>
                        <SectionHeading
                            title='Bingung Mau Nonton Apa?'
                            subtitle='Pilihan acak dari library kamu'
                        />
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => rerollMutation.mutate()}
                            disabled={rerollMutation.isPending}
                            className='shrink-0 gap-1.5 text-xs'
                        >
                            {rerollMutation.isPending ? (
                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            ) : (
                                <RefreshCw className='h-3.5 w-3.5' />
                            )}
                            Acak Ulang
                        </Button>
                    </div>

                    {picks.length === 0 ? (
                        <EmptyState label='Belum ada anime di library' />
                    ) : (
                        <div
                            className={cn(
                                'grid gap-4 grid-cols-2 sm:grid-cols-3',
                                picks.length > 3 && 'md:grid-cols-5',
                            )}
                        >
                            {picks.map(anime => (
                                <AnimeCard
                                    key={anime.id}
                                    anime={anime}
                                    onClick={() => goToAnime(anime)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <div className='mb-4'>
                        <SectionHeading
                            title='Distribusi Genre'
                            subtitle='Genre paling banyak dikoleksi di library kamu'
                        />
                    </div>

                    {data.genre_distribution.length === 0 ? (
                        <EmptyState label='Belum ada data genre' />
                    ) : (
                        <Card className='border-border'>
                            <CardContent className='px-4 py-6'>
                                <ResponsiveContainer
                                    width='100%'
                                    height={Math.max(
                                        240,
                                        data.genre_distribution.length * 36,
                                    )}
                                >
                                    <BarChart
                                        data={data.genre_distribution}
                                        layout='vertical'
                                        margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray='3 3'
                                            stroke='var(--border)'
                                            horizontal={false}
                                        />
                                        <XAxis
                                            type='number'
                                            allowDecimals={false}
                                            tick={{
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 11,
                                            }}
                                            axisLine={{ stroke: 'var(--border)' }}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            type='category'
                                            dataKey='name'
                                            width={110}
                                            tick={{
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 11,
                                            }}
                                            axisLine={{ stroke: 'var(--border)' }}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{
                                                fill: 'var(--accent)',
                                                color: 'var(--foreground)',
                                            }}
                                            contentStyle={{
                                                background: 'var(--popover)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 12,
                                            }}
                                            itemStyle={{
                                                color: 'var(--muted-foreground)',
                                            }}
                                            formatter={value => [
                                                `${value} anime`,
                                                'Jumlah',
                                            ]}
                                        />
                                        <Bar
                                            dataKey='total'
                                            radius={[0, 4, 4, 0]}
                                            shape={(props: BarShapeProps) => (
                                                <Rectangle
                                                    {...props}
                                                    fill={
                                                        CHART_COLORS[
                                                            (props.index ?? 0) %
                                                                CHART_COLORS.length
                                                        ]
                                                    }
                                                />
                                            )}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}
                </section>
            </div>
        </div>
    );
};
