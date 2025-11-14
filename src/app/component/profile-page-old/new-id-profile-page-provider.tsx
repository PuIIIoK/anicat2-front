
'use client';

import React, {useEffect, useMemo, useState} from 'react';
import Head from 'next/head';
import {useProfile} from './hooks/useProfile';
import {FriendsList} from './components/FriendsList';
import {FriendsModal} from './components/FriendsModal';
import {OptimizedImage} from './components/OptimizedImage';
import AnimatedMedia from '@/components/AnimatedMedia';
import AddFriendButton from './widgets/AddFriendButton';
import FriendRequestNotification from './widgets/FriendRequestNotification';
import {StatsChart} from './components/StatsChart';
import {NowWatching} from './components/NowWatching';
import {Favorites} from './components/Favorites';
import {RecentActivity} from './components/RecentActivity';
import {UserCollections} from './components/UserCollections';
import {API_SERVER} from '@/hosts/constants';
import {BADGE_META} from './badgeMeta';
import * as LucideIcons from 'lucide-react';


// Type for Lucide icons
type LucideIconComponent = React.ComponentType<{
  className?: string;
  size?: number;
  strokeWidth?: number;
}>;

// Cached profile data shape used by __profileCache
type CachedProfileData = {
    userName?: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    backgroundUrl?: string | null;
    backgroundAnimatedUrl?: string | null;
};

// Window.__profileCache уже определен в src/types/window.d.ts

interface ProfileMainInfoProps {
    username?: string;
}

