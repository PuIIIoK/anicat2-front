'use client';

import React, { useState } from 'react';
import { YumekoProfileData } from '../hooks/useYumekoProfile';
import AnimatedMedia from '@/components/AnimatedMedia';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';
import { BADGE_META } from '../../profile-page-old/badgeMeta';
import SkeletonLoader from './SkeletonLoader';

interface YumekoProfileHeaderProps {
    profileData: YumekoProfileData;
}

const YumekoProfileHeader: React.FC<YumekoProfileHeaderProps> = ({ profileData }) => {
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
        isLoading
    } = profileData;

    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);

    // Показываем скелетон при загрузке
    if (isLoading) {
        return <SkeletonLoader type="profile-header" />;
    }

    return (
        <div className="yumeko-profile-header">
            {/* Banner */}
            <div className="yumeko-banner-wrapper">
                {bannerUrl && (
                    bannerAnimatedUrl ? (
                        <AnimatedMedia src={bannerAnimatedUrl} alt="Баннер" fill objectFit="cover" />
                    ) : (
                        <Image src={bannerUrl} alt="Баннер" fill style={{ objectFit: 'cover' }} />
                    )
                )}
                <div className="yumeko-banner-overlay" />
            </div>

            {/* Profile Info */}
            <div className="yumeko-profile-info">
                {/* Avatar */}
                <div className="yumeko-avatar-container">
                    {avatarAnimatedUrl ? (
                        <AnimatedMedia src={avatarAnimatedUrl} alt="Аватар" width={120} height={120} className="yumeko-avatar" />
                    ) : (
                        <Image src={avatarUrl || '/default-avatar.png'} alt="Аватар" width={120} height={120} className="yumeko-avatar" />
                    )}
                </div>

                {/* User Details */}
                <div className="yumeko-user-details">
                    {/* Roles */}
                    {userRoles.length > 0 && (
                        <div className="yumeko-roles">
                            {userRoles.includes('ADMIN') && <span className="yumeko-role admin">Администратор</span>}
                            {userRoles.includes('MODERATOR') && <span className="yumeko-role moderator">Модератор</span>}
                            {userRoles.includes('ANIME_CHECKER') && <span className="yumeko-role uploader">Заливщик</span>}
                        </div>
                    )}

                    <div className="yumeko-username-row">
                        <h1 className="yumeko-username">{userName}</h1>
                        {isVerified && (
                            <LucideIcons.BadgeCheck className="yumeko-verified-badge" size={24} />
                        )}
                    </div>

                    {/* Badges */}
                    {badges.length > 0 && (
                        <div className="yumeko-badges">
                            {badges.slice(0, 5).map((badge, idx) => {
                                const badgeMeta = BADGE_META[badge.toLowerCase()] || { icon: 'Award', title: badge, description: '' };
                                const IconComponent = LucideIcons[badgeMeta.icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number }>;
                                
                                return (
                                    <div key={idx} className="yumeko-badge" title={badgeMeta.title}>
                                        <IconComponent size={16} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Bio */}
                    {userDescription && (
                        <p className="yumeko-bio">{userDescription}</p>
                    )}
                </div>

                {/* Level Block */}
                <div className="yumeko-level-block" onClick={() => setIsLevelModalOpen(true)}>
                    <div className="yumeko-level-header">
                        <LucideIcons.TrendingUp className="yumeko-level-icon" size={24} />
                        <div className="yumeko-level-info">
                            <div className="yumeko-level-label">УРОВЕНЬ</div>
                            <div className="yumeko-level-number">0</div>
                        </div>
                    </div>
                    <div className="yumeko-level-progress-container">
                        <div className="yumeko-level-progress-bar">
                            <div className="yumeko-level-progress-fill" style={{ width: '5%' }}></div>
                        </div>
                        <div className="yumeko-level-xp-text">0 / 100 XP</div>
                    </div>
                    <div className="yumeko-level-subtitle">
                        <LucideIcons.Info size={14} />
                        <span>Скоро будет...</span>
                    </div>
                </div>
            </div>

            {/* Level Modal */}
            {isLevelModalOpen && (
                <div className="yumeko-level-modal-overlay" onClick={() => setIsLevelModalOpen(false)}>
                    <div className="yumeko-level-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="yumeko-level-modal-content">
                            <LucideIcons.Construction size={48} className="yumeko-level-modal-icon" />
                            <h2 className="yumeko-level-modal-title">Функция в разработке</h2>
                            <p className="yumeko-level-modal-text">
                                Данная функция в разработке, скоро будет на сайте! Ждите)
                            </p>
                            <button className="yumeko-level-modal-button" onClick={() => setIsLevelModalOpen(false)}>
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YumekoProfileHeader;
