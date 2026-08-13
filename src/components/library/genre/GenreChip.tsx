import { cn } from '@/lib/utils';
import { Genre } from '@/types/bindings';

export function GenreChip({
    genre,
    selected,
    onToggle,
}: {
    genre: Genre;
    selected: boolean;
    onToggle: (genre: Genre) => void;
}) {
    return (
        <button
            onClick={() => onToggle(genre)}
            className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground',
            )}
        >
            {genre.name}
        </button>
    );
}
