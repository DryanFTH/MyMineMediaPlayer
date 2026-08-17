import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router';

import {
    AlertCircle,
    Check,
    // CirclePlay,
    Film,
    FolderOpen,
    Loader2,
    LucideProps,
} from 'lucide-react';

import { SprocketRail } from '@/components/onboarding/SprocketRail';
import { StepDots } from '@/components/onboarding/StepDots';
import { InitStatus, commands } from '@/types/bindings';

type TSTEP = {
    id: string;
    initKey: keyof InitStatus;
    command: keyof Pick<
        typeof commands,
        'setAnimeDownloadDirectory' | 'setYoutubeDownloadDirectory'
    >;
    icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'>>;
    title: string;
    description: string;
    doneTitle: string;
};

export const STEPS: TSTEP[] = [
    {
        id: 'anime',
        initKey: 'has_store_anime_directory',
        command: 'setAnimeDownloadDirectory',
        icon: Film,
        title: 'Where should episodes land?',
        description:
            'Pick a folder for anime downloads. Every episode you download gets saved there.',
        doneTitle: 'Anime folder set',
    },
    // {
    //     id: 'youtube',
    //     initKey: 'has_youtube_download_directory',
    //     command: 'setYoutubeDownloadDirectory',
    //     icon: CirclePlay,
    //     title: 'Where should videos land?',
    //     description:
    //         'Pick a folder for YouTube downloads. This can be the same folder or a different one.',
    //     doneTitle: 'YouTube folder set',
    // },
];

