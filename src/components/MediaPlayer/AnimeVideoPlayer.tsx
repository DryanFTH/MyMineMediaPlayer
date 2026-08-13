import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';

import { Loader2, RotateCcw, RotateCw } from 'lucide-react';

import { cn, formatTime } from '@/lib/utils';

import VideoFullscreenButton from './VideoFullscreenButton';
import VideoMuteButton from './VideoMuteButton';
import VideoPlayButton from './VideoPlayButton';
import VideoSpeedButton, { PLAYBACK_SPEEDS } from './VideoSpeedButton';
import VideoTimeSlider from './VideoTimeSlider';
import VideoVolumeSlider from './VideoVolumeSlider';

const SETTINGS_STORAGE_KEY = 'anime-player-settings';
const ARROW_SEEK_SECONDS = 5;
const JL_SEEK_SECONDS = 10;
const CONTROLS_HIDE_DELAY_MS = 2500;
const DOUBLE_TAP_WINDOW_MS = 300;

type PersistedPlayerSettings = {
    volume: number;
    muted: boolean;
    playbackRate: number;
};

const DEFAULT_PLAYER_SETTINGS: PersistedPlayerSettings = {
    volume: 1,
    muted: false,
    playbackRate: 1,
};

function loadPersistedPlayerSettings(): PersistedPlayerSettings {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return DEFAULT_PLAYER_SETTINGS;

        const parsed = JSON.parse(raw) as Partial<PersistedPlayerSettings>;
        return {
            volume:
                typeof parsed.volume === 'number'
                    ? parsed.volume
                    : DEFAULT_PLAYER_SETTINGS.volume,
            muted:
                typeof parsed.muted === 'boolean'
                    ? parsed.muted
                    : DEFAULT_PLAYER_SETTINGS.muted,
            playbackRate:
                typeof parsed.playbackRate === 'number'
                    ? parsed.playbackRate
                    : DEFAULT_PLAYER_SETTINGS.playbackRate,
        };
    } catch {
        return DEFAULT_PLAYER_SETTINGS;
    }
}

function savePersistedPlayerSettings(settings: PersistedPlayerSettings) {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Pura pura ga liat -_-
    }
}

export default forwardRef<
    HTMLVideoElement,
    { src: string; title: string; onEnded?: () => void }
>(({ src, title, onEnded }, forwardedRef) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const initialSettingsRef =
        useRef<ReturnType<typeof loadPersistedPlayerSettings>>(undefined);
    if (initialSettingsRef.current === undefined) {
        initialSettingsRef.current = loadPersistedPlayerSettings();
    }
    const initialSettings = initialSettingsRef.current;

    useImperativeHandle(forwardedRef, () => videoRef.current as HTMLVideoElement, []);

    const [paused, setPaused] = useState(true);
    const [buffering, setBuffering] = useState(true);
    const [muted, setMuted] = useState(initialSettings.muted);
    const [volume, setVolume] = useState(initialSettings.volume);
    const [playbackRate, setPlaybackRate] = useState(initialSettings.playbackRate);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [isScrubbing, setIsScrubbing] = useState(false);

    const isScrubbingRef = useRef(isScrubbing);
    useEffect(() => {
        isScrubbingRef.current = isScrubbing;
    }, [isScrubbing]);

    const logMediaError = useCallback((context: string, error: unknown) => {
        if (error instanceof DOMException) {
            console.error(`${context}:`, error.name, error.message);
        } else {
            console.error(`${context}:`, error);
        }
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.volume = initialSettings.volume;
        video.muted = initialSettings.muted;
        video.playbackRate = initialSettings.playbackRate;
    }, []);

    useEffect(() => {
        savePersistedPlayerSettings({ volume, muted, playbackRate });
    }, [volume, muted, playbackRate]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = () => setPaused(false);
        const onPause = () => setPaused(true);
        const onWaiting = () => {
            if (
                !video.paused &&
                !video.ended &&
                video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
            )
                setBuffering(true);
        };
        const onPlaying = () => setBuffering(false);
        const onCanPlay = () => setBuffering(false);
        const onLoadedMetadata = () => setDuration(video.duration || 0);
        const onVolumeChange = () => {
            setVolume(video.volume);
            setMuted(video.muted);
        };
        const onRateChange = () => setPlaybackRate(video.playbackRate);
        const onTimeUpdate = () => {
            if (!isScrubbingRef.current) setCurrentTime(video.currentTime);
        };
        const onProgress = () => {
            if (video.buffered.length > 0 && video.duration) {
                const end = video.buffered.end(video.buffered.length - 1);
                setBuffered(Math.min(end / video.duration, 1));
            }
        };

        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('volumechange', onVolumeChange);
        video.addEventListener('ratechange', onRateChange);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('progress', onProgress);

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('volumechange', onVolumeChange);
            video.removeEventListener('ratechange', onRateChange);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('progress', onProgress);
        };
    }, []);

    useEffect(() => {
        function onFullscreenChange() {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        }
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const togglePlayPause = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (video.paused) {
                await video.play();
            } else {
                video.pause();
            }
        } catch (error) {
            logMediaError('Error while toggling play/pause', error);
        }
    }, [logMediaError]);

    const seekBy = useCallback((deltaSeconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        const max = Number.isFinite(video.duration) ? video.duration : Infinity;
        video.currentTime = Math.min(Math.max(video.currentTime + deltaSeconds, 0), max);
    }, []);

    const seekTo = useCallback((seconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        const max = Number.isFinite(video.duration) ? video.duration : seconds;
        video.currentTime = Math.min(Math.max(seconds, 0), max);
    }, []);

    const changeVolume = useCallback((delta: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.volume = Math.min(Math.max(video.volume + delta, 0), 1);
        if (video.volume > 0 && video.muted) video.muted = false;
    }, []);

    const setVolumeValue = useCallback((next: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.volume = Math.min(Math.max(next, 0), 1);
        if (video.volume > 0 && video.muted) video.muted = false;
    }, []);

    const toggleMuted = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
    }, []);

    const toggleFullscreen = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void container.requestFullscreen();
        }
    }, []);

    const togglePictureInPicture = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            logMediaError('Error while toggling picture-in-picture', error);
        }
    }, [logMediaError]);

    const toggleCaptions = useCallback(() => {
        const video = videoRef.current;
        if (!video || video.textTracks.length === 0) return;
        for (let i = 0; i < video.textTracks.length; i++) {
            const track = video.textTracks[i];
            track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
        }
    }, []);

    const cycleSpeed = useCallback((direction: 1 | -1) => {
        const video = videoRef.current;
        if (!video) return;
        const currentIndex = PLAYBACK_SPEEDS.indexOf(video.playbackRate);
        const baseIndex = currentIndex === -1 ? PLAYBACK_SPEEDS.indexOf(1) : currentIndex;
        const nextIndex = Math.min(
            Math.max(baseIndex + direction, 0),
            PLAYBACK_SPEEDS.length - 1,
        );
        video.playbackRate = PLAYBACK_SPEEDS[nextIndex];
    }, []);

    const setSpeed = useCallback((speed: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = speed;
    }, []);

    const scheduleHideControls = useCallback(() => {
        if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
        hideControlsTimeoutRef.current = setTimeout(() => {
            setControlsVisible(false);
        }, CONTROLS_HIDE_DELAY_MS);
    }, []);

    const showControls = useCallback(() => {
        setControlsVisible(true);
        if (!paused) scheduleHideControls();
    }, [paused, scheduleHideControls]);

    useEffect(() => {
        if (paused) {
            setControlsVisible(true);
            if (hideControlsTimeoutRef.current)
                clearTimeout(hideControlsTimeoutRef.current);
        } else {
            scheduleHideControls();
        }
        return () => {
            if (hideControlsTimeoutRef.current)
                clearTimeout(hideControlsTimeoutRef.current);
        };
    }, [paused, scheduleHideControls]);

    const keyActionsRef = useRef<Record<string, () => void>>(undefined);
    keyActionsRef.current = {
        ' ': () => void togglePlayPause(),
        Spacebar: () => void togglePlayPause(),
        k: () => void togglePlayPause(),
        K: () => void togglePlayPause(),
        j: () => seekBy(-JL_SEEK_SECONDS),
        J: () => seekBy(-JL_SEEK_SECONDS),
        l: () => seekBy(JL_SEEK_SECONDS),
        L: () => seekBy(JL_SEEK_SECONDS),
        ArrowLeft: () => seekBy(-ARROW_SEEK_SECONDS),
        ArrowRight: () => seekBy(ARROW_SEEK_SECONDS),
        ArrowUp: () => changeVolume(0.1),
        ArrowDown: () => changeVolume(-0.1),
        m: () => toggleMuted(),
        M: () => toggleMuted(),
        f: () => toggleFullscreen(),
        F: () => toggleFullscreen(),
        i: () => void togglePictureInPicture(),
        I: () => void togglePictureInPicture(),
        c: () => toggleCaptions(),
        C: () => toggleCaptions(),
        '>': () => cycleSpeed(1),
        '<': () => cycleSpeed(-1),
    };

    const PREVENT_DEFAULT_KEYS = new Set([
        ' ',
        'Spacebar',
        'k',
        'K',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
    ]);

    useEffect(() => {
        function isTypingTarget(target: EventTarget | null) {
            if (!(target instanceof HTMLElement)) return false;
            const tag = target.tagName.toLowerCase();
            return tag === 'input' || tag === 'textarea' || target.isContentEditable;
        }

        function onKeyDown(event: KeyboardEvent) {
            if (isTypingTarget(event.target) || !containerRef.current) return;

            const action = keyActionsRef.current?.[event.key];
            if (!action) return;

            if (PREVENT_DEFAULT_KEYS.has(event.key)) event.preventDefault();
            action();
            showControls();
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showControls]);

    const lastCenterTapRef = useRef(0);
    const lastSideTapRef = useRef<{ time: number; side: -1 | 1 } | null>(null);

    function handleCenterTap() {
        const now = Date.now();
        if (now - lastCenterTapRef.current < DOUBLE_TAP_WINDOW_MS) {
            toggleFullscreen();
        } else {
            void togglePlayPause();
        }
        lastCenterTapRef.current = now;
        showControls();
    }

    function handleSideTap(side: -1 | 1) {
        const now = Date.now();
        const last = lastSideTapRef.current;
        if (last && last.side === side && now - last.time < DOUBLE_TAP_WINDOW_MS) {
            seekBy(side * JL_SEEK_SECONDS);
            lastSideTapRef.current = null;
        } else {
            lastSideTapRef.current = { time: now, side };
        }
        showControls();
    }

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            data-buffering={buffering ? '' : undefined}
            data-controls={controlsVisible ? '' : undefined}
            onMouseMove={showControls}
            onMouseLeave={() => {
                if (!paused) setControlsVisible(false);
            }}
            className={cn(
                'group relative flex h-full w-full',
                'bg-black text-foreground',
                'font-sans',
                'outline-none',
                !controlsVisible && 'cursor-none',
            )}
        >
            <video
                ref={videoRef}
                src={src}
                title={title}
                playsInline
                preload='metadata'
                onEnded={onEnded}
                className='h-full w-full object-contain'
            />

            <div
                className={cn(
                    'pointer-events-none absolute inset-0 z-10',
                    'hidden items-center justify-center',
                    'group-data-buffering:flex',
                )}
            >
                <Loader2 className='h-8 w-8 animate-spin text-white/80' />
            </div>

            {/* Gestures */}
            <div
                className='absolute inset-0 z-0 block h-full w-full'
                onPointerUp={handleCenterTap}
            />
            <div
                className={cn('absolute top-0 z-5 block h-full w-1/5', 'left-0')}
                onPointerUp={() => handleSideTap(-1)}
            />
            <div
                className={cn('absolute top-0 z-5 block h-full w-1/5', 'right-0')}
                onPointerUp={() => handleSideTap(1)}
            />

            <div
                className={cn(
                    'pointer-events-none absolute inset-0 z-10',
                    'flex h-full w-full flex-col justify-end',
                    'bg-linear-to-t from-black/85 via-black/10 to-transparent',
                    'opacity-0',
                    'transition-opacity duration-200 group-data-controls:opacity-100',
                )}
            >
                <div className='pointer-events-auto flex items-center px-3 pt-1 sm:px-4'>
                    <VideoTimeSlider
                        currentTime={currentTime}
                        duration={duration}
                        buffered={buffered}
                        onSeek={seekTo}
                        onScrubStart={() => setIsScrubbing(true)}
                        onScrubChange={setCurrentTime}
                        onScrubEnd={() => setIsScrubbing(false)}
                    />
                </div>

                <div className='pointer-events-auto flex items-center gap-1 px-2 pb-2 pt-1 sm:px-3'>
                    <VideoPlayButton paused={paused} onToggle={togglePlayPause} />

                    <button
                        type='button'
                        onClick={() => seekBy(-10)}
                        className={cn(
                            'hidden items-center justify-center sm:inline-flex',
                            'h-9 w-9',
                            'text-foreground/90',
                            'outline-none transition-colors hover:bg-white/10',
                            'rounded-md focus-visible:ring-2 focus-visible:ring-primary/50',
                        )}
                        aria-label='Mundur 10 detik'
                    >
                        <RotateCcw className='h-4 w-4' />
                    </button>
                    <button
                        type='button'
                        onClick={() => seekBy(90)}
                        className={cn(
                            'hidden items-center justify-center sm:inline-flex',
                            'px-3 py-2',
                            'text-foreground/90 text-sm text-nowrap',
                            'outline-none transition-colors hover:bg-white/10',
                            'rounded-full focus-visible:ring-2 focus-visible:ring-primary/50',
                        )}
                        aria-label='Skip Intro'
                    >
                        Skip Intro
                    </button>

                    <button
                        type='button'
                        onClick={() => seekBy(10)}
                        className={cn(
                            'hidden items-center justify-center sm:inline-flex',
                            'h-9 w-9',
                            'text-foreground/90',
                            'outline-none transition-colors hover:bg-white/10',
                            'rounded-md focus-visible:ring-2 focus-visible:ring-primary/50',
                        )}
                        aria-label='Maju 10 detik'
                    >
                        <RotateCw className='h-4 w-4' />
                    </button>

                    <VideoMuteButton
                        muted={muted}
                        volume={volume}
                        onToggle={toggleMuted}
                    />

                    <VideoVolumeSlider
                        volume={volume}
                        muted={muted}
                        onChange={setVolumeValue}
                    />

                    <div
                        className={cn(
                            'ml-1 flex items-center gap-1',
                            'text-xs font-medium tabular-nums text-foreground/80',
                        )}
                    >
                        <span>{formatTime(currentTime)}</span>
                        <span className='text-foreground/40'>/</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    <div className='flex-1' />

                    <VideoSpeedButton playbackRate={playbackRate} onChange={setSpeed} />
                    <VideoFullscreenButton
                        isFullscreen={isFullscreen}
                        onToggle={toggleFullscreen}
                    />
                </div>
            </div>
        </div>
    );
});
