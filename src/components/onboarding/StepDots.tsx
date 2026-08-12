import { Check } from 'lucide-react';

import { STEPS } from '@/pages/Onboarding';

export function StepDots({
    steps,
    currentIndex,
    completed,
}: {
    steps: typeof STEPS;
    currentIndex: number;
    completed: { [key: string]: boolean };
}) {
    return (
        <div className='mb-6 flex items-center justify-center gap-2'>
            {steps.map((step, i) => {
                const isDone = completed[step.id];
                const isCurrent = i === currentIndex && !isDone;
                return (
                    <div key={step.id} className='flex items-center gap-2'>
                        <div
                            className='flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium transition-all'
                            style={{
                                borderColor: isDone
                                    ? '#3ECF8E'
                                    : isCurrent
                                      ? '#3ECF8E'
                                      : '#2E2E2E',
                                background: isDone ? '#3ECF8E' : 'transparent',
                                color: isDone
                                    ? '#121212'
                                    : isCurrent
                                      ? '#3ECF8E'
                                      : '#6E6E6E',
                            }}
                        >
                            {isDone ? (
                                <Check className='h-3 w-3' strokeWidth={3} />
                            ) : (
                                i + 1
                            )}
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className='h-px w-6 transition-colors'
                                style={{ background: isDone ? '#3ECF8E' : '#2E2E2E' }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
