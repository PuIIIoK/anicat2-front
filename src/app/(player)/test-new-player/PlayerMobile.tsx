"use client";
import { loadSettings, saveSettings } from '@/utils/player/settings';
import { savePlayerState } from '@/utils/player/playerState';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
    fetchAnimeMeta,
    fetchKodikSearch,
    fetchKodikStream,
    fetchLibriaEpisodes,
    fetchKodikEpisodesFromSearch,
    AnimeMeta,
    KodikSearchItem,
    KodikTranslation,
    LibriaEpisode,
    KodikStreamResponse,
    fetchLastWatchedProgress,
    fetchYumekoVoices,
    fetchYumekoEpisodes,
    fetchYumekoEpisodeStream,
    YumekoVoice,
    YumekoEpisode
} from './playerApi';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    List,
    Settings,
    Sliders,
    Headphones,
    X,
    ChevronLeft,
    Smartphone,
    Monitor
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getEpisodeProgress, upsertEpisodeProgress, getEpisodeProgressLibriaAnyVoice, setEpisodeProgress, upsertEpisodeProgressWithSync, fetchAndMergeFromServer, pushAllCacheForAnimeToServer } from '@/utils/player/progressCache';

interface PlayerMobileProps {
    animeId: string;
    animeMeta?: AnimeMeta | null;
    initError?: { code: number; message: string } | null;
    showSourceButton?: boolean;
}

type OverlayType = 'none' | 'source' | 'voice' | 'quality' | 'playlist';

