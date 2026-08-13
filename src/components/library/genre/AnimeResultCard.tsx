import { useNavigate } from 'react-router';

import { convertFileSrc } from '@tauri-apps/api/core';
import { Calendar, Clapperboard, Film } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Anime } from '@/types/bindings';

export function AnimeResultCard({ anime }: { anime: Anime }) {
    const navigate = useNavigate();

    return (
        <Card
            onClick={() =>
                anime.folder_name && navigate(`/library/anime/${anime.folder_name}`)
            }
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
    );
}
