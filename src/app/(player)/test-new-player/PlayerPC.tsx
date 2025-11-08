"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import '@/styles/components/test-new-player.scss';
import { fetchPlayerHls, fetchKodikSearch, fetchKodikStream, fetchLibriaEpisodes, fetchKodikEpisodesFromSearch, AnimeMeta, fetchLastWatchedProgress, fetchYumekoVoices, fetchYumekoEpisodes, fetchYumekoEpisodeStream, YumekoVoice, YumekoEpisode } from './playerApi';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Maximize,
    Minimize,
    Volume as VolumeIcon,
    Volume1 as VolumeLowIcon,
    Volume2 as VolumeHighIcon,
    VolumeX as VolumeMuteIcon,
    Settings,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    List,
    RotateCcw,
    RotateCw
} from 'lucide-react';
import Link from 'next/link';
import { getEpisodeProgress, upsertEpisodeProgress, markEpisodeOpened, getEpisodeProgressLibriaAnyVoice, setEpisodeProgress, upsertEpisodeProgressWithSync, fetchAndMergeFromServer, pushAllCacheForAnimeToServer } from '@/utils/player/progressCache';
import { loadSettings, saveSettings } from '@/utils/player/settings';
import { savePlayerState } from '@/utils/player/playerState';

interface PlayerPCProps {
    animeId: string;
    animeMeta?: AnimeMeta | null;
    initError?: { code: number; message: string } | null;
    src?: string; // HLS m3u8 ссылка
    onNextEpisode?: () => void;
    onPrevEpisode?: () => void;
}

type OverlayKind = 'volume' | 'seek-forward' | 'seek-backward' | 'notice' | 'play-pause';

