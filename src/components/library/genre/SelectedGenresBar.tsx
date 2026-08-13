import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Genre } from '@/types/bindings';

export function SelectedGenresBar({
    genres,
    onRemove,
    onClear,
}: {
    genres: Genre[];
    onRemove: (genre: Genre) => void;
    onClear: () => void;
}) {
    if (genres.length === 0) return null;

    return (
        <div className='mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5'>
            <span className='text-xs text-muted-foreground/70'>Filter:</span>
            {genres.map(genre => (
                <Badge
                    key={genre.id}
                    variant='secondary'
                    className='flex items-center gap-1 bg-background text-xs font-normal'
                >
                    {genre.name}
                    <button
                        onClick={() => onRemove(genre)}
                        className='text-muted-foreground hover:text-foreground'
                    >
                        <X className='h-3 w-3' />
                    </button>
                </Badge>
            ))}
            <Button
                size='sm'
                variant='ghost'
                onClick={onClear}
                className='ml-auto h-6 px-2 text-xs text-muted-foreground'
            >
                Hapus semua
            </Button>
        </div>
    );
}
