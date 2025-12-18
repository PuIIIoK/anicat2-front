'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Crown, ArrowLeft } from 'lucide-react';
import PlyrPlayer from '@/component/anime-players/plyr-player';
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

    const [selectedPlayer, setSelectedPlayer] = useState<'kodik' | 'anilibria' | null>(null);
    const [kodikIframeUrl, setKodikIframeUrl] = useState<string>('');
    const [libriaEpisodes, setLibriaEpisodes] = useState<LibriaEpisode[]>([]);
    const [selectedEpisode, setSelectedEpisode] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Определяем мобильное устройство
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
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

    // Загрузка Kodik iframe URL
    useEffect(() => {
        if (selectedPlayer === 'kodik' && kodik) {
            setIsLoading(true);
            const fetchKodik = async () => {
                try {
                    const res = await fetch(`${KODIK_API_BASE}/search?token=${KODIK_API_TOKEN}&title=${encodeURIComponent(kodik)}`);
                    const data = await res.json();
                    const link = data.results?.[0]?.link;
                    if (link) {
                        setKodikIframeUrl(link);
                    }
                } catch (e) {
                    console.error('Ошибка Kodik:', e);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchKodik();
        }
    }, [selectedPlayer, kodik]);

    // Загрузка Анилибрия эпизодов
    useEffect(() => {
        if (selectedPlayer === 'anilibria' && animeId) {
            setIsLoading(true);
            const fetchLibria = async () => {
                try {
                    const res = await fetch(`${API_SERVER}/api/libria/episodes/${animeId}`);
                    if (!res.ok) return;

                    const data: LibriaEpisode[] = await res.json();
                    if (data && data.length > 0) {
                        setLibriaEpisodes(data);
                        setSelectedEpisode(0);
                    }
                } catch (e) {
                    console.error('Ошибка Libria:', e);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchLibria();
        }
    }, [selectedPlayer, animeId]);

    const handleKodikSelect = () => {
        setSelectedPlayer('kodik');
    };

    const handleAnilibriaSelect = () => {
        setSelectedPlayer('anilibria');
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

    // Обновление заголовка страницы
    useEffect(() => {
        if (!title) return;
        
        if (selectedPlayer === 'kodik') {
            document.title = `Kodik || ${title}`;
        } else if (selectedPlayer === 'anilibria') {
            const episodeNum = libriaEpisodes[selectedEpisode]?.ordinal || selectedEpisode + 1;
            document.title = `Эпизод ${episodeNum} || ${title}`;
        } else {
            document.title = title || 'Выбор плеера';
        }
    }, [selectedPlayer, selectedEpisode, title, libriaEpisodes]);

    // Если выбран Kodik или Анилибрия - показываем с боковой панелью
    if (selectedPlayer) {
        const currentEpisode = libriaEpisodes[selectedEpisode];
        const videoUrl = currentEpisode?.hls_1080 || currentEpisode?.hls_720 || currentEpisode?.hls_480 || '';

        return (
            <div style={{ 
                width: '100%', 
                minHeight: '100vh', 
                background: colors.bg,
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                padding: isMobile ? '70px 10px 10px 10px' : '95px 20px 20px 20px',
                gap: isMobile ? '15px' : '20px',
                marginTop: isMobile ? '0px' : '0px'
            }}>
                {/* Боковая панель выбора плеера */}
                <div 
                    className="player-sidebar"
                    style={{
                        width: isMobile ? '100%' : '280px',
                        background: colors.sidebarBg,
                        borderRadius: isMobile ? '12px' : '16px',
                        padding: isMobile ? '15px' : '20px',
                        border: `1px solid ${colors.sidebarBorder}`,
                        height: 'fit-content',
                        maxHeight: isMobile ? 'none' : 'calc(100vh - 135px)',
                        overflowY: 'auto'
                    }}
                >
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
                            e.currentTarget.style.transform = 'translateX(-4px)';
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
                            background: selectedPlayer === 'kodik' ? colors.primaryBg : colors.buttonBg,
                            border: `1px solid ${selectedPlayer === 'kodik' ? colors.primaryBorder : colors.buttonBorder}`,
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
                            if (selectedPlayer !== 'kodik') {
                                e.currentTarget.style.background = colors.buttonHoverBg;
                                e.currentTarget.style.borderColor = colors.buttonHoverBorder;
                            }
                            if (!isMobile) e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                            if (selectedPlayer !== 'kodik') {
                                e.currentTarget.style.background = colors.buttonBg;
                                e.currentTarget.style.borderColor = colors.buttonBorder;
                            }
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                    >
                        <div style={{
                            width: isMobile ? '36px' : '40px',
                            height: isMobile ? '36px' : '40px',
                            borderRadius: '8px',
                            background: selectedPlayer === 'kodik' ? colors.primaryBg : colors.iconBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: selectedPlayer === 'kodik' ? colors.primary : colors.textPrimary,
                            flexShrink: 0
                        }}>
                            <ExternalLink size={isMobile ? 18 : 20} strokeWidth={2} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: colors.textPrimary, fontSize: isMobile ? '14px' : '15px', fontWeight: '600', marginBottom: '2px' }}>
                                Kodik {selectedPlayer === 'kodik' && '✓'}
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
                            background: selectedPlayer === 'anilibria' ? colors.primaryBg : colors.buttonBg,
                            border: `1px solid ${selectedPlayer === 'anilibria' ? colors.primaryBorder : colors.buttonBorder}`,
                            borderRadius: isMobile ? '10px' : '12px',
                            padding: isMobile ? '12px' : '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '10px' : '12px'
                        }}
                        onMouseEnter={(e) => {
                            if (selectedPlayer !== 'anilibria') {
                                e.currentTarget.style.background = colors.primaryHover;
                                e.currentTarget.style.borderColor = colors.buttonHoverBorder;
                            }
                            if (!isMobile) e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                            if (selectedPlayer !== 'anilibria') {
                                e.currentTarget.style.background = colors.buttonBg;
                                e.currentTarget.style.borderColor = colors.buttonBorder;
                            }
                            e.currentTarget.style.transform = 'translateX(0)';
                        }}
                    >
                        <div style={{
                            width: isMobile ? '36px' : '40px',
                            height: isMobile ? '36px' : '40px',
                            borderRadius: '8px',
                            background: selectedPlayer === 'anilibria' ? colors.primaryBg : colors.iconBg,
                            border: `1px solid ${selectedPlayer === 'anilibria' ? colors.primaryBorder : 'transparent'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: selectedPlayer === 'anilibria' ? colors.primary : colors.textPrimary,
                            flexShrink: 0
                        }}>
                            <Crown size={isMobile ? 18 : 20} strokeWidth={2} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: colors.textPrimary, fontSize: isMobile ? '14px' : '15px', fontWeight: '600', marginBottom: '2px' }}>
                                Анилибрия {selectedPlayer === 'anilibria' && '✓'}
                            </div>
                            <div style={{ color: colors.textSecondary, fontSize: isMobile ? '11px' : '12px' }}>
                                1080p качество
                            </div>
                        </div>
                    </div>

                    {/* Список серий для Анилибрии */}
                    {selectedPlayer === 'anilibria' && libriaEpisodes.length > 0 && (
                        <div style={{
                            marginTop: isMobile ? '15px' : '20px',
                            borderTop: `1px solid ${colors.sidebarBorder}`,
                            paddingTop: isMobile ? '15px' : '20px'
                        }}>
                            <h4 style={{
                                color: colors.textPrimary,
                                fontSize: isMobile ? '15px' : '16px',
                                fontWeight: '600',
                                marginBottom: isMobile ? '10px' : '12px',
                                marginTop: 0
                            }}>
                                Выберите серию:
                            </h4>
                            <div 
                                className="episodes-grid"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
                                    gap: isMobile ? '6px' : '8px',
                                    maxHeight: isMobile ? 'none' : '400px',
                                    overflowY: 'auto',
                                    paddingRight: '8px'
                                }}
                            >
                                {libriaEpisodes.map((episode, index) => (
                                    <div
                                        key={episode.ordinal || index}
                                        onClick={() => setSelectedEpisode(index)}
                                        style={{
                                            background: selectedEpisode === index ? colors.primaryBg : colors.buttonBg,
                                            border: `1px solid ${selectedEpisode === index ? colors.primaryBorder : colors.buttonBorder}`,
                                            borderRadius: '8px',
                                            padding: isMobile ? '8px' : '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'center',
                                            color: selectedEpisode === index ? colors.primary : colors.textPrimary,
                                            fontSize: isMobile ? '13px' : '14px',
                                            fontWeight: selectedEpisode === index ? '600' : '500'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedEpisode !== index) {
                                                e.currentTarget.style.background = colors.buttonHoverBg;
                                                e.currentTarget.style.borderColor = colors.buttonHoverBorder;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedEpisode !== index) {
                                                e.currentTarget.style.background = colors.buttonBg;
                                                e.currentTarget.style.borderColor = colors.buttonBorder;
                                            }
                                        }}
                                    >
                                        {episode.ordinal || index + 1}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Контейнер для плеера */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: isMobile ? '250px' : '400px'
                }}>
                    {isLoading ? (
                        <div style={{ color: colors.textPrimary, fontSize: '16px' }}>
                            Загрузка плеера...
                        </div>
                    ) : selectedPlayer === 'kodik' && kodikIframeUrl ? (
                        <div style={{
                            width: '100%',
                            maxWidth: isMobile ? '100%' : '1400px',
                            aspectRatio: '16 / 9'
                        }}>
                            <iframe
                                src={kodikIframeUrl}
                                style={{ width: '100%', height: '100%', border: 'none', borderRadius: isMobile ? '8px' : '12px' }}
                                allowFullScreen
                                frameBorder="0"
                            />
                        </div>
                    ) : selectedPlayer === 'anilibria' && videoUrl ? (
                        <div style={{
                            width: '100%',
                            maxWidth: isMobile ? '100%' : '1400px'
                        }}>
                            <PlyrPlayer 
                                videoUrl={videoUrl}
                                onNext={handleNextEpisode}
                                onPrev={handlePrevEpisode}
                            />
                        </div>
                    ) : (
                        <div style={{ color: colors.textSecondary, fontSize: '16px', textAlign: 'center' }}>
                            {selectedPlayer === 'kodik' ? 'Плеер Kodik не найден' : 'Эпизоды не найдены'}
                        </div>
                    )}
                </div>
            </div>
        );
    }


    // Показываем выбор плеера со списком слева
    return (
        <div style={{ 
            width: '100%', 
            minHeight: '100vh', 
            background: colors.bg,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            padding: isMobile ? '70px 10px 10px 10px' : '95px 20px 20px 20px',
            gap: isMobile ? '15px' : '20px',
            marginTop: isMobile ? '-70px' : '-95px'
        }}>
            {/* Боковая панель выбора плеера */}
            <div style={{
                width: isMobile ? '100%' : '280px',
                background: colors.sidebarBg,
                borderRadius: isMobile ? '12px' : '16px',
                padding: isMobile ? '15px' : '20px',
                border: `1px solid ${colors.sidebarBorder}`,
                height: 'fit-content'
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
                        e.currentTarget.style.background = colors.primaryHover;
                        e.currentTarget.style.borderColor = colors.primaryBorder;
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
                        border: `1px solid ${colors.primary}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.primary,
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

            {/* Контейнер для плеера */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: isMobile ? '250px' : '400px'
            }}>
                <div style={{
                    color: colors.textSecondary,
                    fontSize: '16px',
                    textAlign: 'center'
                }}>
                    Выберите плеер из списка {isMobile ? 'сверху' : 'слева'}
                </div>
            </div>
        </div>
    );
}

