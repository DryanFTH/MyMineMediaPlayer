import { useRef } from 'react';

export default function ({
    volume,
    muted,
    onChange,
}: {
    volume: number;
    muted: boolean;
    onChange: (volume: number) => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const effectiveVolume = muted ? 0 : volume;

    function volumeFromPointer(clientX: number) {
        const track = trackRef.current;
        if (!track) return 0;
        const rect = track.getBoundingClientRect();
        return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    }

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        event.currentTarget.setPointerCapture(event.pointerId);
        onChange(volumeFromPointer(event.clientX));
    }

    function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        if (event.buttons !== 1) return;
        onChange(volumeFromPointer(event.clientX));
    }

    return (
        <div
            ref={trackRef}
            role='slider'
            aria-label='Volume'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(effectiveVolume * 100)}
            className='group/volume relative hidden h-9 w-20 cursor-pointer touch-none select-none items-center outline-none sm:flex'
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
        >
            <div className='relative h-0.75 w-full rounded-full bg-white/25'>
                <div
                    className='absolute h-full rounded-full bg-white/80'
                    style={{ width: `${effectiveVolume * 100}%` }}
                />
            </div>
            <div
                className='absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover/volume:opacity-100'
                style={{ left: `${effectiveVolume * 100}%` }}
            />
        </div>
    );
}
