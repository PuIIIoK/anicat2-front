'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { YumekoProfileData } from '../../yumeko-anime-profile/hooks/useYumekoProfile';
import AnimatedMedia from '@/components/AnimatedMedia';
import * as LucideIcons from 'lucide-react';
import { BADGE_META } from '../../profile-page-old/badgeMeta';

interface ProfileV2HeaderProps {
    profileData: YumekoProfileData;
}

const ProfileV2Header: React.FC<ProfileV2HeaderProps> = ({ profileData }) => {
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
        isOwnProfile
    } = profileData;

    if (isLoading) {
        return (
            <div className="profile-v2-header profile-v2-header--loading">
                <div className="header-banner skeleton-pulse" />
                <div className="header-content">
                    <div className="header-avatar skeleton-pulse" />
                    <div className="header-info">
                        <div className="skeleton-text skeleton-pulse" style={{ width: '200px', height: '32px' }} />
                        <div className="skeleton-text skeleton-pulse" style={{ width: '300px', height: '20px', marginTop: '12px' }} />
                    </div>
                </div>
            </div>
        );
    }

    const getRoleBadge = () => {
        if (userRoles.includes('ADMIN')) return { label: 'Администратор', class: 'role-admin' };
        if (userRoles.includes('MODERATOR')) return { label: 'Модератор', class: 'role-mod' };
        if (userRoles.includes('ANIME_CHECKER')) return { label: 'Заливщик', class: 'role-uploader' };
        return null;
    };

    const role = getRoleBadge();

    return (
        <div className="profile-v2-header">
            {/* Баннер */}
            <div className="header-banner">
                {bannerUrl ? (
                    bannerAnimatedUrl ? (
                        <AnimatedMedia src={bannerAnimatedUrl} alt="Баннер" fill objectFit="cover" />
                    ) : (
                        <Image src={bannerUrl} alt="Баннер" fill style={{ objectFit: 'cover' }} />
                    )
                ) : (
                    <div className="header-banner-placeholder" />
                )}
                <div className="header-banner-gradient" />
            </div>

            {/* Контент хедера */}
            <div className="header-content">
                {/* Аватар с анимацией */}
                <div className="header-avatar-wrapper">
                    <div className="header-avatar-glow" />
                    <div className="header-avatar">
                        {avatarAnimatedUrl ? (
                            <AnimatedMedia src={avatarAnimatedUrl} alt="Аватар" width={140} height={140} />
                        ) : (
                            <Image 
                                src={avatarUrl || '/default-avatar.png'} 
                                alt="Аватар" 
                                width={140} 
                                height={140}
                            />
                        )}
                    </div>
                    {isVerified && (
                        <div className="header-verified">
                            <LucideIcons.BadgeCheck size={24} />
                        </div>
                    )}
                </div>

                {/* Информация о пользователе */}
                <div className="header-info">
                    <div className="header-name-row">
                        <h1 className="header-username">{userName}</h1>
                        {role && (
                            <span className={`header-role ${role.class}`}>
                                {role.label}
                            </span>
                        )}
                    </div>

                    {/* Badges */}
                    {badges.length > 0 && (
                        <div className="header-badges">
                            {badges.slice(0, 6).map((badge, idx) => {
                                const badgeMeta = BADGE_META[badge.toLowerCase()] || { icon: 'Award', title: badge, description: '' };
                                const IconComponent = LucideIcons[badgeMeta.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }>;
                                
                                return (
                                    <div key={idx} className="header-badge" title={badgeMeta.title}>
                                        <IconComponent size={18} />
                                        <span>{badgeMeta.title}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Био */}
                    {userDescription && (
                        <p className="header-bio">{userDescription}</p>
                    )}

                    {/* Кнопки действий */}
                    <div className="header-actions">
                        {isOwnProfile ? (
                            <Link href="/profile/settings" className="action-btn action-btn--primary">
                                <LucideIcons.Settings size={18} />
                                <span>Настройки</span>
                            </Link>
                        ) : (
                            <>
                                <button className="action-btn action-btn--primary">
                                    <LucideIcons.UserPlus size={18} />
                                    <span>Добавить в друзья</span>
                                </button>
                                <button className="action-btn action-btn--secondary">
                                    <LucideIcons.MessageCircle size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Мини-статистика */}
                <div className="header-quick-stats">
                    <div className="quick-stat">
                        <span className="quick-stat-value">{profileData.friends?.length || 0}</span>
                        <span className="quick-stat-label">Друзей</span>
                    </div>
                    <div className="quick-stat">
                        <span className="quick-stat-value">{profileData.watchingAnime?.length || 0}</span>
                        <span className="quick-stat-label">Смотрит</span>
                    </div>
                    <div className="quick-stat">
                        <span className="quick-stat-value">{profileData.favoriteAnime?.length || 0}</span>
                        <span className="quick-stat-label">Избранное</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileV2Header;
