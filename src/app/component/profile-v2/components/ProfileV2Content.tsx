'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { YumekoProfileData } from '../../yumeko-anime-profile/hooks/useYumekoProfile';
import * as LucideIcons from 'lucide-react';
import { API_SERVER } from '@/hosts/constants';

interface ProfileV2ContentProps {
    profileData: YumekoProfileData;
    activeSection: 'activity' | 'anime' | 'reviews' | 'friends';
}

const ProfileV2Content: React.FC<ProfileV2ContentProps> = ({ profileData, activeSection }) => {
    const { 
        watchingAnime, 
        favoriteAnime, 
        userReviews, 
        recentActivity,
        friends,
        isLoadingContent,
        isLoadingFriends
    } = profileData;

    const renderActivity = () => {
        if (isLoadingContent) {
            return (
                <div className="content-loading">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="activity-skeleton skeleton-pulse" />
                    ))}
                </div>
            );
        }

        if (!recentActivity || recentActivity.length === 0) {
            return (
                <div className="content-empty">
                    <LucideIcons.Activity size={48} />
                    <h3>Нет активности</h3>
                    <p>Пользователь еще ничего не делал</p>
                </div>
            );
        }

        return (
            <div className="activity-feed">
                {recentActivity.slice(0, 10).map((activity, idx) => (
                    <div key={idx} className="activity-item">
                        <div className="activity-icon">
                            {activity.type === 'WATCH' && <LucideIcons.Play size={18} />}
                            {activity.type === 'RATE' && <LucideIcons.Star size={18} />}
                            {activity.type === 'FAVORITE' && <LucideIcons.Heart size={18} />}
                            {!['WATCH', 'RATE', 'FAVORITE'].includes(activity.type) && <LucideIcons.Activity size={18} />}
                        </div>
                        <div className="activity-content">
                            <p className="activity-text">{activity.description || 'Действие'}</p>
                            <span className="activity-time">
                                {new Date(activity.createdAt).toLocaleDateString('ru-RU')}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderAnime = () => {
        if (isLoadingContent) {
            return (
                <div className="anime-grid anime-grid--loading">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="anime-card-skeleton skeleton-pulse" />
                    ))}
                </div>
            );
        }

        const allAnime = [
            ...watchingAnime.map(a => ({ ...a, status: 'watching' })),
            ...favoriteAnime.map(a => ({ ...a, status: 'favorite' }))
        ];

        if (allAnime.length === 0) {
            return (
                <div className="content-empty">
                    <LucideIcons.Tv size={48} />
                    <h3>Нет аниме</h3>
                    <p>Пользователь еще не добавил аниме в коллекцию</p>
                </div>
            );
        }

        return (
            <>
                {watchingAnime.length > 0 && (
                    <div className="anime-section">
                        <h3 className="section-title">
                            <LucideIcons.Play size={20} />
                            <span>Сейчас смотрит</span>
                            <span className="count">{watchingAnime.length}</span>
                        </h3>
                        <div className="anime-grid">
                            {watchingAnime.slice(0, 6).map((anime, idx) => (
                                <Link 
                                    key={idx} 
                                    href={`/anime/${anime.animeId || anime.id}`}
                                    className="anime-card"
                                >
                                    <div className="anime-card-cover">
                                        <Image
                                            src={`${API_SERVER}/api/stream/${anime.animeId || anime.id}/cover`}
                                            alt={anime.title || anime.name}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                        />
                                        <div className="anime-card-overlay">
                                            <span className="anime-status watching">
                                                <LucideIcons.Play size={12} />
                                                Смотрит
                                            </span>
                                        </div>
                                    </div>
                                    <div className="anime-card-info">
                                        <h4>{anime.title || anime.name}</h4>
                                        {anime.currentEpisode && (
                                            <span className="anime-progress">
                                                Эпизод {anime.currentEpisode}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {favoriteAnime.length > 0 && (
                    <div className="anime-section">
                        <h3 className="section-title">
                            <LucideIcons.Heart size={20} />
                            <span>Избранное</span>
                            <span className="count">{favoriteAnime.length}</span>
                        </h3>
                        <div className="anime-grid">
                            {favoriteAnime.slice(0, 6).map((anime, idx) => (
                                <Link 
                                    key={idx} 
                                    href={`/anime/${anime.animeId || anime.id}`}
                                    className="anime-card"
                                >
                                    <div className="anime-card-cover">
                                        <Image
                                            src={`${API_SERVER}/api/stream/${anime.animeId || anime.id}/cover`}
                                            alt={anime.title || anime.name}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                        />
                                        <div className="anime-card-overlay">
                                            <span className="anime-status favorite">
                                                <LucideIcons.Heart size={12} />
                                                Избранное
                                            </span>
                                        </div>
                                    </div>
                                    <div className="anime-card-info">
                                        <h4>{anime.title || anime.name}</h4>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </>
        );
    };

    const renderReviews = () => {
        if (isLoadingContent) {
            return (
                <div className="reviews-list reviews-list--loading">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="review-skeleton skeleton-pulse" />
                    ))}
                </div>
            );
        }

        if (!userReviews || userReviews.length === 0) {
            return (
                <div className="content-empty">
                    <LucideIcons.MessageSquare size={48} />
                    <h3>Нет отзывов</h3>
                    <p>Пользователь еще не оставлял отзывы</p>
                </div>
            );
        }

        return (
            <div className="reviews-list">
                {userReviews.map((review, idx) => (
                    <div key={idx} className="review-card">
                        <div className="review-cover">
                            <Image
                                src={`${API_SERVER}/api/stream/${review.animeId || review.id}/cover`}
                                alt="Аниме"
                                width={80}
                                height={120}
                                style={{ objectFit: 'cover' }}
                            />
                        </div>
                        <div className="review-content">
                            <div className="review-header">
                                <Link 
                                    href={`/anime/${review.animeId || review.id}`}
                                    className="review-title"
                                >
                                    {review.animeName || review.title || 'Аниме'}
                                </Link>
                                {review.rating && (
                                    <div className="review-rating">
                                        <LucideIcons.Star size={16} />
                                        <span>{review.rating}</span>
                                    </div>
                                )}
                            </div>
                            {review.review && (
                                <p className="review-text">{review.review}</p>
                            )}
                            <span className="review-date">
                                {new Date(review.createdAt || review.ratedAt).toLocaleDateString('ru-RU')}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderFriends = () => {
        if (isLoadingFriends) {
            return (
                <div className="friends-full-grid friends-full-grid--loading">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="friend-card-skeleton skeleton-pulse" />
                    ))}
                </div>
            );
        }

        if (!friends || friends.length === 0) {
            return (
                <div className="content-empty">
                    <LucideIcons.Users size={48} />
                    <h3>Нет друзей</h3>
                    <p>Пользователь пока ни с кем не подружился</p>
                </div>
            );
        }

        return (
            <div className="friends-full-grid">
                {friends.map((friend) => (
                    <Link
                        key={friend.id}
                        href={`/profile/${friend.username || friend.name}`}
                        className="friend-card"
                    >
                        <div className="friend-card-banner">
                            {friend.bannerAnimatedUrl ? (
                                <video
                                    src={friend.bannerAnimatedUrl}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                />
                            ) : friend.bannerUrl ? (
                                <Image
                                    src={friend.bannerUrl}
                                    alt=""
                                    fill
                                    style={{ objectFit: 'cover' }}
                                />
                            ) : (
                                <div className="friend-card-banner-placeholder" />
                            )}
                        </div>
                        <div className="friend-card-avatar">
                            {friend.avatarAnimatedUrl ? (
                                <video
                                    src={friend.avatarAnimatedUrl}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                />
                            ) : friend.avatarUrl ? (
                                <Image
                                    src={friend.avatarUrl}
                                    alt={friend.name}
                                    width={64}
                                    height={64}
                                />
                            ) : (
                                <div className="friend-card-avatar-placeholder">
                                    {friend.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="friend-card-info">
                            <span className="friend-name">
                                {friend.nickname || friend.name}
                                {friend.verified && (
                                    <LucideIcons.BadgeCheck size={14} className="verified-icon" />
                                )}
                            </span>
                            <span className="friend-username">@{friend.username}</span>
                        </div>
                    </Link>
                ))}
            </div>
        );
    };

    const getSectionTitle = () => {
        switch (activeSection) {
            case 'activity': return { icon: LucideIcons.Activity, title: 'Активность' };
            case 'anime': return { icon: LucideIcons.Tv, title: 'Аниме' };
            case 'reviews': return { icon: LucideIcons.MessageSquare, title: 'Отзывы' };
            case 'friends': return { icon: LucideIcons.Users, title: 'Друзья' };
        }
    };

    const section = getSectionTitle();
    const SectionIcon = section.icon;

    return (
        <main className="profile-v2-content">
            <div className="content-header">
                <SectionIcon size={24} />
                <h2>{section.title}</h2>
            </div>

            <div className="content-body">
                {activeSection === 'activity' && renderActivity()}
                {activeSection === 'anime' && renderAnime()}
                {activeSection === 'reviews' && renderReviews()}
                {activeSection === 'friends' && renderFriends()}
            </div>
        </main>
    );
};

export default ProfileV2Content;
