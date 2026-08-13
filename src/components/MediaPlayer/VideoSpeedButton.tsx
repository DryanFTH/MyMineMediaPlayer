import { useRef, useState } from 'react';

import { Minus, Plus } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 5];

const SPEED_MIN = PLAYBACK_SPEEDS[0];
const SPEED_MAX = PLAYBACK_SPEEDS[PLAYBACK_SPEEDS.length - 1];
const SPEED_STEP = 0.05;

function formatSpeedLabel(speed: number) {
    const rounded = Math.round(speed * 100) / 100;
    return Number.isInteger(rounded * 10) ? rounded.toFixed(1) : rounded.toFixed(2);
}

function SpeedSlider({
    value,
    min,
    max,
    step,
    onChange,
}: {
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (speed: number) => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);

    function speedFromPointer(clientX: number) {
        const track = trackRef.current;
        if (!track) return value;
        const rect = track.getBoundingClientRect();
        const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        const raw = min + ratio * (max - min);
        const snapped = Math.round(raw / step) * step;
        const clean = Math.round(snapped * 100) / 100;
        return Math.min(Math.max(clean, min), max);
    }

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        event.currentTarget.setPointerCapture(event.pointerId);
        onChange(speedFromPointer(event.clientX));
    }

    function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        if (event.buttons !== 1) return;
        onChange(speedFromPointer(event.clientX));
    }

    const ratio = (value - min) / (max - min);

    return (
        <div
            ref={trackRef}
            role='slider'
            aria-label='Kecepatan putar'
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            className='relative flex h-6 flex-1 cursor-pointer touch-none select-none items-center outline-none'
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
        >
            <div className='relative h-0.5 w-full rounded-full bg-white/20'>
                <div
                    className='absolute h-full rounded-full bg-white'
                    style={{ width: `${ratio * 100}%` }}
                />
            </div>
            <div
                className='absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow'
                style={{ left: `${ratio * 100}%` }}
            />
        </div>
    );
}

export default function ({
    playbackRate,
    onChange,
}: {
    playbackRate: number;
    onChange: (speed: number) => void;
}) {
    const [open, setOpen] = useState(false);

    function step(direction: 1 | -1) {
        const next = Math.min(
            Math.max(playbackRate + direction * SPEED_STEP, SPEED_MIN),
            SPEED_MAX,
        );
        onChange(Math.round(next * 100) / 100);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type='button'
                    className='inline-flex h-9 items-center rounded-md px-2.5 text-xs font-medium text-foreground/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary/50'
                    aria-label='Kecepatan putar'
                >
                    {playbackRate === 1 ? 'Normal' : `${formatSpeedLabel(playbackRate)}x`}
                </button>
            </PopoverTrigger>

            <PopoverContent
                side='top'
                align='end'
                sideOffset={10}
                className='w-80 border-white/10 bg-black/40 p-4 text-white shadow-2xl backdrop-blur-sm'
            >
                <p className='mb-3 text-center text-lg font-medium'>
                    {Number.isInteger(playbackRate)
                        ? `${playbackRate}x`
                        : `${formatSpeedLabel(playbackRate)}x`}
                </p>

                <div className='mb-4 flex items-center gap-2'>
                    <button
                        type='button'
                        onClick={() => step(-1)}
                        disabled={playbackRate <= SPEED_MIN}
                        className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 disabled:opacity-30'
                        aria-label='Kurangi kecepatan'
                    >
                        <Minus className='h-3 w-3' />
                    </button>

                    <SpeedSlider
                        value={playbackRate}
                        min={SPEED_MIN}
                        max={SPEED_MAX}
                        step={SPEED_STEP}
                        onChange={onChange}
                    />

                    <button
                        type='button'
                        onClick={() => step(1)}
                        disabled={playbackRate >= SPEED_MAX}
                        className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 disabled:opacity-30'
                        aria-label='Tambah kecepatan'
                    >
                        <Plus className='h-3 w-3' />
                    </button>
                </div>

                <div className='grid grid-cols-5 gap-2'>
                    {PLAYBACK_SPEEDS.map(speed => {
                        const isActive = speed === playbackRate;
                        return (
                            <button
                                key={speed}
                                type='button'
                                onClick={() => onChange(speed)}
                                className={`flex h-9 flex-col items-center justify-center rounded-full text-xs font-medium leading-tight transition-colors ${
                                    isActive
                                        ? 'bg-white text-black'
                                        : 'bg-white/10 text-white/90 hover:bg-white/20'
                                }`}
                            >
                                <span>{formatSpeedLabel(speed)}</span>
                                {speed === 1 && (
                                    <span
                                        className={`text-[10px] ${isActive ? 'text-black/60' : 'text-white/60'}`}
                                    >
                                        Normal
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