export default function PlayerPC({ animeId, animeMeta, src, onNextEpisode, onPrevEpisode }: PlayerPCProps) {
    console.log('[player] component mounted');
    // const router = useRouter(); // Не используется
    // const pathname = usePathname(); // Не используется после отключения URL синхронизации
    // const searchParams = useSearchParams(); // Не используется после отключения URL синхронизации
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [volume, setVolume] = useState(0.7);
    const [isMuted, setIsMuted] = useState(false);
    const [levels, setLevels] = useState<Array<{ index: number; height?: number }>>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = auto
    const [showOverlays, setShowOverlays] = useState<{ kind: OverlayKind; value?: number; mode?: 'up' | 'down' | 'mute' | 'neutral'; text?: string } | null>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [, setBufferedEnd] = useState(0);
    const [bufferedRanges, setBufferedRanges] = useState<Array<{ start: number; end: number }>>([]);
    const [, setIsSeeking] = useState(false);
    const [showUI, setShowUI] = useState(true);
    const showUIRef = useRef<boolean>(true);
    const [isUIStable, setIsUIStable] = useState(true); // Флаг стабильности UI
    
    useEffect(() => { 
        showUIRef.current = showUI; 
        // Устанавливаем стабильность UI через небольшую задержку
        const timeout = setTimeout(() => setIsUIStable(showUI), 50);
        return () => clearTimeout(timeout);
    }, [showUI]);
    
    // Мемоизированные CSS классы для предотвращения лишних перерендеров
    const uiClasses = useMemo(() => ({
        topbar: `player-topbar ${showUI ? 'visible' : 'hidden'}`,
        centerControls: `player-center-controls ${showUI ? 'visible' : 'hidden'}`,
        hotbar: `player-hotbar ${showUI ? 'visible' : 'hidden'}`,
        controls: `player-controls ${showUI ? 'visible' : 'hidden'}`
    }), [showUI]);
    const hideUiTimeoutRef = useRef<number | null>(null);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsSection, setSettingsSection] = useState<'main' | 'quality' | 'speed' | 'hotkeys'>('main');
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const initialSettings = loadSettings();
    const [skipOpening, setSkipOpening] = useState<boolean>(typeof initialSettings.skipOpening === 'boolean' ? initialSettings.skipOpening! : false);
    const [skipEnding, setSkipEnding] = useState<boolean>(typeof initialSettings.skipEnding === 'boolean' ? initialSettings.skipEnding! : false);
    const [autoPlay, setAutoPlay] = useState<boolean>(typeof initialSettings.autoPlay === 'boolean' ? initialSettings.autoPlay! : false);
    const [autoFullscreen, setAutoFullscreen] = useState<boolean>(typeof initialSettings.autoFullscreen === 'boolean' ? initialSettings.autoFullscreen! : false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);
    const [isVolumeSliderActive, setIsVolumeSliderActive] = useState(false);
    const [showBackTooltip, setShowBackTooltip] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [currentEpisode, setCurrentEpisode] = useState(1);
    const [resumePrompt, setResumePrompt] = useState<null | { epId: number; time: number; duration: number }>(null);
    const resumeCandidateRef = useRef<null | { epId: number; time: number; duration: number }>(null);
    const resumePromptShownForEpisodeRef = useRef<Set<number>>(new Set()); // Отслеживание показанных плашек для эпизодов
    const [showSourceDropdown, setShowSourceDropdown] = useState(false);
    const [selectedSource, setSelectedSource] = useState<'kodik' | 'libria' | 'yumeko'>('kodik');
    const [selectedKodikVoice, setSelectedKodikVoice] = useState<string | null>(null);
    const [isLibriaAvailable, setIsLibriaAvailable] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [yumekoVoices, setYumekoVoices] = useState<YumekoVoice[]>([]);
    const [selectedYumekoVoice, setSelectedYumekoVoice] = useState<YumekoVoice | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [yumekoEpisodes, setYumekoEpisodes] = useState<YumekoEpisode[]>([]);
    const [kodikPlaylistMap, setKodikPlaylistMap] = useState<Record<string, Array<{ id: number; title: string; duration?: string; raw?: unknown }>>>({});
    const [, setIsSwitchingSource] = useState(false);
    const switchingTimeoutRef = useRef<number | null>(null);
    const [libriaSkips, setLibriaSkips] = useState<null | { opening?: { start: number; end: number }; ending?: { start: number; end: number } }>(null);
    const [kodikSegments, setKodikSegments] = useState<null | { ad?: Array<{ start: number; end: number }>; skip?: Array<{ start: number; end: number }> }>(null);
    const hasSkippedOpeningRef = useRef<boolean>(false);
    const hasSkippedEndingRef = useRef<boolean>(false);
    const autoSkippedAdSegments = useRef<Set<string>>(new Set());
    const [skipAutoProgress, setSkipAutoProgress] = useState<number>(0);
    const skipAutoKindRef = useRef<'opening' | 'ending' | null>(null);
    const skipElapsedRef = useRef<number>(0);
    const lastVideoTimeRef = useRef<number>(0);
    const didAutoStartRef = useRef<boolean>(false);
    const userInteractedRef = useRef<boolean>(false); // Флаг пользовательского взаимодействия с плеером
    const autoplayMutedRef = useRef<boolean>(false);
    const autoFullscreenPendingRef = useRef<boolean>(false);
    const unmuteOnInteractHandlerRef = useRef<((ev: Event) => void) | null>(null);
    const isEpisodeSwitchingRef = useRef<boolean>(false);
    const fsOnInteractHandlerRef = useRef<((ev: Event) => void) | null>(null);
    const lastPersistAtRef = useRef<number>(0);
    const onLoadedProcessedRef = useRef<boolean>(false); // Флаг обработки onLoaded для текущего эпизода
    // Load/save settings toggles to localStorage
    const initializingRef = useRef(true);
    useEffect(() => {
        // дочитываем числовые/прочие параметры, если они есть в кэше
        const s = initialSettings;
        if (typeof s.playbackSpeed === 'number') setPlaybackSpeed(s.playbackSpeed);
        if (typeof s.volume === 'number') setVolume(Math.max(0, Math.min(1, s.volume!)));
        if (typeof s.isMuted === 'boolean') setIsMuted(s.isMuted);
        initializingRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (initializingRef.current) {
            // пропускаем первый вызов после загрузки
            initializingRef.current = false;
            return;
        }
        saveSettings({ skipOpening, skipEnding, autoPlay, autoFullscreen, playbackSpeed, volume, isMuted });
    }, [skipOpening, skipEnding, autoPlay, autoFullscreen, playbackSpeed, volume, isMuted]);

    // Сохранение состояния плеера
    useEffect(() => {
        if (!animeId) return;
        
        const state = {
            episode: currentEpisode,
            source: selectedSource,
            voice: selectedSource === 'kodik' ? selectedKodikVoice || undefined : (selectedSource === 'yumeko' ? selectedYumekoVoice?.name || undefined : undefined),
            time: currentTime
        };
        
        savePlayerState(animeId, state);
    }, [animeId, currentEpisode, selectedSource, selectedKodikVoice, selectedYumekoVoice, currentTime]);

    // Функция обновления URL параметров
    // Отключено обновление URL - больше не синхронизируем с адресной строкой
    // const updateURLParams = useCallback(() => {
    //     if (!animeMeta) return;
    //     
    //     const currentParams = new URLSearchParams(searchParams.toString());
    //     
    //     // Обновляем параметры плеера
    //     if (currentEpisode) {
    //         currentParams.set('episode', currentEpisode.toString());
    //     }
    //     if (selectedSource) {
    //         currentParams.set('source', selectedSource);
    //     }
    //     if (selectedKodikVoice && selectedSource === 'kodik') {
    //         currentParams.set('voice', selectedKodikVoice);
    //     } else if (selectedSource === 'libria') {
    //         currentParams.delete('voice');
    //     }
    //     
    //     // Обновляем время только если значимое (больше 10 секунд)
    //     if (currentTime > 10) {
    //         currentParams.set('time', Math.floor(currentTime).toString());
    //     }
    //     
    //     const newURL = `${pathname}?${currentParams.toString()}`;
    //     router.replace(newURL, { scroll: false });
    // }, [animeMeta, searchParams, pathname, router, currentEpisode, selectedSource, selectedKodikVoice, currentTime]);

    // Отключено обновление URL - больше не синхронизируем с адресной строкой
    // useEffect(() => {
    //     const timeoutId = setTimeout(() => {
    //         updateURLParams();
    //     }, 1000);
    //     
    //     return () => clearTimeout(timeoutId);
    // }, [updateURLParams]);

    // Отключено моментальное обновление URL - больше не синхронизируем с адресной строкой
    // useEffect(() => {
    //     if (!animeMeta) return;
    //     
    //     const currentParams = new URLSearchParams(searchParams.toString());
    //     
    //     // Обновляем параметры плеера моментально
    //     if (currentEpisode) {
    //         currentParams.set('episode', currentEpisode.toString());
    //     }
    //     if (selectedSource) {
    //         currentParams.set('source', selectedSource);
    //     }
    //     if (selectedKodikVoice && selectedSource === 'kodik') {
    //         currentParams.set('voice', selectedKodikVoice);
    //     } else if (selectedSource === 'libria') {
    //         currentParams.delete('voice');
    //     }
    //     
    //     const newURL = `${pathname}?${currentParams.toString()}`;
    //     router.replace(newURL, { scroll: false });
    // }, [animeMeta, searchParams, pathname, router, currentEpisode, selectedSource, selectedKodikVoice]);

    // Единая функция автозапуска/полноэкранного режима (идемпотентная)
    const attemptAutoStart = () => {
        const video = videoRef.current;
        const container = containerRef.current;
        if (!video) {
            console.log('[auto] No video ref');
            return;
        }
        
        // КРИТИЧНО: duration > 0 означает что таймлайн загружен
        // readyState проверяем только для логирования, но не блокируем запуск
        if (!video.duration || video.duration <= 0 || isNaN(video.duration)) {
            console.log('[auto] Duration not available yet:', video.duration);
            return;
        }
        
        // Если показана плашка возобновления — ничего не запускаем до выбора пользователя
        if (resumePrompt) {
            console.log('[auto] Blocked by resume prompt');
            return;
        }
        if (didAutoStartRef.current) {
            console.log('[auto] Already started');
            return;
        }
        // Если видео уже играет - не нужно перезапускать
        if (!video.paused) {
            console.log('[auto] Video already playing');
            return;
        }
        // Если пользователь уже взаимодействовал с плеером - не запускаем автоплей
        if (userInteractedRef.current) {
            console.log('[auto] Blocked by user interaction');
            return;
        }
        if (!autoPlay && !autoFullscreen) {
            console.log('[auto] Blocked - autoPlay and autoFullscreen are off');
            return;
        }
        console.log('[auto] ✅ Starting autoplay', { autoPlay, autoFullscreen, readyState: video.readyState, duration: video.duration, paused: video.paused });

        const ensureHandlersCleared = () => {
            if (unmuteOnInteractHandlerRef.current) {
                document.removeEventListener('pointerdown', unmuteOnInteractHandlerRef.current);
                document.removeEventListener('keydown', unmuteOnInteractHandlerRef.current as any);
                unmuteOnInteractHandlerRef.current = null;
            }
            if (fsOnInteractHandlerRef.current) {
                document.removeEventListener('pointerdown', fsOnInteractHandlerRef.current);
                document.removeEventListener('keydown', fsOnInteractHandlerRef.current as any);
                fsOnInteractHandlerRef.current = null;
            }
        };

        const registerFirstGestureHandler = () => {
            // единый обработчик для одновременного fullscreen и размута
            const handler = () => {
                try {
                    if (autoFullscreenPendingRef.current) {
                        container?.requestFullscreen?.().catch(() => {});
                        autoFullscreenPendingRef.current = false;
                    }
                    if (autoplayMutedRef.current && !isMuted) {
                        try { video.muted = false; } catch {}
                        autoplayMutedRef.current = false;
                    }
                } catch {}
                ensureHandlersCleared();
            };
            unmuteOnInteractHandlerRef.current = handler;
            fsOnInteractHandlerRef.current = handler;
            document.addEventListener('pointerdown', handler, { once: true });
            document.addEventListener('keydown', handler, { once: true });
        };

        // Новый порядок: выставляем целевую громкость/мьют заранее,
        // затем пробуем сперва без mute; при неудаче — с mute и откладываем размутивание
        if (autoPlay) {
            try { video.volume = isMuted ? 0 : volume; } catch {}
            try { video.muted = isMuted; } catch {}
            const tryUnmuted = video.play();
            if (tryUnmuted && typeof (tryUnmuted as any).catch === 'function') {
                (tryUnmuted as Promise<void>).then(() => {
                    console.log('[auto] ✅ play() resolved successfully (unmuted)');
                    didAutoStartRef.current = true;
                    setIsPlaying(true);
                    setIsBuffering(false); // Сбрасываем буферизацию
                    // НЕ пытаемся размутить - браузер может поставить на паузу!
                    // Размутивание только при взаимодействии пользователя
                }).catch(err => {
                    console.log('[auto] unmuted play failed, fallback to muted', err);
                    try { video.muted = true; } catch {}
                    autoplayMutedRef.current = true;
                    const tryMuted = video.play();
                    if (tryMuted && typeof (tryMuted as any).catch === 'function') {
                        (tryMuted as Promise<void>).then(() => {
                            console.log('[auto] play ok (muted)');
                            didAutoStartRef.current = true;
                            setIsPlaying(true);
                            setIsBuffering(false); // Сбрасываем буферизацию
                            if (!isMuted) registerFirstGestureHandler();
                        }).catch(() => {});
                    }
                });
            }
        }

        if (autoFullscreen) {
            const req = container?.requestFullscreen?.();
            if (req && typeof (req as any).catch === 'function') {
                (req as Promise<void>).then(() => {
                    didAutoStartRef.current = true;
                }).catch(() => {
                    autoFullscreenPendingRef.current = true;
                    registerFirstGestureHandler();
                });
            }
        }
    };

    // Демо-список серий
    const episodes = useMemo(() => {
        return Array.from({ length: 24 }, (_, i) => ({
            id: i + 1,
            title: `Серия ${i + 1}`,
            duration: '24:30'
        }));
    }, []);

    // Прогресс для плейлиста (для текущего источника/озвучки)
    const [episodeProgressMap, setEpisodeProgressMap] = useState<Record<number, { time: number; ratio: number }>>({});

    // Источник: либо передан через пропсы, либо подгружается из API по animeId+selectedSource
    const [fetchedSrc, setFetchedSrc] = useState<string | null>(null);
    const [availableVoices, setAvailableVoices] = useState<string[]>([]);
    const [playlistEpisodes, setPlaylistEpisodes] = useState<Array<{ id: number; title: string; duration?: string; raw?: unknown }>>([]);
    const [, setInitialLoading] = useState(true);
    
    // Обновление заголовка вкладки браузера
    useEffect(() => {
        const currentEp = playlistEpisodes.find(ep => ep.id === currentEpisode);
        const episodeTitle = currentEp?.title || `Эпизод ${currentEpisode}`;
        const animeTitle = animeMeta?.title || animeMeta?.name || animeMeta?.ru || 'AniCat';
        
        document.title = `${episodeTitle} | ${animeTitle}`;
        
        // Восстановление оригинального заголовка при размонтировании
        return () => {
            document.title = 'AniCat';
        };
    }, [currentEpisode, playlistEpisodes, animeMeta]);
    const [libriaQualities, setLibriaQualities] = useState<Array<{ key: string; label: string; url: string }>>([]);
    const [libriaSelectedQualityKey, setLibriaSelectedQualityKey] = useState<string | null>(null);
    const [libriaCurrentActiveKey, setLibriaCurrentActiveKey] = useState<string | null>(null);
    // Kodik quality selection derived from stream API response
    const [kodikQualities, setKodikQualities] = useState<Array<{ key: string; label: string; url: string }>>([]);
    const [kodikSelectedQualityKey, setKodikSelectedQualityKey] = useState<string | null>(null);
    const [kodikCurrentActiveKey, setKodikCurrentActiveKey] = useState<string | null>(null);
    const sourceUrl = useMemo(() => {
        return src ?? fetchedSrc ?? undefined;
    }, [src, fetchedSrc]);

    // Вспомогательная функция для получения voice в зависимости от источника
    const getVoiceForProgress = useCallback(() => {
        if (selectedSource === 'kodik') {
            return selectedKodikVoice;
        } else if (selectedSource === 'yumeko') {
            return selectedYumekoVoice?.name || null;
        }
        return null;
    }, [selectedSource, selectedKodikVoice, selectedYumekoVoice]);

    // Пересчёт карты прогресса при изменении списка серий/источника/озвучки
    useEffect(() => {
        const voice = getVoiceForProgress();
        const list = playlistEpisodes.length ? playlistEpisodes : episodes;
        const map: Record<number, { time: number; ratio: number }> = {};
        list.forEach(ep => {
            const prog = getEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: ep.id });
            if (prog && (prog.opened === true || (prog.time ?? 0) > 0 || (prog.duration ?? 0) > 0)) {
                const total = (prog.duration ?? 0) > 0 ? prog.duration : (prog.time > 0 ? prog.time : 0);
                const ratio = total > 0 ? Math.max(0, Math.min(1, prog.time / total)) : 0;
                map[ep.id] = { time: prog.time, ratio };
            }
        });
        setEpisodeProgressMap(map);
        // Try initial fetch/merge from server for this anime (fire-and-forget)
        try { fetchAndMergeFromServer(animeId); } catch {}
        // Push all local cache for this anime to server as bulk (ensure server has our local data)
        try { pushAllCacheForAnimeToServer(animeId); } catch {}
    }, [animeId, selectedSource, selectedKodikVoice, selectedYumekoVoice, playlistEpisodes, episodes, getVoiceForProgress]);

    // Восстановление времени из URL при загрузке
    useEffect(() => {
        const timeParam = animeMeta?.time;
        if (timeParam && !isNaN(Number(timeParam))) {
            const timeToSet = Number(timeParam);
            const video = videoRef.current;
            if (video && timeToSet > 0) {
                // Устанавливаем время после загрузки метаданных
                const handleLoadedMetadata = () => {
                    if (video.duration && timeToSet < video.duration) {
                        video.currentTime = timeToSet;
                        console.log('[time-restore] Set time from URL:', timeToSet);
                    }
                    video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                };
                
                if (video.readyState >= 1) {
                    // Метаданные уже загружены
                    if (video.duration && timeToSet < video.duration) {
                        video.currentTime = timeToSet;
                        console.log('[time-restore] Set time from URL (immediate):', timeToSet);
                    }
                } else {
                    video.addEventListener('loadedmetadata', handleLoadedMetadata);
                }
            }
        }
    }, [animeMeta?.time, fetchedSrc]);

    // При смене источника сбрасываем плашку возобновления, чтобы не тянуть её между источниками
    useEffect(() => {
        try { setResumePrompt(null); } catch {}
        resumeCandidateRef.current = null;
    }, [selectedSource]);

    const getEffectiveNetworkType = (): string => {
        try {
            const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
            return nav.connection?.effectiveType || '4g';
        } catch { return '4g'; }
    };

    const chooseLibriaKey = (qlist: Array<{ key: string; label: string; url: string }>) => {
        if (!qlist || !qlist.length) return null;
        const et = getEffectiveNetworkType();
        const priority = et.includes('2g') ? ['360','480','720','1080'] : et.includes('3g') ? ['480','720','1080'] : ['1080','720','480','360'];
        for (const pref of priority) {
            const found = qlist.find(q => q.key.toLowerCase().includes(pref) || q.label.toLowerCase().includes(pref));
            if (found) return found.key;
        }
        return qlist[0].key;
    };

    const getDisplayedQualityLabel = () => {
        if (selectedSource === 'libria') {
            if (libriaSelectedQualityKey === 'auto') {
                const active = libriaQualities.find(q => q.key === libriaCurrentActiveKey);
                return active ? `${active.label} (Auto)` : 'Auto';
            }
            const sel = libriaQualities.find(q => q.key === libriaSelectedQualityKey);
            return sel ? sel.label : 'Auto';
        }
        if (selectedSource === 'kodik') {
            if (kodikSelectedQualityKey === 'auto') {
                const active = kodikQualities.find(q => q.key === kodikCurrentActiveKey);
                return active ? `${active.label} (Auto)` : 'Auto';
            }
            const sel = kodikQualities.find(q => q.key === kodikSelectedQualityKey);
            return sel ? sel.label : 'Auto';
        }
        return qualityOptions.find(opt => opt.value === currentLevel)?.label || 'Auto';
    };

    // Флаг для определения, есть ли базовые параметры (для загрузки прогресса с сервера)
    const hasPlayerParamsInURL = useMemo(() => {
        // Если есть базовые параметры аниме - плеер готов загрузить прогресс с сервера
        // Для Yumeko проверяем наличие voiceId и episodeId
        return !!(animeMeta?.kodik || animeMeta?.title || (animeMeta?.source === 'yumeko' && animeMeta?.voiceId && animeMeta?.episodeId));
    }, [animeMeta]);

    useEffect(() => {
        let mounted = true;
        // Если src передан пропсом — не нужно ничего запрашивать
        if (src) return;
        if (!animeId) return;
        // Используем уже переданный animeMeta из страницы; если его нет — ждём
        if (!animeMeta) return;
        
        // Для Yumeko или Libria источника пропускаем этот useEffect полностью
        if (animeMeta.source === 'yumeko' || animeMeta.source === 'libria') {
            console.log('[Init] Yumeko/Libria source detected, skipping standard initialization');
            return;
        }
        
        // Если есть базовые параметры (kodik/title) - пропускаем обычную инициализацию
        // Вместо этого будет использоваться инициализация с прогрессом с сервера
        if (hasPlayerParamsInURL) return;
        // Сначала используем переданные meta для определения kodik/title
        (async () => {
            try {
                const meta = animeMeta;
                if (!mounted) return;

                if (selectedSource === 'kodik') {
                    const kodikTitle = meta?.kodik ?? meta?.title ?? null;
                    if (kodikTitle) {
                        console.log('[Init] Step 1: Fetching Kodik voices for:', kodikTitle);
                        
                        // ЭТАП 1: Получаем список озвучек
                        const searchRes = await fetchKodikSearch(kodikTitle);
                        const items = await fetchKodikEpisodesFromSearch(searchRes);

                        // Build map: translation/title -> episodes array
                        const map: Record<string, Array<{ id: number; title: string; duration?: string; raw?: unknown }>> = {};
                        const voicesSet = new Set<string>();

                        items.forEach((it: any) => {
                            const translations = it.translations || (it.translation ? [it.translation] : []);
                            // normalize episodes list
                            let epsArr: any[] = [];
                            if (Array.isArray(it.episodes) && it.episodes.length) epsArr = it.episodes;
                            else if (Array.isArray(it.list) && it.list.length) epsArr = it.list;
                            else if (it.seasons && it.seasons[1] && it.seasons[1].episodes) {
                                const epsObj = it.seasons[1].episodes;
                                epsArr = Object.keys(epsObj).map(k => ({ id: Number(k), url: epsObj[k] }));
                            }

                            translations.forEach((t: any) => {
                                const ttitle = t && (t.title || t.name) ? (t.title || t.name) : String(t);
                                voicesSet.add(ttitle);
                                if (!map[ttitle]) map[ttitle] = [];
                                if (epsArr && epsArr.length) {
                                    const mapped = epsArr.map((e: any, idx: number) => {
                                        const id = Number(e.id ?? e.ordinal ?? e.number ?? idx + 1);
                                        return {
                                            id,
                                            title: e.title ?? `Серия ${id}`,
                                            duration: typeof e.duration === 'number'
                                                ? formatEpisodeDurationNumber(normalizeDurationToSeconds(e.duration))
                                                : (typeof e.duration === 'string' ? e.duration : undefined),
                                            raw: e
                                        };
                                    });
                                    map[ttitle] = map[ttitle].concat(mapped);
                                }
                            });
                        });

                        const voices = Array.from(voicesSet).map(v => String(v).trim()).filter(Boolean);
                        
                        // ЭТАП 2: Устанавливаем доступные озвучки
                        setAvailableVoices(voices.length ? voices : ['Default']);
                        console.log('[Init] Step 2: Available voices loaded:', voices);
                        setKodikPlaylistMap(map);

                        // Если нет реальных озвучек, не пытаемся загружать стрим
                        if (voices.length === 0) {
                            console.log('[Init] No voices found, skipping stream fetch');
                            return;
                        }
                        
                        const defaultVoice = voices[0] ?? (items[0]?.translations?.[0]?.title) ?? null;
                        if (defaultVoice && !selectedKodikVoice && !hasPlayerParamsInURL) {
                            console.log('[Init] Step 3: Setting default voice and episodes list');
                            
                            // ЭТАП 3: Устанавливаем озвучку и список серий
                            setSelectedKodikVoice(defaultVoice);
                            const mapped = map[defaultVoice] ?? [];
                            setPlaylistEpisodes(mapped);
                            const firstId = mapped[0]?.id ?? 1;
                            setCurrentEpisode(firstId);
                            
                            console.log('[Init] Step 4: Episodes list loaded, starting stream fetch');
                            
                            // ЭТАП 4: Загружаем стрим для выбранной озвучки и серии
                            const res = await fetchKodikStream(kodikTitle, defaultVoice, firstId, true);
                            const links = res?.links as Record<string, { Src?: string }> | undefined;
                            const hlsUrl = links
                                ? (links['720']?.Src ?? links['480']?.Src ?? links['360']?.Src ?? links['240']?.Src)
                                : (res?.link ?? res?.hls ?? res?.url ?? null);
                            
                            // Store segments from Kodik response
                            if (res?.segments) {
                                setKodikSegments(res.segments);
                                // Clear previously auto-skipped segments for new episode
                                autoSkippedAdSegments.current.clear();
                            }
                            
                            console.log('[Init] Step 5: Stream loaded, setting video source');
                            if (mounted) setFetchedSrc(hlsUrl ?? null);
                        }
                    }
                } else if (selectedSource === 'libria') {
                    // Use animeId (DB id) to fetch Libria episodes instead of alias
                    const eps = await fetchLibriaEpisodes(animeId);
                    if (eps && Array.isArray(eps)) {
                        setIsLibriaAvailable(true);
                        // Use numeric ordinal as episode id (API returns UUID in `id`) to ensure numeric navigation works
                        const mapped = eps.map((e: any, idx: number) => ({
                            id: Number(e.ordinal ?? e.number ?? idx+1),
                            title: e.name ?? `Эпизод ${e.ordinal ?? e.number ?? idx+1}`,
                            duration: typeof e.duration === 'number'
                                ? formatEpisodeDurationNumber(normalizeDurationToSeconds(e.duration))
                                : (typeof e.duration === 'string' ? e.duration : undefined),
                            raw: e
                        }));
                        setPlaylistEpisodes(mapped);
                        // default to first episode for Libria only if no params for server loading
                        if (!hasPlayerParamsInURL) {
                            setCurrentEpisode(mapped[0]?.id ?? 1);
                        }

                        // qualities from first episode
                        const firstRaw = mapped[0]?.raw ?? null;
                        if (firstRaw) {
                            const keys = Object.keys(firstRaw).filter(k => /^hls_?/i.test(k));
                            const qlist = keys.map(k => ({ key: k, label: k.replace(/hls_?/i, '') + 'p', url: firstRaw[k] })).filter(q => q.url);
                            setLibriaQualities(qlist);

                            // choose default quality based on network
                            const chooseDefault = () => {
                                const et = getEffectiveNetworkType();
                                const priority = et.includes('2g') ? ['hls_360','hls_480','hls_720','hls_1080'] : et.includes('3g') ? ['hls_480','hls_720','hls_1080'] : ['hls_1080','hls_720','hls_480','hls_360'];
                                for (const pref of priority) {
                                    const found = qlist.find(q => q.key.toLowerCase().includes(pref.replace('hls_','')) || q.key.toLowerCase() === pref);
                                    if (found) return found.key;
                                }
                                return qlist[0]?.key ?? null;
                            };
                            // default to auto mode (choose best but remain in 'auto' unless user selects)
                            setLibriaSelectedQualityKey('auto');
                            const defaultKey = chooseDefault();
                            setLibriaCurrentActiveKey(defaultKey);
                            const chosen = qlist.find(q => q.key === defaultKey) ?? qlist[0];
                            if (chosen) setFetchedSrc(chosen.url);
                        }
                    }
                } else if (selectedSource === 'yumeko') {
                    // Yumeko source - загружаем озвучки и эпизоды
                    console.log('[Init] Loading Yumeko voices for anime:', animeId);
                    const voices = await fetchYumekoVoices(animeId);
                    
                    if (voices && voices.length > 0) {
                        console.log('[Init] Yumeko voices loaded:', voices);
                        setYumekoVoices(voices);
                        
                        // Если есть voiceId в meta - используем его, иначе первую озвучку
                        const targetVoice = animeMeta.voiceId 
                            ? voices.find(v => v.id === animeMeta.voiceId) || voices[0]
                            : voices[0];
                        
                        setSelectedYumekoVoice(targetVoice);
                        
                        // Загружаем эпизоды для выбранной озвучки
                        console.log('[Init] Loading Yumeko episodes for voice:', targetVoice.id);
                        const episodes = await fetchYumekoEpisodes(targetVoice.id);
                        
                        if (episodes && episodes.length > 0) {
                            console.log('[Init] Yumeko episodes loaded:', episodes);
                            setYumekoEpisodes(episodes);
                            
                            // Маппим эпизоды в формат плейлиста
                            const mapped = episodes.map(e => ({
                                id: e.episodeNumber,
                                title: e.title || `Эпизод ${e.episodeNumber}`,
                                duration: e.durationSeconds > 0 
                                    ? formatEpisodeDurationNumber(e.durationSeconds)
                                    : undefined,
                                raw: e
                            }));
                            setPlaylistEpisodes(mapped);
                            
                            // Если есть episodeNumber в meta - используем его, иначе первый эпизод
                            const targetEpisodeNumber = animeMeta.episodeNumber || episodes[0].episodeNumber;
                            const targetEpisode = episodes.find(e => e.episodeNumber === targetEpisodeNumber) || episodes[0];
                            
                            if (!hasPlayerParamsInURL) {
                                setCurrentEpisode(targetEpisodeNumber);
                            }
                            
                            // Загружаем HLS поток для выбранного эпизода
                            console.log('[Init] Loading Yumeko stream for episode:', targetEpisode.id);
                            const hlsUrl = await fetchYumekoEpisodeStream(targetEpisode.id);
                            
                            if (hlsUrl && mounted) {
                                console.log('[Init] Yumeko stream loaded:', hlsUrl);
                                setFetchedSrc(hlsUrl);
                            }
                        }
                    }
                }
                // If no playlist episodes were set (fallback), still try to fetch generic HLS
                if (!playlistEpisodes.length) {
                    const simpleHls = await fetchPlayerHls(animeId, selectedSource);
                    if (mounted) setFetchedSrc(simpleHls);
                }

                // initialLoading is controlled by presence of animeMeta (see effect below)
            } catch (err) {
                console.error('Error fetching player data', err);
            }
        })();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animeId, selectedSource, src, animeMeta]);

    // initial loading should wait for page-level animeMeta fetch
    useEffect(() => {
        if (animeMeta) {
            setInitialLoading(false);
            
            // Устанавливаем источник из animeMeta
            if (animeMeta.source === 'yumeko') {
                console.log('[Init] Setting source to Yumeko from animeMeta');
                setSelectedSource('yumeko');
            } else if (animeMeta.source === 'libria') {
                console.log('[Init] Setting source to Libria from animeMeta');
                setSelectedSource('libria');
            } else if (animeMeta.source === 'kodik') {
                console.log('[Init] Setting source to Kodik from animeMeta');
                setSelectedSource('kodik');
            }
        }
    }, [animeMeta]);

    // Последовательная инициализация плеера на основе прогресса с сервера
    useEffect(() => {
        if (!animeMeta || !hasPlayerParamsInURL || !animeId) return;
        
        console.log('[Server-init] Starting player initialization from server progress');
        
        const initializeFromServerProgress = async () => {
            try {
                // ВАЖНО: Если явно указан источник Yumeko или Libria в URL - инициализируем только его
                if (animeMeta.source === 'yumeko') {
                    console.log('[Server-init] Yumeko source detected in URL, initializing Yumeko directly');
                    setSelectedSource('yumeko');
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // ЭТАП 1: Загружаем озвучки для аниме
                    const voices = await fetchYumekoVoices(animeId);
                    
                    if (voices && voices.length > 0) {
                        setYumekoVoices(voices);
                        
                        // ЭТАП 2: Определяем целевую озвучку (из meta или первую)
                        const targetVoice = animeMeta.voiceId 
                            ? voices.find(v => v.id === animeMeta.voiceId) || voices[0]
                            : voices[0];
                        
                        setSelectedYumekoVoice(targetVoice);
                        console.log('[Server-init] Selected Yumeko voice:', targetVoice.name);
                        
                        // ЭТАП 3: Загружаем эпизоды для выбранной озвучки
                        const episodes = await fetchYumekoEpisodes(targetVoice.id);
                        
                        if (episodes && episodes.length > 0) {
                            setYumekoEpisodes(episodes);
                            
                            // Маппим эпизоды в формат плейлиста
                            const mapped = episodes.map(e => ({
                                id: e.episodeNumber,
                                title: e.title || `Эпизод ${e.episodeNumber}`,
                                duration: e.durationSeconds > 0 
                                    ? formatEpisodeDurationNumber(e.durationSeconds)
                                    : undefined,
                                raw: e
                            }));
                            setPlaylistEpisodes(mapped);
                            
                            // ЭТАП 4: Определяем целевой эпизод (из meta или первый)
                            const targetEpisodeNumber = animeMeta.episodeNumber || episodes[0].episodeNumber;
                            const targetEpisode = episodes.find(e => e.episodeNumber === targetEpisodeNumber) || episodes[0];
                            
                            setCurrentEpisode(targetEpisodeNumber);
                            console.log('[Server-init] Selected Yumeko episode:', targetEpisodeNumber);
                            
                            // ЭТАП 5: Загружаем HLS поток для выбранного эпизода
                            const hlsUrl = await fetchYumekoEpisodeStream(targetEpisode.id);
                            
                            if (hlsUrl) {
                                console.log('[Server-init] Yumeko stream loaded from backend API');
                                setFetchedSrc(hlsUrl);
                                
                                // ЭТАП 6: Включаем автозапуск
                                setAutoPlay(true);
                                setResumePrompt(null);
                                resumeCandidateRef.current = null;
                            }
                        }
                    }
                    
                    return;
                }
                
                // 1. Получаем последний прогресс с сервера (только для Kodik/Libria)
                const lastProgress = await fetchLastWatchedProgress(animeId);
                console.log('[Server-init] Fetched last progress from server:', lastProgress);
                
                // 2. Если прогресс найден - используем его для инициализации
                if (lastProgress && lastProgress.source) {
                    const targetSource = lastProgress.source as 'kodik' | 'libria' | 'yumeko';
                    console.log('[Server-init] Setting source from progress:', targetSource);
                    setSelectedSource(targetSource);
                    
                    // Ждем немного чтобы источник установился
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // 3. Если Kodik - получаем список озвучек и устанавливаем нужную
                    if (targetSource === 'kodik') {
                        const kodikTitle = animeMeta?.kodik ?? animeMeta?.title ?? null;
                        if (kodikTitle) {
                            console.log('[Server-init] Step 1: Fetching Kodik voices for:', kodikTitle);
                            
                            // ЭТАП 1: Получаем список озвучек
                            const searchRes = await fetchKodikSearch(kodikTitle);
                            const items = await fetchKodikEpisodesFromSearch(searchRes);

                            // Build map: translation/title -> episodes array
                            const map: Record<string, Array<{ id: number; title: string; duration?: string; raw?: unknown }>> = {};
                            const voicesSet = new Set<string>();

                            items.forEach((it: any) => {
                                const translations = it.translations || (it.translation ? [it.translation] : []);
                                let epsArr: any[] = [];
                                if (Array.isArray(it.episodes) && it.episodes.length) epsArr = it.episodes;
                                else if (Array.isArray(it.list) && it.list.length) epsArr = it.list;
                                else if (it.seasons && it.seasons[1] && it.seasons[1].episodes) {
                                    const epsObj = it.seasons[1].episodes;
                                    epsArr = Object.keys(epsObj).map(k => ({ id: Number(k), url: epsObj[k] }));
                                }

                                translations.forEach((t: any) => {
                                    const ttitle = t && (t.title || t.name) ? (t.title || t.name) : String(t);
                                    voicesSet.add(ttitle);
                                    if (!map[ttitle]) map[ttitle] = [];
                                    if (epsArr && epsArr.length) {
                                        const mapped = epsArr.map((e: any, idx: number) => {
                                            const id = Number(e.id ?? e.ordinal ?? e.number ?? idx + 1);
                                            return {
                                                id,
                                                title: e.title ?? `Серия ${id}`,
                                                duration: typeof e.duration === 'number'
                                                    ? formatEpisodeDurationNumber(normalizeDurationToSeconds(e.duration))
                                                    : (typeof e.duration === 'string' ? e.duration : undefined),
                                                raw: e
                                            };
                                        });
                                        map[ttitle] = map[ttitle].concat(mapped);
                                    }
                                });
                            });

                            const voices = Array.from(voicesSet).map(v => String(v).trim()).filter(Boolean);
                            console.log('[Server-init] Step 2: Available voices loaded:', voices);

                            // Если нет реальных озвучек, не пытаемся загружать стрим
                            if (voices.length === 0) {
                                console.log('[Server-init] No voices found, skipping stream fetch');
                                return;
                            }

                            // ЭТАП 2: Устанавливаем доступные озвучки
                            setAvailableVoices(voices.length ? voices : ['Default']);
                            setKodikPlaylistMap(map);

                            // ЭТАП 3: Устанавливаем озвучку из прогресса
                            let targetVoice = lastProgress.voice || null;
                            if (!targetVoice || !voices.includes(targetVoice)) {
                                targetVoice = voices[0] ?? null;
                                console.log('[Server-init] Step 3: Voice not found in progress, using fallback:', targetVoice);
                            } else {
                                console.log('[Server-init] Step 3: Using voice from progress:', targetVoice);
                            }
                            
                            if (!targetVoice) {
                                console.log('[Server-init] No valid voice found, skipping stream fetch');
                                return;
                            }
                            
                            const mapped = map[targetVoice] ?? [];
                            
                            // ЭТАП 4: Устанавливаем выбранную озвучку и список серий
                            setSelectedKodikVoice(targetVoice);
                            setPlaylistEpisodes(mapped);

                            // ЭТАП 5: Устанавливаем серию из прогресса
                            const targetEpisode = lastProgress.episodeId || mapped[0]?.id || 1;
                            console.log('[Server-init] Step 4: Episodes list loaded, using episode from progress:', targetEpisode);
                            setCurrentEpisode(targetEpisode);

                            // ЭТАП 6: Загружаем стрим для выбранной озвучки и серии
                            console.log('[Server-init] Step 5: Starting stream fetch for voice:', targetVoice, 'episode:', targetEpisode);
                            const res = await fetchKodikStream(kodikTitle, targetVoice, targetEpisode, true);
                            
                            if (res?.segments) {
                                setKodikSegments(res.segments);
                                autoSkippedAdSegments.current.clear();
                            }

                            // Build qualities from API response
                            if (res && res.links) {
                                const links = res.links as Record<string, { Src?: string }>;
                                const qlist: Array<{ key: string; label: string; url: string }> = Object.keys(links)
                                    .filter(k => links[k]?.Src)
                                    .map(k => ({ key: k, label: `${k}p`, url: links[k].Src! }));
                                
                                setKodikQualities(qlist);
                                
                                if (qlist.length > 0) {
                                    setKodikSelectedQualityKey('auto');
                                    setKodikCurrentActiveKey(qlist[0].key);
                                    setFetchedSrc(qlist[0].url);
                                }
                            }

                            // ЭТАП 7: Включаем автозапуск и отключаем плашку возобновления
                            console.log('[Server-init] Step 6: Stream loaded, enabling autoplay');
                            setAutoPlay(true);
                            setResumePrompt(null);
                            resumeCandidateRef.current = null;
                        }
                    } else if (targetSource === 'libria') {
                        console.log('[Server-init] Step 1: Initializing Libria from server progress');
                        
                        // ЭТАП 1: Инициализируем Libria эпизоды
                        const eps = await fetchLibriaEpisodes(animeId);
                        if (eps && Array.isArray(eps)) {
                            setIsLibriaAvailable(true);
                            const mapped = eps.map((e: any, idx: number) => ({
                                id: Number(e.ordinal ?? e.number ?? idx + 1),
                                title: e.name ?? `Эпизод ${e.ordinal ?? e.number ?? idx + 1}`,
                                duration: typeof e.duration === 'number'
                                    ? formatEpisodeDurationNumber(normalizeDurationToSeconds(e.duration))
                                    : (typeof e.duration === 'string' ? e.duration : undefined),
                                raw: e
                            }));
                            setPlaylistEpisodes(mapped);
                            
                            // ЭТАП 2: Устанавливаем серию из прогресса
                            const targetEpisode = lastProgress.episodeId || mapped[0]?.id || 1;
                            console.log('[Server-init] Step 2: Setting Libria episode from progress:', targetEpisode);
                            setCurrentEpisode(targetEpisode);
                            
                            // ЭТАП 3: Настраиваем качества и стрим
                            const firstRaw = mapped.find(ep => ep.id === targetEpisode)?.raw ?? mapped[0]?.raw ?? null;
                            if (firstRaw) {
                                const fr = firstRaw as Record<string, unknown>;
                                const keys = Object.keys(fr).filter(k => /^hls_?/i.test(k));
                                const qlist = keys.map(k => ({ key: k, label: k.replace(/hls_?/i, '') + 'p', url: fr[k] as string })).filter(q => q.url);
                                setLibriaQualities(qlist);
                                setLibriaSelectedQualityKey('auto');
                                const defaultKey = qlist.find(q => /1080|720/.test(q.label))?.key ?? qlist[0]?.key ?? null;
                                setLibriaCurrentActiveKey(defaultKey);
                                const chosen = qlist.find(q => q.key === defaultKey) ?? qlist[0];
                                if (chosen) setFetchedSrc(chosen.url);
                            }
                            
                            // ЭТАП 4: Включаем автозапуск и отключаем плашку возобновления
                            console.log('[Server-init] Step 3: Libria initialized, enabling autoplay');
                            setAutoPlay(true);
                            setResumePrompt(null);
                            resumeCandidateRef.current = null;
                        } else {
                            console.log('[Server-init] Libria episodes not available, falling back to Kodik');
                            setSelectedSource('kodik');
                        }
                    } else if (targetSource === 'yumeko') {
                        console.log('[Server-init] Step 1: Initializing Yumeko from server progress or URL params');
                        
                        // ЭТАП 1: Загружаем озвучки для аниме
                        const voices = await fetchYumekoVoices(animeId);
                        
                        if (voices && voices.length > 0) {
                            setYumekoVoices(voices);
                            
                            // ЭТАП 2: Определяем целевую озвучку (из meta или из прогресса)
                            let targetVoice: YumekoVoice | null = null;
                            if (animeMeta.voiceId) {
                                targetVoice = voices.find(v => v.id === animeMeta.voiceId) || null;
                            }
                            if (!targetVoice && lastProgress.voice) {
                                // Попробуем найти по имени из прогресса
                                targetVoice = voices.find(v => v.name === lastProgress.voice) || null;
                            }
                            if (!targetVoice) {
                                targetVoice = voices[0];
                            }
                            
                            setSelectedYumekoVoice(targetVoice);
                            console.log('[Server-init] Step 2: Selected Yumeko voice:', targetVoice.name);
                            
                            // ЭТАП 3: Загружаем эпизоды для выбранной озвучки
                            const episodes = await fetchYumekoEpisodes(targetVoice.id);
                            
                            if (episodes && episodes.length > 0) {
                                setYumekoEpisodes(episodes);
                                
                                // Маппим эпизоды в формат плейлиста
                                const mapped = episodes.map(e => ({
                                    id: e.episodeNumber,
                                    title: e.title || `Эпизод ${e.episodeNumber}`,
                                    duration: e.durationSeconds > 0 
                                        ? formatEpisodeDurationNumber(e.durationSeconds)
                                        : undefined,
                                    raw: e
                                }));
                                setPlaylistEpisodes(mapped);
                                
                                // ЭТАП 4: Определяем целевой эпизод (из meta или из прогресса)
                                let targetEpisodeNumber = 1;
                                if (animeMeta.episodeNumber) {
                                    targetEpisodeNumber = animeMeta.episodeNumber;
                                } else if (lastProgress.episodeId) {
                                    targetEpisodeNumber = lastProgress.episodeId;
                                }
                                
                                const targetEpisode = episodes.find(e => e.episodeNumber === targetEpisodeNumber) || episodes[0];
                                setCurrentEpisode(targetEpisodeNumber);
                                console.log('[Server-init] Step 3: Selected Yumeko episode:', targetEpisodeNumber);
                                
                                // ЭТАП 5: Загружаем HLS поток для выбранного эпизода
                                const hlsUrl = await fetchYumekoEpisodeStream(targetEpisode.id);
                                
                                if (hlsUrl) {
                                    console.log('[Server-init] Step 4: Yumeko stream loaded');
                                    setFetchedSrc(hlsUrl);
                                    
                                    // ЭТАП 6: Включаем автозапуск и отключаем плашку возобновления
                                    setAutoPlay(true);
                                    setResumePrompt(null);
                                    resumeCandidateRef.current = null;
                                }
                            }
                        }
                    }
                } else {
                    // Если прогресс не найден - инициализируем обычным образом (первая серия, первая озвучка)
                    console.log('[Server-init] No progress found, initializing with default settings');
                    
                    // Устанавливаем источник по умолчанию (из meta или Kodik)
                    const defaultSource = (animeMeta.source || 'kodik') as 'kodik' | 'libria' | 'yumeko';
                    setSelectedSource(defaultSource);
                    
                    // Ждем немного чтобы источник установился
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Для Yumeko - инициализируем из параметров URL
                    if (defaultSource === 'yumeko') {
                        console.log('[Server-init] Initializing Yumeko from URL params');
                        
                        // Загружаем озвучки
                        const voices = await fetchYumekoVoices(animeId);
                        
                        if (voices && voices.length > 0) {
                            setYumekoVoices(voices);
                            
                            // Определяем целевую озвучку (из meta или первую)
                            const targetVoice = animeMeta.voiceId 
                                ? voices.find(v => v.id === animeMeta.voiceId) || voices[0]
                                : voices[0];
                            
                            setSelectedYumekoVoice(targetVoice);
                            console.log('[Server-init] Selected Yumeko voice:', targetVoice.name);
                            
                            // Загружаем эпизоды
                            const episodes = await fetchYumekoEpisodes(targetVoice.id);
                            
                            if (episodes && episodes.length > 0) {
                                setYumekoEpisodes(episodes);
                                
                                // Маппим эпизоды в формат плейлиста
                                const mapped = episodes.map(e => ({
                                    id: e.episodeNumber,
                                    title: e.title || `Эпизод ${e.episodeNumber}`,
                                    duration: e.durationSeconds > 0 
                                        ? formatEpisodeDurationNumber(e.durationSeconds)
                                        : undefined,
                                    raw: e
                                }));
                                setPlaylistEpisodes(mapped);
                                
                                // Определяем целевой эпизод (из meta или первый)
                                const targetEpisodeNumber = animeMeta.episodeNumber || episodes[0].episodeNumber;
                                const targetEpisode = episodes.find(e => e.episodeNumber === targetEpisodeNumber) || episodes[0];
                                
                                setCurrentEpisode(targetEpisodeNumber);
                                console.log('[Server-init] Selected Yumeko episode:', targetEpisodeNumber);
                                
                                // Загружаем HLS поток
                                const hlsUrl = await fetchYumekoEpisodeStream(targetEpisode.id);
                                
                                if (hlsUrl) {
                                    console.log('[Server-init] Yumeko stream loaded:', hlsUrl);
                                    setFetchedSrc(hlsUrl);
                                }
                            }
                        }
                        
                        return;
                    }
                    
                    // Инициализируем Kodik с параметрами из URL
                    const kodikTitle = animeMeta?.kodik ?? animeMeta?.title ?? null;
                    if (kodikTitle) {
                        console.log('[Server-init] Step 1: Fetching Kodik voices for:', kodikTitle);
                        
                        // ЭТАП 1: Получаем список озвучек
                        const searchRes = await fetchKodikSearch(kodikTitle);
                        const items = await fetchKodikEpisodesFromSearch(searchRes);

                        // Build map: translation/title -> episodes array
                        const map: Record<string, Array<{ id: number; title: string; duration?: string; raw?: unknown }>> = {};
                        const voicesSet = new Set<string>();

                        items.forEach((it: any) => {
                            const translations = it.translations || (it.translation ? [it.translation] : []);
                            let epsArr: any[] = [];
                            if (Array.isArray(it.episodes) && it.episodes.length) epsArr = it.episodes;
                            else if (Array.isArray(it.list) && it.list.length) epsArr = it.list;
                            else if (it.seasons && it.seasons[1] && it.seasons[1].episodes) {
                                const epsObj = it.seasons[1].episodes;
                                epsArr = Object.keys(epsObj).map(k => ({ id: Number(k), url: epsObj[k] }));
                            }

                            translations.forEach((t: any) => {
                                const ttitle = t && (t.title || t.name) ? (t.title || t.name) : String(t);
                                voicesSet.add(ttitle);
                                if (!map[ttitle]) map[ttitle] = [];
                                if (epsArr && epsArr.length) {
                                    const mapped = epsArr.map((e: any, idx: number) => {
                                        const id = Number(e.id ?? e.ordinal ?? e.number ?? idx + 1);
                                        return {
                                            id,
                                            title: e.title ?? `Серия ${id}`,
                                            duration: typeof e.duration === 'number'
                                                ? formatEpisodeDurationNumber(normalizeDurationToSeconds(e.duration))
                                                : (typeof e.duration === 'string' ? e.duration : undefined),
                                            raw: e
                                        };
                                    });
                                    map[ttitle] = map[ttitle].concat(mapped);
                                }
                            });
                        });

                        const voices = Array.from(voicesSet).map(v => String(v).trim()).filter(Boolean);
                        console.log('[Server-init] Step 2: Available voices loaded:', voices);

                        // Если нет реальных озвучек, не пытаемся загружать стрим
                        if (voices.length === 0) {
                            console.log('[Server-init] No voices found, skipping stream fetch');
                            return;
                        }

                        // ЭТАП 2: Устанавливаем доступные озвучки
                        setAvailableVoices(voices.length ? voices : ['Default']);
                        setKodikPlaylistMap(map);

                        // ЭТАП 3: Устанавливаем первую доступную озвучку и список серий
                        const defaultVoice = voices[0] ?? null;
                        if (defaultVoice) {
                            console.log('[Server-init] Step 3: Setting default voice and episodes list');
                            
                            setSelectedKodikVoice(defaultVoice);
                            const mapped = map[defaultVoice] ?? [];
                            setPlaylistEpisodes(mapped);
                            const firstId = mapped[0]?.id ?? 1;
                            setCurrentEpisode(firstId);
                            
                            console.log('[Server-init] Step 4: Episodes list loaded, starting stream fetch');
                            
                            // ЭТАП 4: Загружаем стрим для выбранной озвучки и серии
                            const res = await fetchKodikStream(kodikTitle, defaultVoice, firstId, true);
                            const links = res?.links as Record<string, { Src?: string }> | undefined;
                            const hlsUrl = links
                                ? (links['720']?.Src ?? links['480']?.Src ?? links['360']?.Src ?? links['240']?.Src)
                                : (res?.link ?? res?.hls ?? res?.url ?? null);
                            
                            // Store segments from Kodik response
                            if (res?.segments) {
                                setKodikSegments(res.segments);
                                autoSkippedAdSegments.current.clear();
                            }
                            
                            console.log('[Server-init] Step 5: Stream loaded, setting video source');
                            setFetchedSrc(hlsUrl ?? null);
                        }
                    } else {
                        // Если нет Kodik параметров, пробуем Libria
                        console.log('[Server-init] No Kodik params, trying Libria initialization');
                        try {
                            const eps = await fetchLibriaEpisodes(animeId);
                            if (eps && Array.isArray(eps)) {
                                setIsLibriaAvailable(true);
                                const mapped = eps.map((e: any, idx: number) => ({
                                    id: Number(e.ordinal ?? e.number ?? idx + 1),
                                    title: e.name ?? `Эпизод ${e.ordinal ?? e.number ?? idx + 1}`,
                                    duration: typeof e.duration === 'number'
                                        ? formatEpisodeDurationNumber(normalizeDurationToSeconds(e.duration))
                                        : (typeof e.duration === 'string' ? e.duration : undefined),
                                    raw: e
                                }));
                                setPlaylistEpisodes(mapped);
                                setCurrentEpisode(mapped[0]?.id ?? 1);
                                
                                const firstRaw = mapped[0]?.raw ?? null;
                                if (firstRaw) {
                                    const fr = firstRaw as Record<string, unknown>;
                                    const keys = Object.keys(fr).filter(k => /^hls_?/i.test(k));
                                    const qlist = keys.map(k => ({ key: k, label: k.replace(/hls_?/i, '') + 'p', url: fr[k] as string })).filter(q => q.url);
                                    setLibriaQualities(qlist);
                                    setLibriaSelectedQualityKey('auto');
                                    const defaultKey = qlist.find(q => /1080|720/.test(q.label))?.key ?? qlist[0]?.key ?? null;
                                    setLibriaCurrentActiveKey(defaultKey);
                                    const chosen = qlist.find(q => q.key === defaultKey) ?? qlist[0];
                                    if (chosen) setFetchedSrc(chosen.url);
                                }
                            }
                        } catch (e) {
                            console.warn('[Server-init] Libria bootstrap failed:', e);
                        }
                    }
                }
            } catch (error) {
                console.error('[Server-init] Error during initialization:', error);
            }
        };

        initializeFromServerProgress();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animeMeta, hasPlayerParamsInURL, animeId]);

    // Debug logs for voice/menu state to diagnose click/selection issues
    useEffect(() => {
        console.log('Player dropdown/state:', { selectedSource, showSourceDropdown, selectedKodikVoice, availableVoices });
    }, [selectedSource, showSourceDropdown, selectedKodikVoice, availableVoices]);

    // Проверка доступности источника Libria, чтобы скрывать его из выбора при отсутствии
    useEffect(() => {
        let mounted = true;
        // обновляем карту прогресса при изменении плейлиста/озвучки/источника
        const voice = getVoiceForProgress();
        const list = playlistEpisodes.length ? playlistEpisodes : episodes;
        const map: Record<number, { time: number; ratio: number }> = {};
        list.forEach(ep => {
            const prog = getEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: ep.id });
            if (prog && prog.duration > 0) {
                const ratio = Math.max(0, Math.min(1, prog.time / prog.duration));
                map[ep.id] = { time: prog.time, ratio };
            }
        });
        setEpisodeProgressMap(map);
        (async () => {
            if (!animeId) return;
            
            // Для Yumeko источника не проверяем доступность Libria
            if (selectedSource === 'yumeko') {
                console.log('[Libria-Check] Skipping Libria availability check for Yumeko source');
                return;
            }
            
            try {
                const eps = await fetchLibriaEpisodes(animeId);
                const available = Array.isArray(eps) && eps.length > 0;
                if (!mounted) return;
                setIsLibriaAvailable(available);
                if (!available && selectedSource === 'libria') {
                    setSelectedSource('kodik');
                }
            } catch {
                if (!mounted) return;
                setIsLibriaAvailable(false);
                if (selectedSource === 'libria') {
                    setSelectedSource('kodik');
                }
            }
        })();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animeId, selectedSource]);

    // Реинициализация источника при переключении
    useEffect(() => {
        let mounted = true;
        
        const reinitializeSource = async () => {
            if (!animeId || !animeMeta) return;
            
            // Если в URL явно указан источник Yumeko или Libria - не пытаемся переключиться на другие
            if ((animeMeta.source === 'yumeko' && selectedSource !== 'yumeko') || 
                (animeMeta.source === 'libria' && selectedSource !== 'libria') ||
                (animeMeta.source === 'kodik' && selectedSource !== 'kodik')) {
                console.log('[Source-Switch] Skipping reinit - source is set in URL');
                return;
            }
            
            console.log('[Source-Switch] Reinitializing source:', selectedSource);
            
            // Пауза плеера на время переключения
            try { videoRef.current?.pause(); } catch {}
            setIsPlaying(false);
            setIsBuffering(true);
            
            if (selectedSource === 'kodik') {
                // Реинициализация Kodik
                console.log('[Source-Switch] Reinitializing Kodik');
                const kodikTitle = animeMeta.kodik || animeMeta.title;
                if (!kodikTitle) return;
                
                try {
                    // ЭТАП 1: Получаем озвучки
                    const searchRes = await fetchKodikSearch(kodikTitle);
                    const items = await fetchKodikEpisodesFromSearch(searchRes);
                    if (!mounted) return;
                    
                    // Build map: translation/title -> episodes array
                    const map: Record<string, Array<{ id: number; title: string; duration?: string; raw?: unknown }>> = {};
                    const voicesSet = new Set<string>();

                    items.forEach((it: any) => {
                        const translations = it.translations || (it.translation ? [it.translation] : []);
                        // normalize episodes list
                        let epsArr: any[] = [];
                        if (it.episodes_list) {
                            epsArr = it.episodes_list;
                        } else if (it.episodes_count) {
                            epsArr = Array.from({ length: it.episodes_count }, (_, i) => ({ number: i + 1 }));
                        } else if (it.last_episode) {
                            epsArr = Array.from({ length: it.last_episode }, (_, i) => ({ number: i + 1 }));
                        }

                        translations.forEach((trans: any) => {
                            const title = typeof trans === 'object' && trans.title ? trans.title : (typeof trans === 'string' ? trans : null);
                            if (!title) return;
                            voicesSet.add(title);
                            if (!map[title]) map[title] = [];
                            epsArr.forEach((ep: any) => {
                                const epNum = ep.number ?? ep.episode ?? ep.id ?? 1;
                                const existing = map[title].find(e => e.id === Number(epNum));
                                if (!existing) {
                                    map[title].push({ id: Number(epNum), title: `Эпизод ${epNum}`, raw: it });
                                }
                            });
                        });
                    });

                    const voices = Array.from(voicesSet);
                    
                    if (voices.length === 0) {
                        console.log('[Source-Switch] No Kodik voices found');
                        setIsBuffering(false);
                        return;
                    }
                    
                    // ЭТАП 2: Устанавливаем озвучки и плейлист
                    setAvailableVoices(voices);
                    setKodikPlaylistMap(map);
                    
                    // ЭТАП 3: Выбираем первую озвучку и эпизоды
                    const firstVoice = voices[0];
                    setSelectedKodikVoice(firstVoice);
                    const episodes = map[firstVoice] || [];
                    setPlaylistEpisodes(episodes);
                    
                    // ЭТАП 4: Устанавливаем первый эпизод
                    const firstEpisode = episodes[0]?.id || 1;
                    setCurrentEpisode(firstEpisode);
                    
                    // ЭТАП 5: Загружаем стрим
                    const res = await fetchKodikStream(kodikTitle, firstVoice, firstEpisode, false);
                    if (!mounted) return;
                    
                    if (res?.segments) {
                        setKodikSegments(res.segments);
                        autoSkippedAdSegments.current.clear();
                    }
                    
                    const hlsUrl = res ? (res.links ? (((res.links as Record<string, unknown>)['720'] as Record<string, unknown>)?.['Src'] as string ?? ((res.links as Record<string, unknown>)['480'] as Record<string, unknown>)?.['Src'] as string) : (res.link ?? res.hls ?? res.url ?? null)) : null;
                    
                    setFetchedSrc(hlsUrl ?? null);
                    setIsBuffering(false);
                    console.log('[Source-Switch] Kodik reinitialized successfully');
                } catch (error) {
                    console.error('[Source-Switch] Kodik reinit error:', error);
                    setIsBuffering(false);
                }
            } else if (selectedSource === 'libria') {
                // Реинициализация Libria
                console.log('[Source-Switch] Reinitializing Libria');
                
                try {
                    const eps = await fetchLibriaEpisodes(animeId);
                    if (!mounted) return;
                    
                    if (!eps || !Array.isArray(eps)) {
                        console.log('[Source-Switch] No Libria episodes found');
                        setIsLibriaAvailable(false);
                        setSelectedSource('kodik');
                        return;
                    }
                    
                    setIsLibriaAvailable(true);
                    const mapped = eps.map((e: any, idx: number) => ({
                        id: Number(e.ordinal ?? e.number ?? idx + 1),
                        title: e.name ?? `Эпизод ${e.ordinal ?? e.number ?? idx + 1}`,
                        duration: typeof e.duration === 'number'
                            ? formatEpisodeDurationNumber(normalizeDurationToSeconds(e.duration))
                            : (typeof e.duration === 'string' ? e.duration : undefined),
                        raw: e
                    }));
                    setPlaylistEpisodes(mapped);
                    
                    // Устанавливаем первый эпизод
                    const firstEpisode = mapped[0]?.id || 1;
                    setCurrentEpisode(firstEpisode);
                    
                    // Настраиваем качества и стрим
                    const firstRaw = mapped[0]?.raw ?? null;
                    if (firstRaw) {
                        const fr = firstRaw as Record<string, unknown>;
                        const keys = Object.keys(fr).filter(k => /^hls_?/i.test(k));
                        const qlist = keys.map(k => ({ key: k, label: k.replace(/hls_?/i, '') + 'p', url: fr[k] as string })).filter(q => q.url);
                        setLibriaQualities(qlist);
                        setLibriaSelectedQualityKey('auto');
                        const defaultKey = qlist.find(q => /1080|720/.test(q.label))?.key ?? qlist[0]?.key ?? null;
                        setLibriaCurrentActiveKey(defaultKey);
                        const chosen = qlist.find(q => q.key === defaultKey) ?? qlist[0];
                        if (chosen) {
                            setFetchedSrc(chosen.url);
                            setIsBuffering(false);
                            console.log('[Source-Switch] Libria reinitialized successfully');
                        }
                    }
                } catch (error) {
                    console.error('[Source-Switch] Libria reinit error:', error);
                    setIsBuffering(false);
                }
            } else if (selectedSource === 'yumeko') {
                // Реинициализация Yumeko
                console.log('[Source-Switch] Reinitializing Yumeko');
                
                try {
                    // ЭТАП 1: Загружаем озвучки
                    const voices = await fetchYumekoVoices(animeId);
                    if (!mounted) return;
                    
                    if (!voices || voices.length === 0) {
                        console.log('[Source-Switch] No Yumeko voices found');
                        setIsBuffering(false);
                        return;
                    }
                    
                    setYumekoVoices(voices);
                    
                    // ЭТАП 2: Выбираем первую озвучку (или из animeMeta если есть)
                    const targetVoice = animeMeta.voiceId 
                        ? voices.find(v => v.id === animeMeta.voiceId) || voices[0]
                        : voices[0];
                    
                    setSelectedYumekoVoice(targetVoice);
                    
                    // ЭТАП 3: Загружаем эпизоды для выбранной озвучки
                    const episodes = await fetchYumekoEpisodes(targetVoice.id);
                    if (!mounted) return;
                    
                    if (!episodes || episodes.length === 0) {
                        console.log('[Source-Switch] No Yumeko episodes found');
                        setIsBuffering(false);
                        return;
                    }
                    
                    setYumekoEpisodes(episodes);
                    
                    // ЭТАП 4: Маппим эпизоды в формат плейлиста
                    const mapped = episodes.map(e => ({
                        id: e.episodeNumber,
                        title: e.title || `Эпизод ${e.episodeNumber}`,
                        duration: e.durationSeconds > 0 
                            ? formatEpisodeDurationNumber(e.durationSeconds)
                            : undefined,
                        raw: e
                    }));
                    setPlaylistEpisodes(mapped);
                    
                    // ЭТАП 5: Устанавливаем первый эпизод (или из animeMeta если есть)
                    const targetEpisodeNumber = animeMeta.episodeNumber || episodes[0].episodeNumber;
                    const targetEpisode = episodes.find(e => e.episodeNumber === targetEpisodeNumber) || episodes[0];
                    setCurrentEpisode(targetEpisodeNumber);
                    
                    // ЭТАП 6: Загружаем HLS поток
                    const hlsUrl = await fetchYumekoEpisodeStream(targetEpisode.id);
                    if (!mounted) return;
                    
                    if (hlsUrl) {
                        setFetchedSrc(hlsUrl);
                        setIsBuffering(false);
                        console.log('[Source-Switch] Yumeko reinitialized successfully');
                    } else {
                        console.error('[Source-Switch] Failed to load Yumeko stream');
                        setIsBuffering(false);
                    }
                } catch (error) {
                    console.error('[Source-Switch] Yumeko reinit error:', error);
                    setIsBuffering(false);
                }
            }
        };
        
        reinitializeSource();
        
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSource]);

    // react to currentEpisode changes (especially for libria)
    useEffect(() => {
        // ВАЖНО: Сбрасываем флаги при смене эпизода
        didAutoStartRef.current = false;
        onLoadedProcessedRef.current = false;
        
        let mounted = true;
        (async () => {
            if (!animeId) return;
            // interrupt current playback ТОЛЬКО если это переключение эпизода, а не первая загрузка
            console.log('[Episode-Switch] currentEpisode changed:', currentEpisode, 'isSwitching:', isEpisodeSwitchingRef.current);
            if (isEpisodeSwitchingRef.current) {
                console.log('[Episode-Switch] Pausing video for episode switch');
                try { videoRef.current?.pause(); } catch {}
                setIsPlaying(false);
            }
            setIsBuffering(true);
            if (selectedSource === 'libria') {
                const ep = playlistEpisodes.find(p => p.id === currentEpisode) ?? playlistEpisodes[0];
                if (!ep) return;
                const raw = (ep.raw ?? {}) as Record<string, string>;
                // collect available hls keys for this episode
                const epKeys = Object.keys(raw).filter(k => /^hls_?/i.test(k));

                // if user selected explicit quality (not auto)
                if (libriaSelectedQualityKey && libriaSelectedQualityKey !== 'auto') {
                    if (libriaSelectedQualityKey && raw[libriaSelectedQualityKey]) {
                        if (mounted) setFetchedSrc(raw[libriaSelectedQualityKey]);
                        // remember active
                        setLibriaCurrentActiveKey(libriaSelectedQualityKey);
                        return;
                    }
                    // selected key not present for this episode -> fall back to auto
                    setLibriaSelectedQualityKey('auto');
                }

                // Auto mode or fallback: choose best quality for this episode
                const chooseForEpisode = () => {
                    if (!epKeys.length) return null;
                    const et = getEffectiveNetworkType();
                    const priority = et.includes('2g') ? ['360','480','720','1080'] : et.includes('3g') ? ['480','720','1080'] : ['1080','720','480','360'];
                    for (const pref of priority) {
                        const key = epKeys.find(k => k.toLowerCase().includes(pref) || k.toLowerCase().includes(pref.replace('p','')) );
                        if (key && raw[key]) return key;
                    }
                    return epKeys[0];
                };

                const chosenKey = chooseForEpisode();
                if (chosenKey) {
                    setLibriaCurrentActiveKey(chosenKey);
                    if (mounted) setFetchedSrc(raw[chosenKey]);
                }
            } else if (selectedSource === 'kodik') {
                // For kodik, use selected voice and re-fetch stream for selected episode
                const meta = animeMeta;
                const kodikTitle = meta?.kodik ?? meta?.title ?? '';
                const chosenVoice = selectedKodikVoice && availableVoices.includes(selectedKodikVoice)
                    ? selectedKodikVoice
                    : availableVoices[0];
                const epNumber = typeof currentEpisode === 'number' ? currentEpisode : Number(currentEpisode);
                if (kodikTitle && epNumber && chosenVoice) {
                    const res = await fetchKodikStream(kodikTitle, chosenVoice, epNumber, true);
                    
                    // Store segments from Kodik response
                    if (res?.segments) {
                        setKodikSegments(res.segments);
                        // Clear previously auto-skipped segments for new episode
                        autoSkippedAdSegments.current.clear();
                    }
                    
                    // Build qualities from API response
                    if (res && res.links) {
                        const links = res.links as Record<string, { Src?: string }>;
                        const qlist: Array<{ key: string; label: string; url: string }> = Object.keys(links)
                            .sort((a,b) => Number(b) - Number(a))
                            .map(k => ({ key: k, label: `${k}p`, url: links[k]?.Src || '' }))
                            .filter(q => !!q.url);
                        setKodikQualities(qlist);
                        // Сохраняем выбор качества пользователя, если он уже был
                        if (kodikSelectedQualityKey && kodikSelectedQualityKey !== 'auto') {
                            const chosen = qlist.find(q => q.key === kodikSelectedQualityKey);
                            if (chosen) {
                                setFetchedSrc(chosen.url);
                                setKodikCurrentActiveKey(chosen.key);
                            } else {
                                setKodikSelectedQualityKey('auto');
                                setKodikCurrentActiveKey(qlist[0]?.key ?? null);
                            }
                        } else {
                            setKodikSelectedQualityKey('auto');
                            setKodikCurrentActiveKey(qlist[0]?.key ?? null);
                        }
                    } else {
                        setKodikQualities([]);
                        setKodikSelectedQualityKey(null);
                        setKodikCurrentActiveKey(null);
                    }
                    const links = res?.links as Record<string, { Src?: string }> | undefined;
                    // Если пользователь выбрал конкретное качество — приоритет ему
                    if (kodikSelectedQualityKey && kodikSelectedQualityKey !== 'auto' && links && links[kodikSelectedQualityKey]?.Src) {
                        setFetchedSrc(links[kodikSelectedQualityKey].Src!);
                    } else {
                        const hlsUrl = links
                            ? (links['720']?.Src ?? links['480']?.Src ?? links['360']?.Src ?? links['240']?.Src)
                            : (res?.link ?? res?.hls ?? res?.url ?? null);
                        if (mounted) setFetchedSrc(hlsUrl ?? null);
                    }
                }
            } else if (selectedSource === 'yumeko') {
                // For yumeko, load stream for selected episode
                const ep = playlistEpisodes.find(p => p.id === currentEpisode);
                if (!ep || !ep.raw) return;
                
                const yumekoEp = ep.raw as YumekoEpisode;
                const hlsUrl = await fetchYumekoEpisodeStream(yumekoEp.id);
                
                if (hlsUrl && mounted) {
                    setFetchedSrc(hlsUrl);
                    console.log('[Episode-Switch] Yumeko stream loaded for episode:', yumekoEp.episodeNumber);
                }
            }
            if (mounted) setInitialLoading(false);
        })();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentEpisode, selectedSource, playlistEpisodes, libriaSelectedQualityKey, selectedKodikVoice]);

    // Восстановление прогресса теперь происходит только в onLoaded для избежания конфликтов

    // Инициализация HLS
    useEffect(() => {
        // ВАЖНО: Сбрасываем флаги при смене источника видео
        didAutoStartRef.current = false;
        onLoadedProcessedRef.current = false;
        
        const video = videoRef.current;
        if (!video || !sourceUrl) return;

        if (Hls.isSupported()) {
            const hls = new Hls({ 
                enableWorker: true,
                // Настройки для поддержки длинных видео (фильмов)
                maxBufferLength: 60, // Максимум 60 секунд буфера
                maxMaxBufferLength: 120, // Абсолютный максимум буфера
                maxBufferSize: 60 * 1000 * 1000, // 60MB максимум
                maxBufferHole: 0.5, // Допустимый разрыв в буфере
                highBufferWatchdogPeriod: 3, // Проверка высокого буфера каждые 3с
                // Оптимизация для длинных видео
                nudgeOffset: 0.1,
                nudgeMaxRetry: 3,
                backBufferLength: 30, // Храним 30 секунд назад для перемотки
            });
            // Allow cross-origin loading of HLS manifests/segments when server provides CORS headers
            try { video.crossOrigin = 'anonymous'; } catch {}
            // Ensure XHR for HLS does not send credentials by default (helps with some CORS setups)
            hls.config.xhrSetup = (xhr: XMLHttpRequest) => { xhr.withCredentials = false; };
            hlsRef.current = hls;
            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(sourceUrl);
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error event', event, data);
                try {
                    if (data && data.fatal) {
                        const t = data.type;
                        if (t === Hls.ErrorTypes.NETWORK_ERROR) {
                            console.warn('HLS network error — attempting startLoad()');
                            hls.startLoad();
                        } else if (t === Hls.ErrorTypes.MEDIA_ERROR) {
                            console.warn('HLS media error — attempting recoverMediaError()');
                            hls.recoverMediaError();
                        } else {
                            console.warn('HLS fatal error — destroying Hls and setting video.src fallback');
                            hls.destroy();
                            try { video.src = sourceUrl as string; } catch (e) { console.error('Fallback video.src set failed', e); }
                        }
                    }
                } catch (e) {
                    console.error('Error handling HLS error', e);
                }
            });
            hls.on(Hls.Events.MANIFEST_PARSED, (_, data: { levels?: Array<{ height?: number }> }) => {
                const parsedLevels = (data.levels || []).map((lvl, idx: number) => ({ index: idx, height: lvl.height }));
                setLevels(parsedLevels);
            });
            hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
                setCurrentLevel(data.level);
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari (native HLS)
            video.src = sourceUrl;
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [sourceUrl]);

    // Синхронизация громкости/мьюта c учетом принудительного mute для автоплея
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        try { video.volume = isMuted ? 0 : volume; } catch {}
        
        // Логика muted:
        // 1. Если пользователь явно замутил (isMuted = true) - мутим
        // 2. НЕ пытаемся автоматически размутить - браузер паузит видео!
        // 3. Размутивание только при взаимодействии пользователя (через toggleMute/changeVolume)
        if (isMuted) {
            try { video.muted = true; } catch {}
        } else {
            // Применяем только если это явный mute от autoplay ИЛИ пользователь размутил вручную
            try { video.muted = autoplayMutedRef.current; } catch {}
        }
    }, [volume, isMuted]);

    // Применение скорости воспроизведения (только если пользователь менял настройки)
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        // Применяем playbackRate только если он не равен 1
        // И только после того как пользователь взаимодействовал с плеером
        if (playbackSpeed !== 1) {
            try { video.playbackRate = playbackSpeed; } catch {}
        } else {
            try { video.playbackRate = 1; } catch {}
        }
    }, [playbackSpeed]);

    // Функция сохранения прогресса с троттлингом (не чаще 1 раза в 3 секунды)
    const persistProgress = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        
        // Троттлинг: не сохраняем чаще чем раз в 3 секунды
        const now = Date.now();
        if (now - lastPersistAtRef.current < 3000) return;
        
        // Если висит плашка возобновления для текущей серии — не перетирать прогресс нулями
        if (resumePrompt && resumePrompt.epId === currentEpisode) return;
        // Если серия только что переключается — тоже не перетираем (ждём onLoaded)
        if (isEpisodeSwitchingRef.current) return;
        // Дополнительная защита: не сохраняем если время слишком мало (менее 3 секунд) или видео не загружено
        const t = video.currentTime || 0;
        const dur = (video.duration || duration || 0);
        if (t < 3 && dur === 0) return; // Не сохраняем если видео только начало загружаться
        
        const voice = getVoiceForProgress();
        try { upsertEpisodeProgressWithSync({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, dur); } catch {
            // fallback to local only
            try { upsertEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, dur); } catch {}
        }
        lastPersistAtRef.current = now;
        setEpisodeProgressMap(prev => (dur > 0 ? { ...prev, [currentEpisode]: { time: t, ratio: Math.max(0, Math.min(1, t / dur)) } } : prev));
    }, [animeId, selectedSource, selectedKodikVoice, selectedYumekoVoice, currentEpisode, duration, resumePrompt, getVoiceForProgress]);

    // События длительности/времени/буфера
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        // сбрасываем одноразовый автостарт при пересоздании слушателей, только если пользователь не взаимодействовал с плеером
        if (!userInteractedRef.current) {
            didAutoStartRef.current = false;
        }
        autoplayMutedRef.current = false;
        autoFullscreenPendingRef.current = false;
        if (unmuteOnInteractHandlerRef.current) {
            document.removeEventListener('pointerdown', unmuteOnInteractHandlerRef.current);
            unmuteOnInteractHandlerRef.current = null;
        }
        if (fsOnInteractHandlerRef.current) {
            document.removeEventListener('pointerdown', fsOnInteractHandlerRef.current);
            fsOnInteractHandlerRef.current = null;
        }
        const tryAutoStart = attemptAutoStart;

        const onLoaded = async () => {
            try { await fetchAndMergeFromServer(animeId); } catch {}
            const dur = video.duration || 0;
            
            // КРИТИЧНО: Не продолжаем если duration не готова (таймлайн не загружен)
            if (!dur || dur <= 0 || isNaN(dur)) {
                console.log('[onLoaded] Duration not ready yet, skipping initialization:', dur);
                return;
            }
            
            // ВАЖНО: Защита от повторной обработки onLoaded для одного эпизода
            if (onLoadedProcessedRef.current) {
                console.log('[onLoaded] Already processed for this episode, skipping');
                return;
            }
            
            console.log('[onLoaded] Duration ready, initializing player:', dur);
            onLoadedProcessedRef.current = true; // Отмечаем что начали обработку
            setDuration(dur);
            // восстановление прогресса → если есть, и автоплей выключен — показываем плашку; если автоплей включён — автопродолжаем
            const voiceKey = getVoiceForProgress();
            const saved = selectedSource === 'libria'
                ? getEpisodeProgressLibriaAnyVoice(animeId, currentEpisode)
                : getEpisodeProgress({ animeId, source: selectedSource, voice: voiceKey, episodeId: currentEpisode });
            if (saved && saved.time > 0 && saved.time < (saved.duration || dur || 1)) {
                resumeCandidateRef.current = { epId: currentEpisode, time: saved.time, duration: saved.duration };
                
                // Проверяем, показывалась ли уже плашка для этого эпизода в текущей сессии
                const alreadyShown = resumePromptShownForEpisodeRef.current.has(currentEpisode);
                
                if (autoPlay && !userInteractedRef.current) {
                    // Автоплей включён и пользователь не взаимодействовал → применяем сохранённую позицию
                    console.log('[onLoaded] ✅ Autoplay enabled - restoring progress and starting:', saved.time);
                    try { 
                        if (video.readyState >= 1) {
                            video.currentTime = saved.time;
                            setCurrentTime(saved.time);
                        } else {
                            // Если видео еще не готово, подождем
                            const onCanPlay = () => {
                                try {
                                    video.currentTime = saved.time;
                                    setCurrentTime(saved.time);
                                } catch {}
                                video.removeEventListener('canplay', onCanPlay);
                            };
                            video.addEventListener('canplay', onCanPlay, { once: true });
                        }
                    } catch {}
                    // ВАЖНО: Запускаем автоплей сразу как duration готова
                    tryAutoStart();
                } else if (!alreadyShown) {
                    // Показываем плашку только если она еще не показывалась для этого эпизода
                    console.log('[onLoaded] ⏸️ Showing resume prompt - pausing video');
                    setResumePrompt({ epId: currentEpisode, time: saved.time, duration: saved.duration });
                    resumePromptShownForEpisodeRef.current.add(currentEpisode);
                    try { video.pause(); } catch {}
                    setIsPlaying(false);
                } else {
                    // Если плашка уже показывалась - запускаем автоплей если он включен
                    console.log('[onLoaded] Resume prompt already shown, checking autoplay:', autoPlay);
                    if (!userInteractedRef.current && autoPlay) {
                        tryAutoStart();
                    }
                }
            } else {
                // если прогресса нет — запускаем автоплей если он включен
                console.log('[onLoaded] No saved progress, checking autoplay:', autoPlay);
                if (!userInteractedRef.current && autoPlay) {
                    tryAutoStart();
                }
            }
            
            // ВАЖНО: Добавляем повторную попытку автозапуска через задержку
            // на случай если первая попытка была слишком ранней
            if (!userInteractedRef.current && autoPlay) {
                setTimeout(() => {
                    if (!didAutoStartRef.current && !userInteractedRef.current && !resumePrompt) {
                        console.log('[onLoaded] Retry autostart after delay');
                        tryAutoStart();
                    }
                }, 500);
            }
            
            // Сбросим флаг переключения серии после обработки loaded
            isEpisodeSwitchingRef.current = false;
            // помечаем серию как открытую
            markEpisodeOpened({ animeId, source: selectedSource, voice: voiceKey, episodeId: currentEpisode });
            // после фактической загрузки — пересчёт полосок, чтобы они не мигали
            const voice = getVoiceForProgress();
            const list = playlistEpisodes.length ? playlistEpisodes : episodes;
            const map: Record<number, { time: number; ratio: number }> = {};
            list.forEach(ep => {
                const prog = getEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: ep.id });
                if (prog && (prog.opened === true || (prog.time ?? 0) > 0 || (prog.duration ?? 0) > 0)) {
                    const total = (prog.duration ?? 0) > 0 ? prog.duration : (prog.time > 0 ? prog.time : 0);
                    const ratio = total > 0 ? Math.max(0, Math.min(1, prog.time / total)) : 0;
                    map[ep.id] = { time: prog.time, ratio };
                }
            });
            setEpisodeProgressMap(map);
        };
        const onTime = () => {
            const t = video.currentTime || 0;
            setCurrentTime(t);
            // сохранить прогресс
            persistProgress();
            // Убрали спам console.log
            if (video.readyState >= 3 && !video.paused) {
                setIsBuffering(false);
            }
            try {
                console.log('[skip] processing timeupdate', { selectedSource, hasSkips: !!libriaSkips });
                if (selectedSource === 'libria' && libriaSkips) {
                    const t = video.currentTime || 0;
                    const opStart = libriaSkips.opening?.start ?? null;
                    const opEnd = libriaSkips.opening?.end ?? null;
                    const edStart = libriaSkips.ending?.start ?? null;
                    const edEnd = libriaSkips.ending?.end ?? null;
                    const inOpening = !!(opStart !== null && opEnd !== null && t >= opStart && t < opEnd);
                    const inEnding = !!(edStart !== null && edEnd !== null && t >= edStart && t < edEnd);
                    console.log('[skip] state', { t, inOpening, inEnding, skipOpening, skipEnding, currentKind: skipAutoKindRef.current, elapsed: skipElapsedRef.current, lastTime: lastVideoTimeRef.current });
                    // Прогресс авто-пропуска считает только прошедшее воспроизведённое время
                    if (inOpening || inEnding) {
                        const kind: 'opening' | 'ending' = inOpening ? 'opening' : 'ending';
                        const allowed = (kind === 'opening' ? skipOpening : skipEnding);
                        
                        // Обрабатываем сегмент только если соответствующий тумблер включен
                        if (allowed) {
                            if (skipAutoKindRef.current !== kind) {
                                skipAutoKindRef.current = kind;
                                // при входе в сегмент сбрасываем накопление и запоминаем текущее время
                                skipElapsedRef.current = 0;
                                lastVideoTimeRef.current = t;
                                setSkipAutoProgress(0);
                                console.log('[skip] enter segment', { kind, t, allowed });
                            } else {
                                // На паузе currentTime не меняется → прогресс не растёт
                                const delta = Math.max(0, t - lastVideoTimeRef.current);
                                if (delta > 0) {
                                    skipElapsedRef.current += delta;
                                    lastVideoTimeRef.current = t;
                                    setSkipAutoProgress(Math.max(0, Math.min(1, skipElapsedRef.current / 5)));
                                    console.log('[skip] progress', { kind, t, delta, elapsed: skipElapsedRef.current, progress: Math.max(0, Math.min(1, skipElapsedRef.current / 5)) });
                                }
                            }
                        } else {
                            // тумблер выключен — сбрасываем состояние и не накапливаем
                            if (skipAutoKindRef.current === kind) {
                                skipAutoKindRef.current = null;
                                skipElapsedRef.current = 0;
                                setSkipAutoProgress(0);
                                console.log('[skip] toggle disabled, reset', { kind, t });
                            }
                            lastVideoTimeRef.current = t;
                        }
                    } else {
                        // вне сегментов — сбрасываем состояние и разрешаем повторный пропуск
                        if (skipAutoKindRef.current !== null) {
                            skipAutoKindRef.current = null;
                            skipElapsedRef.current = 0;
                            setSkipAutoProgress(0);
                            console.log('[skip] exit segment', { t });
                        }
                        if (hasSkippedOpeningRef.current || hasSkippedEndingRef.current) {
                            hasSkippedOpeningRef.current = false;
                            hasSkippedEndingRef.current = false;
                            console.log('[skip] reset hasSkipped outside segments');
                        }
                        lastVideoTimeRef.current = t;
                    }

                    // Авто-пропуск после 5с накопленного воспроизведения
                    if (inOpening && skipOpening && !hasSkippedOpeningRef.current) {
                        console.log('[skip] checking auto-skip opening', { 
                            elapsed: skipElapsedRef.current, 
                            threshold: 5, 
                            opEnd, 
                            canSkip: skipElapsedRef.current >= 5 && opEnd !== null,
                            skipOpening,
                            hasSkipped: hasSkippedOpeningRef.current
                        });
                        if (skipElapsedRef.current >= 5 && opEnd !== null) {
                            const end = opEnd;
                            video.currentTime = Math.min(end, video.duration || end);
                            hasSkippedOpeningRef.current = true;
                            console.log('[skip] auto-skip opening executed', { t, end, newTime: video.currentTime });
                            return;
                        }
                    }
                    if (inEnding && skipEnding && !hasSkippedEndingRef.current) {
                        console.log('[skip] checking auto-skip ending', { 
                            elapsed: skipElapsedRef.current, 
                            threshold: 5, 
                            edEnd, 
                            canSkip: skipElapsedRef.current >= 5 && edEnd !== null,
                            skipEnding,
                            hasSkipped: hasSkippedEndingRef.current
                        });
                        if (skipElapsedRef.current >= 5 && edEnd !== null) {
                            const end = edEnd;
                            video.currentTime = Math.min(end, (video.duration || end));
                            hasSkippedEndingRef.current = true;
                            console.log('[skip] auto-skip ending executed', { t, end, newTime: video.currentTime });
                            return;
                        }
                    }
                } else if (selectedSource === 'kodik' && kodikSegments) {
                    const t = video.currentTime || 0;
                    
                    // Handle automatic ad skip (ad segments)
                    if (kodikSegments.ad) {
                        kodikSegments.ad.forEach((adSegment, index) => {
                            const segmentKey = `ad-${index}-${adSegment.start}-${adSegment.end}`;
                            const inAdSegment = t >= adSegment.start && t < adSegment.end;
                            
                            if (inAdSegment && !autoSkippedAdSegments.current.has(segmentKey)) {
                                // Automatically skip ad segment
                                video.currentTime = Math.min(adSegment.end, video.duration || adSegment.end);
                                autoSkippedAdSegments.current.add(segmentKey);
                                console.log('[kodik-skip] auto-skip ad segment', { start: adSegment.start, end: adSegment.end, newTime: video.currentTime });
                            }
                        });
                    }
                    
                    // Handle optional skip segments (opening/ending - same as Libria logic)
                    if (kodikSegments.skip) {
                        const currentSkipSegment = kodikSegments.skip.find(segment => 
                            t >= segment.start && t < segment.end
                        );
                        
                        if (currentSkipSegment) {
                            const inOpening = currentSkipSegment.start < 300; // Assume opening if within first 5 minutes
                            const kind: 'opening' | 'ending' = inOpening ? 'opening' : 'ending';
                            const allowed = (kind === 'opening' ? skipOpening : skipEnding);
                            
                            if (allowed) {
                                if (skipAutoKindRef.current !== kind) {
                                    skipAutoKindRef.current = kind;
                                    skipElapsedRef.current = 0;
                                    lastVideoTimeRef.current = t;
                                    setSkipAutoProgress(0);
                                    console.log('[kodik-skip] enter segment', { kind, t, allowed });
                                } else {
                                    const delta = Math.max(0, t - lastVideoTimeRef.current);
                                    if (delta > 0) {
                                        skipElapsedRef.current += delta;
                                        lastVideoTimeRef.current = t;
                                        setSkipAutoProgress(Math.max(0, Math.min(1, skipElapsedRef.current / 5)));
                                        console.log('[kodik-skip] progress', { kind, t, delta, elapsed: skipElapsedRef.current });
                                    }
                                }
                                
                                // Auto-skip after 5 seconds
                                if (skipElapsedRef.current >= 5) {
                                    const hasSkipped = inOpening ? hasSkippedOpeningRef.current : hasSkippedEndingRef.current;
                                    if (!hasSkipped) {
                                        video.currentTime = Math.min(currentSkipSegment.end, video.duration || currentSkipSegment.end);
                                        if (inOpening) {
                                            hasSkippedOpeningRef.current = true;
                                        } else {
                                            hasSkippedEndingRef.current = true;
                                        }
                                        console.log('[kodik-skip] auto-skip executed', { kind, t, end: currentSkipSegment.end, newTime: video.currentTime });
                                    }
                                }
                            } else {
                                if (skipAutoKindRef.current === kind) {
                                    skipAutoKindRef.current = null;
                                    skipElapsedRef.current = 0;
                                    setSkipAutoProgress(0);
                                }
                                lastVideoTimeRef.current = t;
                            }
                        } else {
                            // Outside skip segments - reset state
                            if (skipAutoKindRef.current !== null) {
                                skipAutoKindRef.current = null;
                                skipElapsedRef.current = 0;
                                setSkipAutoProgress(0);
                            }
                            if (hasSkippedOpeningRef.current || hasSkippedEndingRef.current) {
                                hasSkippedOpeningRef.current = false;
                                hasSkippedEndingRef.current = false;
                            }
                            lastVideoTimeRef.current = t;
                        }
                    }
                }
            } catch {}
        };
        const onSeeking = () => {
            try { lastVideoTimeRef.current = video.currentTime || 0; } catch {}
        };
        const onSeeked = () => {
            try {
                const t = video.currentTime || 0;
                lastVideoTimeRef.current = t;
                persistProgress();
                if (selectedSource === 'libria' && libriaSkips) {
                    const opStart = libriaSkips.opening?.start ?? null;
                    const opEnd = libriaSkips.opening?.end ?? null;
                    const edStart = libriaSkips.ending?.start ?? null;
                    const edEnd = libriaSkips.ending?.end ?? null;
                    const inOpening = !!(opStart !== null && opEnd !== null && t >= opStart && t < opEnd);
                    const inEnding = !!(edStart !== null && edEnd !== null && t >= edStart && t < edEnd);
                    if (inOpening) {
                        hasSkippedOpeningRef.current = false;
                        skipElapsedRef.current = 0;
                        setSkipAutoProgress(0);
                        skipAutoKindRef.current = null;
                        console.log('[skip] seeked: reset inside opening', { t });
                    } else if (inEnding) {
                        hasSkippedEndingRef.current = false;
                        skipElapsedRef.current = 0;
                        setSkipAutoProgress(0);
                        skipAutoKindRef.current = null;
                        console.log('[skip] seeked: reset inside ending', { t });
                    } else {
                        if (hasSkippedOpeningRef.current || hasSkippedEndingRef.current) {
                            hasSkippedOpeningRef.current = false;
                            hasSkippedEndingRef.current = false;
                            console.log('[skip] seeked: reset hasSkipped outside segments', { t });
                        }
                    }
                }
            } catch {}
        };
        const onProgress = () => {
            try {
                const ranges = video.buffered;
                const end = ranges.length ? ranges.end(ranges.length - 1) : 0;
                setBufferedEnd(end);
                const list: Array<{ start: number; end: number }> = [];
                for (let i = 0; i < ranges.length; i++) {
                    list.push({ start: ranges.start(i), end: ranges.end(i) });
                }
                setBufferedRanges(list);
            } catch {
                setBufferedEnd(0);
                setBufferedRanges([]);
            }
        };
        const onWaiting = () => {
            // Показываем буферизацию только если видео действительно не может воспроизводиться
            if (video.readyState < 3) {
                setIsBuffering(true);
            }
            persistProgress();
        };
        const onCanPlay = () => {
            // Скрываем буферизацию когда видео готово к воспроизведению
            if (video.readyState >= 3) {
                setIsBuffering(false);
            }
            // Пробуем запустить если duration готова
            tryAutoStart();
            persistProgress();
        };
        const onCanPlayThrough = () => {
            // Скрываем буферизацию когда видео может воспроизводиться без остановок
            setIsBuffering(false);
            // Пробуем запустить когда видео полностью готово
            tryAutoStart();
            persistProgress();
        };
        const onPlaying = () => {
            console.log('[onPlaying] ✅ Video is playing');
            // Видео начало воспроизводиться - точно убираем буферизацию
            setIsBuffering(false);
            setIsPlaying(true);
            
            // НЕ размучиваем здесь - браузер паузит видео!
            // Размутивание произойдет только при первом взаимодействии пользователя
        };
        const onPause = () => {
            console.log('[onPause] Video paused');
            setIsPlaying(false);
            persistProgress();
        };
        const onEnded = () => {
            persistProgress();
            // Автоматический переход на следующий эпизод при завершении текущего
            const currentIdx = playlistEpisodes.findIndex(p => p.id === currentEpisode);
            const hasNextEpisode = currentIdx !== -1 && currentIdx < playlistEpisodes.length - 1;
            
            if (hasNextEpisode) {
                // Логика переключения на следующий эпизод
                const newIdx = Math.min(playlistEpisodes.length - 1, currentIdx + 1);
                const newId = playlistEpisodes[newIdx].id;
                
                // Перед переключением — сохранить текущий прогресс с синхронизацией
                try {
                    const v = videoRef.current;
                    const t = (v?.currentTime ?? currentTime) || 0;
                    const d = (v?.duration ?? duration) || 0;
                    const voice = getVoiceForProgress();
                    if (d >= 0) {
                        try { 
                            upsertEpisodeProgressWithSync({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, d); 
                        } catch {
                            try { 
                                upsertEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, d); 
                            } catch {}
                        }
                    }
                } catch {}
                
                isEpisodeSwitchingRef.current = true;
                // Сбрасываем флаг пользовательского взаимодействия для новой серии
                userInteractedRef.current = false;
                setCurrentEpisode(newId);
                
                // Если включен авто-запуск, запускаем новый эпизод после переключения
                if (autoPlay) {
                    setTimeout(() => {
                        const nextVideo = videoRef.current;
                        if (nextVideo && !nextVideo.paused) {
                            // Видео уже играет, ничего не делаем
                            return;
                        }
                        if (nextVideo) {
                            nextVideo.play()
                                .then(() => setIsPlaying(true))
                                .catch(console.error);
                        }
                    }, 1000); // Задержка для корректной загрузки нового эпизода
                }
            }
        }; 
        
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('durationchange', onLoaded);
        video.addEventListener('timeupdate', onTime);
        video.addEventListener('progress', onProgress);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('canplaythrough', onCanPlayThrough);
        video.addEventListener('seeking', onSeeking);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        
        // Убрали ранний вызов tryAutoStart() - запуск будет только в canplaythrough

        return () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            video.removeEventListener('durationchange', onLoaded);
            video.removeEventListener('timeupdate', onTime);
            video.removeEventListener('progress', onProgress);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('canplaythrough', onCanPlayThrough);
            video.removeEventListener('seeking', onSeeking);
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
        };
    }, [selectedSource, libriaSkips, skipOpening, skipEnding, autoPlay, autoFullscreen, persistProgress, onNextEpisode, playlistEpisodes, currentEpisode, animeId, selectedKodikVoice, selectedYumekoVoice, duration, currentTime, upsertEpisodeProgressWithSync, upsertEpisodeProgress, isEpisodeSwitchingRef, getVoiceForProgress]);

    // Периодическое сохранение, на случай если события не пришли
    useEffect(() => {
        const id = window.setInterval(() => {
            persistProgress();
        }, 2000);
        return () => window.clearInterval(id);
    }, [persistProgress]);

    // Сохраняем при сворачивании/перезагрузке вкладки
    useEffect(() => {
        const handler = () => persistProgress();
        window.addEventListener('beforeunload', handler);
        document.addEventListener('visibilitychange', handler);
        return () => {
            window.removeEventListener('beforeunload', handler);
            document.removeEventListener('visibilitychange', handler);
        };
    }, [persistProgress]);

    // Обработчики воспроизведения
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        
        // КРИТИЧНО: Блокируем воспроизведение если duration не загружена
        if (!video.duration || video.duration <= 0 || isNaN(video.duration)) {
            console.log('[togglePlay] Blocked - duration not ready:', video.duration);
            return;
        }
        
        // Если висит плашка "Продолжить" — блокируем старт до выбора
        if (resumePrompt) return;
        
        // Помечаем, что пользователь взаимодействовал с плеером
        userInteractedRef.current = true;
        
        if (video.paused) {
            // Старт воспроизведения → стабильно показываем UI, затем плавно скрываем
            video.play();
            setIsPlaying(true);
            // Показываем UI только если он не показан, чтобы избежать лишних рендеров
            if (!showUIRef.current) {
                setShowUI(true);
            }
            if (hideUiTimeoutRef.current) window.clearTimeout(hideUiTimeoutRef.current);
            hideUiTimeoutRef.current = window.setTimeout(() => setShowUI(false), 2500);
        } else {
            // Пауза → показываем UI стабильно и не скрываем
            video.pause();
            setIsPlaying(false);
            // Показываем UI только если он не показан
            if (!showUIRef.current) {
                setShowUI(true);
            }
            if (hideUiTimeoutRef.current) window.clearTimeout(hideUiTimeoutRef.current);
        }
    };

    // Prev/Next handlers that update currentEpisode and keep quality selection
    const handlePrevEpisodeInternal = () => {
        if (!playlistEpisodes.length) return;
        const idx = playlistEpisodes.findIndex(p => p.id === currentEpisode);
        const currentIdx = idx === -1 ? 0 : idx;
        const newIdx = Math.max(0, currentIdx - 1);
        const newId = playlistEpisodes[newIdx].id;
        // Перед переключением — сохранить текущий прогресс с синхронизацией
        try {
            const v = videoRef.current;
            const t = (v?.currentTime ?? currentTime) || 0;
            const d = (v?.duration ?? duration) || 0;
            const voice = getVoiceForProgress();
            if (d >= 0) {
                try { upsertEpisodeProgressWithSync({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, d); } catch {
                    try { upsertEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, d); } catch {}
                }
            }
        } catch {}
        // СНАЧАЛА помечаем, что идёт смена серии, чтобы блокировать параллельные сохранения
        isEpisodeSwitchingRef.current = true;
        // Сбрасываем флаг пользовательского взаимодействия для новой серии
        userInteractedRef.current = false;
        setCurrentEpisode(newId);
    };

    const handleNextEpisodeInternal = () => {
        if (!playlistEpisodes.length) return;
        const idx = playlistEpisodes.findIndex(p => p.id === currentEpisode);
        const currentIdx = idx === -1 ? 0 : idx;
        const newIdx = Math.min(playlistEpisodes.length - 1, currentIdx + 1);
        const newId = playlistEpisodes[newIdx].id;
        // Перед переключением — сохранить текущий прогресс с синхронизацией
        try {
            const v = videoRef.current;
            const t = (v?.currentTime ?? currentTime) || 0;
            const d = (v?.duration ?? duration) || 0;
            const voice = getVoiceForProgress();
            if (d >= 0) {
                try { upsertEpisodeProgressWithSync({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, d); } catch {
                    try { upsertEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, d); } catch {}
                }
            }
        } catch {}
        // СНАЧАЛА помечаем, что идёт смена серии, чтобы блокировать параллельные сохранения
        isEpisodeSwitchingRef.current = true;
        // Сбрасываем флаг пользовательского взаимодействия для новой серии
        userInteractedRef.current = false;
        setCurrentEpisode(newId);
    };

    const changeVolume = (delta: number, mode: 'up' | 'down' | 'neutral' = 'neutral') => {
        // При изменении громкости - пользователь взаимодействовал с плеером
        userInteractedRef.current = true;
        // Снимаем флаг принудительного mute от autoplay
        autoplayMutedRef.current = false;
        
        setIsMuted(false);
        setVolume(prev => {
            const next = Math.max(0, Math.min(1, prev + delta));
            const computedMode = next === 0 ? 'mute' : mode;
            showVolumeOverlay(next, computedMode as 'up' | 'down' | 'mute' | 'neutral');
            return next;
        });
    };

    const toggleMute = () => {
        // При клике на громкость - пользователь взаимодействовал с плеером
        userInteractedRef.current = true;
        // Снимаем флаг принудительного mute от autoplay
        autoplayMutedRef.current = false;
        // Очищаем обработчики первого жеста
        if (unmuteOnInteractHandlerRef.current) {
            document.removeEventListener('pointerdown', unmuteOnInteractHandlerRef.current);
            document.removeEventListener('keydown', unmuteOnInteractHandlerRef.current as any);
            unmuteOnInteractHandlerRef.current = null;
        }
        
        setIsMuted(m => {
            const next = !m;
            showVolumeOverlay(next ? 0 : volume, 'mute');
            // Принудительно применяем muted к видео элементу
            const video = videoRef.current;
            if (video) {
                try { video.muted = next; } catch {}
            }
            return next;
        });
    };

    const seekBy = (seconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        setIsBuffering(true);
        video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + seconds));
        setShowOverlays({ kind: seconds > 0 ? 'seek-forward' : 'seek-backward' });
        window.setTimeout(() => setShowOverlays(o => (o?.kind.includes('seek') ? null : o)), 600);
        // Сбрасываем состояние буферизации через 2 секунды после перемотки
        window.setTimeout(() => setIsBuffering(false), 2000);
    };

    // Полноэкранный режим
    const toggleFullscreen = () => {
        const container = containerRef.current;
        if (!container) return;
        if (!document.fullscreenElement) {
            container.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    // Наложения (OSD)
    const volumeOverlayTimeout = useRef<number | null>(null);
    const showVolumeOverlay = (vol: number, mode: 'up' | 'down' | 'mute' | 'neutral' = 'neutral') => {
        setShowOverlays({ kind: 'volume', value: vol, mode });
        if (volumeOverlayTimeout.current) window.clearTimeout(volumeOverlayTimeout.current);
        volumeOverlayTimeout.current = window.setTimeout(() => setShowOverlays(o => (o?.kind === 'volume' ? null : o)), 700);
    };
    // Helper kept inline inside key handlers below; outer function not used elsewhere
    const showPlayPauseIcon = (isPlaying: boolean) => {
        setShowOverlays({ kind: 'play-pause', value: isPlaying ? 1 : 0 });
        window.setTimeout(() => setShowOverlays(o => (o?.kind === 'play-pause' ? null : o)), 800);
    };

    // Клавиатурные шорткаты (RU/EN) + уведомления на 5с
    useEffect(() => {
        const showNotice = (text: string) => {
            setShowOverlays({ kind: 'notice', text });
            window.setTimeout(() => setShowOverlays(o => (o?.kind === 'notice' ? null : o)), 5000);
        };
        const isInput = (el: Element | null) => !!(el && ['INPUT', 'TEXTAREA'].includes((el as HTMLElement).tagName));
        const onKey = (e: KeyboardEvent) => {
            if (isInput(e.target as Element | null)) return;
            const key = e.key.toLowerCase();
            // Вспомогательные наборы: RU/EN и символы
            const isAny = (...ks: string[]) => ks.includes(key);
            if (isAny(' ', 'space')) { e.preventDefault(); showPlayPauseIcon(isPlaying); togglePlay(); return; }
            // 1) F/А — fullscreen
            if (isAny('f', 'а')) { e.preventDefault(); const prev = isFullscreen; toggleFullscreen(); showNotice(prev ? 'Выход из полноэкранного режима' : 'Полноэкранный режим'); return; }
            // 2) K/Л/Space — уже покрыт space; добавим K/Л
            if (isAny('k', 'л')) { e.preventDefault(); showPlayPauseIcon(isPlaying); togglePlay(); return; }
            // 3) P/З — плейлист (без уведомления)
            if (isAny('p', 'з')) { e.preventDefault(); setShowPlaylist(v => !v); return; }
            // 4) O/Щ — настройки
            if (isAny('o', 'щ')) { e.preventDefault(); setShowSettings(v => !v); setSettingsSection('main'); showNotice('Меню настроек'); return; }
            // 5) Y/Н — авто-качество
            if (isAny('y', 'н')) { e.preventDefault();
                if (selectedSource === 'libria') {
                    setLibriaSelectedQualityKey('auto');
                    const activeKey = libriaCurrentActiveKey ?? chooseLibriaKey(libriaQualities) ?? (libriaQualities[0]?.key ?? null);
                    setLibriaCurrentActiveKey(activeKey);
                    const active = libriaQualities.find(x => x.key === activeKey);
                    if (active) setFetchedSrc(active.url);
                } else if (selectedSource === 'kodik') {
                    setKodikSelectedQualityKey('auto');
                    const activeKey = kodikCurrentActiveKey ?? (kodikQualities[0]?.key ?? null);
                    setKodikCurrentActiveKey(activeKey);
                    const active = kodikQualities.find(x => x.key === activeKey);
                    if (active) setFetchedSrc(active.url);
                } else {
                    setCurrentLevel(-1); // hls auto
                }
                showNotice('Качество: Auto');
                return;
            }
            // 6) J/О — максимум качества
            if (isAny('j', 'о')) { e.preventDefault();
                if (selectedSource === 'libria' && libriaQualities.length) {
                    const best = [...libriaQualities].sort((a,b)=>parseInt(b.key)-parseInt(a.key))[0];
                    setLibriaSelectedQualityKey(best.key); setLibriaCurrentActiveKey(best.key); setFetchedSrc(best.url);
                } else if (selectedSource === 'kodik' && kodikQualities.length) {
                    const best = [...kodikQualities].sort((a,b)=>parseInt(b.key)-parseInt(a.key))[0];
                    setKodikSelectedQualityKey(best.key); setKodikCurrentActiveKey(best.key); setFetchedSrc(best.url);
                } else {
                    setCurrentLevel(0); // fallback
                }
                showNotice('Качество: Максимум');
                return;
            }
            // 7) N/Т — минимум качества
            if (isAny('n', 'т')) { e.preventDefault();
                if (selectedSource === 'libria' && libriaQualities.length) {
                    const worst = [...libriaQualities].sort((a,b)=>parseInt(a.key)-parseInt(b.key))[0];
                    setLibriaSelectedQualityKey(worst.key); setLibriaCurrentActiveKey(worst.key); setFetchedSrc(worst.url);
                } else if (selectedSource === 'kodik' && kodikQualities.length) {
                    const worst = [...kodikQualities].sort((a,b)=>parseInt(a.key)-parseInt(b.key))[0];
                    setKodikSelectedQualityKey(worst.key); setKodikCurrentActiveKey(worst.key); setFetchedSrc(worst.url);
                } else {
                    setCurrentLevel(0);
                }
                showNotice('Качество: Минимум');
                return;
            }
            // 8) ",/Б" и "./Ю" — пред/след серия
            if (isAny(',', 'б')) { e.preventDefault(); handlePrevEpisodeInternal(); return; }
            if (isAny('.', 'ю')) { e.preventDefault(); handleNextEpisodeInternal(); return; }
            // 9) L/Д — включить оба автопропуска
            if (isAny('l', 'д')) { e.preventDefault(); setSkipOpening(true); setSkipEnding(true); showNotice('Авто‑пропуск: Опенинг + Эндинг'); return; }
            // 10) ;/Ж — опенинг, '/Э — эндинг
            if (isAny(';', 'ж')) { e.preventDefault(); setSkipOpening(v => !v); showNotice(`Пропускать Опенинг: ${!skipOpening ? 'Вкл' : 'Выкл'}`); return; }
            if (isAny("'", 'э')) { e.preventDefault(); setSkipEnding(v => !v); showNotice(`Пропускать Эндинг: ${!skipEnding ? 'Вкл' : 'Выкл'}`); return; }

            // Стрелки и volume на RU
            if (isAny('arrowup', 'ц')) { e.preventDefault(); changeVolume(0.1, 'up'); return; }
            if (isAny('arrowdown', 'в')) { e.preventDefault(); changeVolume(-0.1, 'down'); return; }
            if (isAny('arrowright', 'к')) { e.preventDefault();
                seekBy(10);
                setShowOverlays({ kind: 'seek-forward' });
                window.setTimeout(() => setShowOverlays(o => (o?.kind === 'seek-forward' ? null : o)), 600);
                return;
            }
            if (isAny('arrowleft', 'ф')) { e.preventDefault();
                seekBy(-10);
                setShowOverlays({ kind: 'seek-backward' });
                window.setTimeout(() => setShowOverlays(o => (o?.kind === 'seek-backward' ? null : o)), 600);
                return;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [volume, isMuted, isPlaying, isFullscreen, skipOpening, skipEnding, selectedSource, libriaQualities, libriaCurrentActiveKey, kodikQualities, kodikCurrentActiveKey]);

    // Автоскрытие UI при бездействии с улучшенной стабильностью
    const lastPokeTime = useRef<number>(0);
    const isPoking = useRef<boolean>(false);
    
    const pokeUi = useCallback(() => {
        const now = Date.now();
        
        // Предотвращаем множественные вызовы
        if (isPoking.current) return;
        
        // Debounce: не обновлять чаще чем раз в 200мс
        if (now - lastPokeTime.current < 200) return;
        lastPokeTime.current = now;
        
        isPoking.current = true;
        
        // Показать UI только если он действительно скрыт
        if (!showUIRef.current) {
            setShowUI(true);
        }
        
        // Сбросить таймер скрытия
        if (hideUiTimeoutRef.current) window.clearTimeout(hideUiTimeoutRef.current);
        const video = videoRef.current;
        if (video && !video.paused) {
            hideUiTimeoutRef.current = window.setTimeout(() => {
                setShowUI(false);
            }, 3500); // Увеличен таймер для большей стабильности
        }
        
        // Сбрасываем флаг через короткое время
        setTimeout(() => { isPoking.current = false; }, 100);
    }, []);
    
    // Супер-стабильный обработчик движения мыши
    const lastMouseMoveTime = useRef<number>(0);
    const mouseMovePending = useRef<boolean>(false);
    
    const handleMouseMove = useCallback(() => {
        const now = Date.now();
        
        // Предотвращаем избыточные вызовы
        if (mouseMovePending.current) return;
        
        // Если UI уже показан, очень редко обновляем таймер
        if (showUIRef.current) {
            if (now - lastMouseMoveTime.current < 800) return; // Увеличено до 800мс
            lastMouseMoveTime.current = now;
            
            const video = videoRef.current;
            if (video && !video.paused) {
                // Только сбрасываем таймер скрытия, НЕ меняем состояние
                if (hideUiTimeoutRef.current) window.clearTimeout(hideUiTimeoutRef.current);
                hideUiTimeoutRef.current = window.setTimeout(() => setShowUI(false), 4000);
                return;
            }
        }
        
        // Если UI скрыт, показываем с большой задержкой для стабильности
        if (now - lastMouseMoveTime.current > 300) { // Увеличено до 300мс
            lastMouseMoveTime.current = now;
            mouseMovePending.current = true;
            
            // Используем requestAnimationFrame для плавности
            requestAnimationFrame(() => {
                pokeUi();
                setTimeout(() => { mouseMovePending.current = false; }, 150);
            });
        }
    }, [pokeUi]);
    useEffect(() => {
        pokeUi();
        return () => {
            if (hideUiTimeoutRef.current) window.clearTimeout(hideUiTimeoutRef.current);
        };
    }, []);

    // Обновление сегментов Libria при смене эпизода/источника
    useEffect(() => {
        if (selectedSource !== 'libria') {
            setLibriaSkips(null);
            hasSkippedOpeningRef.current = false;
            hasSkippedEndingRef.current = false;
            console.log('[skip] reset hasSkipped for non-libria', { selectedSource });
            return;
        }
        const ep = playlistEpisodes.find(p => p.id === currentEpisode) ?? null;
        const raw = ep?.raw ?? null;
        const segs = extractLibriaSkips(raw);
        setLibriaSkips(segs);
        hasSkippedOpeningRef.current = false;
        hasSkippedEndingRef.current = false;
        console.log('[skip] reset hasSkipped for new episode', { currentEpisode, selectedSource });
    }, [selectedSource, currentEpisode, playlistEpisodes]);

    // (удалён дубликат загрузки настроек)

    // После загрузки настроек: флаги autoPlay/autoFullscreen проверяются в attemptAutoStart
    // который вызывается в canplaythrough, поэтому здесь ничего делать не нужно
    // useEffect убран чтобы не запускать видео до полной загрузки

    // Save settings (обновляется на каждое изменение тумблеров)
    useEffect(() => {
        try {
            const s = { skipOpening, skipEnding, autoPlay, autoFullscreen, playbackSpeed, volume, isMuted };
            localStorage.setItem('player.settings', JSON.stringify(s));
            console.debug('[settings] saved to storage', s);
        } catch {}
    }, [skipOpening, skipEnding, autoPlay, autoFullscreen, playbackSpeed, volume, isMuted]);

    // Выбор качества
    const handleQualityChange = (value: string) => {
        const level = parseInt(value, 10);
        setCurrentLevel(level);
        if (hlsRef.current) {
            hlsRef.current.currentLevel = level; // -1 = auto
        }
    };

    const renderVolumeIcon = (color?: string, style?: React.CSSProperties) => {
        const vol = isMuted ? 0 : volume;
        const common = { size: 20 as const, color, style, strokeWidth: 2 as const };
        if (vol === 0) return <VolumeMuteIcon {...common} />;
        if (vol < 0.34) return <VolumeIcon {...common} />;
        if (vol < 0.67) return <VolumeLowIcon {...common} />;
        return <VolumeHighIcon {...common} />;
    };

    const showVolumeSliderWithTimeout = () => {
        setShowVolumeSlider(true);
        setIsVolumeSliderActive(true);
    };

    const qualityOptions = useMemo(() => {
        const opts = [{ label: 'Auto', value: -1 }];
        const uniqueHeights = new Set<number>();
        levels.forEach(lvl => {
            const h = lvl.height ?? 0;
            if (!uniqueHeights.has(h)) {
                uniqueHeights.add(h);
                opts.push({ label: h ? `${h}p` : `Level ${lvl.index}`, value: lvl.index });
            }
        });
        // Сортировка по убыванию разрешения, Auto остаётся первым
        const auto = opts.shift()!;
        const rest = opts.sort((a, b) => Number(b.label.replace('p', '')) - Number(a.label.replace('p', '')));
        return [auto, ...rest];
    }, [levels]);

    // Ensure player keeps full width when there's no video source (avoid collapsing)
    const videoStyle: React.CSSProperties = useMemo(() => {
        if (sourceUrl) return { width: '100%', height: '100%' };
        return { width: '100%', height: '100%', minHeight: '360px', backgroundColor: '#000' };
    }, [sourceUrl]);

    // Container style: occupy full viewport when no video source so hooks are declared consistently
    const containerStyle: React.CSSProperties = useMemo(() => {
        // Растягиваем плеер на высоту вьюпорта всегда; видео внутри само впишется (object-fit: contain)
        return { width: '100%', height: '100vh', minHeight: '100vh', backgroundColor: '#000' };
    }, []);

    // Display title/subtitle for current episode
    const { displayedTitle, displayedSubtitle } = useMemo(() => {
        const ep = playlistEpisodes.find(p => p.id === currentEpisode) ?? null;
        // Episode number: prefer ordinal/number from raw, else use id/currentEpisode
        let epNum: number = typeof currentEpisode === 'number' ? currentEpisode : Number(currentEpisode);
        if (ep && ep.raw) {
            const raw: any = ep.raw;
            const n = Number(raw.ordinal ?? raw.number ?? ep.id ?? epNum);
            if (!Number.isNaN(n)) epNum = n;
        } else if (ep && typeof ep.id === 'number') {
            epNum = ep.id;
        }
        const titleText = `Эпизод ${epNum}`;
        // Subtitle: show only when there is a real episode name, not a generic label like "Серия 1"/"Эпизод 1"
        const genericRe = /^(серия|эпизод)\s*\d+/i;
        const nameCandidate: string | null = (ep && ((ep.raw as Record<string, unknown>)?.name || ep.title)) ? String(((ep.raw as Record<string, unknown>)?.name) || ep.title) : null;
        const subtitleText = nameCandidate && !genericRe.test(nameCandidate.trim()) ? nameCandidate.trim() : '';
        return { displayedTitle: titleText, displayedSubtitle: subtitleText };
    }, [playlistEpisodes, currentEpisode]);

    const iconColor = '#ffffff';
    const iconStyle: React.CSSProperties = { width: 20, height: 20, stroke: iconColor, color: iconColor, opacity: 1, display: 'inline-block', visibility: 'visible' };

    const IconButton: React.FC<{ label: string; onClick?: () => void; disabled?: boolean; className?: string; children: React.ReactNode; onMouseEnter?: () => void; onMouseLeave?: () => void }>
        = ({ label, onClick, disabled, className, children, onMouseEnter, onMouseLeave }) => (
        <button onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} aria-label={label} className={`player-icon-button${className ? ' ' + className : ''}`} style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }} disabled={disabled}>
            <span className="player-icon-wrap" style={{ color: iconColor }}>{children}</span>
        </button>
    );
    const formatTime = (s: number) => {
        if (!isFinite(s)) return '00:00';
        const total = Math.max(0, Math.floor(s));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const sec = total % 60;
        const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
        const ss = String(sec).padStart(2, '0');
        return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
    };

    // Форматирование длительности эпизода, поддерживает часы
    const formatEpisodeDurationNumber = (value: number) => {
        const total = Math.max(0, Math.floor(value));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    // Нормализация числовой длительности: сек/мс -> сек
    const normalizeDurationToSeconds = (value: number) => {
        if (!Number.isFinite(value)) return 0;
        // Если значение похоже на миллисекунды — конвертируем в секунды
        return value > 10000 ? Math.floor(value / 1000) : Math.floor(value);
    };

    // Извлекаем метки опенинга/эндинга из ответа Libria (гибко по полям)
    const extractLibriaSkips = (raw: any): { opening?: { start: number; end: number }; ending?: { start: number; end: number } } | null => {
        if (!raw || typeof raw !== 'object') return null;
        const toNum = (v: any) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };
        // Вложенные объекты opening/ending: { start, stop }
        const opObj = raw?.opening;
        const edObj = raw?.ending;
        const opening0 = raw?.skips?.opening?.[0];
        const ending0 = raw?.skips?.ending?.[0];
        const timings = Array.isArray(raw?.timings) ? raw.timings : [];
        const opTiming = timings.find((t: any) => /^(op|opening)$/i.test(String(t?.type || t?.kind || '')));
        const edTiming = timings.find((t: any) => /^(ed|ending)$/i.test(String(t?.type || t?.kind || '')));

        const opening = (() => {
            if (opObj && toNum(opObj.start) !== null && toNum(opObj.stop) !== null) return { start: toNum(opObj.start)!, end: toNum(opObj.stop)! };
            if (opening0 && toNum(opening0.start) !== null && toNum(opening0.end) !== null) return { start: toNum(opening0.start)!, end: toNum(opening0.end)! };
            if (opTiming && toNum(opTiming.start) !== null && toNum(opTiming.end) !== null) return { start: toNum(opTiming.start)!, end: toNum(opTiming.end)! };
            if (toNum(raw.opening_start) !== null && toNum(raw.opening_end) !== null) return { start: toNum(raw.opening_start)!, end: toNum(raw.opening_end)! };
            return undefined;
        })();
        const ending = (() => {
            if (edObj && toNum(edObj.start) !== null && toNum(edObj.stop) !== null) return { start: toNum(edObj.start)!, end: toNum(edObj.stop)! };
            if (ending0 && toNum(ending0.start) !== null && toNum(ending0.end) !== null) return { start: toNum(ending0.start)!, end: toNum(ending0.end)! };
            if (edTiming && toNum(edTiming.start) !== null && toNum(edTiming.end) !== null) return { start: toNum(edTiming.start)!, end: toNum(edTiming.end)! };
            if (toNum(raw.ending_start) !== null && toNum(raw.ending_end) !== null) return { start: toNum(raw.ending_start)!, end: toNum(raw.ending_end)! };
            return undefined;
        })();

        if (!opening && !ending) return null;
        return { opening, ending };
    };

    // Хотбар прогресса
    const hotbarRef = useRef<HTMLDivElement | null>(null);
    const percentPlayed = duration > 0 ? currentTime / duration : 0;
    // percentBuffered reserved for future UI; remove to avoid unused var warning
    const [hoverRatio, setHoverRatio] = useState<number | null>(null);

    const updateSeekByClientX = (clientX: number) => {
        const bar = hotbarRef.current;
        const video = videoRef.current;
        if (!bar || !video || duration <= 0) return;
        
        // При клике по прогресс-бару - пользователь взаимодействовал с плеером
        userInteractedRef.current = true;
        // Снимаем флаг принудительного mute от autoplay
        if (autoplayMutedRef.current && !isMuted) {
            autoplayMutedRef.current = false;
            try { video.muted = false; } catch {}
        }
        
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = ratio * duration;
        setIsBuffering(true);
        video.currentTime = newTime;
        setCurrentTime(newTime);
        // Сбрасываем состояние буферизации через 2 секунды после перемотки
        window.setTimeout(() => setIsBuffering(false), 2000);
    };

    const onHotbarMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
        setIsSeeking(true);
        updateSeekByClientX(e.clientX);
        const onMove = (ev: MouseEvent) => updateSeekByClientX(ev.clientX);
        const onUp = () => {
            setIsSeeking(false);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const onHotbarTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
        if (!e.touches?.[0]) return;
        setIsSeeking(true);
        updateSeekByClientX(e.touches[0].clientX);
        const onMove = (ev: TouchEvent) => {
            if (!ev.touches?.[0]) return;
            updateSeekByClientX(ev.touches[0].clientX);
        };
        const onEnd = () => {
            setIsSeeking(false);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
            window.removeEventListener('touchcancel', onEnd);
        };
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);
    };

    
    const handleContainerClick: React.MouseEventHandler<HTMLDivElement> = useCallback((e) => {
        // Проверяем, не кликнули ли по кнопке или интерактивному элементу
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[role="button"]') || target.closest('.player-icon-button') || target.closest('input') || target.closest('.player-hotbar')) {
            // Если кликнули по кнопке или хотбару, показываем UI но НЕ останавливаем событие
            pokeUi();
            return;
        }
        
        const wasHidden = !showUIRef.current;
        if (wasHidden) {
            pokeUi();
            // Не перенаправляем клик, если UI был скрыт - просто показываем его
            e.stopPropagation();
        }
    }, [pokeUi]);

    return (
        <div ref={containerRef} className="player-pc" style={{ ...containerStyle, cursor: isUIStable && showUI ? 'default' : 'none', pointerEvents: 'auto' }} onMouseMove={handleMouseMove} onClick={handleContainerClick}>
            {/* Видео */}
            <video ref={videoRef} className="player-video" style={videoStyle} onClick={(ev) => { if (!showUIRef.current) { ev.stopPropagation(); pokeUi(); return; } ev.stopPropagation(); showPlayPauseIcon(isPlaying); togglePlay(); }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} playsInline controls={false} />

            {/* Верхняя панель */}
            <div className={uiClasses.topbar}>
                <div className="player-topbar__left">
                    <div className="player-episode-title-main">{displayedTitle}</div>
                    { (displayedSubtitle ?? '').length > 0 && (
                        <div className="player-episode-sub">{displayedSubtitle}</div>
                    )}
                </div>
                <div className="player-topbar__right">
                    {/* Кнопка выбора источника скрыта для Yumeko */}
                    {selectedSource !== 'yumeko' && (
                        <IconButton 
                            label="Источник видео" 
                            onClick={() => setShowSourceDropdown(!showSourceDropdown)} 
                            className="player-source-toggle"
                        >
                            {showSourceDropdown ? (
                                <ChevronRight size={20} style={iconStyle} strokeWidth={2} />
                            ) : (
                                <ChevronLeft size={20} style={iconStyle} strokeWidth={2} />
                            )}
                        </IconButton>
                    )}
                </div>
            </div>

            {/* Центральные большие контролы */}
            <div className={uiClasses.centerControls}>
                <IconButton label="Предыдущая серия" onClick={() => { (onPrevEpisode ?? handlePrevEpisodeInternal)(); }} disabled={!onPrevEpisode && !playlistEpisodes.length} className="player-icon-button--circle">
                    <SkipBack size={24} style={iconStyle} strokeWidth={2} />
                </IconButton>
                <IconButton label={isPlaying ? 'Пауза' : 'Воспроизвести'} onClick={togglePlay} className="player-icon-button--circle player-icon-button--primary">
                    {isBuffering ? (
                        <Loader2 size={26} style={iconStyle} strokeWidth={2} className="player-buffering-spinner" />
                    ) : isPlaying ? (
                        <Pause size={26} style={iconStyle} strokeWidth={2} />
                    ) : (
                        <Play size={26} style={iconStyle} strokeWidth={2} />
                    )}
                </IconButton>
                <IconButton label="Следующая серия" onClick={() => { (onNextEpisode ?? handleNextEpisodeInternal)(); }} disabled={!onNextEpisode && !playlistEpisodes.length} className="player-icon-button--circle">
                    <SkipForward size={24} style={iconStyle} strokeWidth={2} />
                </IconButton>
            </div>

            {/* Кнопка пропуска опенинга/эндинга для Libria */}
            {selectedSource === 'libria' && libriaSkips && (
                (() => {
                    const t = currentTime;
                    const inOpening = !!(libriaSkips.opening && t >= (libriaSkips.opening.start || 0) && t < (libriaSkips.opening.end || 0));
                    const inEnding = !!(libriaSkips.ending && t >= (libriaSkips.ending.start || 0) && t < (libriaSkips.ending.end || 0));
                    if (!inOpening && !inEnding) return null;
                    const isOpening = inOpening;
                    const label = isOpening ? 'Пропустить Опенинг' : 'Пропустить Эндинг';
                    const handleSkip = () => {
                        const video = videoRef.current;
                        if (!video) return;
                        if (isOpening && libriaSkips.opening) {
                            video.currentTime = Math.min(libriaSkips.opening.end, video.duration || libriaSkips.opening.end);
                            hasSkippedOpeningRef.current = true;
                        } else if (!isOpening && libriaSkips.ending) {
                            video.currentTime = Math.min(libriaSkips.ending.end, video.duration || libriaSkips.ending.end);
                            hasSkippedEndingRef.current = true;
                        }
                    };
                    return (
                        <button className={`player-skip-button ${((isOpening && skipOpening) || (!isOpening && skipEnding)) ? 'has-auto' : ''}`} onClick={handleSkip} aria-label={label}>
                            <span className="player-skip-label">{label}</span>
                            {(((isOpening && skipOpening) || (!isOpening && skipEnding))) && (
                                <span className="player-skip-fill" style={{ width: `${Math.max(0, Math.min(100, skipAutoProgress * 100))}%` }} />
                            )}
                        </button>
                    );
                })()
            )}

            {/* Кнопка пропуска опенинга/эндинга для Kodik */}
            {selectedSource === 'kodik' && kodikSegments && kodikSegments.skip && (
                (() => {
                    const t = currentTime;
                    const currentSkipSegment = kodikSegments.skip.find(segment => 
                        t >= segment.start && t < segment.end
                    );
                    
                    if (!currentSkipSegment) return null;
                    
                    const isOpening = currentSkipSegment.start < 300; // Assume opening if within first 5 minutes
                    const label = isOpening ? 'Пропустить Опенинг' : 'Пропустить Эндинг';
                    const handleSkip = () => {
                        const video = videoRef.current;
                        if (!video) return;
                        video.currentTime = Math.min(currentSkipSegment.end, video.duration || currentSkipSegment.end);
                        if (isOpening) {
                            hasSkippedOpeningRef.current = true;
                        } else {
                            hasSkippedEndingRef.current = true;
                        }
                    };
                    
                    return (
                        <button className={`player-skip-button ${((isOpening && skipOpening) || (!isOpening && skipEnding)) ? 'has-auto' : ''}`} onClick={handleSkip} aria-label={label}>
                            <span className="player-skip-label">{label}</span>
                            {(((isOpening && skipOpening) || (!isOpening && skipEnding))) && (
                                <span className="player-skip-fill" style={{ width: `${Math.max(0, Math.min(100, skipAutoProgress * 100))}%` }} />
                            )}
                        </button>
                    );
                })()
            )}

            {/* Центральный OSD громкости */}
            {showOverlays?.kind === 'volume' && (
                <div className="player-osd-center">
                    {/* Иконка динамика по 3 состояниям */}
                    {(() => {
                        const vol = isMuted ? 0 : (showOverlays.value ?? volume);
                        if (vol === 0 || showOverlays.mode === 'mute') {
                            return <VolumeMuteIcon size={24} style={iconStyle} strokeWidth={2} />;
                        }
                        if (vol < 0.5) {
                            return <VolumeIcon size={24} style={iconStyle} strokeWidth={2} />;
                        }
                        return <VolumeHighIcon size={24} style={iconStyle} strokeWidth={2} />;
                    })()}
                    <span style={{ fontWeight: 600 }}>{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                </div>
            )}

            {/* Центральный спиннер буферизации */}
            {isBuffering && (
                <div className="player-osd-buffering">
                    <Loader2 size={32} style={iconStyle} strokeWidth={2} className="player-buffering-spinner" />
                </div>
            )}

            {/* OSD для перемотки */}
            {showOverlays?.kind === 'seek-backward' && (
                <div className="player-osd-left">
                    <RotateCcw size={28} style={iconStyle} strokeWidth={2.5} />
                    <span style={{ marginLeft: '8px', fontSize: '16px', fontWeight: '700' }}>10с</span>
                </div>
            )}
            {showOverlays?.kind === 'seek-forward' && (
                <div className="player-osd-right">
                    <RotateCw size={28} style={iconStyle} strokeWidth={2.5} />
                    <span style={{ marginLeft: '8px', fontSize: '16px', fontWeight: '700' }}>10с</span>
                </div>
            )}

            {/* Центр: уведомления на 5с */}
            {showOverlays?.kind === 'notice' && (
                <div className="player-osd-center" style={{ fontSize: 16, fontWeight: 600 }}>
                    {showOverlays.text}
                </div>
            )}

            {/* Центр: плей/пауза иконка */}
            {showOverlays?.kind === 'play-pause' && (
                <div className="player-osd-play-pause">
                    {showOverlays.value === 1 ? (
                        <Pause size={48} style={iconStyle} strokeWidth={2} fill="white" />
                    ) : (
                        <Play size={48} style={iconStyle} strokeWidth={2} fill="white" />
                    )}
                </div>
            )}

            {/* Хотбар над управлением - показывается только когда duration загружен */}
            {duration > 0 && (
                <div
                    ref={hotbarRef}
                    onMouseDown={onHotbarMouseDown}
                    onTouchStart={onHotbarTouchStart}
                    onMouseMove={(e) => {
                        const bar = hotbarRef.current;
                        if (!bar || duration <= 0) return;
                        const rect = bar.getBoundingClientRect();
                        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        setHoverRatio(ratio);
                    }}
                    onMouseLeave={() => setHoverRatio(null)}
                    className={uiClasses.hotbar}
                    aria-label="Прогресс серии"
                >
                    <div className="player-hotbar__track">
                        {/* Буферизированные сегменты */}
                        {bufferedRanges.map((r, i) => {
                            const left = `${Math.max(0, Math.min(100, (r.start / duration) * 100))}%`;
                            const width = `${Math.max(0, Math.min(100, ((r.end - r.start) / duration) * 100))}%`;
                            return <div key={i} className="player-hotbar__buffer-seg" style={{ left, width }} />;
                        })}
                        {/* Прогресс */}
                        <div className="player-hotbar__progress" style={{ width: `${Math.max(0, Math.min(100, percentPlayed * 100))}%` }} />
                        {/* Ползунок */}
                        <div className="player-hotbar__thumb" style={{ left: `${Math.max(0, Math.min(100, percentPlayed * 100))}%` }} />
                    </div>
                    {/* Подсказка времени */}
                    {hoverRatio !== null && (
                        <div className="player-hotbar__tooltip" style={{ left: `${hoverRatio * 100}%` }}>
                            {formatTime(hoverRatio * duration)}
                        </div>
                    )}
                    {/* Малый тайм-код справа над баром */}
                    <div className="player-hotbar__time">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                </div>
            )}

            {/* Панель управления */}
            <div className={uiClasses.controls}>
                <div className="player-controls__left">
                    <div className="player-back-wrapper" onMouseEnter={() => setShowBackTooltip(true)} onMouseLeave={() => setShowBackTooltip(false)}>
                        <Link href={`/anime-page/${animeId}`} style={{ display: 'inline-flex' }}>
                            <IconButton label="Назад к аниме">
                                <ChevronLeft size={20} style={iconStyle} strokeWidth={2} />
                            </IconButton>
                        </Link>
                        {showBackTooltip && (
                            <div className="player-back-tooltip">
                                <div className="player-back-tooltip__cover" style={{ backgroundImage: `url(${animeMeta?.coverUrl || ''})` }} />
                                <div className="player-back-tooltip__content">
                                    <div className="player-back-tooltip__title">{animeMeta?.title || ''}</div>
                                    <div className="player-back-tooltip__label">Назад к странице с аниме</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <IconButton label="Плейлист серий" onClick={() => setShowPlaylist(true)} className="player-icon-button--playlist">
                        <List size={20} style={iconStyle} strokeWidth={2} />
                    </IconButton>
                </div>

                <div className="player-controls__center">
                    <IconButton label="Предыдущая серия" onClick={() => { (onPrevEpisode ?? handlePrevEpisodeInternal)(); }} disabled={!onPrevEpisode && !playlistEpisodes.length}>
                        <SkipBack size={20} style={iconStyle} strokeWidth={2} />
                    </IconButton>
                    <IconButton label={isPlaying ? 'Пауза' : 'Воспроизвести'} onClick={togglePlay} className="player-icon-button--primary">
                        {isBuffering ? (
                            <Loader2 size={22} style={iconStyle} strokeWidth={2} className="player-buffering-spinner" />
                        ) : isPlaying ? (
                            <Pause size={22} style={iconStyle} strokeWidth={2} />
                        ) : (
                            <Play size={22} style={iconStyle} strokeWidth={2} />
                        )}
                    </IconButton>
                    <IconButton label="Следующая серия" onClick={() => { (onNextEpisode ?? handleNextEpisodeInternal)(); }} disabled={!onNextEpisode && !playlistEpisodes.length}>
                        <SkipForward size={20} style={iconStyle} strokeWidth={2} />
                    </IconButton>
                </div>

                <div className="player-controls__right">

                    <div className="player-volume-group">
                        <IconButton
                            label="Выключить звук"
                            onClick={toggleMute}
                            className="player-icon-button--volume"
                            onMouseEnter={showVolumeSliderWithTimeout}
                        >
                            {renderVolumeIcon(iconColor, iconStyle)}
                        </IconButton>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={isMuted ? 0 : volume}
                            onChange={e => setVolume(parseFloat(e.target.value))}
                            onInput={e => showVolumeOverlay(parseFloat((e.target as HTMLInputElement).value))}
                            className={`player-volume ${showVolumeSlider || isDraggingVolume || isVolumeSliderActive ? 'visible' : ''}`}
                            onMouseLeave={() => {
                                if (!isDraggingVolume) {
                                    setIsVolumeSliderActive(false);
                                    setShowVolumeSlider(false);
                                }
                            }}
                            onMouseDown={() => {
                                setIsDraggingVolume(true);
                                setIsVolumeSliderActive(true);
                            }}
                            onMouseUp={() => {
                                setIsDraggingVolume(false);
                                setIsVolumeSliderActive(false);
                            }}
                            style={{ ['--percent' as any]: `${(isMuted ? 0 : volume) * 100}%` }}
                            aria-label="Громкость"
                        />
                    </div>

                    <IconButton label="Настройки" onClick={() => setShowSettings(true)}>
                        <Settings size={18} style={iconStyle} strokeWidth={2} />
                    </IconButton>

                    <IconButton label="Полноэкранный режим" onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize size={20} style={iconStyle} strokeWidth={2} /> : <Maximize size={20} style={iconStyle} strokeWidth={2} />}
                    </IconButton>
                </div>
            </div>

            {/* Модальное окно настроек */}
            {showSettings && (
                <div className="player-settings-overlay" onClick={() => setShowSettings(false)}>
                    <div className="player-settings-modal" onClick={e => e.stopPropagation()}>
                        {/* Заголовок */}
                        <div className="player-settings-header">
                            {settingsSection !== 'main' && (
                                <button
                                    className="player-settings-back"
                                    onClick={() => setSettingsSection('main')}
                                >
                                    <ChevronLeft size={20} style={iconStyle} strokeWidth={2} />
                                    Назад
                                </button>
                            )}
                            <div className="player-settings-title">
                                {settingsSection === 'main' && 'Настройки'}
                                {settingsSection === 'quality' && 'Качество'}
                                {settingsSection === 'speed' && 'Скорость'}
                                {settingsSection === 'hotkeys' && 'Горячие клавиши'}
                            </div>
                            <button
                                className="player-settings-close"
                                onClick={() => setShowSettings(false)}
                            >
                                <X size={20} style={iconStyle} strokeWidth={2} />
                                Закрыть
                            </button>
                        </div>

                        {/* Основное меню */}
                        {settingsSection === 'main' && (
                            <div className="player-settings-content">
                                <div className="player-settings-section">
                                    <div className="player-settings-item" onClick={() => setSettingsSection('speed')}>
                                        <span>Скорость</span>
                                        <div className="player-settings-value">
                                            <span>{playbackSpeed}x</span>
                                            <ChevronRight size={16} style={iconStyle} strokeWidth={2} />
                                        </div>
                                    </div>
                                    <div className="player-settings-item" onClick={() => setSettingsSection('quality')}>
                                        <span>Качество</span>
                                        <div className="player-settings-value">
                                            <span>{getDisplayedQualityLabel()}</span>
                                            <ChevronRight size={16} style={iconStyle} strokeWidth={2} />
                                        </div>
                                    </div>
                                    <div className="player-settings-item" onClick={() => setSettingsSection('hotkeys')}>
                                        <span>Горячие клавиши</span>
                                        <div className="player-settings-value">
                                            <ChevronRight size={16} style={iconStyle} strokeWidth={2} />
                                        </div>
                                    </div>
                                </div>

                                <div className="player-settings-section">
                                    <div className="player-settings-section-title">Управление опенингом / эндингом</div>
                                    <div className="player-settings-item">
                                        <span>Пропускать опенинг</span>
                                        <div className="player-settings-toggle">
                                            <input
                                                type="checkbox"
                                                checked={skipOpening}
                                                onChange={e => { const v = e.target.checked; setSkipOpening(v); saveSettings({ skipOpening: v }); }}
                                                id="skip-opening"
                                            />
                                            <label htmlFor="skip-opening" />
                                        </div>
                                    </div>
                                    <div className="player-settings-item">
                                        <span>Пропускать эндинг</span>
                                        <div className="player-settings-toggle">
                                            <input
                                                type="checkbox"
                                                checked={skipEnding}
                                                onChange={e => { const v = e.target.checked; setSkipEnding(v); saveSettings({ skipEnding: v }); }}
                                                id="skip-ending"
                                            />
                                            <label htmlFor="skip-ending" />
                                        </div>
                                    </div>
                                </div>

                                <div className="player-settings-section">
                                    <div className="player-settings-section-title">Управление воспроизведением</div>
                                    <div className="player-settings-item">
                                        <span>Авто-воспроизведение</span>
                                        <div className="player-settings-toggle">
                                            <input
                                                type="checkbox"
                                                checked={autoPlay}
                                                onChange={e => { const v = e.target.checked; setAutoPlay(v); saveSettings({ autoPlay: v }); }}
                                                id="auto-play"
                                            />
                                            <label htmlFor="auto-play" />
                                        </div>
                                    </div>
                                    <div className="player-settings-item">
                                        <span>Авто-полноэкранный режим</span>
                                        <div className="player-settings-toggle">
                                            <input
                                                type="checkbox"
                                                checked={autoFullscreen}
                                                onChange={e => { const v = e.target.checked; setAutoFullscreen(v); saveSettings({ autoFullscreen: v }); }}
                                                id="auto-fullscreen"
                                            />
                                            <label htmlFor="auto-fullscreen" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Подменю качества */}
                        {settingsSection === 'quality' && (
                            <div className="player-settings-content">
                                <div className="player-settings-section">
                                    {selectedSource === 'libria' && libriaQualities.length ? (
                                        [
                                            { key: 'auto', label: 'Auto', url: '' },
                                            ...libriaQualities
                                        ].map(q => (
                                            <div
                                                key={q.key}
                                                className={`player-settings-item ${((libriaSelectedQualityKey === 'auto' ? libriaCurrentActiveKey : libriaSelectedQualityKey) === q.key) ? 'active' : ''}`}
                                                onClick={() => {
                                                    if (q.key === 'auto') {
                                                        setLibriaSelectedQualityKey('auto');
                                                        const activeKey = libriaCurrentActiveKey ?? chooseLibriaKey(libriaQualities) ?? (libriaQualities[0]?.key ?? null);
                                                        setLibriaCurrentActiveKey(activeKey);
                                                        if (activeKey) {
                                                            const active = libriaQualities.find(x => x.key === activeKey);
                                                            if (active) setFetchedSrc(active.url);
                                                        }
                                                    } else {
                                                        setLibriaSelectedQualityKey(q.key);
                                                        setLibriaCurrentActiveKey(q.key);
                                                        setFetchedSrc(q.url);
                                                    }
                                                    setSettingsSection('main');
                                                }}
                                            >
                                                <span>{q.label}</span>
                                                {((libriaSelectedQualityKey === 'auto' ? libriaCurrentActiveKey : libriaSelectedQualityKey) === q.key) && <div className="player-settings-check" />}
                                            </div>
                                        ))
                                    ) : selectedSource === 'kodik' && kodikQualities.length ? (
                                        [
                                            { key: 'auto', label: 'Auto', url: '' },
                                            ...kodikQualities
                                        ].map(q => (
                                            <div
                                                key={q.key}
                                                className={`player-settings-item ${((kodikSelectedQualityKey === 'auto' ? kodikCurrentActiveKey : kodikSelectedQualityKey) === q.key) ? 'active' : ''}`}
                                                onClick={() => {
                                                    if (q.key === 'auto') {
                                                        setKodikSelectedQualityKey('auto');
                                                        const activeKey = kodikCurrentActiveKey ?? (kodikQualities[0]?.key ?? null);
                                                        setKodikCurrentActiveKey(activeKey);
                                                        if (activeKey) {
                                                            const active = kodikQualities.find(x => x.key === activeKey);
                                                            if (active) setFetchedSrc(active.url);
                                                        }
                                                    } else {
                                                        setKodikSelectedQualityKey(q.key);
                                                        setKodikCurrentActiveKey(q.key);
                                                        setFetchedSrc(q.url);
                                                    }
                                                    setSettingsSection('main');
                                                }}
                                            >
                                                <span>{q.label}</span>
                                                {((kodikSelectedQualityKey === 'auto' ? kodikCurrentActiveKey : kodikSelectedQualityKey) === q.key) && <div className="player-settings-check" />}
                                            </div>
                                        ))
                                    ) : (
                                        qualityOptions.map(opt => (
                                            <div
                                                key={opt.value}
                                                className={`player-settings-item ${currentLevel === opt.value ? 'active' : ''}`}
                                                onClick={() => {
                                                    handleQualityChange(opt.value.toString());
                                                    setSettingsSection('main');
                                                }}
                                            >
                                                <span>{opt.label}</span>
                                                {currentLevel === opt.value && <div className="player-settings-check" />}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Подменю скорости */}
                        {settingsSection === 'speed' && (
                            <div className="player-settings-content">
                                <div className="player-settings-section">
                                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                        <div
                                            key={speed}
                                            className={`player-settings-item ${playbackSpeed === speed ? 'active' : ''}`}
                                            onClick={() => {
                                                setPlaybackSpeed(speed);
                                                setSettingsSection('main');
                                            }}
                                        >
                                            <span>{speed}x</span>
                                            {playbackSpeed === speed && <div className="player-settings-check" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Подменю горячих клавиш */}
                        {settingsSection === 'hotkeys' && (
                            <div className="player-settings-content">
                                <div className="player-settings-section">
                                    <div className="player-settings-item"><span>F / А</span><span className="player-settings-hotkey">Полноэкранный режим</span></div>
                                    <div className="player-settings-item"><span>K / Л / Пробел</span><span className="player-settings-hotkey">Воспроизвести / Пауза</span></div>
                                    <div className="player-settings-item"><span>P / З</span><span className="player-settings-hotkey">Плейлист серий</span></div>
                                    <div className="player-settings-item"><span>O / Щ</span><span className="player-settings-hotkey">Меню настроек</span></div>
                                    <div className="player-settings-item"><span>Y / Н</span><span className="player-settings-hotkey">Авто‑выбор качества</span></div>
                                    <div className="player-settings-item"><span>J / О</span><span className="player-settings-hotkey">Максимальное качество</span></div>
                                    <div className="player-settings-item"><span>N / Т</span><span className="player-settings-hotkey">Минимальное качество</span></div>
                                    <div className="player-settings-item"><span>, / Б</span><span className="player-settings-hotkey">Предыдущая серия</span></div>
                                    <div className="player-settings-item"><span>. / Ю</span><span className="player-settings-hotkey">Следующая серия</span></div>
                                    <div className="player-settings-item"><span>L / Д</span><span className="player-settings-hotkey">Автопропуск опенинга и эндинга</span></div>
                                    <div className="player-settings-item"><span>; / Ж</span><span className="player-settings-hotkey">Переключить опенинг</span></div>
                                    <div className="player-settings-item"><span>' / Э</span><span className="player-settings-hotkey">Переключить эндинг</span></div>
                                    <div className="player-settings-item"><span>← →</span><span className="player-settings-hotkey">Перемотка ±10с</span></div>
                                    <div className="player-settings-item"><span>↑ ↓</span><span className="player-settings-hotkey">Громкость ±10%</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Стрелочка открытия плейлиста (всегда видна) */}
            <div className={`player-playlist-arrow-wrapper ${showPlaylist ? 'open' : ''}`}>
                <button
                    className={`player-playlist-arrow ${showPlaylist ? 'open' : ''}`}
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    aria-label={showPlaylist ? 'Закрыть плейлист серий' : 'Открыть плейлист серий'}
                >
                    <ChevronRight size={20} style={iconStyle} strokeWidth={2.5} />
                </button>
                <div className="player-playlist-arrow-tooltip">
                    {showPlaylist ? 'Закрыть плейлист серий' : 'Открыть плейлист серий'}
                </div>
            </div>

            {/* Модальное окно плейлиста */}
            {showPlaylist && (
                <div className={`player-playlist-overlay ${showPlaylist ? 'open' : ''}`} onClick={() => setShowPlaylist(false)}>
                    <div className={`player-playlist-modal ${showPlaylist ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
                        {/* Заголовок */}
                        <div className="player-playlist-header">
                            <div className="player-playlist-title">Плейлист серий</div>
                            <button
                                className="player-playlist-close"
                                onClick={() => setShowPlaylist(false)}
                            >
                                <X size={20} style={iconStyle} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Список серий (используем данные из API для Libria/Kodik) */}
                        <div className="player-playlist-content">
                            {playlistEpisodes.length ? playlistEpisodes.map((ep) => (
                                <div
                                    key={ep.id}
                                    className={`player-playlist-item ${currentEpisode === ep.id ? 'active' : ''}`}
                                    onClick={() => {
                                        // Внутри плейлиста: не закрываем список
                        // СНАЧАЛА отмечаем переключение серии, чтобы временно не перетирать прогресс
                        isEpisodeSwitchingRef.current = true;
                                        // Затем сохраним прогресс текущей серии (не трогаем будущую полосу новой серии)
                                        try { persistProgress(); } catch {}
                        // Сбрасываем флаг пользовательского взаимодействия для новой серии
                        userInteractedRef.current = false;
                                        const prog = selectedSource === 'libria'
                                            ? getEpisodeProgressLibriaAnyVoice(animeId, ep.id)
                                            : getEpisodeProgress({ animeId, source: selectedSource, voice: getVoiceForProgress(), episodeId: ep.id });
                                        if (prog && prog.time > 0 && prog.duration > 0 && prog.time < prog.duration - 1) {
                                            if (autoPlay) {
                                                // автоплей включён → не показываем плашку, сразу применяем время при загрузке
                                                setResumePrompt(null);
                                                resumeCandidateRef.current = { epId: ep.id, time: prog.time, duration: prog.duration };
                                            } else {
                                                // показываем плашку «Продолжить»
                                                setResumePrompt({ epId: ep.id, time: prog.time, duration: prog.duration });
                                                resumeCandidateRef.current = { epId: ep.id, time: prog.time, duration: prog.duration };
                                            }
                                        } else {
                                            resumeCandidateRef.current = { epId: ep.id, time: 0, duration: prog?.duration ?? 0 };
                                        }
                                        // Не обновляем карту прогресса новой серии прямо сейчас,
                                        // чтобы её полоса не мигала: применим после клика по плашке или автозапуска
                                        setCurrentEpisode(ep.id);
                                    }}
                                >
                                    {/* Пульсирующий кружок для текущей серии */}
                                    {currentEpisode === ep.id && (
                                        <div className="player-playlist-current-indicator" />
                                    )}
                                    
                                    <div className="player-playlist-item-info">
                                        <span className="player-playlist-item-title">{ep.title}</span>
                                        <span className="player-playlist-item-duration">{ep.duration}</span>
                                    </div>
                                    {episodeProgressMap[ep.id] && (
                                        <div className="player-playlist-progress">
                                            <div className="player-playlist-progress__bar" style={{ width: `${Math.round(episodeProgressMap[ep.id].ratio * 100)}%` }} />
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="player-playlist-empty">Плейлист пуст</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Окно продолжения просмотра */}
            {resumePrompt && (
                <div className="player-resume-overlay" onClick={() => setResumePrompt(null)}>
                    <div className="player-resume" onClick={e => e.stopPropagation()}>
                        <div className="player-resume-title">Вы остановились на {formatTime(resumePrompt.time)}</div>
                        <div className="player-resume-actions">
                            <button className="player-resume-btn primary" onClick={() => {
                                const r = resumePrompt; if (!r) return;
                                setResumePrompt(null);
                                if (currentEpisode !== r.epId) setCurrentEpisode(r.epId);
                                const v = videoRef.current;
                                const apply = () => {
                                    // После подтверждения «Продолжить» разрешаем обновление прогресса текущей серии
                                    isEpisodeSwitchingRef.current = false;
                                    try {
                                        if (videoRef.current) {
                                            videoRef.current.currentTime = r.time;
                                        }
                                    } catch {}
                                    persistProgress();
                                    try {
                                        // Пользовательский клик → можно воспроизводить сразу
                                        (v ?? videoRef.current)?.play?.();
                                        setIsPlaying(true);
                                    } catch {}
                                };
                                if (v) {
                                    if (v.readyState >= 1) apply();
                                    else {
                                        const handler = () => { try { apply(); } catch {} };
                                        v.addEventListener('loadedmetadata', handler, { once: true } as any);
                                    }
                                }
                            }}>Продолжить</button>
                            <button className="player-resume-btn" onClick={() => {
                                // Полный сброс прогресса для серии и мгновенный старт с начала
                                const epId = resumePrompt.epId;
                                const voice = getVoiceForProgress();
                                try { setEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: epId }, { time: 0, duration: 0, updatedAt: Date.now(), opened: true }); } catch {}
                                setCurrentEpisode(epId);
                                resumeCandidateRef.current = { epId, time: 0, duration: 0 };
                                setResumePrompt(null);
                                const v = videoRef.current;
                                const apply = () => {
                                    try { if (videoRef.current) videoRef.current.currentTime = 0; } catch {}
                                    persistProgress();
                                    try { (v ?? videoRef.current)?.play?.(); setIsPlaying(true); } catch {}
                                };
                                if (v) {
                                    if (v.readyState >= 1) apply();
                                    else {
                                        const handler = () => { try { apply(); } catch {} };
                                        v.addEventListener('loadedmetadata', handler, { once: true } as any);
                                    }
                                }
                            }}>Начать заново</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Выдвигающееся окно выбора источника (скрыто для Yumeko) */}
            {showSourceDropdown && selectedSource !== 'yumeko' && (
                <div className="player-source-dropdown">
                    <div className="player-source-header">
                        <span>Источник:</span>
                        <button
                            className="player-source-close"
                            onClick={() => setShowSourceDropdown(false)}
                        >
                            <X size={18} style={iconStyle} strokeWidth={2} />
                        </button>
                    </div>
                    <div className="player-source-options">
                        <div 
                            className={`player-source-option ${selectedSource === 'kodik' ? 'active' : ''}`}
                            onClick={() => {
                                if (selectedSource !== 'kodik') {
                                    setIsSwitchingSource(true);
                                    if (switchingTimeoutRef.current) window.clearTimeout(switchingTimeoutRef.current);
                                    switchingTimeoutRef.current = window.setTimeout(() => setIsSwitchingSource(false), 800);
                                }
                                setSelectedSource('kodik');
                            }}
                        >
                            <span>Kodik</span>
                            {selectedSource === 'kodik' && <div className="player-source-check" />}
                        </div>
                        {isLibriaAvailable && (
                            <div 
                                className={`player-source-option ${selectedSource === 'libria' ? 'active' : ''}`}
                                onClick={() => {
                                    if (selectedSource !== 'libria') {
                                        setIsSwitchingSource(true);
                                        if (switchingTimeoutRef.current) window.clearTimeout(switchingTimeoutRef.current);
                                        switchingTimeoutRef.current = window.setTimeout(() => setIsSwitchingSource(false), 800);
                                    }
                                    setSelectedSource('libria');
                                }}
                            >
                                <span>Libria</span>
                                {selectedSource === 'libria' && <div className="player-source-check" />}
                            </div>
                        )}
                    </div>
                    
                    {/* Список озвучек только для Kodik */}
                    {selectedSource === 'kodik' && (
                        <div className="player-voice-list">
                            <div className="player-voice-header">Озвучки:</div>
                            <div className="player-voice-options">
                                {availableVoices.length ? availableVoices.map((voice) => (
                                    <div key={voice} className={`player-voice-option ${(String(voice).trim() === String(selectedKodikVoice ?? availableVoices[0]).trim()) ? 'player-selected-voiced-kodik' : ''}`} onClick={async () => {
                                        console.log('Kodik voice clicked:', { voice, selectedKodikVoice });
                                        // highlight immediately
                                        setSelectedKodikVoice(voice);
                                        console.log('selectedKodikVoice set to', voice);
                                        // keep the source dropdown open so user can continue selecting

                                        const kodikTitle = animeMeta?.kodik ?? animeMeta?.title ?? '';
                                        if (!kodikTitle) return;

                                        try {
                                            // Пытаемся использовать уже загруженную карту плейлистов по озвучкам
                                            let mapped = kodikPlaylistMap[voice];
                                            if (!mapped) {
                                                // Если в карте нет — фолбек: запросить снова только при необходимости
                                                const searchRes = await fetchKodikSearch(kodikTitle);
                                                const items = await fetchKodikEpisodesFromSearch(searchRes);
                                                const matched = items.find((it: any) => (it.translations || []).some((t: any) => String(t.title || t.name).trim() === String(voice).trim()));
                                                let epsArr: any[] = [];
                                                if (matched) {
                                                    const m = matched as Record<string, any>;
                                                    epsArr = m.episodes ?? m.list ?? [];
                                                    if ((!epsArr || !epsArr.length) && m.seasons && m.seasons[1] && m.seasons[1].episodes) {
                                                        const epsObj = m.seasons[1].episodes as Record<string, unknown>;
                                                        epsArr = Object.keys(epsObj).map(k => ({ id: Number(k), url: (epsObj as Record<string, unknown>)[k] }));
                                                    }
                                                }
                                                mapped = Array.isArray(epsArr) ? epsArr.map((e: any, idx: number) => ({ id: Number(e.id ?? e.ordinal ?? e.number ?? idx+1), title: e.title ?? `Серия ${e.id ?? idx+1}`, duration: typeof e.duration === 'number' ? `${Math.floor((e.duration as number)/60)}:${String((e.duration as number)%60).padStart(2,'0')}` : (e.duration as string | undefined), raw: e })) : [];
                                                setKodikPlaylistMap(prev => ({ ...prev, [voice]: mapped! }));
                                            }
                                            setPlaylistEpisodes(mapped ?? []);
                                            const firstId = (mapped && mapped[0]?.id) ?? 1;
                                            setCurrentEpisode(firstId);
                                            setLibriaSelectedQualityKey('auto');

                                            // fetch stream for first episode of chosen voice
                                            const res = await fetchKodikStream(kodikTitle, voice, firstId, true);
                                            
                                            // Store segments from Kodik response
                                            if (res?.segments) {
                                                setKodikSegments(res.segments);
                                                // Clear previously auto-skipped segments for new episode
                                                autoSkippedAdSegments.current.clear();
                                            }
                                            
                                            const links = res?.links as Record<string, { Src?: string }> | undefined;
                                            const hlsUrl = links ? (links['720']?.Src ?? links['480']?.Src ?? links['360']?.Src ?? links['240']?.Src) : (res?.link ?? res?.hls ?? res?.url ?? null);
                                            if (hlsUrl) setFetchedSrc(hlsUrl);
                                        } catch (err) {
                                            console.error('Error fetching Kodik data for voice', voice, err);
                                        }
                                    }}>
                                        <span>{voice}</span>
                                        {(String(voice).trim() === String(selectedKodikVoice ?? availableVoices[0]).trim()) && (
                                            <div className="player-source-check" />
                                        )}
                                    </div>
                                )) : (
                                    <div className="player-voice-option">Нет доступных озвучек</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


