import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export interface Episode {
    title: string;
    src: string;
}

// Обновляем тип для selectedPlayer
export const useVideoPlayer = (episodes: Episode[], selectedPlayer: 'kodik' | 'anicat' | 'kinescope') => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [volume, setVolume] = useState<number>(1);
    const [progress, setProgress] = useState<number>(0);
    const [buffered, setBuffered] = useState<number>(0);
    const [showUI, setShowUI] = useState<boolean>(true);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [showPlaylist, setShowPlaylist] = useState<boolean>(false);
    const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);
    const [availableQualities, setAvailableQualities] = useState<number[]>([]);
    const [selectedQuality, setSelectedQuality] = useState<number | 'auto'>('auto');
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState<number | null>(null);
    const [isHoveringProgressBar, setIsHoveringProgressBar] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentEpisode = Array.isArray(episodes) && episodes.length > 0
        ? episodes[currentIndex]
        : null;

    const [isBuffering, setIsBuffering] = useState(false);
    const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('autoPlayNext');
            return saved === 'true';
        }
        return false;
    });
    const [scale, setScale] = useState("1");
    const [wasEnded, setWasEnded] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
    const [skipOpening, setSkipOpening] = useState(false);
    const [skipEnding, setSkipEnding] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoFullscreen, setAutoFullscreen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'main' | 'speed' | 'quality' | 'hotkeys'>('main');
    const [isMobileHorizontal, setIsMobileHorizontal] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            const isMobile = window.innerWidth <= 1024;
            const isHorizontal = window.innerWidth > window.innerHeight;
            setIsMobileHorizontal(isMobile && isHorizontal);
        };

        checkOrientation();
        window.addEventListener("resize", checkOrientation);

        return () => {
            window.removeEventListener("resize", checkOrientation);
        };
    }, []);

    useEffect(() => {
        console.log('selectedPlayer:', selectedPlayer); // Просто выводим в консоль, чтобы использовать эту переменную
    }, [selectedPlayer]);
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (showSettings && isMobileHorizontal) {
                document.body.classList.add('settings-open');
            } else {
                document.body.classList.remove('settings-open');
            }
        }
    }, [showSettings, isMobileHorizontal]);
    useEffect(() => {
        console.log("Episodes:", episodes);  // Логируешь, что находится в episodes
        console.log("Current Index:", currentIndex);
    }, [episodes, currentIndex]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('autoPlayNext', String(autoPlayNext));
        }
    }, [autoPlayNext]);
    useEffect(() => {
        // В зависимости от выбранного плеера меняем источник видео
        if (selectedPlayer === 'kodik') {
            // Логика для Kodik
        } else if (selectedPlayer === 'anicat') {
            // Логика для AniCat
        } else if (selectedPlayer === 'kinescope') {
            // Логика для Kinescope
        }
    }, [selectedPlayer, episodes, currentIndex]);
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleMouseMove = (e?: React.MouseEvent<HTMLDivElement>) => {
        setShowUI(true);

        if (e && videoRef.current && videoRef.current.duration) {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const position = e.clientX - rect.left;
            const percentage = position / rect.width;
            const rawTime = videoRef.current.duration * percentage;
            const time = Math.min(videoRef.current.duration, Math.floor(rawTime));

            setHoverTime(time);
            setHoverPosition((position / rect.width) * 100); // фиксируем процентное положение

            const tooltipTop = rect.top - 30;
            const tooltipLeft = e.clientX - 50;

            setTooltipPosition({ left: tooltipLeft, top: tooltipTop });
        }
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        const current = video.currentTime;
        const dur = video.duration;
        const buf = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;
        setProgress((current / dur) * 100);
        setBuffered((buf / dur) * 100);
    };

    const handleVolume = (value: number) => {
        const video = videoRef.current;
        if (video) video.volume = value;
        setVolume(value);
    };

    const changeEpisode = (index: number) => {
        setIsBuffering(true);
        setCurrentIndex(index);
    };

    const setQuality = (height: number | 'auto') => {
        if (!hlsInstance) return;
        if (height === 'auto') {
            hlsInstance.currentLevel = -1;
        } else {
            const levelIndex = hlsInstance.levels.findIndex((l) => l.height === height);
            if (levelIndex !== -1) {
                hlsInstance.currentLevel = levelIndex;
            }
        }
        setSelectedQuality(height);
        setShowSettings(false);
    };

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play().catch(() => {});
            setIsPlaying(true);
            setWasEnded(false);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    const toggleFullscreen = () => {
        const container = containerRef.current;
        if (!container) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen();
        }
    };

    const autoPlayNextRef = useRef(autoPlayNext);
    useEffect(() => {
        autoPlayNextRef.current = autoPlayNext;
    }, [autoPlayNext]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !currentEpisode) return;

        setShowUI(true);
        setProgress(0);
        setBuffered(0);
        setShowSettings(false);

        const endedHandler = () => {
            setIsPlaying(false);
            setWasEnded(true);
            if (autoPlayNextRef.current && currentIndex < episodes.length - 1) {
                setIsBuffering(true);
                setCurrentIndex(currentIndex + 1);
            }
        };

        const onPlaying = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        video.addEventListener("ended", endedHandler);
        video.addEventListener("playing", onPlaying);
        video.addEventListener("pause", onPause);

        if (Hls.isSupported() && currentEpisode.src.endsWith('.m3u8')) {
            const hls = new Hls();
            setHlsInstance(hls);
            hls.loadSource(currentEpisode.src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const levels = hls.levels.map((level) => level.height).sort((a, b) => b - a);
                setAvailableQualities([...new Set(levels)]);
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, () => {
                const level = hls.currentLevel;
                if (level >= 0 && hls.levels[level]) {
                    const height = hls.levels[level].height;
                    setSelectedQuality(height);
                }
            });

            hls.on(Hls.Events.LEVEL_LOADED, () => {
                setIsBuffering(false);
            });

            return () => {
                hls.destroy();
                video.removeEventListener("ended", endedHandler);
                video.removeEventListener("playing", onPlaying);
                video.removeEventListener("pause", onPause);
            };
        } else {
            setHlsInstance(null);
            video.src = currentEpisode.src;

            video.play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));

            video.oncanplay = () => {
                setIsBuffering(false);
            };

            return () => {
                video.removeEventListener("ended", endedHandler);
                video.removeEventListener("playing", onPlaying);
                video.removeEventListener("pause", onPause);
            };
        }
    }, [currentEpisode]);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.volume = volume;
            video.play().catch(() => {});
            setIsPlaying(true);
        }
    }, [currentEpisode]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowPlaylist(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        currentIndex,
        isPlaying,
        volume,
        progress,
        buffered,
        showUI,
        showSettings,
        showPlaylist,
        selectedQuality,
        availableQualities,
        hoverTime,
        hoverPosition,
        videoRef,
        containerRef,
        currentEpisode,
        formatTime,
        handleMouseMove,
        handleTimeUpdate,
        handleVolume,
        setHoverTime,
        setHoverPosition,
        changeEpisode,
        setShowSettings,
        setShowPlaylist,
        setQuality,
        togglePlay,
        toggleFullscreen,
        isHoveringProgressBar,
        setIsHoveringProgressBar,
        isBuffering,
        setIsBuffering,
        autoPlayNext,
        setAutoPlayNext,
        scale,
        setScale,
        setIsPlaying,
        wasEnded,
        setWasEnded,
        tooltipPosition,
        skipOpening,
        skipEnding,
        autoPlay,
        autoFullscreen,
        setAutoFullscreen,
        setSkipEnding,
        setSkipOpening,
        setAutoPlay,
        settingsTab,
        setSettingsTab,
        isMobileHorizontal,
    };
};
