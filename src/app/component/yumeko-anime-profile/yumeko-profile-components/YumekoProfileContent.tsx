'use client';

import React, { useState } from 'react';
import { YumekoProfileData } from '../hooks/useYumekoProfile';
import { API_SERVER } from '@/hosts/constants';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';
import YumekoAnimeDetailModal from './YumekoAnimeDetailModal';
import GlobalAnimeCard from '../../anime-structure/GlobalAnimeCard';
import SkeletonLoader from './SkeletonLoader';
import '../../../styles/components/global-anime-card.scss';

interface YumekoProfileContentProps {
    profileData: YumekoProfileData;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const YumekoProfileContent: React.FC<YumekoProfileContentProps> = ({ profileData, activeTab, setActiveTab }) => {
    const { watchingAnime, favoriteAnime, userReviews, recentActivity, isLoadingContent } = profileData;
    const [selectedAnime, setSelectedAnime] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAnimeClick = (anime: any) => {
        setSelectedAnime(anime);
        setIsModalOpen(true);
    };

    return (
        <div className="yumeko-profile-content">
            {/* Tabs */}
            {isLoadingContent ? (
                <SkeletonLoader type="tabs" count={4} />
            ) : (
                <div className="yumeko-tabs">
                    <button 
                        className={`yumeko-tab ${activeTab === 'main' ? 'active' : ''}`}
                        onClick={() => setActiveTab('main')}
                    >
                        Обзор
                    </button>
                    <button 
                        className={`yumeko-tab ${activeTab === 'watching' ? 'active' : ''}`}
                        onClick={() => setActiveTab('watching')}
                    >
                        Недавно просмотренное ({watchingAnime.length})
                    </button>
                    <button 
                        className={`yumeko-tab ${activeTab === 'favorites' ? 'active' : ''}`}
                        onClick={() => setActiveTab('favorites')}
                    >
                        Избранное ({favoriteAnime.length})
                    </button>
                    <button 
                        className={`yumeko-tab ${activeTab === 'reviews' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reviews')}
                    >
                        Отзывы ({userReviews.length})
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="yumeko-tab-content">
                {activeTab === 'main' && (
                    <div className="yumeko-overview">
                        {!isLoadingContent && <h2>Недавняя активность</h2>}
                        {isLoadingContent ? (
                            <SkeletonLoader type="activity" count={5} />
                        ) : recentActivity.length > 0 ? (
                            <div className="yumeko-activity-list">
                                {recentActivity.slice(0, 10).map((activity: any, idx: number) => {
                                    const getActivityIcon = () => {
                                        const type = activity.activityType || activity.type || '';
                                        if (type.includes('WATCH') || type.includes('VIEW')) return <LucideIcons.Play size={16} />;
                                        if (type.includes('FAVORITE') || type.includes('LIKE')) return <LucideIcons.Heart size={16} />;
                                        if (type.includes('REVIEW') || type.includes('RATING')) return <LucideIcons.Star size={16} />;
                                        if (type.includes('FRIEND')) return <LucideIcons.UserPlus size={16} />;
                                        return <LucideIcons.Activity size={16} />;
                                    };
                                    
                                    const getActivityText = () => {
                                        if (activity.description) return activity.description;
                                        if (activity.message) return activity.message;
                                        if (activity.text) return activity.text;
                                        const type = activity.activityType || activity.type || '';
                                        if (type.includes('WATCH')) return 'Просмотрел аниме';
                                        if (type.includes('FAVORITE')) return 'Добавил в избранное';
                                        if (type.includes('REVIEW')) return 'Оставил отзыв';
                                        return 'Активность';
                                    };
                                    
                                    const getActivityTime = () => {
                                        const timestamp = activity.timestamp || activity.createdAt || activity.date;
                                        if (!timestamp) return '';
                                        try {
                                            const date = new Date(timestamp);
                                            if (isNaN(date.getTime())) return '';
                                            const now = new Date();
                                            const diff = now.getTime() - date.getTime();
                                            const minutes = Math.floor(diff / 60000);
                                            const hours = Math.floor(diff / 3600000);
                                            const days = Math.floor(diff / 86400000);
                                            
                                            if (minutes < 1) return 'только что';
                                            if (minutes < 60) return `${minutes} мин назад`;
                                            if (hours < 24) return `${hours} ч назад`;
                                            if (days < 7) return `${days} дн назад`;
                                            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                                        } catch {
                                            return '';
                                        }
                                    };
                                    
                                    return (
                                        <div key={activity.id || idx} className="yumeko-activity-item">
                                            <div className="yumeko-activity-icon">
                                                {getActivityIcon()}
                                            </div>
                                            <span className="yumeko-activity-text">{getActivityText()}</span>
                                            <span className="yumeko-activity-time">{getActivityTime()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="yumeko-empty-state">
                                <LucideIcons.Inbox size={48} />
                                <p>Нет активности</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'watching' && (
                    <div className="yumeko-watching">
                        <h2>Недавно просмотренное</h2>
                        {watchingAnime.length > 0 ? (
                            <div className="yumeko-anime-grid">
                                {watchingAnime.map((anime: any) => {
                                    const totalEps = anime.episode_all || anime.totalEpisodes || '?';
                                    
                                    // Подсчитываем количество уникальных просмотренных серий
                                    const watchedEpisodesCount = anime.totalWatchedEpisodes || 0;
                                    
                                    // Сортируем озвучки по количеству просмотренных серий (от большего к меньшему)
                                    const voiceProgress = anime.voiceProgress || {};
                                    const sortedVoices = Object.entries(voiceProgress)
                                        .sort(([, a]: any, [, b]: any) => b - a);
                                    
                                    // Берем топ-2 озвучки
                                    const topVoices = sortedVoices.slice(0, 2);
                                    const remainingCount = sortedVoices.length - 2;
                                    
                                    return (
                                        <div key={anime.id} className="yumeko-anime-card" onClick={() => handleAnimeClick(anime)}>
                                            <div className="yumeko-anime-cover">
                                                <Image 
                                                    src={`${API_SERVER}/api/stream/${anime.id}/cover`}
                                                    alt={anime.title}
                                                    width={200}
                                                    height={280}
                                                />
                                            </div>
                                            <div className="yumeko-anime-details">
                                                <h3 className="yumeko-anime-title">{anime.title}</h3>
                                                <div className="yumeko-anime-meta-row">
                                                    <span className="year">{anime.year || '2025'}</span>
                                                    <span className="season">{anime.seasonLabel || '1 сезон'}</span>
                                                </div>
                                                {topVoices.length > 0 && (
                                                    <div className="yumeko-anime-voices-list">
                                                        {topVoices.map(([voice, count]: [string, any]) => (
                                                            <div key={voice} className="yumeko-anime-voice">
                                                                <span className="voice-label">{voice}:</span>
                                                                <span className="voice-count">{count} эп.</span>
                                                            </div>
                                                        ))}
                                                        {remainingCount > 0 && (
                                                            <div className="yumeko-anime-more-voices">
                                                                +{remainingCount} озвучек
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="yumeko-anime-actions">
                                                    <button className="yumeko-btn-list">
                                                        <LucideIcons.CheckSquare size={16} />
                                                        Список просмот.
                                                    </button>
                                                    <button className="yumeko-btn-progress">
                                                        {watchedEpisodesCount}/{totalEps} эп.
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="yumeko-empty-state">
                                <LucideIcons.Tv size={48} />
                                <p>Список пуст</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'favorites' && (
                    <div className="yumeko-favorites">
                        <h2>Избранное</h2>
                        {favoriteAnime.length > 0 ? (
                            <div className="yumeko-favorites-grid">
                                {favoriteAnime.map((item: any) => {
                                    const anime = item.anime || item;
                                    return (
                                        <GlobalAnimeCard
                                            key={anime.id}
                                            anime={anime}
                                            collectionType="FAVORITE"
                                            showCollectionStatus={true}
                                            showRating={true}
                                            showType={true}
                                            className="yumeko-favorite-card"
                                            priority={false}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="yumeko-empty-state">
                                <LucideIcons.Heart size={48} />
                                <p>Нет избранного аниме</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="yumeko-reviews">
                        <h2>Отзывы</h2>
                        {userReviews.length > 0 ? (
                            <div className="yumeko-reviews-list">
                                {userReviews.map((review: any) => (
                                    <div key={review.id} className="yumeko-review-card">
                                        <div className="yumeko-review-cover">
                                            <Image 
                                                src={`${API_SERVER}/api/stream/${review.animeId || review.id}/cover`}
                                                alt={review.animeTitle}
                                                width={80}
                                                height={120}
                                                className="yumeko-review-cover-image"
                                            />
                                        </div>
                                        <div className="yumeko-review-content">
                                            <div className="yumeko-review-header">
                                                <h3>{review.animeTitle}</h3>
                                                <div className="yumeko-review-score">
                                                    <LucideIcons.Star size={16} fill="currentColor" />
                                                    <span>{review.score}/10</span>
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <p className="yumeko-review-text">{review.comment}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="yumeko-empty-state">
                                <LucideIcons.MessageSquare size={48} />
                                <p>Отзывов пока нет</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <YumekoAnimeDetailModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                anime={selectedAnime}
                username={profileData.canonicalUsername}
            />
        </div>
    );
};

export default YumekoProfileContent;
