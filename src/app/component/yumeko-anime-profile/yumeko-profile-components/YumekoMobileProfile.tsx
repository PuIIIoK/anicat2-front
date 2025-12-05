'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import AnimatedMedia from '@/components/AnimatedMedia';
import { YumekoProfileData } from '../hooks/useYumekoProfile';
import { BADGE_META } from '../../profile-page-old/badgeMeta';
import { useServerUrl } from '../../../context/RegionalServerContext';
import YumekoAnimeCard from '../../anime-structure/YumekoAnimeCard';
import '../styles-for-profile/yumeko-profile-mobile.scss';
import '../../mobile-navigation/yumeko-mobile-index.scss';

interface YumekoMobileProfileProps {
    profileData: YumekoProfileData;
}

type TabType = 'stats' | 'reviews' | 'history';
type CollectionType = 'FAVORITE' | 'WATCHING' | 'PLANNED' | 'COMPLETED' | 'PAUSED' | 'DROPPED';
type FriendsTabType = 'friends' | 'incoming' | 'outgoing';

interface FriendRequest {
    id: number;
    senderId: number;
    senderUsername: string;
    senderNickname?: string;
    senderAvatarUrl?: string;
    receiverId: number;
    receiverUsername: string;
    receiverNickname?: string;
    receiverAvatarUrl?: string;
    status: string;
    createdAt: string;
}

interface CollectionAnime {
    id: number;
    title: string;
    imageUrl?: string;
    coverUrl?: string;
    type?: string;
    year?: string;
    current_episode?: string;
    episode_all?: string;
}