export default () => {
    const navigate = useNavigate();

    const [stepIndex, setStepIndex] = useState(0);
    const [phase, setPhase] = useState('idle'); // idle | picking | all-done
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [completed, setCompleted] = useState<{ [key: string]: boolean }>({});
    const [checkedExisting, setCheckedExisting] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        commands.checkInitStatus().then(res => {
            if (!mountedRef.current) return;
            if (res.status === 'ok') {
                const nextCompleted: { [key: string]: boolean } = {};
                STEPS.forEach(step => {
                    if (res.data[step.initKey as keyof InitStatus])
                        nextCompleted[step.id] = true;
                });
                setCompleted(nextCompleted);

                const firstIncomplete = STEPS.findIndex(step => !nextCompleted[step.id]);
                if (firstIncomplete === -1) {
                    setPhase('all-done');
                } else {
                    setStepIndex(firstIncomplete);
                }
            }
            setCheckedExisting(true);
        });
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const currentStep = STEPS[stepIndex];
    const litCount = Object.keys(completed).length + (phase === 'picking' ? 1 : 0);

    async function handlePickFolder() {
        setErrorMsg(null);
        setPhase('picking');

        const command = currentStep.command;
        const result = await commands[command]();

        if (result.status === 'ok') {
            if (result.data) {
                const nextCompleted = { ...completed, [currentStep.id]: true };
                setCompleted(nextCompleted);

                const nextIndex = stepIndex + 1;
                if (nextIndex < STEPS.length) {
                    setStepIndex(nextIndex);
                    setPhase('idle');
                } else {
                    setPhase('all-done');
                }
            } else {
                setPhase('idle');
                setErrorMsg('No folder selected. Choose a folder to continue.');
            }
        } else {
            setPhase('idle');
            setErrorMsg(
                typeof result.error === 'string'
                    ? result.error
                    : "Couldn't set the folder. Try again.",
            );
        }
    }

    const StepIcon = currentStep?.icon ?? Film;

    return (
        <div
            className='flex min-h-screen w-full items-center justify-center p-6'
            style={{ background: '#121212', fontFamily: "'Inter', sans-serif" }}
        >
            <div className='w-full max-w-md'>
                <div className='mb-4 flex items-center justify-center gap-2 text-center'>
                    <Film
                        className='h-4 w-4'
                        style={{ color: '#A0A0A0' }}
                        strokeWidth={2}
                    />
                    <span
                        className='text-xs font-medium uppercase tracking-[0.2em]'
                        style={{ color: '#A0A0A0' }}
                    >
                        First-time setup
                    </span>
                </div>

                <StepDots steps={STEPS} currentIndex={stepIndex} completed={completed} />

                <div
                    className='flex overflow-hidden rounded-2xl border'
                    style={{ background: '#1C1C1C', borderColor: '#2E2E2E' }}
                >
                    <SprocketRail
                        litCount={litCount}
                        total={STEPS.length + 1}
                        pulsing={phase === 'picking'}
                    />

                    <div className='flex-1 px-7 py-9'>
                        {phase !== 'all-done' && currentStep && (
                            <>
                                <div
                                    className='mb-4 flex h-9 w-9 items-center justify-center rounded-lg'
                                    style={{ background: '#3ECF8E1A' }}
                                >
                                    <StepIcon
                                        className='h-4.5 w-4.5'
                                        style={{ color: '#3ECF8E' }}
                                        strokeWidth={2}
                                    />
                                </div>

                                <h1
                                    className='text-2xl font-semibold leading-tight'
                                    style={{
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        color: '#EDEDED',
                                    }}
                                >
                                    {currentStep.title}
                                </h1>
                                <p
                                    className='mt-3 text-sm leading-relaxed'
                                    style={{ color: '#A0A0A0' }}
                                >
                                    {currentStep.description}
                                </p>

                                <button
                                    onClick={handlePickFolder}
                                    disabled={phase === 'picking'}
                                    className='mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all disabled:cursor-not-allowed'
                                    style={{
                                        background:
                                            phase === 'picking' ? '#2E2E2E' : '#3ECF8E',
                                        color:
                                            phase === 'picking' ? '#A0A0A0' : '#121212',
                                    }}
                                >
                                    {phase === 'picking' ? (
                                        <>
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                            Waiting for folder…
                                        </>
                                    ) : (
                                        <>
                                            <FolderOpen className='h-4 w-4' />
                                            Choose folder
                                        </>
                                    )}
                                </button>

                                {errorMsg && (
                                    <div
                                        className='mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs'
                                        style={{
                                            borderColor: '#3A2B2B',
                                            background: '#1F1519',
                                            color: '#E0A6A0',
                                        }}
                                    >
                                        <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                {!checkedExisting && (
                                    <p
                                        className='mt-4 text-center text-xs'
                                        style={{ color: '#6E6E6E' }}
                                    >
                                        Checking existing setup…
                                    </p>
                                )}

                                <p
                                    className='mt-4 text-center text-xs'
                                    style={{ color: '#6E6E6E' }}
                                >
                                    Step {stepIndex + 1} of {STEPS.length}
                                </p>
                            </>
                        )}

                        {phase === 'all-done' && (
                            <div className='flex flex-col items-center py-2 text-center'>
                                <div
                                    className='mb-5 flex h-12 w-12 items-center justify-center rounded-full'
                                    style={{ background: '#3ECF8E1A' }}
                                >
                                    <Check
                                        className='h-6 w-6'
                                        style={{ color: '#3ECF8E' }}
                                        strokeWidth={2.5}
                                    />
                                </div>
                                <h1
                                    className='text-2xl font-semibold'
                                    style={{
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        color: '#EDEDED',
                                    }}
                                >
                                    You're all set
                                </h1>
                                <p
                                    className='mt-2 text-sm leading-relaxed'
                                    style={{ color: '#A0A0A0' }}
                                >
                                    you can always change these folders later in the
                                    settings.
                                </p>
                                <button
                                    className='mt-7 w-full rounded-xl px-4 py-3 text-sm font-medium'
                                    style={{ background: '#3ECF8E', color: '#121212' }}
                                    onClick={() => {
                                        navigate('/');
                                    }}
                                >
                                    Continue
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <p className='mt-5 text-center text-xs' style={{ color: '#6E6E6E' }}>
                    This opens your system's native file explorer.
                </p>
            </div>
        </div>
    );
};