const ProfileMainInfo: React.FC<ProfileMainInfoProps> = ({ username }) => {
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
    const [visibleReviewsCount, setVisibleReviewsCount] = useState(3);
    const [activeTab, setActiveTab] = useState('main');

    const { 
        userName, 
        userDescription, 
        userRoles, 
        avatarUrl, 
        bannerUrl,
        backgroundUrl,
        avatarAnimatedUrl,
        bannerAnimatedUrl,
        backgroundAnimatedUrl,
        backgroundStaticUrl,
        profileColorScheme,
        profileColor1,
        profileColor2,
        isOwnProfile, 
        isLoading, 
        isVerified,
        watchingAnime,
        favoriteAnime,
        userReviews,
        badges = [],
        canonicalUsername,
        isBanned,
        banReason,
        banEndDate,
        isPermanentBan,
        isMuted,
        muteReason,
        muteEndDate,
        friends: friendsFromHook,
        incoming: incomingFromHook,
        incomingCount: incomingCountFromHook,
        refresh: refreshProfileData
    } = useProfile(username);

    // Определяем тему профиля: применяем только для СВОЕГО профиля
    const effectiveProfileTheme = isOwnProfile ? profileColorScheme : null;
    
    // Debug: выводим в консоль информацию о теме
    useEffect(() => {
        console.log('🎨 Profile Theme Debug:', {
            isOwnProfile,
            profileColorScheme,
            effectiveProfileTheme,
            username,
            canonicalUsername
        });
    }, [isOwnProfile, profileColorScheme, effectiveProfileTheme, username, canonicalUsername]);

    // Функция для конвертации HEX в RGB
    const hexToRgb = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '102, 126, 234';
    };

    // Принудительно применяем data-атрибут и CSS переменные к wrapper после монтирования
    useEffect(() => {
        const wrapper = document.querySelector('.anime-profile-page-correct-wrapper');
        if (wrapper) {
            const theme = effectiveProfileTheme || 'default';
            wrapper.setAttribute('data-profile-theme', theme);
            
            // Применяем цвета профиля через CSS переменные (для своего профиля применяем тему + цвета)
            const htmlElement = wrapper as HTMLElement;
            
            console.log('🔍 DEBUG: profileColor1 =', profileColor1);
            console.log('🔍 DEBUG: profileColor2 =', profileColor2);
            console.log('🔍 DEBUG: isOwnProfile =', isOwnProfile);
            
            // Цвета применяются ВСЕГДА если они установлены (и на своем, и на чужом профиле)
            if (profileColor1 && profileColor1.trim() !== '') {
                const color1 = profileColor1.trim();
                const rgb1 = hexToRgb(color1);
                htmlElement.style.setProperty('--profile-color-1', color1, 'important');
                htmlElement.style.setProperty('--profile-color-1-rgb', rgb1, 'important');
                console.log('✅ Profile color 1 applied:', color1, 'RGB:', rgb1);
                
                // Проверяем, что переменная установлена
                const appliedColor1 = getComputedStyle(htmlElement).getPropertyValue('--profile-color-1');
                console.log('✅ Computed --profile-color-1:', appliedColor1);
            } else {
                htmlElement.style.removeProperty('--profile-color-1');
                htmlElement.style.removeProperty('--profile-color-1-rgb');
                console.warn('⚠️ Profile color 1 is empty or null');
            }
            
            if (profileColor2 && profileColor2.trim() !== '') {
                const color2 = profileColor2.trim();
                const rgb2 = hexToRgb(color2);
                htmlElement.style.setProperty('--profile-color-2', color2, 'important');
                htmlElement.style.setProperty('--profile-color-2-rgb', rgb2, 'important');
                console.log('✅ Profile color 2 applied:', color2, 'RGB:', rgb2);
                
                // Проверяем, что переменная установлена
                const appliedColor2 = getComputedStyle(htmlElement).getPropertyValue('--profile-color-2');
                console.log('✅ Computed --profile-color-2:', appliedColor2);
            } else {
                htmlElement.style.removeProperty('--profile-color-2');
                htmlElement.style.removeProperty('--profile-color-2-rgb');
                console.warn('⚠️ Profile color 2 is empty or null');
            }
            
            console.log('✅ Data attribute applied:', theme);
            console.log('🔍 Wrapper element:', wrapper);
            console.log('📋 Current data-profile-theme:', wrapper.getAttribute('data-profile-theme'));
        } else {
            console.error('❌ Wrapper element not found!');
        }
    }, [effectiveProfileTheme, isOwnProfile, profileColor1, profileColor2]);


    // Кэш профиля из глобального Map (если есть — используем для мгновенного отображения)
    const cacheKey = (canonicalUsername || username) || null;
    const cachedProfile: CachedProfileData | undefined = typeof window !== 'undefined' && cacheKey
        ? window.__profileCache?.get(cacheKey)?.data
        : undefined;
    // Определяем жёсткую перезагрузку страницы
    const isHardReload = typeof window !== 'undefined' && (() => {
        try {
            const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
            if (entries && entries.length > 0) return entries[0].type === 'reload';
            // fallback
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (performance && performance.navigation) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return performance.navigation.type === 1;
            }
        } catch {}
        return false;
    })();
    const hasCached = !isHardReload && Boolean(cachedProfile);
    const displayUserName = hasCached ? ((cachedProfile?.userName) || userName) : userName;
    const displayAvatarUrl = hasCached ? ((cachedProfile?.avatarUrl) ?? avatarUrl) : avatarUrl;
    const displayBannerUrl = hasCached ? ((cachedProfile?.bannerUrl) ?? bannerUrl) : bannerUrl;


    const pinnedFriends = useMemo(() => friendsFromHook.slice(0, 3), [friendsFromHook]);
    const extraFriends = useMemo(() => friendsFromHook.slice(3), [friendsFromHook]);

    const COLORS = ['#43d675', '#c4c4c4', '#ffd93a', '#ff4e4e', '#b97aff'];

    // Кэш для аватаров и баннеров друзей
    const [friendsImageCache] = useState<Map<string, { avatarUrl: string, bannerUrl: string }>>(new Map());



    // Обновляем title, когда реально загрузился userName
    useEffect(() => {
        if (userName && userName !== 'Загрузка...') {
            document.title = `${userName} | Yumeko`;
        }
    }, [userName]);


    // Если идёт загрузка, но есть кэш — показываем данные сразу без скелета
    if (isLoading && !hasCached) {
        // Применяем CSS переменные для цветов в loading state
        const loadingStyle: Record<string, string> = {};
        if (profileColor1 && profileColor1.trim() !== '') {
            const rgb1 = hexToRgb(profileColor1.trim());
            loadingStyle['--profile-color-1'] = profileColor1.trim();
            loadingStyle['--profile-color-1-rgb'] = rgb1;
        }
        if (profileColor2 && profileColor2.trim() !== '') {
            const rgb2 = hexToRgb(profileColor2.trim());
            loadingStyle['--profile-color-2'] = profileColor2.trim();
            loadingStyle['--profile-color-2-rgb'] = rgb2;
        }
        
        return (
            <div 
                className="anime-profile-page-correct-wrapper" 
                data-profile-theme={effectiveProfileTheme || 'default'}
                style={loadingStyle}
            >
                {backgroundAnimatedUrl || backgroundStaticUrl || backgroundUrl ? (
                    <div className="anime-profile-page-correct-background">
                        {backgroundAnimatedUrl ? (
                            <AnimatedMedia src={backgroundAnimatedUrl} alt="Фон профиля" fill objectFit="cover" />
                        ) : (
                            <OptimizedImage src={backgroundUrl || backgroundStaticUrl || ''} alt="Фон профиля" fill style={{objectFit: 'cover'}} />
                        )}
                    </div>
                ) : null}
                <div className="anime-profile-page-correct-header-skeleton">
                    <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-banner" />
                    <div className="anime-profile-page-correct-skeleton-info">
                        <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-avatar" />
                        <div className="anime-profile-page-correct-skeleton-details">
                            <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-name" />
                            <div className="anime-profile-page-correct-skeleton-badges">
                                <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-badge" />
                                <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-badge" />
                                <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-badge" />
                            </div>
                            <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-bio" />
                        </div>
                    </div>
                </div>
                <div className="anime-profile-page-correct-container">
                    <div className="anime-profile-page-correct-sidebar">
                        <div className="anime-profile-page-correct-skeleton-section-wrapper">
                            <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-section-title" />
                            <div className="anime-profile-page-correct-skeleton-friends-list">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="anime-profile-page-correct-skeleton-friend-item">
                                        <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-friend-avatar" />
                                        <div className="anime-profile-page-correct-skeleton-friend-info">
                                            <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-friend-name" />
                                            <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-friend-bio" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="anime-profile-page-correct-skeleton-section-wrapper">
                            <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-section-title" />
                            <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-chart" />
                        </div>
                    </div>
                    <div className="anime-profile-page-correct-main">
                        <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-tabs" />
                        <div className="anime-profile-page-correct-skeleton-section-wrapper">
                            <div className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-section-title" />
                            <div className="anime-profile-page-correct-skeleton-anime-grid">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="anime-profile-page-correct-skeleton anime-profile-page-correct-skeleton-anime-card" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Если пользователь забанен перманентно - показываем только страницу с баном
    if (isPermanentBan) {
        return (
            <div className="anime-profile-page-correct-wrapper" data-profile-theme={effectiveProfileTheme || 'default'}>
                {backgroundAnimatedUrl || backgroundStaticUrl || backgroundUrl ? (
                    <div className="anime-profile-page-correct-background">
                        {backgroundAnimatedUrl ? (
                            <AnimatedMedia src={backgroundAnimatedUrl} alt="Фон профиля" fill objectFit="cover" />
                        ) : (
                            <OptimizedImage src={backgroundUrl || backgroundStaticUrl || ''} alt="Фон профиля" fill style={{objectFit: 'cover'}} />
                        )}
                    </div>
                ) : null}
                <div className="anime-profile-page-correct-permanent-ban-page">
                    <div className="anime-profile-page-correct-ban-container">
                        <div className="ban-icon-wrapper">
                            <div className="ban-icon-circle">
                                <LucideIcons.ShieldX size={48} />
                            </div>
                        </div>
                        <h1 className="ban-title">Данный пользователь был навсегда забанен из-за нарушение правил сообщества</h1>
                        {banReason && (
                            <div className="ban-reason-card">
                                <div className="ban-reason-header">
                                    <LucideIcons.AlertTriangle size={20} />
                                    <span>Причина бана</span>
                                </div>
                                <div className="ban-reason-content">
                                    {banReason}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Применяем CSS переменные для цветов профиля через inline style
    const profileStyle: Record<string, string> = {};
    if (profileColor1 && profileColor1.trim() !== '') {
        const rgb1 = hexToRgb(profileColor1.trim());
        profileStyle['--profile-color-1'] = profileColor1.trim();
        profileStyle['--profile-color-1-rgb'] = rgb1;
    }
    if (profileColor2 && profileColor2.trim() !== '') {
        const rgb2 = hexToRgb(profileColor2.trim());
        profileStyle['--profile-color-2'] = profileColor2.trim();
        profileStyle['--profile-color-2-rgb'] = rgb2;
    }

    return (
        <>
            <Head>
                <title>Ваш профиль | Yumeko</title>
                <meta name="description" content="Ваш профиль, где показаны ваши достижения, награды, роли и личная информация. Управляйте своими коллекциями и настройками аккаунта." />
                <meta name="keywords" content="Yumeko, Профиль, Аниме, Коллекции, Награды, Роли" />
                <meta property="og:title" content="Ваш профиль | Yumeko" />
                <meta property="og:description" content="Ваш профиль, где показаны ваши достижения, награды, роли и личная информация. Управляйте своими коллекциями и настройками аккаунта." />
                <meta property="og:image" content="https://anicat.fun/logo-cover.jpg" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://anicat.fun/profile" />
            </Head>

            <div className="anime-profile-page-correct-wrapper" data-profile-theme={effectiveProfileTheme || 'default'} style={profileStyle}>
            {backgroundAnimatedUrl || backgroundStaticUrl || backgroundUrl ? (
                <div className="anime-profile-page-correct-background">
                    {backgroundAnimatedUrl ? (
                        <AnimatedMedia src={backgroundAnimatedUrl} alt="Фон профиля" fill objectFit="cover" />
                    ) : (
                        <OptimizedImage src={backgroundUrl || backgroundStaticUrl || ''} alt="Фон профиля" fill style={{objectFit: 'cover'}} />
                    )}
                </div>
            ) : null}
            <div className="anime-profile-page-correct-header">
                <div className="anime-profile-page-correct-banner-wrapper">
                    {displayBannerUrl ? (
                        bannerAnimatedUrl ? (
                            <AnimatedMedia 
                                src={bannerAnimatedUrl}
                                alt="Баннер" 
                                fill 
                                className="anime-profile-page-correct-banner-image" 
                                objectFit="cover"
                            />
                        ) : (
                            <OptimizedImage src={displayBannerUrl} alt="Баннер" fill className="anime-profile-page-correct-banner-image" style={{ objectFit: 'cover' }} />
                        )
                    ) : null}
                    <div 
                        className="anime-profile-page-correct-banner-overlay"
                        style={{
                            background: profileColor1 
                                ? `linear-gradient(180deg, transparent 0%, ${profileColor1}CC 100%)`
                                : undefined
                        }}
                    />
                    
                    {/* Ban/Mute Banners on Banner */}
                    {(isBanned || isMuted) && (
                        <div className="anime-profile-page-correct-banner-badges">
                            {isBanned && !isPermanentBan && (
                                <div className="anime-profile-page-correct-ban-badge">
                                    <div className="badge-icon">
                                        <LucideIcons.ShieldAlert size={20} />
                                    </div>
                                    <div className="badge-content">
                                        <div className="badge-title">
                                            <strong>Заблокирован</strong>
                                        </div>
                                        {banEndDate && (
                                            <div className="badge-date">
                                                До {new Date(banEndDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        )}
                                        {banReason && (
                                            <div className="badge-reason">
                                                {banReason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {isMuted && (
                                <div className="anime-profile-page-correct-mute-badge">
                                    <div className="badge-icon">
                                        <LucideIcons.MessageSquareOff size={18} />
                                    </div>
                                    <div className="badge-content">
                                        <div className="badge-title">
                                            <strong>Мут</strong>
                                        </div>
                                        {muteEndDate && (
                                            <div className="badge-date">
                                                До {new Date(muteEndDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        )}
                                        {muteReason && (
                                            <div className="badge-reason">
                                                {muteReason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Add Friend Button on Banner */}
                    {!isLoading && !isOwnProfile && (
                        <div className="anime-profile-page-correct-banner-friend-btn">
                            <AddFriendButton targetUsername={(canonicalUsername || username || '')} onChanged={refreshProfileData} />
                        </div>
                    )}
                </div>
                <div className="anime-profile-page-correct-header-content">
                    <div className="anime-profile-page-correct-info">
                    <div className="anime-profile-page-correct-avatar-container">
                        {(profileColor1 && profileColor2) ? (
                            <div 
                                className="anime-profile-page-correct-avatar-wrapper"
                                style={{
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${profileColor1} 0%, ${profileColor2} 100%)`,
                                    padding: '5px',
                                    boxShadow: `0 0 30px ${profileColor1}80, 0 0 60px ${profileColor2}60`
                                }}
                            >
                                {avatarAnimatedUrl ? (
                                    <AnimatedMedia 
                                        src={avatarAnimatedUrl}
                                        alt="Аватар" 
                                        width={180} 
                                        height={180} 
                                        className="anime-profile-page-correct-avatar"
                                        style={{
                                            border: '4px solid #0d0d0d',
                                            borderRadius: '50%'
                                        }}
                                    />
                                ) : (
                                    <OptimizedImage 
                                        src={displayAvatarUrl} 
                                        alt="Аватар" 
                                        width={180} 
                                        height={180} 
                                        className="anime-profile-page-correct-avatar" 
                                        fallbackSrc="/default-avatar.png"
                                        style={{
                                            border: '4px solid #0d0d0d',
                                            borderRadius: '50%'
                                        }}
                                    />
                                )}
                            </div>
                        ) : (
                            <>
                                {avatarAnimatedUrl ? (
                                    <AnimatedMedia 
                                        src={avatarAnimatedUrl}
                                        alt="Аватар" 
                                        width={128} 
                                        height={128} 
                                        className="anime-profile-page-correct-avatar"
                                    />
                                ) : (
                                    <OptimizedImage 
                                        src={displayAvatarUrl} 
                                        alt="Аватар" 
                                        width={128} 
                                        height={128} 
                                        className="anime-profile-page-correct-avatar" 
                                        fallbackSrc="/default-avatar.png"
                                    />
                                )}
                            </>
                        )}
                        <div className="anime-profile-page-correct-avatar-frame" />
                    </div>
                    <div className="anime-profile-page-correct-details">
                        <div className="anime-profile-page-correct-name-row">
                            <span className="anime-profile-page-correct-username">{displayUserName}</span>
                            {isVerified && (
                                <span className="anime-profile-page-correct-verified-badge" title="Верифицированный пользователь">
                                    <svg viewBox="-1.6 -1.6 19.20 19.20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fillRule="evenodd" clipRule="evenodd"
                             d="M14.6563 5.24291C15.4743 5.88358 16 6.8804 16 8C16 9.11964 15.4743 10.1165 14.6562 10.7572C14.7816 11.7886 14.4485 12.8652 13.6568 13.6569C12.8651 14.4486 11.7885 14.7817 10.7571 14.6563C10.1164 15.4743 9.1196 16 8 16C6.88038 16 5.88354 15.4743 5.24288 14.6562C4.21141 14.7817 3.13481 14.4485 2.34312 13.6568C1.55143 12.8652 1.2183 11.7886 1.34372 10.7571C0.525698 10.1164 0 9.1196 0 8C0 6.88038 0.525715 5.88354 1.34376 5.24288C1.21834 4.21141 1.55147 3.13481 2.34316 2.34312C3.13485 1.55143 4.21145 1.2183 5.24291 1.34372C5.88358 0.525698 6.8804 0 8 0C9.11964 0 10.1165 0.525732 10.7572 1.3438C11.7886 1.21838 12.8652 1.55152 13.6569 2.3432C14.4486 3.13488 14.7817 4.21146 14.6563 5.24291ZM12.2071 6.20711L10.7929 4.79289L7 8.58579L5.20711 6.79289L3.79289 8.20711L7 11.4142L12.2071 6.20711Z"
                             fill="#10b981"></path>
                                    </svg>
                                </span>
                            )}
                            {userRoles.includes('MODERATOR') && (
                                <span className="anime-profile-page-correct-role-badge moderator">Модератор</span>
                            )}
                            {userRoles.includes('ANIME_CHECKER') && (
                                <span className="anime-profile-page-correct-role-badge uploader">Заливщик</span>
                            )}
                            {userRoles.includes('ADMIN') && (
                                <span className="anime-profile-page-correct-role-badge admin">Администратор</span>
                            )}
                        </div>
                        {badges && badges.length > 0 && (
                            <div className="anime-profile-page-correct-badges">
                                {badges.map((badge, idx) => {
                                    const meta = BADGE_META[badge.toLowerCase()];
                                    if (!meta) return null;
                                    const LucideIcon = LucideIcons[meta.icon as keyof typeof LucideIcons] as LucideIconComponent;
                                    return LucideIcon ? (
                                        <div
                                            key={badge + idx}
                                            className="anime-profile-page-correct-badge-icon"
                                            title={meta.title + (meta.description ? ' — ' + meta.description : '')}
                                            style={{
                                                background: (profileColor1 && profileColor2)
                                                    ? `linear-gradient(135deg, ${profileColor1}30 0%, ${profileColor2}30 100%)`
                                                    : undefined,
                                                border: (profileColor1 && profileColor2)
                                                    ? `1px solid ${profileColor2}60`
                                                    : undefined
                                            }}
                                        >
                                            <span style={{ color: profileColor2 || undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <LucideIcon 
                                                    size={18} 
                                                    strokeWidth={2.2}
                                                />
                                            </span>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        )}
                        <div className="anime-profile-page-correct-bio">
                            {userDescription !== null && userDescription !== '' ? (
                                userDescription
                            ) : (
                                'Без описания'
                            )}
                        </div>
                    </div>
                    </div>
                </div>
            </div>

            <FriendRequestNotification myUsername={username || null} onDataChanged={refreshProfileData} />
            <div className="anime-profile-page-correct-container">
                <div className="anime-profile-page-correct-sidebar">
                    <div className="anime-profile-page-correct-sidebar-section anime-profile-page-correct-friends-section">
                        <h3 className="anime-profile-page-correct-section-title">Друзья</h3>
                        <FriendsList
                            pinnedFriends={pinnedFriends}
                            extraFriends={extraFriends}
                            incomingCount={isOwnProfile ? incomingCountFromHook : 0}
                            onOpenModal={() => setIsFriendsModalOpen(true)}
                            imageCache={friendsImageCache}
                        />
                    </div>

                    <div className="anime-profile-page-correct-sidebar-section anime-profile-page-correct-stats-section">
                        <h3 className="anime-profile-page-correct-section-title">Статистика</h3>
                        <StatsChart username={canonicalUsername || username} colors={COLORS} />
                    </div>
                </div>

                <div className="anime-profile-page-correct-main">
                    <div className="anime-profile-page-correct-tabs">
                        <button 
                            className={`anime-profile-page-correct-tab-button ${activeTab === 'main' ? 'active' : ''}`}
                            onClick={() => setActiveTab('main')}
                            data-tab="main"
                        >
                            Основное
                        </button>
                        <button 
                            className={`anime-profile-page-correct-tab-button ${activeTab === 'collection' ? 'active' : ''}`}
                            onClick={() => setActiveTab('collection')}
                            data-tab="collection"
                        >
                            Коллекции
                        </button>
                    </div>

                    {activeTab === 'main' && (
                        <>
                            <div className="anime-profile-page-correct-content-section">
                                <div className="anime-profile-page-correct-section-header">
                                    <h2>Недавно просмотренно</h2>
                                </div>
                                <NowWatching items={watchingAnime} username={username} isLoading={isLoading} />
                            </div>

                            <div className="anime-profile-page-correct-content-section">
                                <div className="anime-profile-page-correct-section-header">
                                    <h2>Последняя активность</h2>
                                </div>
                                <RecentActivity username={username} />
                            </div>

                            <div className="anime-profile-page-correct-content-section">
                                <div className="anime-profile-page-correct-section-header">
                                    <h2>Избранное {userName}</h2>
                                </div>
                                <Favorites userName={userName} items={favoriteAnime} />
                            </div>
                            
                            {/* Блок отзывов пользователя */}
                            <div className="anime-profile-page-correct-content-section">
                                <div className="anime-profile-page-correct-section-header">
                                    <h2>Отзывы {displayUserName}</h2>
                                </div>
                                <div className="anime-profile-page-correct-reviews-list">
                                    {userReviews.length === 0 ? (
                                        <p className="no-reviews-message">У этого пользователя еще нет отзывов к аниме</p>
                                    ) : (
                                        [...userReviews].reverse().slice(0, visibleReviewsCount).map((review) => (
                                            <div key={review.id} className="anime-profile-page-correct-review-card">
                                                <div className="anime-profile-page-correct-review-header">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={review.coverUrl} alt={review.animeTitle} className="anime-profile-page-correct-review-cover" />
                                                    <div className="anime-profile-page-correct-review-meta">
                                                        <h3 className="anime-profile-page-correct-review-anime-title">{review.animeTitle}</h3>
                                                        <span className="anime-profile-page-correct-review-rating">Оценка: {review.score}/5</span>
                                                    </div>
                                                </div>
                                                {review.comment && (
                                                    <div className="anime-profile-page-correct-review-text">
                                                        {review.comment.split(/\r?\n/).map((line, idx) => (
                                                            <React.Fragment key={idx}>
                                                                {line}
                                                                {idx < review.comment.split(/\r?\n/).length - 1 && <br />}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {userReviews.length > 3 && (
                                    <div className="anime-profile-page-correct-section-action" onClick={() => setVisibleReviewsCount(visibleReviewsCount === 3 ? userReviews.length : 3)}>
                                        {visibleReviewsCount === 3 ? 'Показать еще' : 'Скрыть'}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'collection' && (
                        <div className="anime-profile-page-correct-content-section">
                            <div className="anime-profile-page-correct-section-header">
                                <h2>Коллекции {username}</h2>
                            </div>
                            <UserCollections username={username} />
                        </div>
                    )}
                </div>
            </div>
            </div>
            <FriendsModal
                isOpen={isFriendsModalOpen}
                onClose={() => setIsFriendsModalOpen(false)}
                friends={friendsFromHook}
                requests={incomingFromHook}
                activeTab={isOwnProfile && incomingCountFromHook > 0 ? 'requests' : 'friends'}
                imageCache={friendsImageCache}
                showOnlyFriendsTab={!isOwnProfile}
                profileUsername={canonicalUsername || username}
                onUnfriend={async (u) => {
                    try {
                        const who = canonicalUsername || username || '';
                        await fetch(`${API_SERVER}/api/friends/unfriend?me=${encodeURIComponent(who)}&other=${encodeURIComponent(u)}`, { method: 'POST' });
                        // перезагрузить друзей
                        refreshProfileData();
                    } catch {}
                }}
                onAccept={async (u) => {
                    try {
                        const who = canonicalUsername || username || '';
                        await fetch(`${API_SERVER}/api/friends/accept?me=${encodeURIComponent(who)}&from=${encodeURIComponent(u)}`, { method: 'POST' });
                        refreshProfileData();
                    } catch {}
                }}
                onDecline={async (u) => {
                    try {
                        const who = canonicalUsername || username || '';
                        await fetch(`${API_SERVER}/api/friends/decline?me=${encodeURIComponent(who)}&from=${encodeURIComponent(u)}`, { method: 'POST' });
                        refreshProfileData();
                    } catch {}
                }}
                onProfileDataChanged={refreshProfileData}
            />
        </>
    );
};

export default ProfileMainInfo;