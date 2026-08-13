import { Volume1, Volume2, VolumeX } from 'lucide-react';

export default function ({
    muted,
    volume,
    onToggle,
}: {
    muted: boolean;
    volume: number;
    onToggle: () => void;
}) {
    const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
    return (
        <button
            type='button'
            onClick={onToggle}
            className='flex h-9 w-9 items-center justify-center rounded-md text-foreground/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary/50'
            aria-label={muted ? 'Aktifkan suara' : 'Matikan suara'}
        >
            <Icon className='h-4 w-4' />
        </button>
    );
}
