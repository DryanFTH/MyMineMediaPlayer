import { Pause, Play } from 'lucide-react';

export default function ({
    paused,
    onToggle,
}: {
    paused: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type='button'
            onClick={onToggle}
            className='flex h-9 w-9 items-center justify-center rounded-md text-foreground outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary/50'
            aria-label={paused ? 'Putar' : 'Jeda'}
        >
            {paused ? (
                <Play className='h-5 w-5 fill-current' />
            ) : (
                <Pause className='h-5 w-5 fill-current' />
            )}
        </button>
    );
}