export default function PlayerMobile({ animeId, animeMeta, initError, showSourceButton = true }: PlayerMobileProps) {
    const router = useRouter();
    // const pathname = usePathname(); // Не используется после отключения URL синхронизации
    // const searchParams = useSearchParams(); // Не используется после отключения URL синхронизации
    const containerRef = useRef<HTMLDivElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    
    // Флаги для управления автозапуском
    const didAutoStartRef = useRef<boolean>(false);
    const userInteractedRef = useRef<boolean>(false);

    const [selectedSource, setSelectedSource] = useState<'kodik' | 'libria' | 'yumeko'>(
        animeMeta?.source || 'kodik'
    );
    const [availableVoices, setAvailableVoices] = useState<string[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [yumekoVoices, setYumekoVoices] = useState<YumekoVoice[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedYumekoVoice, setSelectedYumekoVoice] = useState<YumekoVoice | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [yumekoEpisodes, setYumekoEpisodes] = useState<YumekoEpisode[]>([]);
    const [playlistEpisodes, setPlaylistEpisodes] = useState<Array<{ id: number; title: string; duration?: string; raw?: unknown }>>([]);
    const [currentEpisode, setCurrentEpisode] = useState<number>(1);

    const [libriaQualities, setLibriaQualities] = useState<Array<{ key: string; label: string; url: string }>>([]);
    const [libriaSelectedQualityKey, setLibriaSelectedQualityKey] = useState<string | null>(null);
    const [libriaCurrentActiveKey, setLibriaCurrentActiveKey] = useState<string | null>(null);
    const [kodikQualities, setKodikQualities] = useState<Array<{ key: string; label: string; url: string }>>([]);
    const [kodikSelectedQualityKey, setKodikSelectedQualityKey] = useState<string | null>(null);
    const [kodikCurrentActiveKey, setKodikCurrentActiveKey] = useState<string | null>(null);
    const [yumekoQualities, setYumekoQualities] = useState<Array<{ key: string; label: string; url: string }>>([]);
    const [yumekoSelectedQualityKey, setYumekoSelectedQualityKey] = useState<string | null>(null);
    const [yumekoCurrentActiveKey, setYumekoCurrentActiveKey] = useState<string | null>(null);

    const [fetchedSrc, setFetchedSrc] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [, setBufferedEnd] = useState(0);
    const [overlay, setOverlay] = useState<OverlayType>('none');
    const [resumePrompt, setResumePrompt] = useState<null | { epId: number; time: number; duration: number }>(null);
    const resumeCandidateRef = useRef<null | { epId: number; time: number; duration: number }>(null);
    // Store setters only; values are not currently read anywhere
    const [, setPanelClosing] = useState(false);
    const [, setInitialLoading] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true); // Горизонтальная ориентация по умолчанию
    const [settingsSection, setSettingsSection] = useState<'main' | 'quality' | 'speed' | 'hotkeys'>('main');
    const [skipOpening, setSkipOpening] = useState(false);
    const [skipEnding, setSkipEnding] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoFullscreen, setAutoFullscreen] = useState(false);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [isLibriaAvailable, setIsLibriaAvailable] = useState(false);

    // Принудительная горизонтальная ориентация при загрузке плеера
    useEffect(() => {
        const lockOrientation = async () => {
            try {
                // Пробуем заблокировать ориентацию в landscape
                if (screen.orientation && 'lock' in screen.orientation) {
                    await (screen.orientation as ScreenOrientation & { lock: (orientation: string) => Promise<void> }).lock('landscape');
                    setIsLandscape(true);
                }
            } catch (error) {
                console.log('Screen orientation lock not supported:', error);
                // Если не поддерживается, просто отслеживаем ориентацию
            }
        };

        lockOrientation();

        // При выходе из плеера - разблокируем ориентацию
        return () => {
            try {
                if (screen.orientation && 'unlock' in screen.orientation) {
                    (screen.orientation as ScreenOrientation & { unlock: () => void }).unlock();
                }
            } catch (error) {
                console.log('Screen orientation unlock error:', error);
            }
        };
    }, []);

    // Функция переключения ориентации
    const toggleOrientation = async () => {
        try {
            if (screen.orientation && 'lock' in screen.orientation) {
                const newOrientation = isLandscape ? 'portrait' : 'landscape';
                await (screen.orientation as ScreenOrientation & { lock: (orientation: string) => Promise<void> }).lock(newOrientation);
                setIsLandscape(!isLandscape);
            }
        } catch (error) {
            console.log('Failed to toggle orientation:', error);
        }
    };

    // Shared settings key across PC and Mobile
    useEffect(() => {
        const s = loadSettings();
        if (typeof s.skipOpening === 'boolean') setSkipOpening(s.skipOpening);
        if (typeof s.skipEnding === 'boolean') setSkipEnding(s.skipEnding);
        if (typeof s.autoPlay === 'boolean') setAutoPlay(s.autoPlay);
        if (typeof s.autoFullscreen === 'boolean') setAutoFullscreen(s.autoFullscreen);
        setSettingsLoaded(true);
    }, []);
    useEffect(() => {
        if (!settingsLoaded) return;
        saveSettings({ skipOpening, skipEnding, autoPlay, autoFullscreen });
    }, [settingsLoaded, skipOpening, skipEnding, autoPlay, autoFullscreen]);

    // Сохранение состояния плеера
    useEffect(() => {
        if (!animeId) return;
        
        const state = {
            episode: currentEpisode,
            source: selectedSource,
            voice: selectedSource === 'kodik' ? selectedVoice || undefined : undefined,
            time: currentTime
        };
        
        savePlayerState(animeId, state);
    }, [animeId, currentEpisode, selectedSource, selectedVoice, currentTime]);

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
    //     if (selectedVoice && selectedSource === 'kodik') {
    //         currentParams.set('voice', selectedVoice);
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
    // }, [animeMeta, searchParams, pathname, router, currentEpisode, selectedSource, selectedVoice, currentTime]);

    // Обновление URL при изменении параметров плеера (с debounce только для времени)
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
    //     if (selectedVoice && selectedSource === 'kodik') {
    //         currentParams.set('voice', selectedVoice);
    //     } else if (selectedSource === 'libria') {
    //         currentParams.delete('voice');
    //     }
    //     
    //     const newURL = `${pathname}?${currentParams.toString()}`;
    //     router.replace(newURL, { scroll: false });
    // }, [animeMeta, searchParams, pathname, router, currentEpisode, selectedSource, selectedVoice]);

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

    // Флаг для определения, есть ли базовые параметры (для загрузки прогресса с сервера)
    const hasPlayerParamsInURL = useMemo(() => {
        // Если есть базовые параметры аниме - плеер готов загрузить прогресс с сервера
        // Для Yumeko проверяем наличие voiceId и episodeId
        return !!(animeMeta?.kodik || animeMeta?.title || (animeMeta?.source === 'yumeko' && animeMeta?.voiceId && animeMeta?.episodeId));
    }, [animeMeta]);

    // Последовательная инициализация плеера на основе прогресса с сервера
    useEffect(() => {
        if (!animeMeta || !hasPlayerParamsInURL || !animeId) return;
        
        console.log('[Server-init] Starting player initialization from server progress');
        
        const initializeFromServerProgress = async () => {
            try {
                // 1. Получаем последний прогресс с сервера
                const lastProgress = await fetchLastWatchedProgress(animeId);
                console.log('[Server-init] Fetched last progress from server:', lastProgress);
                
                // 2. Если прогресс найден - используем его для инициализации
                if (lastProgress && lastProgress.source) {
                    const targetSource = lastProgress.source as 'kodik' | 'libria';
                    console.log('[Server-init] Setting source from progress:', targetSource);
                    setSelectedSource(targetSource);
                    
                    // Ждем немного чтобы источник установился
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // 3. Если Kodik - получаем список озвучек и устанавливаем нужную
                    if (targetSource === 'kodik') {
                        const kodikTitle = animeMeta?.kodik ?? animeMeta?.title ?? null;
                        if (kodikTitle) {
                            console.log('[Mobile-Server-init] Step 1: Fetching Kodik voices for:', kodikTitle);
                            
                            // ЭТАП 1: Получаем список озвучек
                            const searchRes = await fetchKodikSearch(kodikTitle);
                            const items = await fetchKodikEpisodesFromSearch(searchRes);

                            // Build map: translation/title -> episodes array
                            const map: Record<string, Array<{ id: number; title: string; duration?: string; raw?: unknown }>> = {};
                            const voicesSet = new Set<string>();

                            items.forEach((it: KodikSearchItem) => {
                                const translationsRaw = it.translations || (it.translation ? [it.translation] : []);
                                const translations = Array.isArray(translationsRaw) ? translationsRaw as KodikTranslation[] : [];
                                let epsArr: unknown[] = [];
                                if (Array.isArray(it.episodes) && it.episodes.length) epsArr = it.episodes as unknown[];
                                else if (Array.isArray(it.list) && it.list.length) epsArr = it.list as unknown[];
                                else if (it.seasons && (it.seasons as Record<string, unknown>)[1] && ((it.seasons as Record<string, unknown>)[1] as Record<string, unknown>)['episodes']) {
                                    const epsObj = ((it.seasons as Record<string, unknown>)[1] as Record<string, unknown>)['episodes'] as Record<string, unknown>;
                                    epsArr = Object.keys(epsObj).map(k => ({ id: Number(k), url: epsObj[k] }));
                                }

                                translations.forEach((t: KodikTranslation) => {
                                    const ttitle = String((t && (t.title || t.name)) ? (t.title || t.name) : t);
                                    voicesSet.add(ttitle);
                                    if (!map[ttitle]) map[ttitle] = [];
                                    if (epsArr && epsArr.length) {
                                        const mapped = epsArr.map((e: unknown, idx: number) => {
                                            const eObj = e as Record<string, unknown>;
                                            const id = Number(eObj['id'] ?? eObj['ordinal'] ?? eObj['number'] ?? idx + 1);
                                            return {
                                                id,
                                                title: (eObj['title'] as string) ?? `Серия ${id}`,
                                                duration: typeof eObj['duration'] === 'number'
                                                    ? formatEpisodeDurationNumber(normalizeDurationToSeconds(eObj['duration'] as number))
                                                    : (typeof eObj['duration'] === 'string' ? eObj['duration'] as string : undefined),
                                                raw: e
                                            };
                                        });
                                        map[ttitle] = map[ttitle].concat(mapped);
                                    }
                                });
                            });

                            const voices = Array.from(voicesSet).map(v => String(v).trim()).filter(Boolean);
                            console.log('[Mobile-Server-init] Step 2: Available voices loaded:', voices);

                            // Если нет реальных озвучек, не пытаемся загружать стрим
                            if (voices.length === 0) {
                                console.log('[Mobile-Server-init] No voices found, skipping stream fetch');
                                return;
                            }

                            // ЭТАП 2: Устанавливаем доступные озвучки
                            setAvailableVoices(voices.length ? voices : ['Default']);

                            // ЭТАП 3: Устанавливаем озвучку из прогресса
                            let targetVoice = lastProgress.voice || null;
                            if (!targetVoice || !voices.includes(targetVoice)) {
                                targetVoice = voices[0] ?? null;
                                console.log('[Mobile-Server-init] Step 3: Voice not found in progress, using fallback:', targetVoice);
                            } else {
                                console.log('[Mobile-Server-init] Step 3: Using voice from progress:', targetVoice);
                            }
                            
                            if (!targetVoice) {
                                console.log('[Mobile-Server-init] No valid voice found, skipping stream fetch');
                                return;
                            }
                            
                            const mapped = map[targetVoice] ?? [];
                            
                            // ЭТАП 4: Устанавливаем выбранную озвучку и список серий
                            setSelectedVoice(targetVoice);
                            setPlaylistEpisodes(mapped);

                            // ЭТАП 5: Устанавливаем серию из прогресса
                            const targetEpisode = lastProgress.episodeId || mapped[0]?.id || 1;
                            console.log('[Mobile-Server-init] Step 4: Episodes list loaded, using episode from progress:', targetEpisode);
                            setCurrentEpisode(targetEpisode);

                            // ЭТАП 6: Загружаем стрим для выбранной озвучки и серии
                            console.log('[Mobile-Server-init] Step 5: Starting stream fetch for voice:', targetVoice, 'episode:', targetEpisode);
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
                                
                                if (qlist.length > 0) {
                                    setFetchedSrc(qlist[0].url);
                                }
                            }

                            // ЭТАП 7: Включаем автозапуск
                            console.log('[Mobile-Server-init] Step 6: Stream loaded, enabling autoplay');
                            setAutoPlay(true);
                        }
                    } else if (targetSource === 'libria') {
                        console.log('[Mobile-Server-init] Step 1: Initializing Libria from server progress');
                        
                        // ЭТАП 1: Инициализируем Libria эпизоды
                        await bootstrapLibria(animeId);
                        
                        // ЭТАП 2: Устанавливаем серию из прогресса
                        const targetEpisode = lastProgress.episodeId || 1;
                        console.log('[Mobile-Server-init] Step 2: Setting Libria episode from progress:', targetEpisode);
                        setCurrentEpisode(targetEpisode);
                        
                        // ЭТАП 3: Включаем автозапуск
                        console.log('[Mobile-Server-init] Step 3: Libria initialized, enabling autoplay');
                        setAutoPlay(true);
                    }
                } else {
                    // Если прогресс не найден - инициализируем обычным образом (первая серия, первая озвучка)
                    console.log('[Mobile-Server-init] No progress found, initializing with default settings');
                    
                    // Устанавливаем источник по умолчанию
                    setSelectedSource('kodik');
                    
                    // Ждем немного чтобы источник установился
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Инициализируем Kodik с параметрами из URL
                    const kodikTitle = animeMeta?.kodik ?? animeMeta?.title ?? null;
                    if (kodikTitle) {
                        console.log('[Mobile-Server-init] Step 1: Fetching Kodik voices for:', kodikTitle);
                        
                        // ЭТАП 1: Получаем список озвучек
                        const searchRes = await fetchKodikSearch(kodikTitle);
                        const items = await fetchKodikEpisodesFromSearch(searchRes);

                        // Build map: translation/title -> episodes array
                        const map: Record<string, Array<{ id: number; title: string; duration?: string; raw?: unknown }>> = {};
                        const voicesSet = new Set<string>();

                        items.forEach((it: KodikSearchItem) => {
                            const translationsRaw = it.translations || (it.translation ? [it.translation] : []);
                            const translations = Array.isArray(translationsRaw) ? translationsRaw as KodikTranslation[] : [];
                            let epsArr: unknown[] = [];
                            if (Array.isArray(it.episodes) && it.episodes.length) epsArr = it.episodes as unknown[];
                            else if (Array.isArray(it.list) && it.list.length) epsArr = it.list as unknown[];
                            else if (it.seasons && (it.seasons as Record<string, unknown>)[1] && ((it.seasons as Record<string, unknown>)[1] as Record<string, unknown>)['episodes']) {
                                const epsObj = ((it.seasons as Record<string, unknown>)[1] as Record<string, unknown>)['episodes'] as Record<string, unknown>;
                                epsArr = Object.keys(epsObj).map(k => ({ id: Number(k), url: epsObj[k] }));
                            }

                            translations.forEach((t: KodikTranslation) => {
                                const ttitle = String((t && (t.title || t.name)) ? (t.title || t.name) : t);
                                voicesSet.add(ttitle);
                                if (!map[ttitle]) map[ttitle] = [];
                                if (epsArr && epsArr.length) {
                                    const mapped = epsArr.map((e: unknown, idx: number) => {
                                        const eObj = e as Record<string, unknown>;
                                        const id = Number(eObj['id'] ?? eObj['ordinal'] ?? eObj['number'] ?? idx + 1);
                                        return {
                                            id,
                                            title: (eObj['title'] as string) ?? `Серия ${id}`,
                                            duration: typeof eObj['duration'] === 'number'
                                                ? formatEpisodeDurationNumber(normalizeDurationToSeconds(eObj['duration'] as number))
                                                : (typeof eObj['duration'] === 'string' ? eObj['duration'] as string : undefined),
                                            raw: e
                                        };
                                    });
                                    map[ttitle] = map[ttitle].concat(mapped);
                                }
                            });
                        });

                        const voices = Array.from(voicesSet).map(v => String(v).trim()).filter(Boolean);
                        console.log('[Mobile-Server-init] Step 2: Available voices loaded:', voices);

                        // Если нет реальных озвучек, не пытаемся загружать стрим
                        if (voices.length === 0) {
                            console.log('[Mobile-Server-init] No voices found, skipping stream fetch');
                            return;
                        }

                        // ЭТАП 2: Устанавливаем доступные озвучки
                        setAvailableVoices(voices.length ? voices : ['Default']);

                        // ЭТАП 3: Устанавливаем первую доступную озвучку и список серий
                        const defaultVoice = voices[0] ?? null;
                        if (defaultVoice) {
                            console.log('[Mobile-Server-init] Step 3: Setting default voice and episodes list');
                            
                            setSelectedVoice(defaultVoice);
                            const mapped = map[defaultVoice] ?? [];
                            setPlaylistEpisodes(mapped);
                            const firstId = mapped[0]?.id ?? 1;
                            setCurrentEpisode(firstId);
                            
                            console.log('[Mobile-Server-init] Step 4: Episodes list loaded, starting stream fetch');
                            
                            // ЭТАП 4: Загружаем стрим для выбранной озвучки и серии
                            const res = await fetchKodikStream(kodikTitle, defaultVoice, firstId, true);
                            
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
                                
                                if (qlist.length > 0) {
                                    setFetchedSrc(qlist[0].url);
                                }
                            }
                            
                            console.log('[Mobile-Server-init] Step 5: Stream loaded, setting video source');
                        }
                    } else {
                        // Если нет Kodik параметров, пробуем Libria
                        console.log('[Mobile-Server-init] No Kodik params, trying Libria initialization');
                        try {
                            await bootstrapLibria(animeId);
                        } catch (e) {
                            console.warn('[Mobile-Server-init] Libria bootstrap failed:', e);
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

    // Отдельный useEffect для инициализации Yumeko источника
    useEffect(() => {
        if (!animeMeta || !animeId) return;
        
        // Только для Yumeko источника
        if (animeMeta.source !== 'yumeko') return;
        
        console.log('[Yumeko-Mobile-init] Starting Yumeko player initialization');
        
        const initializeYumeko = async () => {
            try {
                // Загружаем озвучки для аниме
                console.log('[Yumeko-Mobile-init] Loading Yumeko voices for anime:', animeId);
                const voices = await fetchYumekoVoices(animeId);
                
                if (voices && voices.length > 0) {
                    console.log('[Yumeko-Mobile-init] Yumeko voices loaded:', voices);
                    setYumekoVoices(voices);
                    setSelectedSource('yumeko');
                    
                    // Если есть voiceId в meta - используем его, иначе первую озвучку
                    const targetVoice = animeMeta.voiceId 
                        ? voices.find(v => v.id === animeMeta.voiceId) || voices[0]
                        : voices[0];
                    
                    setSelectedYumekoVoice(targetVoice);
                    
                    // Загружаем эпизоды для выбранной озвучки
                    console.log('[Yumeko-Mobile-init] Loading Yumeko episodes for voice:', targetVoice.id);
                    const episodes = await fetchYumekoEpisodes(targetVoice.id);
                    
                    if (episodes && episodes.length > 0) {
                        console.log('[Yumeko-Mobile-init] Yumeko episodes loaded:', episodes);
                        setYumekoEpisodes(episodes);
                        
                        // Маппим эпизоды в формат плейлиста
                        const mapped = episodes.map(e => ({
                            id: e.episodeNumber,
                            title: e.title || `Эпизод ${e.episodeNumber}`,
                            duration: undefined,
                            raw: e
                        }));
                        setPlaylistEpisodes(mapped);
                        
                        // Если есть episodeNumber в meta - используем его, иначе первый эпизод
                        const targetEpisodeNumber = animeMeta.episodeNumber || episodes[0].episodeNumber;
                        const targetEpisode = episodes.find(e => e.episodeNumber === targetEpisodeNumber) || episodes[0];
                        
                        setCurrentEpisode(targetEpisodeNumber);
                        
                        // Загружаем HLS поток для выбранного эпизода
                        console.log('[Yumeko-Mobile-init] Loading Yumeko stream for episode:', targetEpisode.id);
                        const hlsUrl = await fetchYumekoEpisodeStream(targetEpisode.id);
                        
                        if (hlsUrl) {
                            console.log('[Yumeko-Mobile-init] Yumeko stream loaded:', hlsUrl);
                            setFetchedSrc(hlsUrl);
                            
                            // Получаем реальные качества из m3u8
                            const yumekoQualityList = await parseYumekoQualities(hlsUrl);
                            setYumekoQualities(yumekoQualityList);
                            setYumekoSelectedQualityKey('auto');
                            
                            // Устанавливаем активное качество - выбираем лучшее из доступных
                            const bestQuality = yumekoQualityList.find(q => q.key !== 'auto')?.key ?? '720';
                            setYumekoCurrentActiveKey(bestQuality);
                        }
                    }
                }
            } catch (error) {
                console.error('[Yumeko-Mobile-init] Error during Yumeko initialization:', error);
            }
        };
        
        initializeYumeko();
    }, [animeMeta, animeId]);

    // Отдельный useEffect для инициализации Libria источника
    useEffect(() => {
        if (!animeMeta || !animeId) return;
        
        // Только для Libria источника
        if (animeMeta.source !== 'libria') return;
        
        console.log('[Libria-Mobile-init] Starting Libria player initialization');
        
        const initializeLibria = async () => {
            try {
                // Устанавливаем источник
                setSelectedSource('libria');
                
                // Загружаем эпизоды
                console.log('[Libria-Mobile-init] Loading Libria episodes for anime:', animeId);
                const eps = await fetchLibriaEpisodes(animeId);
                
                if (eps && eps.length > 0) {
                    console.log('[Libria-Mobile-init] Libria episodes loaded:', eps);
                    
                    // Маппим эпизоды в формат плейлиста
                    const mapped = eps.map((e: LibriaEpisode, idx: number) => ({
                        id: Number(e.ordinal ?? idx + 1),
                        title: (e.title ?? `Эпизод ${e.ordinal ?? idx + 1}`) as string,
                        duration: undefined,
                        raw: e
                    }));
                    setPlaylistEpisodes(mapped);
                    
                    // Определяем целевой эпизод (из meta или первый)
                    const targetEpisodeNumber = animeMeta.episodeNumber || 1;
                    const targetEpisode = eps.find((e: LibriaEpisode) => e.ordinal === targetEpisodeNumber) || eps[0];
                    
                    setCurrentEpisode(targetEpisodeNumber);
                    console.log('[Libria-Mobile-init] Selected Libria episode:', targetEpisodeNumber);
                    
                    // Устанавливаем качество по умолчанию
                    const qlist = [
                        { key: 'auto', label: 'Авто', url: '' as string },
                        { key: '1080', label: '1080p', url: (targetEpisode?.hls_1080 || '') as string },
                        { key: '720', label: '720p', url: (targetEpisode?.hls_720 || '') as string },
                        { key: '480', label: '480p', url: (targetEpisode?.hls_480 || '') as string }
                    ].filter(q => q.key === 'auto' || q.url);
                    
                    setLibriaQualities(qlist);
                    setLibriaSelectedQualityKey('auto');
                    
                    // Устанавливаем активное качество - выбираем лучшее из доступных
                    const bestQuality = qlist.find(q => q.key !== 'auto')?.key ?? '720';
                    setLibriaCurrentActiveKey(bestQuality);
                }
            } catch (error) {
                console.error('[Libria-Mobile-init] Error during Libria initialization:', error);
            }
        };
        
        initializeLibria();
    }, [animeMeta, animeId]);

    const sourceUrl = useMemo(() => fetchedSrc ?? undefined, [fetchedSrc]);

    const [showControls, setShowControls] = useState(true);
    const hideTimerRef = useRef<number | null>(null);
    const lastTapTimeRef = useRef<number | null>(null);
    const lastTapSideRef = useRef<'left' | 'right' | null>(null);
    const singleTapTimeoutRef = useRef<number | null>(null);
    // scrubbing state for visual drag on progress bar
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubTime, setScrubTime] = useState<number | null>(null);
    const [seekBadge, setSeekBadge] = useState<null | { side: 'forward' | 'back'; count: number }>(null);
    const seekBadgeTimerRef = useRef<number | null>(null);
    const [libriaSkips, setLibriaSkips] = useState<null | { opening?: { start: number; end: number }, ending?: { start: number; end: number } }>(null);
    const [kodikSegments, setKodikSegments] = useState<null | { ad?: Array<{ start: number; end: number }>; skip?: Array<{ start: number; end: number }> }>(null);
    const [activeSkip, setActiveSkip] = useState<null | 'opening' | 'ending'>(null);
    const autoSkippedAdSegments = useRef<Set<string>>(new Set());
    const [skipProgress, setSkipProgress] = useState(0);
    const isEpisodeSwitchingRef = useRef<boolean>(false);
    const skipTimerRef = useRef<number | null>(null);
    const skipStartRef = useRef<number | null>(null);
    const hasSkippedOpeningRef = useRef(false);
    const hasSkippedEndingRef = useRef(false);
    const [tapRipples, setTapRipples] = useState<Array<{ id: number; x: number; y: number; kind: 'single' | 'forward' | 'back' }>>([]);
    const rippleIdRef = useRef(0);

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

    const normalizeDurationToSeconds = (value: number) => {
        if (!Number.isFinite(value)) return 0;
        return value > 10000 ? Math.floor(value / 1000) : Math.floor(value);
    };

    const formatEpisodeDurationNumber = (value: number) => {
        const total = Math.max(0, Math.floor(value));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    // Build Kodik voices/playlist and first episode
    const bootstrapKodik = useCallback(async (meta: AnimeMeta | null) => {
        const kodikTitle = (meta as AnimeMeta | null)?.kodik ?? (meta as AnimeMeta | null)?.title ?? null;
        if (!kodikTitle) return;
        
        console.log('[Mobile-Init] Step 1: Fetching Kodik voices for:', kodikTitle);
        
        // ЭТАП 1: Получаем список озвучек
        const searchRes = await fetchKodikSearch(kodikTitle);
        const items = (await fetchKodikEpisodesFromSearch(searchRes)) as KodikSearchItem[];
        const map: Record<string, Array<{ id: number; title: string; duration?: string; raw?: KodikSearchItem | unknown }>> = {};
        const voicesSet = new Set<string>();
        items.forEach((it: KodikSearchItem) => {
            const translationsRaw = it.translations ?? (it.translation ? [it.translation] : []);
            const translations = Array.isArray(translationsRaw) ? translationsRaw as KodikTranslation[] : [];
            let epsArr: unknown[] = [];
            if (Array.isArray(it.episodes) && it.episodes.length) epsArr = it.episodes as unknown[];
            else if (Array.isArray(it.list) && it.list.length) epsArr = it.list as unknown[];
            else if (it.seasons && (it.seasons as Record<string, unknown>)[1] && ((it.seasons as Record<string, unknown>)[1] as Record<string, unknown>)['episodes']) {
                const epsObj = ((it.seasons as Record<string, unknown>)[1] as Record<string, unknown>)['episodes'] as Record<string, unknown>;
                epsArr = Object.keys(epsObj).map(k => ({ id: Number(k), url: epsObj[k] }));
            }
            translations.forEach((t: KodikTranslation) => {
                const ttitle = String((t && (t.title || t.name)) ? (t.title || t.name) : t);
                voicesSet.add(ttitle);
                if (!map[ttitle]) map[ttitle] = [];
                if (epsArr && epsArr.length) {
                    const mapped = epsArr.map((e: unknown, idx: number) => {
                        const eObj = e as Record<string, unknown>;
                        const id = Number(eObj['id'] ?? eObj['ordinal'] ?? eObj['number'] ?? idx + 1);
                        const durationVal = eObj['duration'];
                        return {
                            id,
                            title: (eObj['title'] as string | undefined) ?? `Серия ${id}`,
                            duration: typeof durationVal === 'number'
                                ? formatEpisodeDurationNumber(normalizeDurationToSeconds(durationVal as number))
                                : (typeof durationVal === 'string' ? (durationVal as string) : undefined),
                            raw: e
                        };
                    });
                    map[ttitle] = map[ttitle].concat(mapped);
                }
            });
        });
        const voices = Array.from(voicesSet).map(v => String(v).trim()).filter(Boolean);
        
        // Если нет реальных озвучек, не пытаемся загружать стрим
        if (voices.length === 0) {
            console.log('[Mobile-Init] No voices found, skipping stream fetch');
            return;
        }
        
        // ЭТАП 2: Устанавливаем доступные озвучки
        setAvailableVoices(voices.length ? voices : ['Default']);
        console.log('[Mobile-Init] Step 2: Available voices loaded:', voices);
        
        const defaultVoice = voices[0] ?? (items[0] && Array.isArray((items[0] as KodikSearchItem).translations) ? ((items[0] as KodikSearchItem).translations![0]?.title) : undefined) ?? null;
        if (!defaultVoice) return;
        
        // Только устанавливаем voice и episode если нет URL параметров
        const currentHasPlayerParams = !!(meta?.source || meta?.episode || meta?.voice || meta?.time);
        if (!currentHasPlayerParams) {
            console.log('[Mobile-Init] Step 3: Setting default voice and episodes list');
            
            // ЭТАП 3: Устанавливаем озвучку и список серий
            setSelectedVoice(defaultVoice);
            const mapped = map[defaultVoice] ?? [];
            setPlaylistEpisodes(mapped);
            const firstId = mapped[0]?.id ?? 1;
            setCurrentEpisode(firstId);
            
            console.log('[Mobile-Init] Step 4: Episodes list loaded, starting stream fetch');
            
            // ЭТАП 4: Загружаем стрим для выбранной озвучки и серии
            const res = await fetchKodikStream(kodikTitle, defaultVoice, firstId, true) as KodikStreamResponse | null;
            
            // Store segments from Kodik response
            if (res?.segments) {
                setKodikSegments(res.segments);
                autoSkippedAdSegments.current.clear();
            }
            
            const hlsUrl = res ? (res.links ? (((res.links as Record<string, unknown>)['720'] as Record<string, unknown>)?.['Src'] as string ?? ((res.links as Record<string, unknown>)['480'] as Record<string, unknown>)?.['Src'] as string ?? ((res.links as Record<string, unknown>)['360'] as Record<string, unknown>)?.['Src'] as string ?? ((res.links as Record<string, unknown>)['240'] as Record<string, unknown>)?.['Src'] as string) : (res.link ?? res.hls ?? res.url ?? null)) : null;
            
            console.log('[Mobile-Init] Step 5: Stream loaded, setting video source');
            setFetchedSrc(hlsUrl ?? null);
        }
    }, []);

    // Build Libria episodes/qualities
    const bootstrapLibria = useCallback(async (id: string) => {
        const eps = await fetchLibriaEpisodes(id);
        if (!eps || !Array.isArray(eps)) {
            setIsLibriaAvailable(false);
            return;
        }
        setIsLibriaAvailable(true);
        const mapped = eps.map((e: LibriaEpisode, idx: number) => ({
            id: Number(e.ordinal ?? e.number ?? idx + 1),
            title: e.name ?? `Эпизод ${e.ordinal ?? e.number ?? idx + 1}`,
            duration: typeof e.duration === 'number'
                ? formatEpisodeDurationNumber(normalizeDurationToSeconds(e.duration as number))
                : (typeof e.duration === 'string' ? (e.duration as string) : undefined),
            raw: e
        }));
        setPlaylistEpisodes(mapped);
        setCurrentEpisode(mapped[0]?.id ?? 1);
        const firstRaw = mapped[0]?.raw ?? null;
        if (firstRaw) {
            // extract Libria skips for opening/ending
            const fr = firstRaw as Record<string, unknown>;
            const opening0 = fr['opening'] ?? (fr['skips'] && (fr['skips'] as Record<string, unknown>)['opening'] ? ((fr['skips'] as Record<string, unknown>)['opening'] as unknown[])[0] : undefined);
            const ending0 = fr['ending'] ?? (fr['skips'] && (fr['skips'] as Record<string, unknown>)['ending'] ? ((fr['skips'] as Record<string, unknown>)['ending'] as unknown[])[0] : undefined);
            const segs: Record<string, { start: number; end: number }> = {};
            if (opening0) {
                const o = opening0 as Record<string, unknown>;
                const startVal = o['start'];
                const stopVal = o['stop'] ?? o['stop'];
                if (typeof startVal !== 'undefined' && typeof stopVal !== 'undefined') {
                    const s = normalizeDurationToSeconds(Number(startVal));
                    const e = normalizeDurationToSeconds(Number(stopVal));
                    if (Number.isFinite(s) && Number.isFinite(e)) segs.opening = { start: s, end: e };
                }
            }
            if (ending0) {
                const o = ending0 as Record<string, unknown>;
                const startVal = o['start'];
                const stopVal = o['stop'];
                if (typeof startVal !== 'undefined' && typeof stopVal !== 'undefined') {
                    const s = normalizeDurationToSeconds(Number(startVal));
                    const e = normalizeDurationToSeconds(Number(stopVal));
                    if (Number.isFinite(s) && Number.isFinite(e)) segs.ending = { start: s, end: e };
                }
            }
            setLibriaSkips(Object.keys(segs).length ? segs : null);
            const keys = Object.keys(fr).filter(k => /^hls_?/i.test(k));
            const qlist = keys.map(k => ({ key: k, label: k.replace(/hls_?/i, '') + 'p', url: fr[k] as string })).filter(q => q.url);
            setLibriaQualities(qlist);
            setLibriaSelectedQualityKey('auto');
            const defaultKey = qlist.find(q => /1080|720/.test(q.label))?.key ?? qlist[0]?.key ?? null;
            setLibriaCurrentActiveKey(defaultKey);
            const chosen = qlist.find(q => q.key === defaultKey) ?? qlist[0];
            if (chosen) setFetchedSrc(chosen.url);
        }
    }, []);

    // Initial bootstrap from meta
    useEffect(() => {
        let mounted = true;
        // Если есть базовые параметры (kodik/title) - пропускаем обычную инициализацию
        // Вместо этого будет использоваться инициализация с прогрессом с сервера
        if (hasPlayerParamsInURL) return;
        (async () => {
            try {
                const meta = animeMeta ?? (await fetchAnimeMeta(animeId));
                if (!mounted || !meta) return;
                
                // Всегда проверяем доступность libria для корректного отображения опций
                try {
                    await bootstrapLibria(animeId);
                } catch (e) {
                    console.warn('[mobile] libria bootstrap failed:', e);
                    setIsLibriaAvailable(false);
                }
                
                // Загружаем контент для текущего источника
                if (selectedSource === 'kodik') {
                    await bootstrapKodik(meta);
                } else if (selectedSource === 'libria' && isLibriaAvailable) {
                    // Libria уже загружена выше
                }
                
                setInitialLoading(false);

                // initial fetch/merge from server for this anime
                try { fetchAndMergeFromServer(animeId); } catch {}
                // push all local cache for this anime to server
                try { pushAllCacheForAnimeToServer(animeId); } catch {}
            } catch (e) {
                console.error('[mobile] bootstrap error', e);
                setInitialLoading(false);
            }
        })();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animeId, animeMeta, selectedSource, bootstrapKodik, bootstrapLibria, isLibriaAvailable]);

    // HLS init
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !sourceUrl) return;
        // cleanup previous
        try { hlsRef.current?.destroy(); } catch {}
        hlsRef.current = null;
        if (Hls.isSupported()) {
            const hls = new Hls({ 
                enableWorker: true,
                // Настройки для поддержки длинных видео (фильмов) на мобильных
                maxBufferLength: 30, // Меньше для мобильных устройств
                maxMaxBufferLength: 60, 
                maxBufferSize: 30 * 1000 * 1000, // 30MB для мобильных
                maxBufferHole: 0.5,
                highBufferWatchdogPeriod: 3,
                nudgeOffset: 0.1,
                nudgeMaxRetry: 3,
                backBufferLength: 15, // Меньше для экономии памяти на мобильных
            });
            hlsRef.current = hls;
            try { video.crossOrigin = 'anonymous'; } catch {}
            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(sourceUrl);
            });
            hls.on(Hls.Events.ERROR, (_, data) => {
                console.error('[HLS]', data);
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = sourceUrl;
        } else {
            // fallback: just set src
            video.src = sourceUrl;
        }
    }, [sourceUrl]);

    // Video events
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onLoaded = async () => {
            try { await fetchAndMergeFromServer(animeId); } catch {}
            const dur = video.duration || 0;
            setDuration(dur);
            const saved = selectedSource === 'libria'
                ? getEpisodeProgressLibriaAnyVoice(animeId, currentEpisode)
                : getEpisodeProgress({ animeId, source: 'kodik', voice: selectedVoice, episodeId: currentEpisode });
            if (saved && saved.time > 0 && saved.time < (saved.duration || dur || 1)) {
                resumeCandidateRef.current = { epId: currentEpisode, time: saved.time, duration: saved.duration };
                if (autoPlay && !userInteractedRef.current) {
                    console.log('[onLoaded] Restoring progress for autoplay (mobile):', saved.time);
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
                    try { video.play(); setIsPlaying(true); didAutoStartRef.current = true; } catch {}
                } else {
                    setResumePrompt({ epId: currentEpisode, time: saved.time, duration: saved.duration });
                    try { video.pause(); } catch {}
                    setIsPlaying(false);
                }
            }
            // завершили обработку переключения
            isEpisodeSwitchingRef.current = false;
        };
        const onTime = () => {
            const t = video.currentTime || 0;
            setCurrentTime(t);
            const dur = (duration || video.duration || 0);
            if (!(resumePrompt && resumePrompt.epId === currentEpisode) && !isEpisodeSwitchingRef.current) {
                try { upsertEpisodeProgressWithSync({ animeId, source: selectedSource, voice: selectedVoice, episodeId: currentEpisode }, t, dur); } catch {
                    try { upsertEpisodeProgress({ animeId, source: selectedSource, voice: selectedVoice, episodeId: currentEpisode }, t, dur); } catch {}
                }
            }
        };
        const onProgress = () => {
            try {
                const buf = video.buffered;
                const end = buf.length ? buf.end(buf.length - 1) : 0;
                setBufferedEnd(end);
            } catch {}
        };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        
        const onEnded = () => {
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
                    const voice = selectedSource === 'kodik' ? selectedVoice : null;
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
                
                setCurrentEpisode(newId);
                
                // Сбрасываем флаг пользовательского взаимодействия для нового эпизода
                userInteractedRef.current = false;
                
                // Если включен авто-запуск, запускаем новый эпизод после переключения
                if (autoPlay && !userInteractedRef.current) {
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
        const onTimeForSkips = () => {
            const t = video.currentTime || 0;
            
            if (selectedSource === 'libria' && libriaSkips) {
                const inOpening = !!(libriaSkips.opening && t >= (libriaSkips.opening.start) && t < (libriaSkips.opening.end));
                const inEnding = !!(libriaSkips.ending && t >= (libriaSkips.ending.start) && t < (libriaSkips.ending.end));
                const kind: null | 'opening' | 'ending' = inOpening ? 'opening' : (inEnding ? 'ending' : null);
                if (!kind) {
                    setActiveSkip(null);
                    setSkipProgress(0);
                    if (skipTimerRef.current) { window.clearTimeout(skipTimerRef.current); skipTimerRef.current = null; }
                    return;
                }
                // set active and start auto-skip countdown if allowed
                setActiveSkip(kind);
                const allowed = (kind === 'opening' ? skipOpening : skipEnding);
                if (!allowed) return;
                if (!skipTimerRef.current) {
                    setSkipProgress(0);
                    skipStartRef.current = performance.now();
                    const tick = () => {
                        if (!skipStartRef.current) return;
                        const elapsed = performance.now() - skipStartRef.current;
                        const ratio = Math.max(0, Math.min(1, elapsed / 5000));
                        setSkipProgress(ratio);
                        if (ratio >= 1) {
                            // perform skip
                            if (kind === 'opening' && libriaSkips.opening) {
                                video.currentTime = Math.min(libriaSkips.opening.end, video.duration || libriaSkips.opening.end);
                                hasSkippedOpeningRef.current = true;
                            } else if (kind === 'ending' && libriaSkips.ending) {
                                video.currentTime = Math.min(libriaSkips.ending.end, video.duration || libriaSkips.ending.end);
                                hasSkippedEndingRef.current = true;
                            }
                            setActiveSkip(null);
                            setSkipProgress(0);
                            skipStartRef.current = null;
                            if (skipTimerRef.current) { window.clearTimeout(skipTimerRef.current); skipTimerRef.current = null; }
                            return;
                        }
                        skipTimerRef.current = window.setTimeout(tick, 50);
                    };
                    skipTimerRef.current = window.setTimeout(tick, 50);
                }
            } else if (selectedSource === 'kodik' && kodikSegments) {
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
                
                // Handle optional skip segments (opening/ending)
                if (kodikSegments.skip) {
                    const currentSkipSegment = kodikSegments.skip.find(segment => 
                        t >= segment.start && t < segment.end
                    );
                    
                    if (currentSkipSegment) {
                        const inOpening = currentSkipSegment.start < 300; // Assume opening if within first 5 minutes
                        const kind: 'opening' | 'ending' = inOpening ? 'opening' : 'ending';
                        const allowed = (kind === 'opening' ? skipOpening : skipEnding);
                        
                        setActiveSkip(kind);
                        
                        if (allowed && !skipTimerRef.current) {
                            setSkipProgress(0);
                            skipStartRef.current = performance.now();
                            const tick = () => {
                                if (!skipStartRef.current) return;
                                const elapsed = performance.now() - skipStartRef.current;
                                const ratio = Math.max(0, Math.min(1, elapsed / 5000));
                                setSkipProgress(ratio);
                                if (ratio >= 1) {
                                    // perform skip
                                    video.currentTime = Math.min(currentSkipSegment.end, video.duration || currentSkipSegment.end);
                                    if (inOpening) {
                                        hasSkippedOpeningRef.current = true;
                                    } else {
                                        hasSkippedEndingRef.current = true;
                                    }
                                    setActiveSkip(null);
                                    setSkipProgress(0);
                                    skipStartRef.current = null;
                                    if (skipTimerRef.current) { window.clearTimeout(skipTimerRef.current); skipTimerRef.current = null; }
                                    return;
                                }
                                skipTimerRef.current = window.setTimeout(tick, 50);
                            };
                            skipTimerRef.current = window.setTimeout(tick, 50);
                        }
                    } else {
                        setActiveSkip(null);
                        setSkipProgress(0);
                        if (skipTimerRef.current) { window.clearTimeout(skipTimerRef.current); skipTimerRef.current = null; }
                    }
                }
            }
        };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('timeupdate', onTime);
        video.addEventListener('timeupdate', onTimeForSkips);
        video.addEventListener('progress', onProgress);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        return () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            video.removeEventListener('timeupdate', onTime);
            video.removeEventListener('timeupdate', onTimeForSkips);
            video.removeEventListener('progress', onProgress);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
        };
    }, [selectedSource, selectedVoice, currentEpisode, autoPlay, libriaSkips, kodikSegments, skipOpening, skipEnding, playlistEpisodes, animeId, currentTime, duration, resumePrompt]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        
        // Помечаем, что пользователь взаимодействовал с плеером
        userInteractedRef.current = true;
        
        if (video.paused) {
            video.play();
            setIsPlaying(true);
            setShowControls(true);
            startHideTimer();
        } else {
            video.pause();
            setIsPlaying(false);
            clearHideTimer();
            setShowControls(true);
        }
    };

    const seekTo = (time: number) => {
        const video = videoRef.current;
        if (!video) return;
        const clamped = Math.max(0, Math.min(time, duration || video.duration || 0));
        video.currentTime = clamped;
    };

    const toggleFullscreen = () => {
        const container = containerRef.current;
        if (!container) return;
        if (!isFullscreen) {
            container.requestFullscreen?.().catch(() => {});
        } else {
            document.exitFullscreen?.().catch(() => {});
        }
        setIsFullscreen(!isFullscreen);
    };

    const clearHideTimer = () => {
        if (hideTimerRef.current) {
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    };

    const startHideTimer = () => {
        clearHideTimer();
        hideTimerRef.current = window.setTimeout(() => {
            setShowControls(false);
            hideTimerRef.current = null;
        }, 5000);
    };

    const onVideoTap = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        if (!isPlaying) {
            // paused: всегда рисуем рябь и ТОГГЛИМ UI (не запускаем видео)
            spawnRipple(e.clientX, e.clientY, 'single');
            setShowControls(prev => !prev);
            clearHideTimer();
        } else {
            // spawn ripple at tap point only when playing
            spawnRipple(e.clientX, e.clientY, 'single');
            // if playing, toggle controls visibility
            if (showControls) {
                // hide
                setShowControls(false);
                clearHideTimer();
            } else {
                // show and restart timer
                setShowControls(true);
                startHideTimer();
            }
        }
    };

    const DOUBLE_TAP_THRESHOLD = 220; // ms — реалистичный быстрый двойной тап на мобильных

    const handleSideTap = (side: 'left' | 'right', e: React.MouseEvent) => {
        e.stopPropagation();
        const now = Date.now();
        const video = videoRef.current;
        if (!video) return;
        if (lastTapTimeRef.current && lastTapSideRef.current === side && (now - lastTapTimeRef.current) <= DOUBLE_TAP_THRESHOLD) {
            // double tap
            if (singleTapTimeoutRef.current) {
                window.clearTimeout(singleTapTimeoutRef.current);
                singleTapTimeoutRef.current = null;
            }
            const delta = side === 'left' ? -10 : 10;
            const newTime = Math.max(0, Math.min((video.duration || 0), (video.currentTime || 0) + delta));
            video.currentTime = newTime;
            setCurrentTime(newTime);
            // visual ripple for double tap only
            spawnRipple(e.clientX, e.clientY, side === 'left' ? 'back' : 'forward');
            // update accumulating seek badge
            const sideKey: 'forward' | 'back' = side === 'left' ? 'back' : 'forward';
            setSeekBadge(prev => {
                if (prev && prev.side === sideKey) {
                    return { side: sideKey, count: prev.count + 10 };
                }
                return { side: sideKey, count: 10 };
            });
            if (seekBadgeTimerRef.current) window.clearTimeout(seekBadgeTimerRef.current);
            seekBadgeTimerRef.current = window.setTimeout(() => setSeekBadge(null), 800);
            // reset
            lastTapTimeRef.current = null;
            lastTapSideRef.current = null;
            // не показываем интерфейс при перемотке двойным тапом
            return;
        }

        lastTapTimeRef.current = now;
        lastTapSideRef.current = side;
        if (singleTapTimeoutRef.current) window.clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = window.setTimeout(() => {
            // single tap: когда играет — визуал тапа + переключаем UI, на паузе — стандартное поведение
            if (isPlaying) {
                spawnRipple(e.clientX, e.clientY, 'single');
                if (showControls) {
                    setShowControls(false);
                    clearHideTimer();
                } else {
                    setShowControls(true);
                    startHideTimer();
                }
            } else {
                onVideoTap(e);
            }
            lastTapTimeRef.current = null;
            lastTapSideRef.current = null;
            singleTapTimeoutRef.current = null;
        }, DOUBLE_TAP_THRESHOLD - 20);
    };

    const spawnRipple = (clientX: number, clientY: number, kind: 'single' | 'forward' | 'back') => {
        const root = containerRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        const id = ++rippleIdRef.current;
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
        setTapRipples(prev => [...prev, { id, x, y, kind }]);
        window.setTimeout(() => {
            setTapRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
    };

    // changePlaybackSpeed removed; speed is controlled via settings list below

    const handlePrev = async () => {
        const idx = playlistEpisodes.findIndex(e => e.id === currentEpisode);
        if (idx > 0) await changeEpisode(playlistEpisodes[idx - 1].id);
    };

    const handleNext = async () => {
        const idx = playlistEpisodes.findIndex(e => e.id === currentEpisode);
        if (idx >= 0 && idx < playlistEpisodes.length - 1) await changeEpisode(playlistEpisodes[idx + 1].id);
    };

    const changeEpisode = async (epId: number) => {
        // СНАЧАЛА помечаем, что идёт смена серии, чтобы блокировать параллельные сохранения
        isEpisodeSwitchingRef.current = true;
        // Сбрасываем флаг пользовательского взаимодействия для нового эпизода
        userInteractedRef.current = false;
        
        // сохранить прогресс текущей серии перед переключением (с синхронизацией на сервер)
        try {
            const v = videoRef.current;
            const t = (v?.currentTime ?? currentTime) || 0;
            const d = (v?.duration ?? duration) || 0;
            const voice = selectedSource === 'kodik' ? selectedVoice : null;
            if (d >= 0) {
                try { upsertEpisodeProgressWithSync({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, d); } catch {
                    try { upsertEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: currentEpisode }, t, d); } catch {}
                }
            }
        } catch {}
        setCurrentEpisode(epId);

        // подтянуть актуальные данные прогресса с сервера для новой серии
        try { await fetchAndMergeFromServer(animeId); } catch {}

        // после синхронизации — показать/применить сохранённый прогресс новой серии
        {
            const video = videoRef.current;
            if (video) {
                const saved = selectedSource === 'libria'
                    ? getEpisodeProgressLibriaAnyVoice(animeId, epId)
                    : getEpisodeProgress({ animeId, source: 'kodik', voice: selectedVoice, episodeId: epId });
                if (saved && saved.time > 0 && saved.time < (saved.duration || video.duration || 1)) {
                    resumeCandidateRef.current = { epId, time: saved.time, duration: saved.duration };
                    if (autoPlay && !userInteractedRef.current) {
                        console.log('[changeEpisode] Restoring progress for autoplay (mobile):', saved.time);
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
                        try { video.play(); setIsPlaying(true); didAutoStartRef.current = true; } catch {}
                    } else {
                        setResumePrompt({ epId, time: saved.time, duration: saved.duration });
                        try { video.pause(); } catch {}
                        setIsPlaying(false);
                    }
                } else {
                    resumeCandidateRef.current = { epId, time: 0, duration: saved?.duration ?? 0 };
                }
            }
        }
        if (selectedSource === 'kodik') {
            const meta = animeMeta ?? (await fetchAnimeMeta(animeId));
            const kodikTitle = meta?.kodik ?? meta?.title ?? null;
            const voice = selectedVoice ?? availableVoices[0];
            if (kodikTitle && voice) {
                const res = await fetchKodikStream(kodikTitle, voice, epId, true) as KodikStreamResponse | null;
                
                // Store segments from Kodik response
                if (res?.segments) {
                    setKodikSegments(res.segments);
                    autoSkippedAdSegments.current.clear();
                }
                
                const links = res?.links as Record<string, unknown> | undefined;
                const klist: Array<{ key: string; label: string; url: string }> = [];
                if (links) {
                    Object.keys(links).forEach(k => {
                        const url = ((links as Record<string, unknown>)[k] as Record<string, unknown> as { Src?: string })?.Src as string | undefined;
                        if (url) klist.push({ key: k, label: `${k}p`, url });
                    });
                }
                setKodikQualities(klist);
                setKodikSelectedQualityKey('auto');
                setKodikCurrentActiveKey(klist.find(q => q.label.includes('720'))?.key ?? klist[0]?.key ?? null);
                const hlsUrl = links ? (((links as Record<string, Record<string, unknown>>)['720'])?.['Src'] as string | undefined ?? ((links as Record<string, Record<string, unknown>>)['480'])?.['Src'] as string | undefined ?? ((links as Record<string, Record<string, unknown>>)['360'])?.['Src'] as string | undefined ?? ((links as Record<string, Record<string, unknown>>)['240'])?.['Src'] as string | undefined) : (res?.link ?? res?.hls ?? res?.url ?? null);
                setFetchedSrc(hlsUrl ?? null);
            }
        } else if (selectedSource === 'libria') {
            const raw = playlistEpisodes.find(e => e.id === epId)?.raw;
            if (raw) {
                // update Libria skips for new episode
                const fr = raw as Record<string, unknown>;
                const opening0 = fr['opening'] ?? (fr['skips'] && (fr['skips'] as Record<string, unknown>)['opening'] ? ((fr['skips'] as Record<string, unknown>)['opening'] as unknown[])[0] : undefined);
                const ending0 = fr['ending'] ?? (fr['skips'] && (fr['skips'] as Record<string, unknown>)['ending'] ? ((fr['skips'] as Record<string, unknown>)['ending'] as unknown[])[0] : undefined);
                const segs: Record<string, { start: number; end: number }> = {};
                if (opening0) {
                    const o = opening0 as Record<string, unknown>;
                    const sVal = o['start'];
                    const eVal = o['stop'] ?? o['stop'];
                    if (typeof sVal !== 'undefined' && typeof eVal !== 'undefined') {
                        const s = normalizeDurationToSeconds(Number(sVal));
                        const e = normalizeDurationToSeconds(Number(eVal));
                        if (Number.isFinite(s) && Number.isFinite(e)) segs.opening = { start: s, end: e };
                    }
                }
                if (ending0) {
                    const o = ending0 as Record<string, unknown>;
                    const sVal = o['start'];
                    const eVal = o['stop'];
                    if (typeof sVal !== 'undefined' && typeof eVal !== 'undefined') {
                        const s = normalizeDurationToSeconds(Number(sVal));
                        const e = normalizeDurationToSeconds(Number(eVal));
                        if (Number.isFinite(s) && Number.isFinite(e)) segs.ending = { start: s, end: e };
                    }
                }
                setLibriaSkips(Object.keys(segs).length ? segs : null);
                const keys = Object.keys(fr).filter((k: string) => /^hls_?/i.test(k));
                const qlist = keys.map((k: string) => ({ key: k, label: k.replace(/hls_?/i, '') + 'p', url: fr[k] as string })).filter(q => q.url);
                setLibriaQualities(qlist);
                setLibriaSelectedQualityKey('auto');
                const defaultKey = qlist.find(q => /1080|720/.test(q.label))?.key ?? qlist[0]?.key ?? null;
                setLibriaCurrentActiveKey(defaultKey);
                const chosen = qlist.find(q => q.key === defaultKey) ?? qlist[0];
                if (chosen) setFetchedSrc(chosen.url);
            }
        } else if (selectedSource === 'yumeko') {
            // Обработка для Yumeko - загрузка HLS потока для нового эпизода
            const ep = playlistEpisodes.find(p => p.id === epId);
            if (ep && ep.raw) {
                const yumekoEp = ep.raw as YumekoEpisode;
                const hlsUrl = await fetchYumekoEpisodeStream(yumekoEp.id);
                
                if (hlsUrl) {
                    console.log('[changeEpisode] Yumeko stream loaded for episode:', yumekoEp.episodeNumber);
                    setFetchedSrc(hlsUrl);
                    
                    // Получаем реальные качества из m3u8
                    const yumekoQualityList = await parseYumekoQualities(hlsUrl);
                    setYumekoQualities(yumekoQualityList);
                    setYumekoSelectedQualityKey('auto');
                    
                    // Устанавливаем активное качество - выбираем лучшее из доступных
                    const bestQuality = yumekoQualityList.find(q => q.key !== 'auto')?.key ?? '720';
                    setYumekoCurrentActiveKey(bestQuality);
                }
            }
        }
    };

    // Функция для декодирования URL-encoded строк
    const decodeTitle = (title: string): string => {
        try {
            // Проверяем содержит ли строка URL-encoded символы
            if (title.includes('%')) {
                return decodeURIComponent(title);
            }
            return title;
        } catch (error) {
            console.error('Failed to decode title:', error);
            return title;
        }
    };

    const displayedTitle = useMemo(() => {
        const ep = playlistEpisodes.find(e => e.id === currentEpisode);
        if (ep) return decodeTitle(`${ep.title}`);
        return '';
    }, [playlistEpisodes, currentEpisode]);

    // UI handlers
    const openOverlay = (t: OverlayType) => {
        setPanelClosing(false);
        setOverlay(t);
        // Останавливаем таймер скрытия интерфейса при открытии меню
        clearHideTimer();
        // Показываем контролы
        setShowControls(true);
    };
    const closeOverlay = () => {
        if (overlay === 'playlist') {
            // play closing animation then remove
            setPanelClosing(true);
            window.setTimeout(() => {
                setOverlay('none');
                setPanelClosing(false);
                // Перезапускаем таймер скрытия интерфейса после закрытия меню
                if (isPlaying) {
                    startHideTimer();
                }
            }, 220);
        } else {
            setOverlay('none');
            // Перезапускаем таймер скрытия интерфейса после закрытия меню
            if (isPlaying) {
                startHideTimer();
            }
        }
    };

    const onSelectSource = async (src: 'kodik' | 'libria') => {
        if (src === selectedSource) return closeOverlay();
        
        console.log('[Mobile-Source-Switch] Switching to:', src);
        
        // при смене источника — сбросить плашку и не перетирать прогресс до загрузки
        setResumePrompt(null);
        isEpisodeSwitchingRef.current = true;
        setSelectedSource(src);
        setAvailableVoices([]);
        setPlaylistEpisodes([]);
        setFetchedSrc(null);
        
        // Пауза плеера на время переключения
        try { videoRef.current?.pause(); } catch {}
        setIsPlaying(false);
        
        // Реинициализация выбранного источника
        if (src === 'kodik') {
            // Реинициализация Kodik
            console.log('[Mobile-Source-Switch] Reinitializing Kodik');
            const meta = animeMeta ?? (await fetchAnimeMeta(animeId));
            const kodikTitle = meta?.kodik ?? meta?.title ?? null;
            if (!kodikTitle) {
                closeOverlay();
                return;
            }
            
            try {
                // ЭТАП 1: Получаем озвучки
                const searchRes = await fetchKodikSearch(kodikTitle);
                const items = await fetchKodikEpisodesFromSearch(searchRes);
                
                // Build map: translation/title -> episodes array
                const map: Record<string, Array<{ id: number; title: string; duration?: string; raw?: unknown }>> = {};
                const voicesSet = new Set<string>();

                items.forEach((it: Record<string, unknown>) => {
                    const translations = it.translations || (it.translation ? [it.translation] : []);
                    // normalize episodes list
                    let epsArr: Array<Record<string, unknown>> = [];
                    if (it.episodes_list) {
                        epsArr = it.episodes_list as Array<Record<string, unknown>>;
                    } else if (it.episodes_count) {
                        epsArr = Array.from({ length: it.episodes_count as number }, (_, i) => ({ number: i + 1 }));
                    } else if (it.last_episode) {
                        epsArr = Array.from({ length: it.last_episode as number }, (_, i) => ({ number: i + 1 }));
                    }

                    (translations as Array<unknown>).forEach((trans: unknown) => {
                        const title = typeof trans === 'object' && trans && (trans as Record<string, unknown>).title ? (trans as Record<string, unknown>).title : (typeof trans === 'string' ? trans : null);
                        if (!title) return;
                        voicesSet.add(title as string);
                        if (!map[title as string]) map[title as string] = [];
                        epsArr.forEach((ep: Record<string, unknown>) => {
                            const epNum = ep.number ?? ep.episode ?? ep.id ?? 1;
                            const existing = map[title as string].find(e => e.id === Number(epNum));
                            if (!existing) {
                                map[title as string].push({ id: Number(epNum), title: `Эпизод ${epNum}`, raw: it });
                            }
                        });
                    });
                });

                const voices = Array.from(voicesSet);
                
                if (voices.length === 0) {
                    console.log('[Mobile-Source-Switch] No Kodik voices found');
                    closeOverlay();
                    return;
                }
                
                // ЭТАП 2: Устанавливаем озвучки и плейлист
                setAvailableVoices(voices);
                
                // ЭТАП 3: Выбираем первую озвучку и эпизоды
                const firstVoice = voices[0];
                setSelectedVoice(firstVoice);
                const episodes = map[firstVoice] || [];
                setPlaylistEpisodes(episodes);
                
                // ЭТАП 4: Устанавливаем первый эпизод
                const firstEpisode = episodes[0]?.id || 1;
                setCurrentEpisode(firstEpisode);
                
                // ЭТАП 5: Загружаем стрим
                const res = await fetchKodikStream(kodikTitle, firstVoice, firstEpisode, true) as KodikStreamResponse | null;
                
                if (res?.segments) {
                    setKodikSegments(res.segments);
                    autoSkippedAdSegments.current.clear();
                }
                
                const links = res?.links as Record<string, unknown> | undefined;
                if (links) {
                    const qlist: Array<{ key: string; label: string; url: string }> = Object.keys(links)
                        .filter(k => {
                            const item = links[k] as Record<string, unknown>;
                            return item && item.Src;
                        })
                        .map(k => {
                            const item = links[k] as Record<string, unknown>;
                            return { key: k, label: `${k}p`, url: item.Src as string };
                        });
                    
                    if (qlist.length > 0) {
                        setFetchedSrc(qlist[0].url);
                    }
                }
                
                console.log('[Mobile-Source-Switch] Kodik reinitialized successfully');
            } catch (error) {
                console.error('[Mobile-Source-Switch] Kodik reinit error:', error);
            }
        } else if (src === 'libria') {
            // Реинициализация Libria
            console.log('[Mobile-Source-Switch] Reinitializing Libria');
            
            try {
                await bootstrapLibria(animeId);
                console.log('[Mobile-Source-Switch] Libria reinitialized successfully');
            } catch (error) {
                console.error('[Mobile-Source-Switch] Libria reinit error:', error);
                setIsLibriaAvailable(false);
                setSelectedSource('kodik');
            }
        }
        
        closeOverlay();
    };

    const onSelectVoice = async (voice: string) => {
        setSelectedVoice(voice);
        if (selectedSource !== 'kodik') return closeOverlay();
        const meta = animeMeta ?? (await fetchAnimeMeta(animeId));
        const kodikTitle = meta?.kodik ?? meta?.title ?? null;
        if (!kodikTitle) return closeOverlay();
        const firstId = playlistEpisodes[0]?.id ?? 1;
        setCurrentEpisode(firstId);
        const res = await fetchKodikStream(kodikTitle, voice, firstId, true) as KodikStreamResponse | null;
        
        // Store segments from Kodik response
        if (res?.segments) {
            setKodikSegments(res.segments);
            autoSkippedAdSegments.current.clear();
        }
        
        const links = res?.links as Record<string, unknown> | undefined;
        const hlsUrl = links ? (((links as Record<string, Record<string, unknown>>)['720'])?.['Src'] as string | undefined ?? ((links as Record<string, Record<string, unknown>>)['480'])?.['Src'] as string | undefined ?? ((links as Record<string, Record<string, unknown>>)['360'])?.['Src'] as string | undefined ?? ((links as Record<string, Record<string, unknown>>)['240'])?.['Src'] as string | undefined) : (res?.link ?? res?.hls ?? res?.url ?? null);
        setFetchedSrc(hlsUrl ?? null);
        const klist: Array<{ key: string; label: string; url: string }> = [];
        if (links) {
            Object.keys(links).forEach(k => {
                const url = ((links as Record<string, unknown>)[k] as Record<string, unknown> as { Src?: string })?.Src as string | undefined;
                if (url) klist.push({ key: k, label: `${k}p`, url });
            });
        }
        setKodikQualities(klist);
        setKodikSelectedQualityKey('auto');
        setKodikCurrentActiveKey(klist.find(q => q.label.includes('720'))?.key ?? klist[0]?.key ?? null);
        closeOverlay();
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

    const getEffectiveNetworkType = () => {
        try {
            const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
            return nav.connection?.effectiveType || '4g';
        } catch { return '4g'; }
    };

    const parseYumekoQualities = async (hlsUrl: string): Promise<Array<{ key: string; label: string; url: string }>> => {
        try {
            console.log('[parseYumekoQualities] Starting to parse m3u8:', hlsUrl);
            
            // Получаем содержимое m3u8 файла
            const response = await fetch(hlsUrl);
            const m3u8Content = await response.text();
            
            console.log('[parseYumekoQualities] M3U8 content length:', m3u8Content.length);
            console.log('[parseYumekoQualities] First 500 chars:', m3u8Content.substring(0, 500));
            
            const qualities: Array<{ key: string; label: string; url: string }> = [];
            const lines = m3u8Content.split('\n');
            
            // Ищем пары EXT-X-STREAM-INF и URL
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('#EXT-X-STREAM-INF:')) {
                    // Ищем разрешение в строке
                    const resolutionMatch = line.match(/RESOLUTION=(\d+x(\d+))/);
                    const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
                    
                    // Ищем следующую непустую строку - это URL
                    let urlLine = '';
                    for (let j = i + 1; j < lines.length; j++) {
                        const nextLine = lines[j].trim();
                        if (nextLine && !nextLine.startsWith('#')) {
                            urlLine = nextLine;
                            break;
                        }
                    }
                    
                    if (urlLine) {
                        let qualityKey = '';
                        let qualityLabel = '';
                        
                        if (resolutionMatch) {
                            const height = parseInt(resolutionMatch[2]);
                            // Исключаем качества ниже 720p
                            if (height < 720) {
                                continue;
                            }
                            qualityKey = resolutionMatch[2]; // высота
                            qualityLabel = `${resolutionMatch[2]}p`;
                        } else if (bandwidthMatch) {
                            // Определяем качество по bandwidth (только 1080p и 720p)
                            const bandwidth = parseInt(bandwidthMatch[1]);
                            if (bandwidth > 5000000) {
                                qualityKey = '1080';
                                qualityLabel = '1080p';
                            } else if (bandwidth > 2500000) {
                                qualityKey = '720';
                                qualityLabel = '720p';
                            } else {
                                // Пропускаем низкие качества
                                continue;
                            }
                        }
                        
                        if (qualityKey) {
                            // Если URL относительный, делаем абсолютным
                            let fullUrl = urlLine;
                            if (!urlLine.startsWith('http')) {
                                const baseUrl = hlsUrl.substring(0, hlsUrl.lastIndexOf('/') + 1);
                                fullUrl = baseUrl + urlLine;
                            }
                            
                            qualities.push({
                                key: qualityKey,
                                label: qualityLabel,
                                url: fullUrl
                            });
                        }
                    }
                }
            }
            
            console.log('[parseYumekoQualities] Found qualities:', qualities);
            
            // Если не нашли качества, возвращаем пустой массив
            // Опция "Auto" будет добавлена на уровне интерфейса
            if (qualities.length === 0) {
                console.log('[parseYumekoQualities] No qualities found, returning empty array');
                return [];
            } else {
                // Сортируем по убыванию качества
                qualities.sort((a, b) => parseInt(b.key) - parseInt(a.key));
            }
            
            return qualities;
        } catch (error) {
            console.error('[parseYumekoQualities] Error parsing m3u8:', error);
            // В случае ошибки возвращаем базовый список без Auto
            return [
                { key: '1080', label: '1080p', url: hlsUrl },
                { key: '720', label: '720p', url: hlsUrl }
            ];
        }
    };

    const onSelectQuality = (key: string) => {
        if (selectedSource === 'libria') {
            setLibriaSelectedQualityKey(key);
            const q = libriaQualities.find(q => q.key === key);
            if (q) setFetchedSrc(q.url);
        } else if (selectedSource === 'kodik') {
            setKodikSelectedQualityKey(key);
            const q = kodikQualities.find(q => q.key === key);
            if (q) setFetchedSrc(q.url);
        } else if (selectedSource === 'yumeko') {
            setYumekoSelectedQualityKey(key);
            const q = yumekoQualities.find(q => q.key === key);
            if (q) setFetchedSrc(q.url);
        }
        closeOverlay();
    };

    // React to initError
    useEffect(() => {
        if (initError) setInitialLoading(false);
    }, [initError]);

    const seekPercent = useMemo(() => {
        const baseTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
        if (!duration || !isFinite(duration)) return 0;
        return Math.max(0, Math.min(100, (baseTime / duration) * 100));
    }, [currentTime, duration, isScrubbing, scrubTime]);

    const playerTitle = useMemo(() => {
        const meta: Record<string, unknown> = (animeMeta || {}) as Record<string, unknown>;
        const title = meta?.title || meta?.name || meta?.ru || meta?.en || null;
        return title ? decodeTitle(String(title)) : '';
    }, [animeMeta]);

    const playerTitleFontSize = useMemo(() => {
        const len = (playerTitle || '').length;
        if (len > 90) return 10;
        if (len > 72) return 11;
        if (len > 56) return 12;
        if (len > 42) return 13;
        return 14;
    }, [playerTitle]);

    return (
        <div ref={containerRef} className={`mobile-player ${!showControls ? 'ui-hidden' : ''} ${overlay !== 'none' ? 'overlay-open' : ''}`}>
            {playerTitle ? (
                <div className="mobile-player-title-center" style={{ fontSize: playerTitleFontSize }}>{playerTitle}</div>
            ) : null}
            {/* Верхняя панель */}
            <div className="mobile-player-topbar">
                <div className="mobile-player-topbar__left">
                    <button className="mobile-player-top-back" aria-label="Назад к аниме" onClick={() => router.push(`/anime-page/${animeId}`)}>
                        <ChevronLeft />
                    </button>
                    <div className="mobile-player-topbar__info">
                        <div className="mobile-player-episode-info">Серия {currentEpisode}</div>
                        <div className="mobile-player-title">{displayedTitle}</div>
                    </div>
                </div>
                <div className="mobile-player-topbar__right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedSource !== 'libria' && selectedSource !== 'yumeko' && (
                        <button className="mobile-player-top-button" aria-label="Озвучка" onClick={() => openOverlay('voice')}>
                            <Headphones />
                        </button>
                    )}
                    {selectedSource !== 'yumeko' && showSourceButton && (
                        <button className="mobile-player-top-button" aria-label="Источник" onClick={() => openOverlay('source')}>
                            <Sliders />
                        </button>
                    )}
                </div>
            </div>

            <div style={{ position: 'absolute', inset: 0 }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 3, pointerEvents: 'none' }}>
                    <div style={{ flex: 1, pointerEvents: 'auto' }} onClick={(e) => handleSideTap('left', e)} />
                    <div style={{ flex: 1, pointerEvents: 'auto' }} onClick={(e) => handleSideTap('right', e)} />
                </div>
                <video
                    ref={videoRef}
                    className="mobile-player-video"
                    playsInline
                    controls={false}
                    onClick={onVideoTap}
                />
                {tapRipples.map(r => (
                    <div key={r.id} className={`yt-ripple ${r.kind}`} style={{ left: r.x, top: r.y }} />
                ))}
                {/* Плашка продолжения просмотра */}
                {resumePrompt && (
                    <div className="player-resume-overlay player-resume-overlay--mobile" onClick={() => setResumePrompt(null)}>
                        <div className="player-resume player-resume--mobile" onClick={e => e.stopPropagation()}>
                            <div className="player-resume-title">Вы остановились на {formatTime(resumePrompt.time)}</div>
                            <div className="player-resume-actions">
                                <button className="player-resume-btn primary" onClick={() => {
                                    const r = resumePrompt; if (!r) return;
                                    setResumePrompt(null);
                                    if (currentEpisode !== r.epId) setCurrentEpisode(r.epId);
                                    const v = videoRef.current;
                                    const apply = () => {
                                        try { if (videoRef.current) videoRef.current.currentTime = r.time; } catch {}
                                        // сразу продолжаем и даём таймеру timeupdate сохранить прогресс
                                        try { (v ?? videoRef.current)?.play?.(); setIsPlaying(true); } catch {}
                                    };
                                    if (v) {
                                        if (v.readyState >= 1) apply();
                                        else {
                                            const handler = () => { try { apply(); } catch {} };
                                            v.addEventListener('loadedmetadata', handler, { once: true });
                                        }
                                    }
                                }}>Продолжить</button>
                                <button className="player-resume-btn" onClick={() => {
                                    const epId = resumePrompt.epId;
                                    const voice = selectedSource === 'kodik' ? selectedVoice : null;
                                    try { setEpisodeProgress({ animeId, source: selectedSource, voice, episodeId: epId }, { time: 0, duration: 0, updatedAt: Date.now(), opened: true }); } catch {}
                                    setCurrentEpisode(epId);
                                    resumeCandidateRef.current = { epId, time: 0, duration: 0 };
                                    setResumePrompt(null);
                                    try { if (videoRef.current) videoRef.current.currentTime = 0; } catch {}
                                    try { videoRef.current?.play?.(); setIsPlaying(true); } catch {}
                                }}>Начать заново</button>
                            </div>
                        </div>
                    </div>
                )}
                {seekBadge && (
                    <div className={`yt-seek ${seekBadge.side}`}>
                        <div className="yt-seek__icon" />
                        <div className="yt-seek__text">{seekBadge.count}с</div>
                    </div>
                )}
            </div>

            {/* Центральные кнопки управления */}
            <div className={`mobile-player-center-controls`}>
                <button className="mobile-player-center-button" aria-label="Предыдущая серия" onClick={handlePrev}>
                    <SkipBack />
                </button>
                <button className={`mobile-player-center-button play`} aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'} onClick={togglePlay}>
                    {isPlaying ? <Pause /> : <Play />}
                </button>
                <button className="mobile-player-center-button" aria-label="Следующая серия" onClick={handleNext}>
                    <SkipForward />
                </button>
            </div>

            {/* Нижняя панель управления */}
            <div className={`mobile-player-controls ${!showControls ? 'hidden' : ''}`}>
                <div className="mobile-player-progress">
                    <input
                        className="mobile-player-seek"
                        type="range"
                        min={0}
                        max={Math.max(1, duration)}
                        value={isScrubbing && scrubTime !== null ? scrubTime : currentTime}
                        step={0.1}
                        onChange={(e) => seekTo(Number(e.target.value))}
                        onInput={(e) => { setScrubTime(Number((e.target as HTMLInputElement).value)); setShowControls(true); clearHideTimer(); }}
                        onMouseDown={() => { setIsScrubbing(true); setShowControls(true); clearHideTimer(); }}
                        onTouchStart={() => { setIsScrubbing(true); setShowControls(true); clearHideTimer(); }}
                        onMouseUp={() => { if (scrubTime !== null) seekTo(scrubTime); setIsScrubbing(false); setScrubTime(null); if (isPlaying) startHideTimer(); }}
                        onTouchEnd={() => { if (scrubTime !== null) seekTo(scrubTime); setIsScrubbing(false); setScrubTime(null); if (isPlaying) startHideTimer(); }}
                        style={{ ['--percent' as unknown as string]: `${seekPercent}%` } as React.CSSProperties}
                        aria-label="Перемотка"
                    />
                </div>
                
                <div className="mobile-player-bottom-controls">
                    <div className="mobile-player-bottom-left">
                        <div className="mobile-player-time">{formatTime(currentTime)} / {formatTime(duration)}</div>
                    </div>
                    <div className="mobile-player-bottom-right">
                        <button className="mobile-player-bottom-button" aria-label="Плейлист" onClick={() => openOverlay('playlist')}>
                            <List />
                        </button>
                        <button className="mobile-player-bottom-button" aria-label="Настройки" onClick={() => openOverlay('quality')}>
                            <Settings />
                        </button>
                        <button className="mobile-player-bottom-button" aria-label="Полноэкран" onClick={toggleFullscreen}>
                            {/* Fullscreen icon */}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                        </button>
                        <button className="mobile-player-bottom-button" aria-label="Переключить ориентацию" onClick={toggleOrientation}>
                            {/* Иконка: показывает что будет если нажать */}
                            {isLandscape ? <Smartphone size={18} /> : <Monitor size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Overlays */}
            {overlay !== 'none' && (
                <div className="mobile-player-overlay" onClick={closeOverlay}>
                    {settingsSection !== 'main' && overlay === 'quality' && (
                        <button className="mobile-player-panel__back" onClick={(e) => { e.stopPropagation(); setSettingsSection('main'); }} aria-label="Назад">
                            <ChevronLeft />
                        </button>
                    )}
                    <button className="mobile-player-panel__close" onClick={closeOverlay} aria-label="Закрыть">
                        <X />
                    </button>
                    <div className="mobile-player-panel" onClick={(e) => e.stopPropagation()}>
                        {overlay === 'source' && (
                            <>
                                <div className="mobile-player-list">
                                    {[
                                        {k:'kodik',t:'Kodik'},
                                        ...(isLibriaAvailable ? [{k:'libria',t:'Libria'}] : [])
                                    ].map(opt => (
                                        <div key={opt.k} className={`mobile-player-list-item ${selectedSource === (opt.k as 'kodik' | 'libria') ? 'active' : ''}`} onClick={() => onSelectSource(opt.k as 'kodik' | 'libria')}>
                                            <span>{opt.t}</span>
                                            {selectedSource === opt.k && <span className="mobile-player-chip">Текущий</span>}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {overlay === 'voice' && selectedSource === 'kodik' && (
                            <>
                                <div className="mobile-player-list compact">
                                    {availableVoices.map(v => (
                                        <div key={v} className={`mobile-player-list-item ${selectedVoice === v ? 'active' : ''}`} onClick={() => onSelectVoice(v)}>
                                            <span>{v}</span>
                                            {selectedVoice === v && <span className="mobile-player-chip">Выбрано</span>}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {overlay === 'quality' && (
                            <>
                                {/* Мобильные настройки плеера (замена пункта "Источник") */}
                                {settingsSection === 'main' && (
                                    <div className="mobile-player-list settings">
                                        <div className="mobile-player-list-item" onClick={() => setSettingsSection('speed')}>
                                            <span>Скорость</span>
                                            <span className="mobile-player-chip">{playbackSpeed}x</span>
                                        </div>
                                        <div className="mobile-player-list-item" onClick={() => setSettingsSection('quality')}>
                                            <span>Качество</span>
                                            <span className="mobile-player-chip">
                                                {selectedSource === 'libria' ? (libriaSelectedQualityKey === 'auto' ? 'Auto' : (libriaCurrentActiveKey ?? 'Auto')) : 
                                                 selectedSource === 'kodik' ? (kodikSelectedQualityKey === 'auto' ? 'Auto' : (kodikCurrentActiveKey ?? 'Auto')) :
                                                 (yumekoCurrentActiveKey ?? 'Auto')}
                                            </span>
                                        </div>
                                        {/* removed hotkeys from mobile settings */}
                                        <div className="mobile-player-list-item">
                                            <span>Пропускать опенинг</span>
                                            <div className="mobile-player-toggle">
                                                <input type="checkbox" id="skip-opening" checked={skipOpening} onChange={e => { const v = e.target.checked; setSkipOpening(v); saveSettings({ skipOpening: v }); }} />
                                                <label htmlFor="skip-opening" />
                                            </div>
                                        </div>
                                        <div className="mobile-player-list-item">
                                            <span>Пропускать эндинг</span>
                                            <div className="mobile-player-toggle">
                                                <input type="checkbox" id="skip-ending" checked={skipEnding} onChange={e => { const v = e.target.checked; setSkipEnding(v); saveSettings({ skipEnding: v }); }} />
                                                <label htmlFor="skip-ending" />
                                            </div>
                                        </div>
                                        {/* removed auto-play and auto-fullscreen from mobile settings */}
                                    </div>
                                )}

                                {settingsSection === 'quality' && (
                                    <div className="mobile-player-list settings">
                                        {[
                                            { key: 'auto', label: 'Auto', url: '' },
                                            ...(selectedSource === 'libria' ? libriaQualities : 
                                              selectedSource === 'kodik' ? kodikQualities : 
                                              yumekoQualities)
                                        ].map(q => (
                                            <div key={q.key} className={`mobile-player-list-item ${
                                                (selectedSource === 'libria' ? (libriaSelectedQualityKey === 'auto' ? libriaCurrentActiveKey : libriaSelectedQualityKey) : 
                                                 selectedSource === 'kodik' ? (kodikSelectedQualityKey === 'auto' ? kodikCurrentActiveKey : kodikSelectedQualityKey) :
                                                 (yumekoSelectedQualityKey === 'auto' ? yumekoCurrentActiveKey : yumekoSelectedQualityKey)) === q.key ? 'active' : ''}`} onClick={() => { 
                                                if (q.key === 'auto') {
                                                    if (selectedSource === 'libria') {
                                                        setLibriaSelectedQualityKey('auto');
                                                        const activeKey = libriaCurrentActiveKey ?? chooseLibriaKey(libriaQualities) ?? (libriaQualities[0]?.key ?? null);
                                                        setLibriaCurrentActiveKey(activeKey);
                                                        if (activeKey) {
                                                            const active = libriaQualities.find(x => x.key === activeKey);
                                                            if (active) setFetchedSrc(active.url);
                                                        }
                                                    } else if (selectedSource === 'kodik') {
                                                        setKodikSelectedQualityKey('auto');
                                                        const activeKey = kodikCurrentActiveKey ?? (kodikQualities[0]?.key ?? null);
                                                        setKodikCurrentActiveKey(activeKey);
                                                        if (activeKey) {
                                                            const active = kodikQualities.find(x => x.key === activeKey);
                                                            if (active) setFetchedSrc(active.url);
                                                        }
                                                    } else if (selectedSource === 'yumeko') {
                                                        setYumekoSelectedQualityKey('auto');
                                                        const activeKey = yumekoCurrentActiveKey ?? (yumekoQualities[0]?.key ?? null);
                                                        setYumekoCurrentActiveKey(activeKey);
                                                        if (activeKey) {
                                                            const active = yumekoQualities.find(x => x.key === activeKey);
                                                            if (active) setFetchedSrc(active.url);
                                                        }
                                                    }
                                                } else {
                                                    onSelectQuality(q.key);
                                                }
                                                setSettingsSection('main'); 
                                            }}>
                                                <span>{q.label}</span>
                                                {(selectedSource === 'libria' ? (libriaSelectedQualityKey === 'auto' ? libriaCurrentActiveKey === q.key : libriaSelectedQualityKey === q.key) : 
                                                 selectedSource === 'kodik' ? (kodikSelectedQualityKey === 'auto' ? kodikCurrentActiveKey === q.key : kodikSelectedQualityKey === q.key) :
                                                 (yumekoSelectedQualityKey === 'auto' ? yumekoCurrentActiveKey === q.key : yumekoSelectedQualityKey === q.key)) && <span className="mobile-player-chip">Выбрано</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {settingsSection === 'speed' && (
                                    <div className="mobile-player-list settings">
                                        {[0.5,0.75,1,1.25,1.5,2].map(s => (
                                            <div key={s} className={`mobile-player-list-item ${playbackSpeed === s ? 'active' : ''}`} onClick={() => { setPlaybackSpeed(s); const v = videoRef.current; if (v) v.playbackRate = s; setSettingsSection('main'); }}>
                                                <span>{s}x</span>
                                                {playbackSpeed === s && <span className="mobile-player-chip">Выбрано</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {overlay === 'playlist' && (
                            <>
                                <div className="mobile-player-list compact">
                                    {playlistEpisodes.map(ep => {
                                        const prog = getEpisodeProgress({ animeId, source: selectedSource, voice: selectedVoice, episodeId: ep.id });
                                        const ratio = prog && prog.duration > 0 ? Math.max(0, Math.min(1, prog.time / prog.duration)) : 0;
                                        return (
                                            <div key={ep.id} className={`mobile-player-list-item ${currentEpisode === ep.id ? 'active' : ''}`} onClick={() => { changeEpisode(ep.id); closeOverlay(); }}>
                                                <div className="mobile-player-list-col">
                                                    <span className="mobile-player-list-title">{ep.title}</span>
                                                    {prog && (prog.time > 0 || prog.duration > 0) && (
                                                        <div className="mobile-player-ep-progress">
                                                            <div className="mobile-player-ep-progress__bar" style={{ width: `${Math.round(ratio * 100)}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="mobile-player-chip">{currentEpisode === ep.id ? 'Смотрим' : (ep.duration ?? '')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Skip button for Libria - visible even when UI hidden (disabled if не в сегменте) */}
            {selectedSource === 'libria' && libriaSkips && activeSkip && (
                <div className={`mobile-player-skip ${activeSkip}`} onClick={(e) => {
                    e.stopPropagation();
                    const video = videoRef.current; if (!video) return;
                    if (!activeSkip) return;
                    if (activeSkip === 'opening' && libriaSkips?.opening) video.currentTime = Math.min(libriaSkips.opening.end, video.duration || libriaSkips.opening.end);
                    if (activeSkip === 'ending' && libriaSkips?.ending) video.currentTime = Math.min(libriaSkips.ending.end, video.duration || libriaSkips.ending.end);
                    setActiveSkip(null); setSkipProgress(0);
                    if (skipTimerRef.current) { window.clearTimeout(skipTimerRef.current); skipTimerRef.current = null; }
                }}>
                    <div className="mobile-player-skip-fill" style={{ width: `${Math.max(0, Math.min(100, (skipProgress * 100)))}%` }} />
                    <span className="mobile-player-skip-label">{activeSkip === 'opening' ? 'Пропустить опенинг' : 'Пропустить эндинг'}</span>
                </div>
            )}

            {/* Skip button for Kodik - visible even when UI hidden */}
            {selectedSource === 'kodik' && kodikSegments && kodikSegments.skip && activeSkip && (
                <div className={`mobile-player-skip ${activeSkip}`} onClick={(e) => {
                    e.stopPropagation();
                    const video = videoRef.current; if (!video) return;
                    if (!activeSkip) return;
                    
                    const t = video.currentTime || 0;
                    const currentSkipSegment = kodikSegments.skip!.find(segment => 
                        t >= segment.start && t < segment.end
                    );
                    
                    if (currentSkipSegment) {
                        video.currentTime = Math.min(currentSkipSegment.end, video.duration || currentSkipSegment.end);
                        if (activeSkip === 'opening') {
                            hasSkippedOpeningRef.current = true;
                        } else {
                            hasSkippedEndingRef.current = true;
                        }
                    }
                    
                    setActiveSkip(null); setSkipProgress(0);
                    if (skipTimerRef.current) { window.clearTimeout(skipTimerRef.current); skipTimerRef.current = null; }
                }}>
                    <div className="mobile-player-skip-fill" style={{ width: `${Math.max(0, Math.min(100, (skipProgress * 100)))}%` }} />
                    <span className="mobile-player-skip-label">{activeSkip === 'opening' ? 'Пропустить опенинг' : 'Пропустить эндинг'}</span>
                </div>
            )}
        </div>
    );
}