const YumekoMobileProfile: React.FC<YumekoMobileProfileProps> = ({ profileData }) => {
    const {
        userName,
        userDescription,
        userRoles,
        avatarUrl,
        avatarAnimatedUrl,
        bannerUrl,
        bannerAnimatedUrl,
        isVerified,
        badges,
        isLoading,
        friends,
        watchingAnime,
        userReviews,
        isOwnProfile,
        isLoadingFriends,
        isLoadingStats,
        profileColor1,
        profileColor2
    } = profileData;

    const serverUrl = useServerUrl();
    const [activeTab, setActiveTab] = useState<TabType>('stats');
    const [activeCollection, setActiveCollection] = useState<CollectionType>('FAVORITE');
    const [collectionData, setCollectionData] = useState<CollectionAnime[]>([]);
    const [isLoadingCollection, setIsLoadingCollection] = useState(false);
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
    const [friendsTab, setFriendsTab] = useState<FriendsTabType>('friends');
    const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(false);
    const [collectionStats, setCollectionStats] = useState({
        watching: 0,
        favorite: 0,
        planned: 0,
        completed: 0,
        paused: 0,
        dropped: 0
    });

    // Загрузка статистики коллекций
    useEffect(() => {
        const loadStats = async () => {
            if (!userName || userName === 'Загрузка...') return;
            
            const types: CollectionType[] = ['WATCHING', 'FAVORITE', 'PLANNED', 'COMPLETED', 'PAUSED', 'DROPPED'];
            const newStats = { watching: 0, favorite: 0, planned: 0, completed: 0, paused: 0, dropped: 0 };
            
            await Promise.all(types.map(async (type) => {
                try {
                    const res = await fetch(`${serverUrl}/api/collection/user/${encodeURIComponent(userName)}?type=${type}`);
                    if (res.ok) {
                        const data = await res.json();
                        const key = type.toLowerCase() as keyof typeof newStats;
                        newStats[key] = Array.isArray(data) ? data.length : 0;
                    }
                } catch (e) {
                    console.error(`Error loading ${type}:`, e);
                }
            }));
            
            setCollectionStats(newStats);
        };
        
        loadStats();
    }, [userName, serverUrl]);

    // Статистика
    const stats = collectionStats;

    // Загрузка коллекции
    const loadCollection = useCallback(async (type: CollectionType) => {
        if (!userName || userName === 'Загрузка...') return;
        
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
                        imageUrl: `${serverUrl}/api/stream/${animeId}/cover`,
                        coverUrl: `${serverUrl}/api/stream/${animeId}/cover`,
                        type: anime.type,
                        year: anime.year,
                        current_episode: anime.current_episode || '?',
                        episode_all: anime.episode_all || '?',
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
    }, [userName, serverUrl]);

    useEffect(() => {
        if (isCollectionModalOpen) {
            loadCollection(activeCollection);
        }
    }, [isCollectionModalOpen, activeCollection, loadCollection]);

    // Обработка кнопки "назад" для закрытия модалки коллекции
    useEffect(() => {
        if (isCollectionModalOpen) {
            window.history.pushState({ modal: 'collection' }, '');
            
            const handlePopState = () => {
                setIsCollectionModalOpen(false);
            };
            
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isCollectionModalOpen]);

    // Обработка кнопки "назад" для закрытия модалки друзей
    useEffect(() => {
        if (isFriendsModalOpen) {
            window.history.pushState({ modal: 'friends' }, '');
            
            const handlePopState = () => {
                setIsFriendsModalOpen(false);
            };
            
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isFriendsModalOpen]);

    // Загрузка запросов в друзья
    useEffect(() => {
        const loadFriendRequests = async () => {
            if (!isFriendsModalOpen || !isOwnProfile || !userName) return;
            
            setIsLoadingRequests(true);
            try {
                // Входящие запросы
                const inRes = await fetch(`${serverUrl}/api/friends/requests/incoming/${encodeURIComponent(userName)}`);
                if (inRes.ok) {
                    const data = await inRes.json();
                    setIncomingRequests(data || []);
                }
                
                // Исходящие запросы
                const outRes = await fetch(`${serverUrl}/api/friends/requests/outgoing/${encodeURIComponent(userName)}`);
                if (outRes.ok) {
                    const data = await outRes.json();
                    setOutgoingRequests(data || []);
                }
            } catch (e) {
                console.error('Error loading friend requests:', e);
            } finally {
                setIsLoadingRequests(false);
            }
        };
        
        loadFriendRequests();
    }, [isFriendsModalOpen, isOwnProfile, userName, serverUrl]);

    // Скелетон загрузки
    if (isLoading) {
        return (
            <div className="yumeko-profile-mobile">
                {/* Баннер скелетон */}
                <div className="ypm-skeleton-banner" />
                
                {/* Хедер скелетон */}
                <div className="ypm-header">
                    <div className="ypm-avatar-wrapper">
                        <div className="ypm-skeleton ypm-skeleton-avatar" />
                    </div>
                    <div className="ypm-skeleton ypm-skeleton-name" />
                    <div className="ypm-skeleton ypm-skeleton-roles" />
                    <div className="ypm-skeleton ypm-skeleton-bio" />
                </div>

                {/* Друзья скелетон */}
                <div className="ypm-friends-section">
                    <div className="ypm-friends-info">
                        <div className="ypm-skeleton ypm-skeleton-text-sm" />
                    </div>
                    <div className="ypm-friends-avatars">
                        <div className="ypm-skeleton ypm-skeleton-friend-avatar" />
                        <div className="ypm-skeleton ypm-skeleton-friend-avatar" />
                        <div className="ypm-skeleton ypm-skeleton-friend-avatar" />
                    </div>
                </div>

                {/* Табы скелетон */}
                <div className="ypm-tabs">
                    <div className="ypm-skeleton ypm-skeleton-tab" />
                    <div className="ypm-skeleton ypm-skeleton-tab" />
                    <div className="ypm-skeleton ypm-skeleton-tab-small" />
                </div>

                {/* Контент скелетон */}
                <div className="ypm-content">
                    <div className="ypm-skeleton-stats">
                        <div className="ypm-skeleton-stats-list">
                            <div className="ypm-skeleton ypm-skeleton-stat-row" />
                            <div className="ypm-skeleton ypm-skeleton-stat-row" />
                            <div className="ypm-skeleton ypm-skeleton-stat-row" />
                            <div className="ypm-skeleton ypm-skeleton-stat-row" />
                            <div className="ypm-skeleton ypm-skeleton-stat-row" />
                        </div>
                        <div className="ypm-skeleton ypm-skeleton-donut" />
                    </div>
                </div>
            </div>
        );
    }

    const getCollectionLabel = (type: CollectionType): string => {
        const labels: Record<CollectionType, string> = {
            FAVORITE: 'Избранное',
            WATCHING: 'Смотрю',
            PLANNED: 'В планах',
            COMPLETED: 'Просмотрено',
            PAUSED: 'Отложено',
            DROPPED: 'Брошено'
        };
        return labels[type];
    };

    // Цвета для статистики
    const statsColors = {
        watching: '#22c55e',
        favorite: '#ec4899',
        planned: '#a855f7',
        completed: '#3b82f6',
        paused: '#f59e0b',
        dropped: '#ef4444'
    };

    return (
        <div className="yumeko-profile-mobile">
            {/* ===== БАННЕР ===== */}
            <div className="ypm-banner">
                {bannerAnimatedUrl ? (
                    <AnimatedMedia src={bannerAnimatedUrl} alt="Баннер" width={500} height={200} className="banner-img" />
                ) : bannerUrl ? (
                    <Image src={bannerUrl} alt="Баннер" width={500} height={200} className="banner-img" />
                ) : null}
            </div>

            {/* ===== HEADER ===== */}
            <div className="ypm-header">
                {/* Градиент фон */}
                {profileColor1 && profileColor2 && (
                    <div 
                        className="ypm-header-gradient"
                        style={{
                            background: `linear-gradient(180deg, ${profileColor1}35 0%, ${profileColor2}20 60%, transparent 100%)`
                        }}
                    />
                )}
                {/* Аватар */}
                <div className="ypm-avatar-section">
                    <div className="ypm-avatar">
                        {avatarAnimatedUrl ? (
                            <AnimatedMedia src={avatarAnimatedUrl} alt="Аватар" width={110} height={110} className="avatar-img" />
                        ) : (
                            <Image 
                                src={avatarUrl || '/default-avatar.png'} 
                                alt="Аватар" 
                                width={110} 
                                height={110} 
                                className="avatar-img"
                            />
                        )}
                    </div>
                </div>

                {/* Имя */}
                <div className="ypm-name-section">
                    <div className="ypm-name-row">
                        <h1 className="ypm-username">{userName}</h1>
                        {isVerified && <LucideIcons.BadgeCheck className="ypm-verified" size={20} />}
                    </div>

                    {/* Роли */}
                    {userRoles.length > 0 && (
                        <div className="ypm-roles">
                            {userRoles.includes('ADMIN') && <span className="ypm-role admin">Администрация</span>}
                            {userRoles.includes('MODERATOR') && <span className="ypm-role moderator">Модератор</span>}
                            {userRoles.includes('ANIME_CHECKER') && <span className="ypm-role uploader">Заливщик</span>}
                        </div>
                    )}

                    {/* Бейджи */}
                    {badges.length > 0 && (
                        <div className="ypm-badges">
                            {badges.map((badge, idx) => {
                                const badgeMeta = BADGE_META[badge?.toLowerCase()] || { icon: 'Award' };
                                const IconComponent = LucideIcons[badgeMeta.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }>;
                                return (
                                    <div key={idx} className="ypm-badge">
                                        <IconComponent size={14} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Описание */}
                {userDescription && (
                    <p className="ypm-bio">{userDescription}</p>
                )}

                {/* Кнопки действий */}
                {isOwnProfile && (
                    <div className="ypm-actions">
                        <Link href="/profile/settings" className="ypm-edit-btn">
                            Редактировать
                        </Link>
                    </div>
                )}
            </div>

            {/* ===== ДРУЗЬЯ ===== */}
            {isLoadingFriends ? (
                <div className="ypm-friends-section">
                    <div className="ypm-friends-info">
                        <div className="ypm-skeleton ypm-skeleton-text-sm" />
                    </div>
                    <div className="ypm-friends-avatars">
                        <div className="ypm-skeleton ypm-skeleton-friend-avatar" />
                        <div className="ypm-skeleton ypm-skeleton-friend-avatar" />
                        <div className="ypm-skeleton ypm-skeleton-friend-avatar" />
                    </div>
                </div>
            ) : (
                <div className="ypm-friends-section" onClick={() => setIsFriendsModalOpen(true)}>
                    <div className="ypm-friends-info">
                        <span className="ypm-friends-count">{friends.length} друзей</span>
                        {friends.length > 0 && (
                            <span className="ypm-friends-names">
                                {friends.slice(0, 2).map(f => f.name).join(', ')}
                                {friends.length > 2 && ' и другие'}
                            </span>
                        )}
                    </div>
                    <div className="ypm-friends-avatars">
                        {friends.slice(0, 3).map((friend) => (
                            <div key={friend.id} className="ypm-friend-avatar" onClick={(e) => e.stopPropagation()}>
                                <Link href={`/profile/${friend.username}`}>
                                    {friend.avatarAnimatedUrl ? (
                                        <video src={friend.avatarAnimatedUrl} width={40} height={40} autoPlay loop muted playsInline />
                                    ) : (
                                        <Image src={friend.avatarUrl || '/default-avatar.png'} alt={friend.name} width={40} height={40} />
                                    )}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== ТАБЫ ===== */}
            <div className="ypm-tabs">
                <button 
                    className={`ypm-tab ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    <LucideIcons.BarChart3 size={16} />
                    <span>Статистика</span>
                </button>
                <button 
                    className={`ypm-tab ${activeTab === 'reviews' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reviews')}
                >
                    <LucideIcons.Star size={16} />
                    <span>Оценки релизов</span>
                </button>
                <button 
                    className={`ypm-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <LucideIcons.Copy size={16} />
                </button>
            </div>

            {/* ===== КОНТЕНТ ТАБОВ ===== */}
            <div className="ypm-content">
                {/* Статистика */}
                {activeTab === 'stats' && (
                    <div className="ypm-stats-tab">
                        {isLoadingStats ? (
                            <div className="ypm-skeleton-stats">
                                <div className="ypm-skeleton-stats-list">
                                    <div className="ypm-skeleton ypm-skeleton-stat-row" />
                                    <div className="ypm-skeleton ypm-skeleton-stat-row" />
                                    <div className="ypm-skeleton ypm-skeleton-stat-row" />
                                    <div className="ypm-skeleton ypm-skeleton-stat-row" />
                                    <div className="ypm-skeleton ypm-skeleton-stat-row" />
                                </div>
                                <div className="ypm-skeleton ypm-skeleton-donut" />
                            </div>
                        ) : (
                        <div className="ypm-stats-main">
                            {/* Список статистики */}
                            <div className="ypm-stats-list">
                                <div className="ypm-stat-row" onClick={() => { setActiveCollection('WATCHING'); setIsCollectionModalOpen(true); }}>
                                    <span className="ypm-stat-dot" style={{ background: statsColors.watching }} />
                                    <span className="ypm-stat-label">Смотрю</span>
                                    <span className="ypm-stat-value">{stats.watching}</span>
                                </div>
                                <div className="ypm-stat-row" onClick={() => { setActiveCollection('PLANNED'); setIsCollectionModalOpen(true); }}>
                                    <span className="ypm-stat-dot" style={{ background: statsColors.planned }} />
                                    <span className="ypm-stat-label">В планах</span>
                                    <span className="ypm-stat-value">{stats.planned}</span>
                                </div>
                                <div className="ypm-stat-row" onClick={() => { setActiveCollection('COMPLETED'); setIsCollectionModalOpen(true); }}>
                                    <span className="ypm-stat-dot" style={{ background: statsColors.completed }} />
                                    <span className="ypm-stat-label">Просмотрено</span>
                                    <span className="ypm-stat-value">{stats.completed}</span>
                                </div>
                                <div className="ypm-stat-row" onClick={() => { setActiveCollection('PAUSED'); setIsCollectionModalOpen(true); }}>
                                    <span className="ypm-stat-dot" style={{ background: statsColors.paused }} />
                                    <span className="ypm-stat-label">Отложено</span>
                                    <span className="ypm-stat-value">{stats.paused}</span>
                                </div>
                                <div className="ypm-stat-row" onClick={() => { setActiveCollection('DROPPED'); setIsCollectionModalOpen(true); }}>
                                    <span className="ypm-stat-dot" style={{ background: statsColors.dropped }} />
                                    <span className="ypm-stat-label">Брошено</span>
                                    <span className="ypm-stat-value">{stats.dropped}</span>
                                </div>
                            </div>

                            {/* Круговая диаграмма */}
                            <div className="ypm-chart">
                                <svg viewBox="0 0 100 100" className="ypm-donut">
                                    {(() => {
                                        const data = [
                                            { value: stats.watching, color: statsColors.watching },
                                            { value: stats.planned, color: statsColors.planned },
                                            { value: stats.completed, color: statsColors.completed },
                                            { value: stats.paused, color: statsColors.paused },
                                            { value: stats.dropped, color: statsColors.dropped },
                                        ];
                                        const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
                                        let offset = 0;
                                        return data.map((d, i) => {
                                            const dash = (d.value / total) * 251.2;
                                            const circle = (
                                                <circle
                                                    key={i}
                                                    cx="50" cy="50" r="40"
                                                    fill="none"
                                                    stroke={d.color}
                                                    strokeWidth="14"
                                                    strokeDasharray={`${dash} 251.2`}
                                                    strokeDashoffset={-offset}
                                                    transform="rotate(-90 50 50)"
                                                />
                                            );
                                            offset += dash;
                                            return circle;
                                        });
                                    })()}
                                    {/* Внутренний круг для создания "дырки" */}
                                    <circle cx="50" cy="50" r="28" fill="#1a1a1a" />
                                </svg>
                            </div>
                        </div>
                        )}

                        {/* Кнопка для чужих профилей */}
                        {!isOwnProfile && (
                            <button className="ypm-collection-btn" onClick={() => setIsCollectionModalOpen(true)}>
                                <LucideIcons.Library size={18} />
                                Посмотреть коллекцию
                            </button>
                        )}
                    </div>
                )}

                {/* Оценки релизов */}
                {activeTab === 'reviews' && (
                    <div className="ypm-reviews-tab">
                        {userReviews.length > 0 ? (
                            <div className="ypm-reviews-list">
                                {userReviews.map((review, idx) => (
                                    <Link 
                                        key={review.id || idx} 
                                        href={`/anime/${review.animeId || review.id}`}
                                        className="ypm-review-item"
                                    >
                                        <div className="ypm-review-cover">
                                            <Image 
                                                src={`${serverUrl}/api/stream/${review.animeId || review.id}/cover`}
                                                alt={review.animeTitle || 'Аниме'}
                                                width={70}
                                                height={100}
                                            />
                                        </div>
                                        <div className="ypm-review-info">
                                            <span className="ypm-review-title">{review.animeTitle || 'Аниме'}</span>
                                            <div className="ypm-review-meta">
                                                <span className="ypm-review-score">
                                                    <LucideIcons.Star size={14} fill="#fbbf24" color="#fbbf24" />
                                                    {review.score || review.rating || '?'}/5
                                                </span>
                                            </div>
                                            {review.comment && (
                                                <p className="ypm-review-comment">{review.comment}</p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="ypm-empty">
                                <LucideIcons.Star size={48} />
                                <p>Нет оценок</p>
                            </div>
                        )}
                    </div>
                )}

                {/* История просмотров */}
                {activeTab === 'history' && (
                    <div className="ypm-history-tab">
                        <h3 className="ypm-section-title">Просмотрено недавно</h3>
                        {watchingAnime.length > 0 ? (
                            <div className="ypm-history-list">
                                {watchingAnime.slice(0, 10).map((anime, idx) => {
                                    // Форматируем дату
                                    const getTimeAgo = () => {
                                        const date = anime.lastWatched ? new Date(anime.lastWatched) : new Date();
                                        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + 
                                               ' в ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                                    };

                                    return (
                                        <Link 
                                            key={anime.id || idx} 
                                            href={`/anime/${anime.id}`}
                                            className="ypm-history-item"
                                        >
                                            <div className="ypm-history-cover">
                                                <Image 
                                                    src={`${serverUrl}/api/stream/${anime.id}/cover`}
                                                    alt={anime.title}
                                                    width={70}
                                                    height={100}
                                                />
                                            </div>
                                            <div className="ypm-history-info">
                                                <span className="ypm-history-title">{anime.title}</span>
                                                <span className="ypm-history-episode">
                                                    {anime.totalWatchedEpisodes || 1} серия • {getTimeAgo()}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="ypm-empty">
                                <LucideIcons.History size={48} />
                                <p>История пуста</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ===== МОДАЛКА КОЛЛЕКЦИИ ===== */}
            {isCollectionModalOpen && (
                <div className="ypm-modal-overlay" onClick={() => setIsCollectionModalOpen(false)}>
                    <div className="ypm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ypm-modal-header">
                            <h2>{getCollectionLabel(activeCollection)}</h2>
                            <button className="ypm-modal-close" onClick={() => setIsCollectionModalOpen(false)}>
                                <LucideIcons.X size={24} />
                            </button>
                        </div>

                        <div 
                            className="ypm-modal-tabs-wrapper"
                            onTouchStart={(e) => {
                                const touch = e.touches[0];
                                (e.currentTarget as HTMLElement).dataset.touchStartX = touch.clientX.toString();
                            }}
                            onTouchEnd={(e) => {
                                const startX = parseFloat((e.currentTarget as HTMLElement).dataset.touchStartX || '0');
                                const endX = e.changedTouches[0].clientX;
                                const diff = startX - endX;
                                const types: CollectionType[] = ['FAVORITE', 'WATCHING', 'PLANNED', 'COMPLETED', 'PAUSED', 'DROPPED'];
                                const currentIndex = types.indexOf(activeCollection);
                                
                                if (Math.abs(diff) > 50) {
                                    if (diff > 0 && currentIndex < types.length - 1) {
                                        setActiveCollection(types[currentIndex + 1]);
                                    } else if (diff < 0 && currentIndex > 0) {
                                        setActiveCollection(types[currentIndex - 1]);
                                    }
                                }
                            }}
                        >
                            <div className="ypm-modal-tabs">
                                {(['FAVORITE', 'WATCHING', 'PLANNED', 'COMPLETED', 'PAUSED', 'DROPPED'] as CollectionType[]).map((type) => (
                                    <button
                                        key={type}
                                        ref={(el) => {
                                            if (el && activeCollection === type) {
                                                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                            }
                                        }}
                                        className={`ypm-modal-tab ${activeCollection === type ? 'active' : ''}`}
                                        onClick={() => setActiveCollection(type)}
                                    >
                                        {getCollectionLabel(type)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div 
                            className="ypm-modal-content"
                            onTouchStart={(e) => {
                                const touch = e.touches[0];
                                (e.currentTarget as HTMLElement).dataset.touchStartX = touch.clientX.toString();
                            }}
                            onTouchEnd={(e) => {
                                const startX = parseFloat((e.currentTarget as HTMLElement).dataset.touchStartX || '0');
                                const endX = e.changedTouches[0].clientX;
                                const diff = startX - endX;
                                const types: CollectionType[] = ['FAVORITE', 'WATCHING', 'PLANNED', 'COMPLETED', 'PAUSED', 'DROPPED'];
                                const currentIndex = types.indexOf(activeCollection);
                                
                                if (Math.abs(diff) > 50) {
                                    if (diff > 0 && currentIndex < types.length - 1) {
                                        setActiveCollection(types[currentIndex + 1]);
                                    } else if (diff < 0 && currentIndex > 0) {
                                        setActiveCollection(types[currentIndex - 1]);
                                    }
                                }
                            }}
                        >
                            {isLoadingCollection ? (
                                <div className="ypm-loading">
                                    <div className="ypm-spinner" />
                                </div>
                            ) : collectionData.length > 0 ? (
                                <div className="yumeko-mobile-index-grid">
                                    {collectionData.map((anime) => (
                                        <div key={anime.id} className="yumeko-mobile-index-card" onClick={() => setIsCollectionModalOpen(false)}>
                                            <YumekoAnimeCard
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                anime={anime as any}
                                                showCollectionStatus={true}
                                                showRating={true}
                                                showType={true}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="ypm-empty">
                                    <LucideIcons.Inbox size={48} />
                                    <p>Пусто</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== МОДАЛКА ДРУЗЕЙ ===== */}
            {isFriendsModalOpen && (
                <div className="ypm-modal-overlay ypm-fullscreen" onClick={() => setIsFriendsModalOpen(false)}>
                    <div className="ypm-modal ypm-friends-modal ypm-fullscreen-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ypm-modal-header">
                            <h2>
                                {friendsTab === 'friends' && `Друзья (${friends.length})`}
                                {friendsTab === 'incoming' && `Входящие (${incomingRequests.length})`}
                                {friendsTab === 'outgoing' && `Исходящие (${outgoingRequests.length})`}
                            </h2>
                            <button className="ypm-modal-close" onClick={() => setIsFriendsModalOpen(false)}>
                                <LucideIcons.X size={24} />
                            </button>
                        </div>

                        {/* Табы только для своего профиля */}
                        {isOwnProfile && (
                            <div className="ypm-modal-tabs-wrapper">
                                <div className="ypm-modal-tabs">
                                    <button 
                                        className={`ypm-modal-tab ${friendsTab === 'friends' ? 'active' : ''}`}
                                        onClick={() => setFriendsTab('friends')}
                                    >
                                        Друзья
                                    </button>
                                    <button 
                                        className={`ypm-modal-tab ${friendsTab === 'incoming' ? 'active' : ''}`}
                                        onClick={() => setFriendsTab('incoming')}
                                    >
                                        Входящие {incomingRequests.length > 0 && <span className="ypm-count-badge">{incomingRequests.length}</span>}
                                    </button>
                                    <button 
                                        className={`ypm-modal-tab ${friendsTab === 'outgoing' ? 'active' : ''}`}
                                        onClick={() => setFriendsTab('outgoing')}
                                    >
                                        Исходящие
                                    </button>
                                </div>
                            </div>
                        )}

                        <div 
                            className="ypm-modal-content ypm-friends-list"
                            onTouchStart={(e) => {
                                if (!isOwnProfile) return;
                                const touch = e.touches[0];
                                (e.currentTarget as HTMLElement).dataset.touchStartX = touch.clientX.toString();
                            }}
                            onTouchEnd={(e) => {
                                if (!isOwnProfile) return;
                                const startX = parseFloat((e.currentTarget as HTMLElement).dataset.touchStartX || '0');
                                const endX = e.changedTouches[0].clientX;
                                const diff = startX - endX;
                                const tabs: FriendsTabType[] = ['friends', 'incoming', 'outgoing'];
                                const currentIndex = tabs.indexOf(friendsTab);
                                
                                if (Math.abs(diff) > 50) {
                                    if (diff > 0 && currentIndex < tabs.length - 1) {
                                        setFriendsTab(tabs[currentIndex + 1]);
                                    } else if (diff < 0 && currentIndex > 0) {
                                        setFriendsTab(tabs[currentIndex - 1]);
                                    }
                                }
                            }}
                        >
                            {isLoadingRequests && friendsTab !== 'friends' ? (
                                <div className="ypm-loading">
                                    <div className="ypm-spinner" />
                                </div>
                            ) : friendsTab === 'friends' ? (
                                friends.length > 0 ? (
                                    friends.map((friend) => {
                                        const getRoleColor = () => {
                                            const roles = friend.roles || [];
                                            if (roles.includes('ADMIN')) return '#ef4444';
                                            if (roles.includes('MODERATOR')) return '#f59e0b';
                                            if (roles.includes('ANIME_CHECKER')) return '#a855f7';
                                            return null;
                                        };
                                        const roleColor = getRoleColor();
                                        const borderColor = friend.profileColor2 || friend.profileColor1;
                                        
                                        return (
                                            <Link 
                                                key={friend.id} 
                                                href={`/profile/${friend.username}`}
                                                className="ypm-friend-item"
                                                onClick={() => setIsFriendsModalOpen(false)}
                                                style={{
                                                    background: friend.profileColor1 && friend.profileColor2 
                                                        ? `linear-gradient(135deg, ${friend.profileColor1}15, ${friend.profileColor2}25)`
                                                        : undefined,
                                                    borderColor: borderColor || undefined
                                                }}
                                            >
                                                <div className="ypm-friend-item-banner">
                                                    {friend.bannerAnimatedUrl ? (
                                                        <video src={friend.bannerAnimatedUrl} autoPlay loop muted playsInline />
                                                    ) : friend.bannerUrl ? (
                                                        <Image src={friend.bannerUrl} alt="" fill />
                                                    ) : (
                                                        <div className="ypm-friend-item-banner-placeholder" style={{
                                                            background: friend.profileColor1 && friend.profileColor2
                                                                ? `linear-gradient(135deg, ${friend.profileColor1}, ${friend.profileColor2})`
                                                                : '#2a2a2a'
                                                        }} />
                                                    )}
                                                </div>
                                                <div className="ypm-friend-item-content">
                                                    <div className="ypm-friend-item-avatar">
                                                        {friend.avatarAnimatedUrl ? (
                                                            <video src={friend.avatarAnimatedUrl} width={56} height={56} autoPlay loop muted playsInline />
                                                        ) : (
                                                            <Image src={friend.avatarUrl || '/default-avatar.png'} alt={friend.name} width={56} height={56} />
                                                        )}
                                                    </div>
                                                    <div className="ypm-friend-item-info">
                                                        <div className="ypm-friend-item-name-row">
                                                            <span className="ypm-friend-item-name" style={{ color: roleColor || undefined }}>
                                                                {friend.name}
                                                            </span>
                                                            {friend.verified && (
                                                                <LucideIcons.BadgeCheck size={16} className="ypm-friend-verified" />
                                                            )}
                                                        </div>
                                                        <span className="ypm-friend-item-username">@{friend.username}</span>
                                                    </div>
                                                    <LucideIcons.ChevronRight size={20} className="ypm-friend-item-arrow" />
                                                </div>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className="ypm-empty">
                                        <LucideIcons.Users size={48} />
                                        <p>Нет друзей</p>
                                    </div>
                                )
                            ) : friendsTab === 'incoming' ? (
                                incomingRequests.length > 0 ? (
                                    incomingRequests.map((req) => (
                                        <div key={req.id} className="ypm-request-item">
                                            <Link href={`/profile/${req.senderUsername}`} className="ypm-request-user" onClick={() => setIsFriendsModalOpen(false)}>
                                                <div className="ypm-request-avatar">
                                                    <Image src={req.senderAvatarUrl || '/default-avatar.png'} alt={req.senderNickname || req.senderUsername} width={50} height={50} />
                                                </div>
                                                <div className="ypm-request-info">
                                                    <span className="ypm-request-name">{req.senderNickname || req.senderUsername}</span>
                                                    <span className="ypm-request-username">@{req.senderUsername}</span>
                                                </div>
                                            </Link>
                                            <div className="ypm-request-actions">
                                                <button className="ypm-request-accept">
                                                    <LucideIcons.Check size={18} />
                                                </button>
                                                <button className="ypm-request-reject">
                                                    <LucideIcons.X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="ypm-empty">
                                        <LucideIcons.Inbox size={48} />
                                        <p>Нет входящих запросов</p>
                                    </div>
                                )
                            ) : (
                                outgoingRequests.length > 0 ? (
                                    outgoingRequests.map((req) => (
                                        <div key={req.id} className="ypm-request-item">
                                            <Link href={`/profile/${req.receiverUsername}`} className="ypm-request-user" onClick={() => setIsFriendsModalOpen(false)}>
                                                <div className="ypm-request-avatar">
                                                    <Image src={req.receiverAvatarUrl || '/default-avatar.png'} alt={req.receiverNickname || req.receiverUsername} width={50} height={50} />
                                                </div>
                                                <div className="ypm-request-info">
                                                    <span className="ypm-request-name">{req.receiverNickname || req.receiverUsername}</span>
                                                    <span className="ypm-request-username">@{req.receiverUsername}</span>
                                                </div>
                                            </Link>
                                            <button className="ypm-request-cancel">
                                                <LucideIcons.X size={18} />
                                                Отменить
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="ypm-empty">
                                        <LucideIcons.Send size={48} />
                                        <p>Нет исходящих запросов</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YumekoMobileProfile;
