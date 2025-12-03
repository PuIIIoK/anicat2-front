'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import YumekoAnimeCard from '../../anime-structure/YumekoAnimeCard';
import { useServerUrl } from '../../../context/RegionalServerContext';
import SkeletonLoader from './SkeletonLoader';
import { YumekoProfileData } from '../hooks/useYumekoProfile';

interface YumekoProfileSidebarProps {
    profileData: YumekoProfileData;
    onOpenFriendsModal: () => void;
}

type CollectionType = 'FAVORITE' | 'WATCHING' | 'PLANNED' | 'COMPLETED' | 'PAUSED' | 'DROPPED';

interface CollectionAnime {
    id: number;
    title: string;
    alttitle?: string;
    season?: string;
    imageUrl?: string;
    type?: string;
    year?: string;
    rating?: string;
    episodeCount?: number;
    episode_all?: string;
    current_episode?: string;
    mouth_season?: string;
    status?: string;
    coverId?: number;
    bannerId?: number;
    hasScreenshots?: boolean;
    genres?: string[];
    studio?: string;
    alias?: string;
    realesed_for?: string;
    opened?: string;
    age_rating?: string;
    description?: string;
    anons?: boolean;
    coverUrl?: string;
}

const YumekoProfileSidebar: React.FC<YumekoProfileSidebarProps> = ({ 
    profileData, 
    onOpenFriendsModal 
}) => {
    const { friends, watchingAnime, favoriteAnime, isLoadingFriends, isLoadingStats, userName } = profileData;
    const serverUrl = useServerUrl(); // Используем региональный сервер
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<CollectionType>('FAVORITE');
    const [collectionData, setCollectionData] = useState<CollectionAnime[]>([]);
    const [isLoadingCollection, setIsLoadingCollection] = useState(false);

    // Данные для круговой диаграммы
    const stats = {
        watching: watchingAnime.length,
        favorite: favoriteAnime.length,
        planned: 4, // Пример данных
        completed: 28 // Пример данных
    };
    
    const total = stats.watching + stats.favorite + stats.planned + stats.completed;
    
    // Функция получения текста для вкладок
    const getTabLabel = (type: CollectionType): string => {
        switch (type) {
            case 'FAVORITE': return 'Избранное';
            case 'WATCHING': return 'Смотрю';
            case 'PLANNED': return 'В планах';
            case 'COMPLETED': return 'Просмотрено';
            case 'PAUSED': return 'Отложено';
            case 'DROPPED': return 'Брошено';
        }
    };
    
    // Функция загрузки коллекции
    const loadCollection = useCallback(async (type: CollectionType) => {
        if (!userName) return;
        
        setIsLoadingCollection(true);
        try {
            const res = await fetch(`${serverUrl}/api/collection/user/${encodeURIComponent(userName)}?type=${type}`);
            if (res.ok) {
                const data = await res.json();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formatted = data.map((item: any) => {
                    const animeId = item.anime?.id || item.id;
                    const anime = item.anime || item;
                    
                    return {
                        id: animeId,
                        title: anime.title,
                        alttitle: anime.alttitle,
                        season: anime.season,
                        // Используем API stream для обложек
                        imageUrl: `${serverUrl}/api/stream/${animeId}/cover`,
                        coverUrl: `${serverUrl}/api/stream/${animeId}/cover`,
                        type: anime.type,
                        year: anime.year,
                        rating: anime.rating,
                        status: anime.status,
                        // Используем current_episode и episode_all
                        current_episode: anime.current_episode || anime.currentEpisode || '?',
                        episode_all: anime.episode_all || anime.episodeCount || anime.totalEpisodes || '?',
                        mouth_season: anime.mouth_season,
                        coverId: anime.coverId,
                        bannerId: anime.bannerId,
                        hasScreenshots: anime.hasScreenshots,
                        genres: anime.genres,
                        studio: anime.studio,
                        age_rating: anime.age_rating,
                        description: anime.description
                    };
                });
                setCollectionData(formatted);
            } else {
                setCollectionData([]);
            }
        } catch (error) {
            console.error('Error loading collection:', error);
            setCollectionData([]);
        } finally {
            setIsLoadingCollection(false);
        }
    }, [userName]);
    
    // Загрузка коллекции при открытии модалки или смене вкладки
    useEffect(() => {
        if (isStatsModalOpen) {
            loadCollection(activeTab);
        }
    }, [isStatsModalOpen, activeTab, loadCollection]);
    
    // Вычисляем проценты и углы для SVG
    const chartData = [
        { label: 'СМОТРЮ', value: stats.watching, color: '#22c55e', angle: 0 },
        { label: 'ИЗБРАННОЕ', value: stats.favorite, color: '#ef4444', angle: 0 },
        { label: 'В ПЛАНАХ', value: stats.planned, color: '#f59e0b', angle: 0 },
        { label: 'ПРОСМОТРЕНО', value: stats.completed, color: '#8b5cf6', angle: 0 }
    ];
    
    chartData.forEach(item => {
        item.angle = total > 0 ? (item.value / total) * 360 : 0;
    });

    // Функция для создания SVG path для сегмента
    const createArcPath = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(centerX, centerY, radius, endAngle);
        const end = polarToCartesian(centerX, centerY, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        
        return [
            "M", centerX, centerY,
            "L", start.x, start.y, 
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            "Z"
        ].join(" ");
    };

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    return (
        <div className="yumeko-profile-sidebar">
            {/* Friends Section */}
            <div className="yumeko-sidebar-section">
                <div className="yumeko-section-header">
                    <h3>Друзья</h3>
                </div>

                {isLoadingFriends ? (
                    <SkeletonLoader type="friends" count={2} />
                ) : friends.length > 0 ? (
                    <>
                        <div className="yumeko-friends-list">
                            {friends.slice(0, 2).map((friend) => {
                                const bannerStyle: React.CSSProperties = {};
                                
                                // Fallback стили для градиента или статичного баннера
                                if (!friend.bannerAnimatedUrl && (friend.bannerUrl || (friend.profileColor1 && friend.profileColor2))) {
                                    if (friend.bannerUrl) {
                                        bannerStyle.backgroundImage = `url(${friend.bannerUrl})`;
                                        bannerStyle.backgroundSize = 'cover';
                                        bannerStyle.backgroundPosition = 'center';
                                    } else if (friend.profileColor1 && friend.profileColor2) {
                                        bannerStyle.background = `linear-gradient(135deg, ${friend.profileColor1} 0%, ${friend.profileColor2} 100%)`;
                                    }
                                }
                                
                                // Создаем CSS переменные для персональных цветов друга
                                const friendStyle = {} as React.CSSProperties & {
                                    [key: string]: string;
                                };
                                if (friend.profileColor1 && friend.profileColor2) {
                                    // У друга есть персональные цвета - используем их всегда
                                    friendStyle['--friend-primary-color'] = friend.profileColor2;
                                    friendStyle['--friend-primary-bg'] = `${friend.profileColor2}20`; // 20 = 0.125 opacity в hex
                                    friendStyle['--friend-primary-bg-hover'] = `${friend.profileColor2}30`; // 30 = 0.188 opacity в hex
                                } else {
                                    // У друга нет персональных цветов - используем нейтральные цвета
                                    friendStyle['--friend-primary-color'] = 'rgba(255, 255, 255, 0.2)'; // нейтральный для обычного состояния
                                    friendStyle['--friend-primary-bg'] = 'rgba(255, 255, 255, 0.03)'; // почти прозрачный
                                    friendStyle['--friend-primary-bg-hover'] = 'var(--primary-bg)'; // цветовая схема только при hover
                                    friendStyle['--friend-border-hover'] = 'var(--primary-color)'; // цветная обводка только при hover
                                }
                                
                                return (
                                    <Link 
                                        key={friend.id} 
                                        href={`/profile/${friend.username || friend.name}`}
                                        className="yumeko-friend-link"
                                    >
                                        <div 
                                            className="yumeko-friend-card-banner"
                                            style={friendStyle}
                                        >
                                            <div className="yumeko-friend-banner">
                                                {friend.bannerAnimatedUrl ? (
                                                    <video 
                                                        src={friend.bannerAnimatedUrl}
                                                        className="yumeko-friend-banner-video"
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                    />
                                                ) : (
                                                    <div className="yumeko-friend-banner-bg" style={bannerStyle} />
                                                )}
                                                <div className="yumeko-friend-banner-overlay" />
                                            </div>
                                            <div className="yumeko-friend-info-row">
                                                <div className="yumeko-friend-name-section">
                                                    <span className="yumeko-friend-name">{friend.name}</span>
                                                    {friend.verified && (
                                                        <LucideIcons.BadgeCheck size={16} className="verified-icon" />
                                                    )}
                                                </div>
                                                <div className="yumeko-friend-avatar-circle">
                                                    {friend.avatarAnimatedUrl ? (
                                                        <video 
                                                            src={friend.avatarAnimatedUrl}
                                                            width={50} 
                                                            height={50} 
                                                            className="yumeko-friend-avatar"
                                                            autoPlay
                                                            loop
                                                            muted
                                                            playsInline
                                                        />
                                                    ) : (
                                                        <Image 
                                                            src={friend.avatarUrl || '/default-avatar.png'} 
                                                            alt={friend.name} 
                                                            width={50} 
                                                            height={50} 
                                                            className="yumeko-friend-avatar"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        <button className="yumeko-friends-list-btn" onClick={onOpenFriendsModal}>
                            <LucideIcons.Users size={16} />
                            <span>Список друзей</span>
                        </button>
                    </>
                ) : (
                    <SkeletonLoader type="friends" count={2} />
                )}
            </div>

            {/* Stats Section with Chart */}
            <div className="yumeko-sidebar-section">
                {!isLoadingStats && (
                    <div className="yumeko-section-header">
                        <h3>Статистика</h3>
                        <button className="yumeko-stats-expand-btn" onClick={() => setIsStatsModalOpen(true)}>
                            <LucideIcons.Maximize2 size={14} />
                        </button>
                    </div>
                )}

                {isLoadingStats ? (
                    <SkeletonLoader type="stats" />
                ) : (
                    <div className="yumeko-stats-chart-container" onClick={() => setIsStatsModalOpen(true)} style={{ cursor: 'pointer' }}>
                        {total > 0 ? (
                        <>
                            {/* Круговая диаграмма */}
                            <div className="yumeko-pie-chart">
                                <svg width="160" height="160" viewBox="0 0 160 160">
                                    {(() => {
                                        let accumulatedAngle = 0;
                                        return chartData.map((segment, index) => {
                                            if (segment.angle === 0) return null;
                                            
                                            const path = createArcPath(80, 80, 70, accumulatedAngle, accumulatedAngle + segment.angle);
                                            accumulatedAngle += segment.angle;
                                            
                                            return (
                                                <path
                                                    key={index}
                                                    d={path}
                                                    fill={segment.color}
                                                    className="yumeko-chart-segment"
                                                />
                                            );
                                        });
                                    })()}
                                </svg>
                            </div>
                            
                            {/* Список статистики */}
                            <div className="yumeko-stats-list">
                                <div className="yumeko-stat-item">
                                    <div className="yumeko-stat-color" style={{ backgroundColor: '#22c55e' }}></div>
                                    <span className="yumeko-stat-label">СМОТРЮ</span>
                                    <span className="yumeko-stat-value">{stats.watching}</span>
                                </div>
                                <div className="yumeko-stat-item">
                                    <div className="yumeko-stat-color" style={{ backgroundColor: '#ef4444' }}></div>
                                    <span className="yumeko-stat-label">ИЗБРАННОЕ</span>
                                    <span className="yumeko-stat-value">{stats.favorite}</span>
                                </div>
                                <div className="yumeko-stat-item">
                                    <div className="yumeko-stat-color" style={{ backgroundColor: '#f59e0b' }}></div>
                                    <span className="yumeko-stat-label">В ПЛАНАХ</span>
                                    <span className="yumeko-stat-value">{stats.planned}</span>
                                </div>
                                <div className="yumeko-stat-item">
                                    <div className="yumeko-stat-color" style={{ backgroundColor: '#8b5cf6' }}></div>
                                    <span className="yumeko-stat-label">ПРОСМОТРЕНО</span>
                                    <span className="yumeko-stat-value">{stats.completed}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="yumeko-empty-stats">
                            <p>Нет данных для отображения</p>
                        </div>
                    )}
                    </div>
                )}
                
                {!isLoadingStats && total > 0 && (
                    <button className="yumeko-view-stats-collection-btn" onClick={() => setIsStatsModalOpen(true)}>
                        <LucideIcons.Library size={16} />
                        <span>Посмотреть коллекцию</span>
                    </button>
                )}
            </div>

            {/* Collection Modal */}
            {isStatsModalOpen && (
                <div className="yumeko-stats-modal-overlay" onClick={() => setIsStatsModalOpen(false)}>
                    <div className="yumeko-stats-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="yumeko-modal-close" onClick={() => setIsStatsModalOpen(false)}>
                            <LucideIcons.X size={24} />
                        </button>
                        
                        <div className="yumeko-stats-modal-content">
                            <h2 className="yumeko-stats-modal-title">
                                <LucideIcons.Library size={28} />
                                КОЛЛЕКЦИЯ
                            </h2>
                            
                            {/* Вкладки коллекции */}
                            <div className="yumeko-collection-tabs">
                                {(['FAVORITE', 'WATCHING', 'PLANNED', 'COMPLETED', 'PAUSED', 'DROPPED'] as CollectionType[]).map((type) => (
                                    <button
                                        key={type}
                                        className={`yumeko-collection-tab ${activeTab === type ? 'active' : ''}`}
                                        onClick={() => setActiveTab(type)}
                                    >
                                        {getTabLabel(type)}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Список аниме */}
                            <div className="yumeko-collection-anime-list">
                                {isLoadingCollection ? (
                                    <div className="yumeko-collection-loading">
                                        <div className="loader-modal-input"></div>
                                    </div>
                                ) : collectionData.length > 0 ? (
                                    <div className="yumeko-collection-grid">
                                        {collectionData.map((anime) => (
                                            <div key={anime.id} onClick={() => setIsStatsModalOpen(false)}>
                                                <YumekoAnimeCard
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    anime={anime as any}
                                                    // Не передаём collectionType - карточка сама загрузит статус текущего пользователя
                                                    showCollectionStatus={true}
                                                    showRating={true}
                                                    showType={true}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="yumeko-empty-collection">
                                        <LucideIcons.Inbox size={48} />
                                        <p>В этой категории пока нет аниме</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YumekoProfileSidebar;
