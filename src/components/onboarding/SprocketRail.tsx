export function SprocketRail({
    litCount,
    total,
    pulsing,
}: {
    litCount: number;
    total: number;
    pulsing: boolean;
}) {
    const holes = Array.from({ length: total });
    return (
        <div className='relative flex w-10 shrink-0 flex-col items-center justify-between py-8'>
            <div
                className='absolute inset-y-0 left-1/2 w-px -translate-x-1/2'
                style={{
                    background:
                        'linear-gradient(180deg, transparent, #2E2E2E, transparent)',
                }}
            />
            {holes.map((_, i) => {
                const lit = i < litCount;
                const isCurrent = i === litCount - 1 && pulsing;
                return (
                    <div
                        key={i}
                        className='h-2.5 w-2.5 rounded-[3px] transition-all duration-700'
                        style={{
                            background: lit ? '#3ECF8E' : '#262626',
                            boxShadow: lit ? '0 0 8px #3ECF8E66' : 'none',
                            opacity: isCurrent ? 0.55 : 1,
                            transitionDelay: `${i * 60}ms`,
                        }}
                    />
                );
            })}
        </div>
    );
}
