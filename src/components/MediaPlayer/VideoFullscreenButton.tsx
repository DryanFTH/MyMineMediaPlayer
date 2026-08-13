import { Maximize, Minimize } from 'lucide-react';

export default function ({
    isFullscreen,
    onToggle,
}: {
    isFullscreen: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type='button'
            onClick={onToggle}
            className='inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary/50'
            aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
        >
            {isFullscreen ? (
                <Minimize className='h-4 w-4' />
            ) : (
                <Maximize className='h-4 w-4' />
            )}
        </button>
    );
}
