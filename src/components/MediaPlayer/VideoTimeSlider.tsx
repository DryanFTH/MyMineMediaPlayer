import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export default function ({
    currentTime,
    duration,
    buffered,
    onSeek,
    onScrubStart,
    onScrubChange,
    onScrubEnd,
}: {
    currentTime: number;
    duration: number;
    buffered: number;
    onSeek: (seconds: number) => void;
    onScrubStart: () => void;
    onScrubChange: (seconds: number) => void;
    onScrubEnd: () => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragTime, setDragTime] = useState<number | null>(null);

    const displayTime = isDragging && dragTime !== null ? dragTime : currentTime;
    const playedRatio =
        duration > 0 ? Math.min(Math.max(displayTime / duration, 0), 1) : 0;
    const bufferedRatio = Math.min(Math.max(buffered, 0), 1);

    function timeFromPointer(clientX: number) {
        const track = trackRef.current;
        if (!track || duration <= 0) return 0;
        const rect = track.getBoundingClientRect();
        const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        return ratio * duration;
    }

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        event.currentTarget.setPointerCapture(event.pointerId);
        const time = timeFromPointer(event.clientX);
        setIsDragging(true);
        setDragTime(time);
        onScrubStart();
        onScrubChange(time);
    }

    function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        if (!isDragging) return;
        const time = timeFromPointer(event.clientX);
        setDragTime(time);
        onScrubChange(time);
    }

    function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
        if (!isDragging) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        const time = dragTime ?? timeFromPointer(event.clientX);
        setIsDragging(false);
        setDragTime(null);
        onScrubEnd();
        onSeek(time);
    }

    return (
        <div
            ref={trackRef}
            role='slider'
            aria-label='Waktu video'
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={displayTime}
            className='group/slider relative flex h-5 w-full cursor-pointer touch-none select-none items-center outline-none'
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            <div className='relative h-0.75 w-full rounded-full bg-white/25 transition-[height] group-hover/slider:h-1'>
                <div
                    className='absolute h-full rounded-full bg-white/40'
                    style={{ width: `${bufferedRatio * 100}%` }}
                />
                <div
                    className='absolute h-full rounded-full bg-primary'
                    style={{ width: `${playedRatio * 100}%` }}
                />
            </div>
            <div
                data-dragging={isDragging ? '' : undefined}
                className={cn(
                    'absolute top-1/2 -translate-x-1/2 -translate-y-1/2',
                    'h-3 w-3 opacity-0',
                    'rounded-full bg-primary shadow ring-2 ring-primary/30',
                    'transition-opacity group-hover/slider:opacity-100 data-dragging:opacity-100',
                )}
                style={{ left: `${playedRatio * 100}%` }}
            />
        </div>
    );
}
