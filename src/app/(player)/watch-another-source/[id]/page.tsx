'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Crown, AlertTriangle } from 'lucide-react';
import PlayerPC from '@/app/(player)/test-new-player/PlayerPC';
import PlayerMobile from '@/app/(player)/test-new-player/PlayerMobile';
import { API_SERVER, KODIK_API_BASE, KODIK_API_TOKEN } from '@/hosts/constants';
import { useTheme } from '@/app/context/ThemeContext';
import '@/styles/components/source-selection-modal.scss';


interface LibriaEpisode {
    ordinal: number;
    title: string;
    hls_1080?: string;
    hls_720?: string;
    hls_480?: string;
}

export default function WatchAnotherSourcePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { theme, colorScheme } = useTheme();

    const animeId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
    const kodik = searchParams.get('kodik') || '';
    const title = searchParams.get('title') || '';
    const season = searchParams.get('season') || '';

    const [selectedPlayer, setSelectedPlayer] = useState<'kodik' | 'anilibria'>('anilibria');
    const [kodikIframeUrl, setKodikIframeUrl] = useState<string>('');
    const [libriaEpisodes, setLibriaEpisodes] = useState<LibriaEpisode[]>([]);
    const [selectedEpisode, setSelectedEpisode] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isSourcePanelCollapsed, setIsSourcePanelCollapsed] = useState(false);
    const [sourceError, setSourceError] = useState<boolean>(false);
    
    // Временно всегда показываем UI элементы
    // TODO: добавить отслеживание видимости UI плеера через callback из PlayerMobile
    const isPlayerUIVisible = true;

    // Форматируем название с сезоном
    const animeTitle = useMemo(() => {
        if (!title) return 'Аниме';
        
        // Определяем номер сезона из названия или параметра
        let seasonNumber = '';
        if (season) {
            seasonNumber = ` Сезон ${season}`;
        } else {
            // Пытаемся найти сезон в названии (2 сезон, season 2, и т.д.)
            const seasonMatch = title.match(/(?:сезон|season)\s*(\d+)/i);
            if (seasonMatch) {
                seasonNumber = ` Сезон ${seasonMatch[1]}`;
            } else {
                // Пытаемся найти римские цифры или просто цифру в конце
                const romanMatch = title.match(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)$/i);
                const numberMatch = title.match(/\s+(\d+)$/);
                
                if (romanMatch) {
                    const romanToNumber: { [key: string]: string } = {
                        'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5',
                        'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10'
                    };
                    seasonNumber = ` Сезон ${romanToNumber[romanMatch[1].toUpperCase()] || romanMatch[1]}`;
                } else if (numberMatch && parseInt(numberMatch[1]) <= 10) {
                    seasonNumber = ` Сезон ${numberMatch[1]}`;
                }
            }
        }
        
        return title + seasonNumber;
    }, [title, season]);

    // Определяем мобильное устройство
    useEffect(() => {
        const checkMobile = () => {
            const hasTouchPoints = navigator.maxTouchPoints > 1;
            const isSmallScreen = window.innerWidth <= 1024;
            const isMobile = hasTouchPoints || isSmallScreen;
            setIsMobile(isMobile);
        };
        // Добавляем небольшую задержку чтобы убедиться что окно инициализировано
        const timer = setTimeout(checkMobile, 100);
        // Убираем resize listener чтобы не переключаться при повороте
        return () => clearTimeout(timer);
    }, []);

    // Динамические цвета на основе темы и цветовой схемы
    const colors = useMemo(() => {
        const isDark = theme === 'dark';
        let primary = '';
        let primaryBg = '';
        let primaryBorder = '';
        let primaryHover = '';
        
        switch (colorScheme) {
            case 'orange':
                primary = isDark ? '#ff9500' : '#e67700';
                primaryBg = isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(230, 119, 0, 0.12)';
                primaryBorder = isDark ? 'rgba(255, 149, 0, 0.4)' : 'rgba(230, 119, 0, 0.3)';
                primaryHover = isDark ? 'rgba(255, 149, 0, 0.08)' : 'rgba(230, 119, 0, 0.05)';
                break;
            case 'purple':
                primary = isDark ? '#af52de' : '#8030a0';
                primaryBg = isDark ? 'rgba(175, 82, 222, 0.15)' : 'rgba(128, 48, 160, 0.12)';
                primaryBorder = isDark ? 'rgba(175, 82, 222, 0.4)' : 'rgba(128, 48, 160, 0.3)';
                primaryHover = isDark ? 'rgba(175, 82, 222, 0.08)' : 'rgba(128, 48, 160, 0.05)';
                break;
            case 'red':
                primary = isDark ? '#ff3b30' : '#d62015';
                primaryBg = isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(214, 32, 21, 0.12)';
                primaryBorder = isDark ? 'rgba(255, 59, 48, 0.4)' : 'rgba(214, 32, 21, 0.3)';
                primaryHover = isDark ? 'rgba(255, 59, 48, 0.08)' : 'rgba(214, 32, 21, 0.05)';
                break;
            case 'blue':
                primary = isDark ? '#007aff' : '#0055bb';
                primaryBg = isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 85, 187, 0.12)';
                primaryBorder = isDark ? 'rgba(0, 122, 255, 0.4)' : 'rgba(0, 85, 187, 0.3)';
                primaryHover = isDark ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 85, 187, 0.05)';
                break;
        }

        return {
            bg: isDark ? '#0a0a0f' : '#f8f8f8',
            sidebarBg: isDark ? 'rgba(20, 20, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            sidebarBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            textPrimary: isDark ? '#fff' : '#000',
            textSecondary: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
            buttonBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
            buttonBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            buttonHoverBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            buttonHoverBorder: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
            iconBg: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            primary,
            primaryBg,
            primaryBorder,
            primaryHover,
        };
    }, [theme, colorScheme]);

    // Автоматически выбираем Анилибрию при загрузке
    useEffect(() => {
        setSelectedPlayer('anilibria');
        setSourceError(false);
    }, []);

    // Загрузка Анилибрия эпизодов
    useEffect(() => {
        if (selectedPlayer === 'anilibria' && animeId) {
            setIsLoading(true);
            setSourceError(false);
            const fetchLibria = async () => {
                try {
                    const res = await fetch(`${API_SERVER}/api/libria/episodes/${animeId}`);
                    if (!res.ok) {
                        // Проверяем статус ошибки 400, 404, 502
                        if (res.status === 400 || res.status === 404 || res.status === 502) {
                            setSourceError(true);
                            setLibriaEpisodes([]);
                        }
                        return;
                    }

                    const data: LibriaEpisode[] = await res.json();
                    if (data && data.length > 0) {
                        setLibriaEpisodes(data);
                        setSelectedEpisode(0);
                        setSourceError(false);
                    } else {
                        setSourceError(true);
                    }
                } catch (e) {
                    console.error('Ошибка Libria:', e);
                    setSourceError(true);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchLibria();
        }
    }, [selectedPlayer, animeId]);

    // Загрузка Kodik iframe URL
    useEffect(() => {
        if (selectedPlayer === 'kodik' && kodik) {
            setIsLoading(true);
            setSourceError(false);
            const fetchKodik = async () => {
                try {
                    const res = await fetch(`${KODIK_API_BASE}/search?token=${KODIK_API_TOKEN}&title=${encodeURIComponent(kodik)}`);
                    if (!res.ok) {
                        // Проверяем статус ошибки 400, 404, 502
                        if (res.status === 400 || res.status === 404 || res.status === 502) {
                            setSourceError(true);
                            setKodikIframeUrl('');
                        }
                        return;
                    }
                    const data = await res.json();
                    const link = data.results?.[0]?.link;
                    if (link) {
                        setKodikIframeUrl(link);
                        setSourceError(false);
                    } else {
                        setSourceError(true);
                    }
                } catch (e) {
                    console.error('Ошибка Kodik:', e);
                    setSourceError(true);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchKodik();
        }
    }, [selectedPlayer, kodik]);

    const handleKodikSelect = () => {
        setSelectedPlayer('kodik');
        setSourceError(false);
    };

    const handleAnilibriaSelect = () => {
        setSelectedPlayer('anilibria');
        setSourceError(false);
    };

    const handleNextEpisode = () => {
        if (selectedEpisode < libriaEpisodes.length - 1) {
            setSelectedEpisode(selectedEpisode + 1);
        }
    };

    const handlePrevEpisode = () => {
        if (selectedEpisode > 0) {
            setSelectedEpisode(selectedEpisode - 1);
        }
    };

    // Обновление заголовка страницы
    useEffect(() => {
        if (!title) return;
        
        const episodeNum = libriaEpisodes[selectedEpisode]?.ordinal || selectedEpisode + 1;
        document.title = `Эпизод ${episodeNum} || ${title}`;
    }, [selectedEpisode, title, libriaEpisodes]);

    // Динамический CSS для скроллбаров
    useEffect(() => {
        const styleId = 'player-page-scrollbar-styles';
        let styleEl = document.getElementById(styleId);
        
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        
        styleEl.textContent = `
            .episodes-grid::-webkit-scrollbar,
            .player-sidebar::-webkit-scrollbar {
                width: 6px;
            }
            .episodes-grid::-webkit-scrollbar-track,
            .player-sidebar::-webkit-scrollbar-track {
                background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
                border-radius: 3px;
            }
            .episodes-grid::-webkit-scrollbar-thumb,
            .player-sidebar::-webkit-scrollbar-thumb {
                background: ${colors.primary}50;
                border-radius: 3px;
            }
            .episodes-grid::-webkit-scrollbar-thumb:hover,
            .player-sidebar::-webkit-scrollbar-thumb:hover {
                background: ${colors.primary}80;
            }
        `;
    }, [theme, colors.primary]);

    // Если выбрана Анилибрия - показываем плеер на полный экран с правой панелью
    if (selectedPlayer === 'anilibria') {
        // Создаем animeMeta для источника libria
        // episodeNumber должен быть ordinal серии из API, а не индекс массива
        const currentEpisodeOrdinal = libriaEpisodes[selectedEpisode]?.ordinal || (selectedEpisode + 1);
        
        const animeMeta = {
            id: animeId,
            source: 'libria' as const,
            title: animeTitle,
            episodeNumber: currentEpisodeOrdinal
        };

        return (
            <div style={{ 
                width: '100%', 
                height: '100vh',
                background: colors.bg,
                display: 'flex',
                flexDirection: 'column',
                padding: '0',
                margin: '0',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Кнопка скрытия/открытия панели источников (только на мобильных) */}
                {isMobile && isPlayerUIVisible && (
                    <button
                        onClick={() => setIsSourcePanelCollapsed(!isSourcePanelCollapsed)}
                        style={{
                            position: 'absolute',
                            right: isSourcePanelCollapsed ? '20px' : '200px',
                            top: '20px',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: colors.sidebarBg,
                            border: `2px solid ${colors.sidebarBorder}`,
                            color: colors.textPrimary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 1001,
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isSourcePanelCollapsed ? (
                                <path d="M15 18l-6-6 6-6" />
                            ) : (
                                <path d="M9 18l6-6-6-6" />
                            )}
                        </svg>
                    </button>
                )}

                {/* Правая панель переключения источников */}
                <div
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: isSourcePanelCollapsed ? '-220px' : '20px',
                        zIndex: 1000,
                        background: colors.sidebarBg,
                        border: `1px solid ${colors.sidebarBorder}`,
                        borderRadius: '12px',
                        padding: '12px',
                        backdropFilter: 'blur(10px)',
                        minWidth: '200px',
                        transition: 'right 0.3s ease'
                    }}
                >
                    <h4 style={{
                        color: colors.textPrimary,
                        fontSize: '12px',
                        fontWeight: '600',
                        margin: '0 0 8px 0',
                        textAlign: 'center'
                    }}>
                        Источник:
                    </h4>
                    
                    {/* Кнопка Kodik */}
                    <div 
                        onClick={handleKodikSelect}
                        style={{
                            background: colors.buttonBg,
                            border: `1px solid ${colors.buttonBorder}`,
                            borderRadius: '8px',
                            padding: '8px 12px',
                            marginBottom: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                            e.currentTarget.style.borderColor = colors.buttonHoverBorder;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                            e.currentTarget.style.borderColor = colors.buttonBorder;
                        }}
                    >
                        <ExternalLink size={14} strokeWidth={2} />
                        <div style={{ flex: 1 }}>
                            <div style={{ color: colors.textPrimary, fontSize: '11px', fontWeight: '600' }}>
                                Kodik
                            </div>
                            <div style={{ color: colors.textSecondary, fontSize: '9px' }}>
                                До 720p
                            </div>
                        </div>
                    </div>

                    {/* Кнопка Анилибрия */}
                    <div 
                        style={{
                            background: colors.primaryBg,
                            border: `1px solid ${colors.primaryBorder}`,
                            borderRadius: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Crown size={14} strokeWidth={2} />
                        <div style={{ flex: 1 }}>
                            <div style={{ color: colors.textPrimary, fontSize: '11px', fontWeight: '600' }}>
                                Анилибрия ✓
                            </div>
                            <div style={{ color: colors.textSecondary, fontSize: '9px' }}>
                                1080p
                            </div>
                        </div>
                    </div>
                </div>

                {/* Кнопка возврата в углу */}
                {isPlayerUIVisible && (
                    <Link 
                        href={`/anime-page/${animeId}`}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '0' : '10px',
                            background: 'rgba(0, 0, 0, 0.8)',
                            border: `1px solid ${colors.primaryBorder}`,
                            borderRadius: isMobile ? '50%' : '10px',
                            padding: isMobile ? '10px' : '12px',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            width: isMobile ? '44px' : 'auto',
                            height: isMobile ? '44px' : 'auto',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.primaryBg;
                            e.currentTarget.style.borderColor = colors.primaryBorder;
                            if (!isMobile) e.currentTarget.style.transform = 'translateX(-4px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                            e.currentTarget.style.borderColor = colors.primaryBorder;
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                    >
                        {isMobile ? (
                            <ArrowLeft size={20} strokeWidth={2.5} color={colors.primary} />
                        ) : (
                            <>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: colors.primaryBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: colors.primary,
                                    flexShrink: 0
                                }}>
                                    <ArrowLeft size={14} strokeWidth={2.5} />
                                </div>
                                <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>
                                    {animeTitle}
                                </div>
                            </>
                        )}
                    </Link>
                )}

                {/* Плеер на полный экран */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%'
                }}>
                    {isLoading ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '24px'
                        }}>
                            <style>{`
                                @keyframes libriaRingPulse {
                                    0% {
                                        transform: translate(-50%, -50%) scale(0.3);
                                        opacity: 0;
                                    }
                                    50% {
                                        opacity: 0.8;
                                    }
                                    100% {
                                        transform: translate(-50%, -50%) scale(1.2);
                                        opacity: 0;
                                    }
                                }
                                @keyframes libriaLoadingPulse {
                                    0%, 100% { opacity: 0.5; }
                                    50% { opacity: 1; }
                                }
                            `}</style>
                            {/* 3 концентрических кольца от центра */}
                            <div style={{
                                position: 'relative',
                                width: '100px',
                                height: '100px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {/* Кольцо 1 - внутреннее */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    border: `3px solid ${colors.primary}`,
                                    boxShadow: `0 0 8px ${colors.primary}60`,
                                    animation: 'libriaRingPulse 1.5s ease-out infinite',
                                    animationDelay: '0s'
                                }}></div>
                                {/* Кольцо 2 - среднее */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    border: `3px solid ${colors.primary}`,
                                    boxShadow: `0 0 8px ${colors.primary}60`,
                                    animation: 'libriaRingPulse 1.5s ease-out infinite',
                                    animationDelay: '0.3s'
                                }}></div>
                                {/* Кольцо 3 - внешнее */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    border: `3px solid ${colors.primary}`,
                                    boxShadow: `0 0 8px ${colors.primary}60`,
                                    animation: 'libriaRingPulse 1.5s ease-out infinite',
                                    animationDelay: '0.6s'
                                }}></div>
                            </div>
                            {/* Текст */}
                            <div style={{
                                color: colors.textPrimary,
                                fontSize: '18px',
                                fontWeight: '500',
                                letterSpacing: '0.5px',
                                animation: 'libriaLoadingPulse 1.5s ease-in-out infinite'
                            }}>
                                Инциализация источника
                            </div>
                        </div>
                    ) : sourceError ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            padding: '32px',
                            background: colors.sidebarBg,
                            border: `1px solid ${colors.primaryBorder}`,
                            borderRadius: '16px',
                            maxWidth: '500px',
                            textAlign: 'center'
                        }}>
                            <AlertTriangle size={48} color={colors.primary} strokeWidth={2} />
                            <div style={{
                                color: colors.textPrimary,
                                fontSize: '18px',
                                fontWeight: '600'
                            }}>
                                Данный источник недоступен, пожалуйста выберите другой!
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '100%'
                        }}>
                            {isMobile ? (
                                <PlayerMobile 
                                    animeId={animeId}
                                    animeMeta={animeMeta}
                                    showSourceButton={false}
                                />
                            ) : (
                                <PlayerPC 
                                    animeId={animeId}
                                    animeMeta={animeMeta}
                                    onNextEpisode={handleNextEpisode}
                                    onPrevEpisode={handlePrevEpisode}
                                    showSourceButton={false}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Если выбран Kodik - показываем iframe на полный экран
    if (selectedPlayer === 'kodik') {
        return (
            <div style={{ 
                width: '100%', 
                height: '100vh',
                background: colors.bg,
                display: 'flex',
                flexDirection: 'column',
                padding: '0',
                margin: '0',
                position: 'relative'
            }}>
                {/* Кнопка переключения на Libria */}
                <div
                    onClick={handleAnilibriaSelect}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: colors.primaryBg,
                        border: `1px solid ${colors.primaryBorder}`,
                        borderRadius: '10px',
                        padding: '12px 16px',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(4px)';
                        e.currentTarget.style.background = colors.primaryHover;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.background = colors.primaryBg;
                    }}
                >
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: colors.primaryBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.primary,
                        flexShrink: 0
                    }}>
                        <Crown size={14} strokeWidth={2.5} />
                    </div>
                    <div style={{ color: colors.primary, fontSize: '12px', fontWeight: '600' }}>
                        Переключиться на источник Libria
                    </div>
                </div>

                {/* Кнопка возврата - под кнопкой переключения на Libria */}
                <Link 
                    href={`/anime-page/${animeId}`}
                    style={{
                        position: 'absolute',
                        top: '80px',
                        right: '20px',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '0' : '10px',
                        background: 'rgba(0, 0, 0, 0.8)',
                        border: `1px solid ${colors.primaryBorder}`,
                        borderRadius: isMobile ? '50%' : '10px',
                        padding: isMobile ? '10px' : '12px',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        width: isMobile ? '44px' : 'auto',
                        height: isMobile ? '44px' : 'auto',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.primaryBg;
                        e.currentTarget.style.borderColor = colors.primaryBorder;
                        if (!isMobile) e.currentTarget.style.transform = 'translateX(-4px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                        e.currentTarget.style.borderColor = colors.primaryBorder;
                        e.currentTarget.style.transform = 'translateX(0)';
                    }}
                >
                    {isMobile ? (
                        <ArrowLeft size={20} strokeWidth={2.5} color={colors.primary} />
                    ) : (
                        <>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: colors.primaryBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: colors.primary,
                                flexShrink: 0
                            }}>
                                <ArrowLeft size={14} strokeWidth={2.5} />
                            </div>
                            <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>
                                {animeTitle}
                            </div>
                        </>
                    )}
                </Link>

                {/* Kodik iframe на полный экран */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%'
                }}>
                    {isLoading ? (
                        <div style={{ color: colors.textPrimary, fontSize: '16px' }}>
                            Загрузка плеера...
                        </div>
                    ) : sourceError ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            padding: '32px',
                            background: colors.sidebarBg,
                            border: `1px solid ${colors.primaryBorder}`,
                            borderRadius: '16px',
                            maxWidth: '500px',
                            textAlign: 'center'
                        }}>
                            <AlertTriangle size={48} color={colors.primary} strokeWidth={2} />
                            <div style={{
                                color: colors.textPrimary,
                                fontSize: '18px',
                                fontWeight: '600'
                            }}>
                                Данный источник недоступен, пожалуйста выберите другой!
                            </div>
                        </div>
                    ) : kodikIframeUrl ? (
                        <iframe
                            src={kodikIframeUrl}
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                border: 'none', 
                                borderRadius: '0px',
                                position: 'absolute',
                                top: '0',
                                left: '0'
                            }}
                            allowFullScreen
                            frameBorder="0"
                        />
                    ) : (
                        <div style={{ color: colors.textSecondary, fontSize: '16px', textAlign: 'center' }}>
                            Плеер Kodik не найден
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Показываем выбор плеера по умолчанию
    return (
        <div style={{ 
            width: '100%', 
            minHeight: '100vh', 
            background: colors.bg,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            padding: isMobile ? '70px 10px 10px 10px' : '95px 20px 20px 20px',
            gap: isMobile ? '15px' : '20px',
            marginTop: isMobile ? '-70px' : '-95px',
            position: 'relative'
        }}>
  
            {isMobile && (
                <button
                    onClick={() => setIsSourcePanelCollapsed(!isSourcePanelCollapsed)}
                    style={{
                        position: 'fixed',
                        left: isSourcePanelCollapsed ? '10px' : 'calc(100% - 290px - 54px)',
                        top: '90px',
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: colors.sidebarBg,
                        border: `2px solid ${colors.sidebarBorder}`,
                        color: colors.textPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 100,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isSourcePanelCollapsed ? (
                            <path d="M9 18l6-6-6-6" />
                        ) : (
                            <path d="M15 18l-6-6 6-6" />
                        )}
                    </svg>
                </button>
            )}

            {/* Скрывающаяся боковая панель для мобильных */}
            {isMobile && (
                <>
                    
                    {/* Боковая панель выбора плеера */}
                    <div style={{
                        position: isSourcePanelCollapsed ? 'absolute' : 'relative',
                        right: isSourcePanelCollapsed ? '-280px' : '0',
                        top: '70px',
                        width: '280px',
                        background: colors.sidebarBg,
                        borderRadius: '12px',
                        padding: '15px',
                        border: `1px solid ${colors.sidebarBorder}`,
                        height: 'fit-content',
                        transition: 'right 0.3s ease',
                        zIndex: 5,
                        boxShadow: isSourcePanelCollapsed ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                    }}>
                    {/* Кнопка возврата на страницу аниме */}
                    <Link 
                        href={`/anime-page/${animeId}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: colors.buttonBg,
                            border: `1px solid ${colors.buttonBorder}`,
                            borderRadius: '10px',
                            padding: '10px',
                            color: colors.textPrimary,
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                            e.currentTarget.style.borderColor = colors.buttonHoverBorder;
                            e.currentTarget.style.transform = 'translateX(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                            e.currentTarget.style.borderColor = colors.buttonBorder;
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                    >
                        <ArrowLeft size={16} strokeWidth={2} />
                        <span>Назад к аниме</span>
                    </Link>

                    {/* Заголовок */}
                    <h2 style={{
                        color: colors.textPrimary,
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '15px 0 10px 0'
                    }}>
                        Выбор плеера
                    </h2>

                    {/* Кнопка Kodik */}
                    <div 
                        onClick={handleKodikSelect}
                        style={{
                            background: colors.buttonBg,
                            border: `1px solid ${colors.buttonBorder}`,
                            borderRadius: '10px',
                            padding: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                            e.currentTarget.style.borderColor = colors.buttonHoverBorder;
                            e.currentTarget.style.transform = 'translateX(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                            e.currentTarget.style.borderColor = colors.buttonBorder;
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                    >
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: colors.iconBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.textPrimary,
                            flexShrink: 0
                        }}>
                            <ExternalLink size={18} strokeWidth={2} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                                Kodik
                            </div>
                            <div style={{ color: colors.textSecondary, fontSize: '11px' }}>
                                До 720p, много озвучек
                            </div>
                        </div>
                    </div>

                    {/* Кнопка Анилибрии */}
                    <div 
                        onClick={handleAnilibriaSelect}
                        style={{
                            background: colors.buttonBg,
                            border: `1px solid ${colors.buttonBorder}`,
                            borderRadius: '10px',
                            padding: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '10px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.buttonHoverBg;
                            e.currentTarget.style.borderColor = colors.buttonHoverBorder;
                            e.currentTarget.style.transform = 'translateX(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.buttonBg;
                            e.currentTarget.style.borderColor = colors.buttonBorder;
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                    >
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: colors.iconBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.textPrimary,
                            flexShrink: 0
                        }}>
                            <Crown size={18} strokeWidth={2} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                                Анилибрия
                            </div>
                            <div style={{ color: colors.textSecondary, fontSize: '11px' }}>
                                1080p качество
                            </div>
                        </div>
                    </div>
                </div>
                </>
            )}
            
            {/* Десктопная боковая панель */}
            {!isMobile && (
                <div style={{
                    position: isSourcePanelCollapsed ? 'fixed' : 'relative',
                    right: isSourcePanelCollapsed ? '-280px' : '0',
                    width: '280px',
                    background: colors.sidebarBg,
                    borderRadius: '16px',
                    padding: '20px',
                    border: `1px solid ${colors.sidebarBorder}`,
                    height: 'fit-content',
                    transition: 'right 0.3s ease',
                    zIndex: 5
                }}>
                {/* Кнопка возврата на страницу аниме */}
                <Link 
                    href={`/anime-page/${animeId}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '10px' : '12px',
                        background: colors.buttonBg,
                        border: `1px solid ${colors.buttonBorder}`,
                        borderRadius: isMobile ? '10px' : '12px',
                        padding: isMobile ? '12px' : '14px',
                        marginBottom: isMobile ? '15px' : '20px',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.primaryHover;
                        e.currentTarget.style.borderColor = colors.primaryBorder;
                        if (!isMobile) e.currentTarget.style.transform = 'translateX(-4px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.buttonBg;
                        e.currentTarget.style.borderColor = colors.buttonBorder;
                        e.currentTarget.style.transform = 'translateX(0)';
                    }}
                >
                    <div style={{
                        width: isMobile ? '32px' : '36px',
                        height: isMobile ? '32px' : '36px',
                        borderRadius: '8px',
                        background: colors.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.primary,
                        flexShrink: 0
                    }}>
                        <ArrowLeft size={isMobile ? 16 : 18} strokeWidth={2.5} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ 
                            color: colors.textPrimary, 
                            fontSize: isMobile ? '12px' : '13px', 
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {animeTitle}
                        </div>
                        <div style={{ 
                            color: colors.textSecondary, 
                            fontSize: isMobile ? '10px' : '11px',
                            marginTop: '2px'
                        }}>
                            Вернуться на страницу аниме
                        </div>
                    </div>
                </Link>

                <h3 style={{
                    color: colors.textPrimary,
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: '700',
                    marginBottom: isMobile ? '12px' : '16px',
                    marginTop: 0
                }}>
                    Выберите плеер:
                </h3>

                {/* Кнопка Kodik */}
                <div 
                    onClick={handleKodikSelect}
                    style={{
                        background: colors.buttonBg,
                        border: `1px solid ${colors.buttonBorder}`,
                        borderRadius: isMobile ? '10px' : '12px',
                        padding: isMobile ? '12px' : '16px',
                        marginBottom: isMobile ? '10px' : '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '10px' : '12px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.buttonHoverBg;
                        e.currentTarget.style.borderColor = colors.buttonHoverBorder;
                        if (!isMobile) e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.buttonBg;
                        e.currentTarget.style.borderColor = colors.buttonBorder;
                        e.currentTarget.style.transform = 'translateX(0)';
                    }}
                >
                    <div style={{
                        width: isMobile ? '36px' : '40px',
                        height: isMobile ? '36px' : '40px',
                        borderRadius: '8px',
                        background: colors.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.textPrimary,
                        flexShrink: 0
                    }}>
                        <ExternalLink size={isMobile ? 18 : 20} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: colors.textPrimary, fontSize: isMobile ? '14px' : '15px', fontWeight: '600', marginBottom: '2px' }}>
                            Kodik
                        </div>
                        <div style={{ color: colors.textSecondary, fontSize: isMobile ? '11px' : '12px' }}>
                            До 720p, много озвучек
                        </div>
                    </div>
                </div>

                {/* Кнопка Анилибрия */}
                <div 
                    onClick={handleAnilibriaSelect}
                    style={{
                        background: colors.buttonBg,
                        border: `1px solid ${colors.buttonBorder}`,
                        borderRadius: isMobile ? '10px' : '12px',
                        padding: isMobile ? '12px' : '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '10px' : '12px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.buttonHoverBg;
                        e.currentTarget.style.borderColor = colors.buttonHoverBorder;
                        if (!isMobile) e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.buttonBg;
                        e.currentTarget.style.borderColor = colors.buttonBorder;
                        e.currentTarget.style.transform = 'translateX(0)';
                    }}
                >
                    <div style={{
                        width: isMobile ? '36px' : '40px',
                        height: isMobile ? '36px' : '40px',
                        borderRadius: '8px',
                        background: colors.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.textPrimary,
                        flexShrink: 0
                    }}>
                        <Crown size={isMobile ? 18 : 20} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ color: colors.textPrimary, fontSize: isMobile ? '14px' : '15px', fontWeight: '600', marginBottom: '2px' }}>
                            Анилибрия
                        </div>
                        <div style={{ color: colors.textSecondary, fontSize: isMobile ? '11px' : '12px' }}>
                            1080p качество
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Контейнер для плеера */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: isMobile ? '250px' : '400px'
            }}>
                <div style={{ color: colors.textSecondary, fontSize: '16px', textAlign: 'center' }}>
                    Выберите плеер для просмотра
                </div>
            </div>
        </div>
    );
}
