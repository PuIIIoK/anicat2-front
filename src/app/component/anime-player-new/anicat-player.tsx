// app/components/AnimePlayer.tsx
"use client";

import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import clsx from 'clsx';

import {
    Menu,
    SkipBack,
    SkipForward,
    Play,
    Pause,
    Settings,
    Maximize,
    X
} from 'lucide-react';
import {API_SERVER} from '@/hosts/constants';



interface EpisodeApiResponse {
    id: string;
    name: string | null;
    ordinal: number;
    hls_480: string;
    hls_720: string;
    hls_1080: string;
    preview?: {
        optimized?: { thumbnail: string };
    };
    opening?: {
        start: number | null;
        stop: number | null;
    };
    ending?: {
        start: number | null;
        stop: number | null;
    };
}


interface AnimePlayerProps {
    animeId: string;
    initialCookies: Record<string, string>;
}

const AnimePlayer: React.FC<AnimePlayerProps> = ({ animeId }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playlistRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);
    const [episodes, setEpisodes] = useState<EpisodeApiResponse[]>([]);
    const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
    const [quality, setQuality] = useState<'480' | '720' | '1080'>('720');
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [, setFullscreen] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [buffering, setBuffering] = useState(false);
    const [animeTitle, setAnimeTitle] = useState<string | null>(null);
    const [settingsScreen, setSettingsScreen] = useState<'main' | 'quality' | 'speed' | 'scale' | 'skip' | 'quick_keydown'>('main');
    const [skipEnabled, setSkipEnabled] = useState(true);
    const [autoSkipEnabled, setAutoSkipEnabled] = useState(true);
    const [spaceHoldTimeout, setSpaceHoldTimeout] = useState<NodeJS.Timeout | null>(null);
    const [spaceHeldEnough, setSpaceHeldEnough] = useState(false);

    const [controlsVisible, setControlsVisible] = useState(true);

    const [hoverTime, setHoverTime] = useState(0);
    const [hoverX, setHoverX] = useState(0);
    const [showTooltip, setShowTooltip] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const currentEpisode = episodes.find((ep) => ep.id === currentEpisodeId);
    const [showSkipOpening, setShowSkipOpening] = useState(false);
    const [showSkipEnding, setShowSkipEnding] = useState(false);
    useEffect(() => {
        const cookies = document.cookie.split(';').reduce((acc: Record<string, string>, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});
        if (cookies.volume) {
            const vol = parseFloat(cookies.volume);
            if (!isNaN(vol) && vol >= 0 && vol <= 1) {
                setVolume(vol);
            }
        }
        if (cookies.skipEnabled === 'true') {
            setSkipEnabled(true);
        } else if (cookies.skipEnabled === 'false') {
            setSkipEnabled(false);
        }
        if (cookies.autoSkipEnabled === 'true') {
            setAutoSkipEnabled(true);
        } else if (cookies.autoSkipEnabled === 'false') {
            setAutoSkipEnabled(false);
        }
    }, []);
    useEffect(() => {
        fetch(`${API_SERVER}/api/libria/episodes/${animeId}`)
            .then((res) => res.json())
            .then((data) => {
                setEpisodes(data);

                const cookies = document.cookie.split(';').reduce((acc: Record<string, string>, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {});

                const savedEpisodeId = cookies[`lastEpisodeId_${animeId}`];

                const episodeToSet = data.find((ep: EpisodeApiResponse) => ep.id === savedEpisodeId) || data[0];
                setCurrentEpisodeId(episodeToSet.id);
            });
    }, [animeId]);

    useEffect(() => {
        if (!videoRef.current || !currentEpisode) return;

        const video = videoRef.current;
        const hls = new Hls();

        setLoading(true);
        const src = currentEpisode[`hls_${quality}` as keyof EpisodeApiResponse] as string;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
            setLoading(false);
        });

        return () => {
            hls.destroy();
        };
    }, [currentEpisodeId, quality]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !currentEpisode) return;

        // Обработчик события loadedmetadata - гарантирует, что duration доступна
        const handleLoadedMetadata = () => {
            updateProgress();
        };

        const updateProgress = () => {
            if (!videoRef.current || !currentEpisode) return;

            const video = videoRef.current;
            const currentTime = video.currentTime;
            const duration = video.duration;

            if (isNaN(duration) || !isFinite(duration)) return;

            // Вычисляем прогресс воспроизведения в процентах
            const progressPercent = (currentTime / duration) * 100;
            setProgress(isNaN(progressPercent) ? 0 : progressPercent);

            // Вычисляем, сколько видео загружено (буфер) в процентах
            const bufferedEnd = video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0;
            const bufferedPercent = (bufferedEnd / duration) * 100;
            setBuffered(isNaN(bufferedPercent) ? 0 : bufferedPercent);

            // Обработка показа/авто-пропуска опенинга
            const openingStart = currentEpisode.opening?.start;
            const openingStop = currentEpisode.opening?.stop;
            if (openingStart != null && openingStop != null) {
                if (skipEnabled) {
                    const isInOpeningRange = currentTime >= (openingStart - 2) && currentTime < openingStop;
                    if (autoSkipEnabled) {
                        // Авто-пропуск опенинга, если прошло 5 секунд после старта опенинга
                        if (currentTime >= (openingStart + 5) && currentTime < openingStop) {
                            video.currentTime = openingStop;
                            setShowSkipOpening(false);
                        } else {
                            setShowSkipOpening(isInOpeningRange);
                        }
                    } else {
                        // Просто показываем кнопку, если пользователь в диапазоне опенинга
                        setShowSkipOpening(isInOpeningRange);
                    }
                } else {
                    setShowSkipOpening(false);
                }
            } else {
                setShowSkipOpening(false);
            }

            // Обработка показа кнопки пропуска эндинга
            const endingStart = currentEpisode.ending?.start;
            const endingStop = currentEpisode.ending?.stop;
            if (endingStart != null && endingStop != null) {
                const isInEndingRange = currentTime >= (endingStart - 10) && currentTime < endingStop;
                setShowSkipEnding(isInEndingRange);
            } else {
                setShowSkipEnding(false);
            }
        };


        const handleWaiting = () => setBuffering(true);
        const handlePlaying = () => setBuffering(false);

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('progress', updateProgress);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        // Инициализация прогресса при монтировании
        updateProgress();

        return () => {
            video.removeEventListener('timeupdate', updateProgress);
            video.removeEventListener('progress', updateProgress);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [videoRef.current, currentEpisode, skipEnabled, autoSkipEnabled]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
        }
    }, [volume]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (playing) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setPlaying(!playing);
    };

    const toggleFullscreen = () => {
        const video = videoRef.current;
        if (!video) return;
        if (!document.fullscreenElement) {
            video.parentElement?.requestFullscreen();
            setFullscreen(true);
        } else {
            document.exitFullscreen();
            setFullscreen(false);
        }
    };

    const changeVolume = (value: number) => {
        if (videoRef.current) {
            videoRef.current.volume = value;
            setVolume(value);
        }
    };
    useEffect(() => {
        fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`)
            .then(res => res.json())
            .then(data => setAnimeTitle(data.title))
            .catch(() => setAnimeTitle(null));
    }, [animeId]);

    const goToPreviousEpisode = () => {
        if (!currentEpisodeId || episodes.length === 0) return;
        const currentIndex = episodes.findIndex(ep => ep.id === currentEpisodeId);
        if (currentIndex > 0) {
            setCurrentEpisodeId(episodes[currentIndex - 1].id);
            setBuffering(true);
        }
    };

    const goToNextEpisode = () => {
        if (!currentEpisodeId || episodes.length === 0) return;
        const currentIndex = episodes.findIndex(ep => ep.id === currentEpisodeId);
        if (currentIndex < episodes.length - 1) {
            setCurrentEpisodeId(episodes[currentIndex + 1].id);
            setBuffering(true);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            const panel = document.querySelector('.playlist-panel') as HTMLElement;
            if (!panel) return;

            const isFullscreen = !!document.fullscreenElement;
            const isMobile = window.innerWidth <= 768;

            panel.style.height = isFullscreen
                ? '100%'
                : isMobile
                    ? '50vh'
                    : '740px';
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);
    useEffect(() => {
        document.cookie = `skipEnabled=${skipEnabled}; path=/; max-age=31536000`; // 1 год
    }, [skipEnabled]);
    useEffect(() => {
        document.cookie = `autoSkipEnabled=${autoSkipEnabled}; path=/; max-age=31536000`; // 1 год
    }, [autoSkipEnabled]);
    useEffect(() => {
        if (currentEpisodeId) {
            document.cookie = `lastEpisodeId_${animeId}=${currentEpisodeId}; path=/; max-age=31536000`;
        }
    }, [currentEpisodeId, animeId]);
    useEffect(() => {
        document.cookie = `volume=${volume}; path=/; max-age=31536000`;
    }, [volume]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (showPlaylist && playlistRef.current && !playlistRef.current.contains(target)) {
                setShowPlaylist(false);
            }

            if (showSettings && settingsRef.current && !settingsRef.current.contains(target)) {
                setShowSettings(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPlaylist, showSettings]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video) return;

            switch (e.key.toLowerCase()) {
                case 'arrowleft':
                    video.currentTime = Math.max(video.currentTime - 10, 0);
                    break;
                case 'arrowright':
                    video.currentTime = Math.min(video.currentTime + 10, video.duration);
                    break;
                case ' ':
                    e.preventDefault();
                    if (!spaceHoldTimeout) {
                        const timeout = setTimeout(() => {
                            setSpaceHeldEnough(true);
                            video.playbackRate = 2;
                        }, 800); // 1.5 секунды
                        setSpaceHoldTimeout(timeout);
                    }
                    break;
                case 'k':
                    e.preventDefault();
                    if (video.paused) {
                        video.play();
                        setPlaying(true);
                    } else {
                        video.pause();
                        setPlaying(false);
                    }
                    break;
                case 'z':
                    goToPreviousEpisode();
                    break;
                case 'c':
                    goToNextEpisode();
                    break;
                case 'o':
                    setQuality('480');
                    break;
                case 'l':
                    setQuality('1080');
                    break;
                case 'arrowup':
                    changeVolume(Math.min(volume + 0.05, 1));
                    break;
                case 'arrowdown':
                    changeVolume(Math.max(volume - 0.05, 0));
                    break;
                case 'p':
                    setShowPlaylist((prev) => !prev);
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video) return;

            if (e.key === ' ') {
                if (spaceHoldTimeout) {
                    clearTimeout(spaceHoldTimeout);
                    setSpaceHoldTimeout(null);
                }

                if (spaceHeldEnough) {
                    video.playbackRate = 1;
                    setSpaceHeldEnough(false);
                } else {
                    // Обычное поведение: пауза / воспроизведение
                    if (video.paused) {
                        video.play();
                        setPlaying(true);
                    } else {
                        video.pause();
                        setPlaying(false);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [volume, quality, playing, currentEpisodeId, episodes, spaceHoldTimeout, spaceHeldEnough]);

    // обновляй текущие значения при воспроизведении
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => setDuration(video.duration);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

// форматирование времени
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60)
            .toString()
            .padStart(2, '0');
        const seconds = Math.floor(time % 60)
            .toString()
            .padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const resetTimer = () => {
            setControlsVisible(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setControlsVisible(false), 3000);
        };

        const handleMouseMove = () => resetTimer();

        window.addEventListener('mousemove', handleMouseMove);
        resetTimer();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeout);
        };
    }, []);


    return (
        <div className="anime-player">
            <div className="player-wrapper">
                {(loading || buffering) && <div className="buffer-spinner"/>}
                <video
                    ref={videoRef}
                    className="video"
                    controls={false}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onClick={togglePlay} // ← ДОБАВЬ ЭТО
                />

                <div className="logo-overlay">
                    {animeTitle && (
                        <div className={clsx("title", !controlsVisible && "hidden")}>
                            {animeTitle}
                        </div>
                    )}
                    {currentEpisode && (
                        <div className={clsx("subtitle", !controlsVisible && "hidden")}>
                            {currentEpisode.name ? currentEpisode.name : `${currentEpisode.ordinal} серия`}
                        </div>
                    )}
                </div>
                {skipEnabled && (showSkipOpening || showSkipEnding) && (
                    <div className="skip-buttons">
                        {showSkipOpening && (
                            <button
                                className="skip-button"
                                onClick={() => {
                                    if (videoRef.current && currentEpisode?.opening?.stop != null) {
                                        videoRef.current.currentTime = currentEpisode.opening.stop;
                                        setShowSkipOpening(false);
                                    }
                                }}
                            >
                                Пропустить опенинг
                            </button>
                        )}
                        {showSkipEnding && (
                            <button
                                className="skip-button"
                                onClick={() => {
                                    if (videoRef.current && currentEpisode?.ending?.stop != null) {
                                        videoRef.current.currentTime = currentEpisode.ending.stop;
                                        setShowSkipEnding(false);
                                    }
                                }}
                            >
                                Пропустить эндинг
                            </button>
                        )}
                    </div>
                )}


                {showPlaylist && (
                    <div className="playlist-panel" ref={playlistRef}>
                        <div className="playlist-header-fixed">
                            <div className="playlist-header">
                                Выбор эпизода
                                <span className="playlist-close" onClick={() => setShowPlaylist(false)}>
          <X size={20}/>
        </span>
                            </div>
                        </div>
                        <div className="playlist-scroll">
                            <div className="playlist">
                                {episodes.map((ep) => (
                                    <div
                                        key={ep.id}
                                        className={clsx('episode-tile', ep.id === currentEpisodeId && 'active')}
                                        onClick={() => setCurrentEpisodeId(ep.id)}
                                    >
                                        <img
                                            src={`https://anilibria.wtf${ep.preview?.optimized?.thumbnail || ''}`}
                                            alt={ep.name || `Серия ${ep.ordinal}`}
                                        />
                                        <div className="episode-info">
                                            <div className="episode-number">{ep.ordinal}</div>
                                            <div className="episode-title">{ep.name || 'Без названия'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {showSettings && (
                    <div className="settings-panel" ref={settingsRef}>
                        <div className="settings-header">
                            {settingsScreen === 'main' && 'Настройки'}
                            {settingsScreen === 'quality' && (
                                <>
                                    <span style={{cursor: 'pointer'}}
                                          onClick={() => setSettingsScreen('main')}>←&nbsp;</span>Настройки
                                    /&nbsp;Качество
                                </>
                            )}
                            {settingsScreen === 'speed' && (
                                <>
                                    <span style={{cursor: 'pointer'}}
                                          onClick={() => setSettingsScreen('main')}>←&nbsp;</span>Настройки
                                    /&nbsp;Скорость
                                </>
                            )}
                            {settingsScreen === 'scale' && (
                                <>
                                    <span style={{cursor: 'pointer'}}
                                          onClick={() => setSettingsScreen('main')}>←&nbsp;</span>Настройки
                                    /&nbsp;Масштаб
                                </>
                            )}
                            {settingsScreen === 'skip' && (
                                <>
                                    <span style={{cursor: 'pointer'}}
                                          onClick={() => setSettingsScreen('main')}>←&nbsp;</span>Настройки
                                    - &nbsp;Опенинг/Эндинг
                                </>
                            )}
                            {settingsScreen === 'quick_keydown' && (
                                <>
                                    <span style={{cursor: 'pointer'}}
                                          onClick={() => setSettingsScreen('main')}>←&nbsp;</span>Горячие клавиши
                                </>
                            )}
                            <span className="settings-close" onClick={() => setShowSettings(false)}>
        <X size={20}/>
      </span>
                        </div>

                        {settingsScreen === 'main' && (
                            <>
                                <div className="setting-item2" onClick={() => setSettingsScreen('quality')}>
                                    <div className="setting-label2">Качество</div>
                                    <div>{quality}p</div>
                                </div>
                                <div className="setting-item2" onClick={() => setSettingsScreen('speed')}>
                                    <div className="setting-label2">Скорость</div>
                                    <div>1x</div>
                                </div>
                                <div className="setting-item2" onClick={() => setSettingsScreen('scale')}>
                                    <div className="setting-label2">Масштаб</div>
                                    <div>100%</div>
                                </div>
                                <div className="setting-item2" onClick={() => setSettingsScreen('skip')}>
                                    <div className="setting-label2">Опенинг / Эндинг</div>
                                    <div>Настроить</div>
                                </div>
                                <div className="setting-item2" onClick={() => setSettingsScreen('quick_keydown')}>
                                    <div className="setting-label2">Горячие клавиши</div>
                                    <div>Посмотреть</div>
                                </div>
                            </>
                        )}

                        {settingsScreen === 'quality' && (
                            <div className="setting-item">
                                <select
                                    value={quality}
                                    onChange={(e) => setQuality(e.target.value as '480' | '720' | '1080')}
                                >
                                    <option value="480">480p</option>
                                    <option value="720">720p</option>
                                    <option value="1080">1080p</option>
                                </select>
                            </div>
                        )}
                        {settingsScreen === 'skip' && (
                            <div className="setting-submenu">
                                <div className="setting-item2">
                                    <div className="setting-label2">Показать кнопку Пропустить</div>
                                    <input
                                        type="checkbox"
                                        checked={skipEnabled}
                                        onChange={() => setSkipEnabled(!skipEnabled)}
                                    />
                                </div>
                                <div className="setting-item2">
                                    <div className="setting-label2">Авто-пропуск опенинга/эндинга</div>
                                    <input
                                        type="checkbox"
                                        checked={autoSkipEnabled}
                                        onChange={() => setAutoSkipEnabled(!autoSkipEnabled)}
                                    />
                                </div>
                            </div>
                        )}
                        {settingsScreen === 'quick_keydown' && (
                            <div className="setting-submenu">
                                <div className="hotkey-row"><span>←</span> Назад на 10 секунд</div>
                                <div className="hotkey-row"><span>→</span> Вперёд на 10 секунд</div>
                                <div className="hotkey-row"><span>Space / K</span> Пауза / Воспроизведение</div>
                                <div className="hotkey-row"><span>Z</span> Предыдущая серия</div>
                                <div className="hotkey-row"><span>C</span> Следующая серия</div>
                                <div className="hotkey-row"><span>Arrow ↑</span> Увеличить громкость</div>
                                <div className="hotkey-row"><span>Arrow ↓</span> Уменьшить громкость</div>
                                <div className="hotkey-row"><span>O</span> Переключить на 480p</div>
                                <div className="hotkey-row"><span>L</span> Переключить на 1080p</div>
                                <div className="hotkey-row"><span>P</span> Открыть / закрыть плейлист</div>
                                <div className="hotkey-note">Удержание пробела — временная перемотка с ускорением 2x <br/>А так-же, горячие клавиши работают только с англ. расскладкой</div>
                            </div>
                        )}

                    </div>
                )}


                <div
                    className={clsx("controls", showPlaylist && "hidden-under-playlist", !controlsVisible && "hidden")}>
                    <div className="progress-wrapper">
                        {/* Метки времени */}
                        <div className="time-label start-time">{formatTime(currentTime)}</div>
                        <div className="time-label end-time">{formatTime(duration)}</div>

                        {/* Контейнер прогресса */}
                        <div
                            className="progress-container"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const clickPercent = clickX / rect.width;

                                if (videoRef.current && videoRef.current.duration) {
                                    const newTime = clickPercent * videoRef.current.duration;
                                    videoRef.current.currentTime = newTime;
                                    setBuffering(true);
                                }
                            }}
                            onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const hoverX = e.clientX - rect.left;
                                const hoverPercent = hoverX / rect.width;
                                const hoverTime = hoverPercent * (videoRef.current?.duration || 0);

                                setHoverTime(hoverTime);
                                setHoverX(hoverX);
                                setShowTooltip(true);
                            }}
                            onMouseLeave={() => setShowTooltip(false)}
                        >


                            <div
                                className="buffered-bar"
                                style={{'--buffered': `${buffered}%`} as React.CSSProperties}
                            />
                            <div
                                className="progress-bar"
                                style={{'--progress': `${progress}%`} as React.CSSProperties}
                            />
                        </div>
                        {/* Тултип при наведении */}
                        {showTooltip && (
                            <div
                                className="progress-tooltip"
                                style={{left: `${hoverX}px`}}
                            >
                                {formatTime(hoverTime)}
                            </div>
                        )}
                    </div>


                    <div className="bottom-controls">
                        <div className="left">
                            <div className="control-icon" onClick={() => setShowPlaylist(!showPlaylist)}>
                                <Menu size={20}/>
                            </div>
                        </div>
                        <div className="center">
                            <div className="control-icon" onClick={goToPreviousEpisode}>
                                <SkipBack size={20}/>
                            </div>
                            <div className="control-icon" onClick={togglePlay}>
                                {playing ? <Pause size={20}/> : <Play size={20}/>}
                            </div>
                            <div className="control-icon" onClick={goToNextEpisode}>
                                <SkipForward size={20}/>
                            </div>

                        </div>
                        <div className="right">
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                                className="volume-slider"
                            />
                            <div className="control-icon" onClick={() => setShowSettings(!showSettings)}>
                                <Settings size={20}/>
                            </div>
                            <div className="control-icon" onClick={toggleFullscreen}>
                            <Maximize size={20}/>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimePlayer;