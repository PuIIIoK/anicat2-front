'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Friend } from '../types';
import { API_SERVER } from '@/hosts/constants';
import { OptimizedImage } from './OptimizedImage';
import { useRouter } from 'next/navigation';

// API response types
interface ApiFriendData {
    id?: number;
    username: string;
    nickname?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    avatarAnimatedUrl?: string;
    bannerAnimatedUrl?: string;
    profileColor1?: string;
    profileColor2?: string;
    roles?: string[];
    bio?: string;
    verified?: boolean;
}

interface FriendsModalProps {
    isOpen: boolean;
    onClose: () => void;
    friends: Friend[];
    requests: Friend[];
    activeTab: 'friends' | 'requests' | 'outgoing';
    imageCache?: Map<string, { avatarUrl: string, bannerUrl: string }>;
    onUnfriend: (username: string) => Promise<void>;
    onAccept: (username: string) => Promise<void>;
    onDecline: (username: string) => Promise<void>;
    onProfileDataChanged?: () => void;
    showOnlyFriendsTab?: boolean;
    profileUsername?: string;
}

function getToken(): string | null {
    const m = typeof document !== 'undefined' ? document.cookie.match(/token=([^;]+)/) : null;
    return m ? m[1] : null;
}

function getMyUsername(): string | null {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.username || payload.sub || null;
    } catch {
        return null;
    }
}

// Функция для определения цвета ника по ролям
const getNameColor = (roles: string[] = []) => {
  if (roles.includes('ADMIN')) return '#ff4e4e';
  if (roles.includes('MODERATOR')) return '#43d6e3';
  return '#fff';
};

export const FriendsModal: React.FC<FriendsModalProps> = ({
    isOpen,
    onClose,
    friends,
    requests,
    activeTab,
    imageCache,
    onUnfriend,
    onAccept,
    onDecline,
    onProfileDataChanged,
    showOnlyFriendsTab = false,
    profileUsername
}) => {
    const [currentTab, setCurrentTab] = useState<'friends' | 'requests' | 'outgoing'>(activeTab);
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [localFriends, setLocalFriends] = useState<Friend[]>(friends);
    const [localRequests, setLocalRequests] = useState<Friend[]>(requests);
    const [localOutgoingRequests, setLocalOutgoingRequests] = useState<Friend[]>([]);
    const [hoveredFriendId, setHoveredFriendId] = useState<number | null>(null);

    const me = getMyUsername();
    const router = useRouter();

    // Получаем username из адресной строки (если нужно)
    // Если используете react-router, используйте useParams или аналог
    // Для next/router:
    // const router = useRouter();
    // const profileUsername = router.query.username as string;
    // Для универсальности, примем через props или friends[0]?.username

    // Функция для получения кэшированного URL изображения
    const getCachedImageUrl = (friend: Friend, type: 'avatar' | 'banner') => {
        if (imageCache && friend.username) {
            const cached = imageCache.get(friend.username);
            if (cached) {
                return type === 'avatar' ? cached.avatarUrl : cached.bannerUrl;
            }
        }
        return type === 'avatar' ? friend.avatarUrl : friend.bannerUrl;
    };

    // Функция для проверки наличия изображения
    const hasImage = (friend: Friend, type: 'avatar' | 'banner') => {
        const url = getCachedImageUrl(friend, type);
        return url && url.trim() !== '';
    };

    useEffect(() => {
        setCurrentTab(activeTab);
    }, [activeTab]);

    // Сброс состояния при изменении параметров профиля
    useEffect(() => {
        setIsDataLoaded(false);
    }, [showOnlyFriendsTab, profileUsername]);

    // Загрузка данных при открытии модального окна
    useEffect(() => {
        if (!isOpen) {
            setIsDataLoaded(false);
            return;
        }
        setIsLoading(true);
        setIsDataLoaded(false);
        if (showOnlyFriendsTab) {
            // Чужой профиль: грузим друзей по profileUsername через корректный API
            if (!profileUsername) {
                setLocalFriends([]);
                setIsLoading(false);
                setIsDataLoaded(true);
                return;
            }
            fetch(`${API_SERVER}/api/friends/list/${encodeURIComponent(profileUsername)}`)
                .then(res => res.ok ? res.json() : [])
                .then((data: ApiFriendData[]) => {
                    setLocalFriends((data || []).map((d: ApiFriendData, idx: number) => ({
                        id: d.id ?? idx,
                        name: d.nickname || d.username,
                        username: d.username,
                        nickname: d.nickname,
                        avatarUrl: d.avatarUrl,
                        bannerUrl: d.bannerUrl,
                        avatarAnimatedUrl: d.avatarAnimatedUrl,
                        bannerAnimatedUrl: d.bannerAnimatedUrl,
                        profileColor1: d.profileColor1,
                        profileColor2: d.profileColor2,
                        roles: d.roles,
                        bio: d.bio,
                        verified: d.verified,
                    })));
                })
                .finally(() => {
                    setIsLoading(false);
                    setIsDataLoaded(true);
                });
        } else {
            // Свой профиль: старая логика
            if (me) loadFriendsData();
        }
        // eslint-disable-next-line
    }, [isOpen, showOnlyFriendsTab, profileUsername]);

    const loadFriendsData = async () => {
        if (!me) return;
        
        try {
            // Загружаем список друзей
            const friendsRes = await fetch(`${API_SERVER}/api/friends/list/${encodeURIComponent(me)}`);
            if (friendsRes.ok) {
                const friendsData: ApiFriendData[] = await friendsRes.json();
                const mappedFriends: Friend[] = (friendsData || []).map((d: ApiFriendData, idx: number) => ({
                    id: d.id ?? idx,
                    name: d.nickname || d.username,
                    username: d.username,
                    nickname: d.nickname,
                    roles: d.roles,
                    bio: d.bio,
                    avatarUrl: d.avatarUrl,
                    bannerUrl: d.bannerUrl,
                    avatarAnimatedUrl: d.avatarAnimatedUrl,
                    bannerAnimatedUrl: d.bannerAnimatedUrl,
                    profileColor1: d.profileColor1,
                    profileColor2: d.profileColor2,
                    verified: d.verified,
                }));
                setLocalFriends(mappedFriends);
            }

            // Загружаем входящие заявки
            const requestsRes = await fetch(`${API_SERVER}/api/friends/requests/incoming/${encodeURIComponent(me)}`);
            if (requestsRes.ok) {
                const requestsData: ApiFriendData[] = await requestsRes.json();
                const mappedRequests: Friend[] = (requestsData || []).map((d: ApiFriendData, idx: number) => ({
                    id: d.id ?? idx,
                    name: d.nickname || d.username,
                    username: d.username,
                    nickname: d.nickname,
                    roles: d.roles,
                    bio: d.bio,
                    avatarUrl: d.avatarUrl,
                    bannerUrl: d.bannerUrl,
                    avatarAnimatedUrl: d.avatarAnimatedUrl,
                    bannerAnimatedUrl: d.bannerAnimatedUrl,
                    profileColor1: d.profileColor1,
                    profileColor2: d.profileColor2,
                    verified: d.verified,
                }));
                setLocalRequests(mappedRequests);
            }

            // Загружаем исходящие заявки
            const outgoingRes = await fetch(`${API_SERVER}/api/friends/requests/outgoing/${encodeURIComponent(me)}`);
            if (outgoingRes.ok) {
                const outgoingData: ApiFriendData[] = await outgoingRes.json();
                const mappedOutgoing: Friend[] = (outgoingData || []).map((d: ApiFriendData, idx: number) => ({
                    id: d.id ?? idx,
                    name: d.nickname || d.username,
                    username: d.username,
                    nickname: d.nickname,
                    roles: d.roles,
                    bio: d.bio,
                    avatarUrl: d.avatarUrl,
                    bannerUrl: d.bannerUrl,
                    avatarAnimatedUrl: d.avatarAnimatedUrl,
                    bannerAnimatedUrl: d.bannerAnimatedUrl,
                    profileColor1: d.profileColor1,
                    profileColor2: d.profileColor2,
                    verified: d.verified,
                }));
                setLocalOutgoingRequests(mappedOutgoing);
            }
        } catch (error) {
            console.error('Ошибка при загрузке данных о друзьях:', error);
        } finally {
            setIsLoading(false);
            setIsDataLoaded(true);
        }
    };

    // Функция для обновления всех данных после действий
    const refreshAllData = async () => {
        if (!me) return;
        
        try {
            setIsLoading(true);
            setIsDataLoaded(false);
            
            // Обновляем данные в модалке
            await loadFriendsData();
            
            // Обновляем данные на основном профиле через callback
            onProfileDataChanged?.();
        } catch (error) {
            console.error('Ошибка при обновлении данных:', error);
        } finally {
            setIsLoading(false);
            setIsDataLoaded(true);
        }
    };

    // Обработчики действий с автоматическим обновлением
    const handleUnfriend = async (username: string) => {
        try {
            await onUnfriend(username);
            // Немедленно обновляем локальные данные для лучшего UX
            setLocalFriends(prev => prev.filter(f => f.username !== username));
            // Затем обновляем все данные
            await refreshAllData();
        } catch (error) {
            console.error('Ошибка при удалении из друзей:', error);
        }
    };

    const handleAccept = async (username: string) => {
        try {
            await onAccept(username);
            // Немедленно обновляем локальные данные для лучшего UX
            setLocalRequests(prev => prev.filter(r => r.username !== username));
            // Затем обновляем все данные
            await refreshAllData();
        } catch (error) {
            console.error('Ошибка при принятии заявки:', error);
        }
    };

    const handleDecline = async (username: string) => {
        try {
            await onDecline(username);
            // Немедленно обновляем локальные данные для лучшего UX
            setLocalRequests(prev => prev.filter(r => r.username !== username));
            // Затем обновляем все данные
            await refreshAllData();
        } catch (error) {
            console.error('Ошибка при отклонении заявки:', error);
        }
    };

    const handleCancelOutgoing = async (username: string) => {
        if (!me) return;
        
        try {
            const res = await fetch(`${API_SERVER}/api/friends/cancel-outgoing?me=${encodeURIComponent(me)}&to=${encodeURIComponent(username)}`, {
                method: 'POST',
            });
            
            if (res.ok) {
                // Немедленно обновляем локальные данные для лучшего UX
                setLocalOutgoingRequests(prev => prev.filter(r => r.username !== username));
                // Затем обновляем все данные
                await refreshAllData();
            }
        } catch (error) {
            console.error('Ошибка при отмене исходящей заявки:', error);
        }
    };

    if (!isOpen) return null;

    const LoadingSkeleton = ({ type }: { type: 'friend-card' | 'request-item' | 'sidebar-item' | 'content-header' }) => (
        <div className={`loading-skeleton ${type}`} />
    );

    const modalContent = (
        <div className="modal-show-more-friends-overlay" onClick={onClose}>
            <div className="modal-show-more-friends-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-show-more-friends-close" onClick={onClose}>
                    ×
                </button>
                
                <div className="friends-modal-layout">
                    <div className="friends-modal-sidebar">
                        {isLoading ? (
                            <>
                                <LoadingSkeleton type="sidebar-item" />
                                <LoadingSkeleton type="sidebar-item" />
                            </>
                        ) : (
                            <>
                                <button
                                    className={`sidebar-item ${currentTab === 'friends' ? 'active' : ''}`}
                                    onClick={() => setCurrentTab('friends')}
                                >
                                    Друзья {localFriends.length > 0 && `(${localFriends.length})`}
                                </button>
                                {!showOnlyFriendsTab && (
                                    <>
                                        <button
                                            className={`sidebar-item ${currentTab === 'requests' ? 'active' : ''}`}
                                            onClick={() => setCurrentTab('requests')}
                                        >
                                            Заявки {localRequests.length > 0 && `(${localRequests.length})`}
                                        </button>
                                        <button
                                            className={`sidebar-item ${currentTab === 'outgoing' ? 'active' : ''}`}
                                            onClick={() => setCurrentTab('outgoing')}
                                        >
                                            Ваши запросы {localOutgoingRequests.length > 0 && `(${localOutgoingRequests.length})`}
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <div className={`friends-modal-content ${!isDataLoaded ? 'no-scrollbar' : ''}`}>
                        {isLoading ? (
                            <div>
                                <LoadingSkeleton type="content-header" />
                                <div className="friends-grid">
                                    <LoadingSkeleton type="friend-card" />
                                    <LoadingSkeleton type="friend-card" />
                                    <LoadingSkeleton type="friend-card" />
                                    <LoadingSkeleton type="friend-card" />
                                </div>
                            </div>
                        ) : (
                            <>
                                {currentTab === 'friends' && (
                                    <div className="tab-content-friends active">
                                        <h3>Друзья ({localFriends.length})</h3>
                                        {localFriends.length === 0 ? (
                                            <div className="empty">{showOnlyFriendsTab ? 'У данного пользователя еще нету друзей' : 'У вас пока нет друзей'}</div>
                                        ) : (
                                            <div className="friends-grid">
                                                {localFriends.map((friend) => {
                                                    const isCardHovered = hoveredFriendId === friend.id;
                                                    
                                                    // Определяем есть ли цвета профиля
                                                    const hasProfileColors = friend.profileColor1 && friend.profileColor2;
                                                    const color1 = friend.profileColor1;
                                                    const color2 = friend.profileColor2;
                                                    
                                                    // URLs для статических изображений
                                                    const bannerStaticUrl = (hasImage(friend, 'banner') ? getCachedImageUrl(friend, 'banner') : null) || friend.bannerUrl || '/black-banner.svg';
                                                    const avatarStaticUrl = (hasImage(friend, 'avatar') ? getCachedImageUrl(friend, 'avatar') : null) || friend.avatarUrl || '/black-avatar.svg';
                                                    
                                                    // URLs для анимированных изображений (только если они действительно есть)
                                                    const hasBannerAnimated = friend.bannerAnimatedUrl && friend.bannerAnimatedUrl.trim() !== '';
                                                    const hasAvatarAnimated = friend.avatarAnimatedUrl && friend.avatarAnimatedUrl.trim() !== '';
                                                    
                                                    // Выбор URL в зависимости от hover и наличия анимации
                                                    const bannerSrc = isCardHovered && hasBannerAnimated ? friend.bannerAnimatedUrl! : bannerStaticUrl;
                                                    const avatarSrc = isCardHovered && hasAvatarAnimated ? friend.avatarAnimatedUrl! : avatarStaticUrl;
                                                    
                                                    // Определяем тип медиа (video или image)
                                                    const isVideoUrl = (url: string | null | undefined) => url && (url.includes('.webm') || url.includes('.mp4'));
                                                    const isBannerVideo = isCardHovered && hasBannerAnimated && isVideoUrl(friend.bannerAnimatedUrl);
                                                    const isAvatarVideo = isCardHovered && hasAvatarAnimated && isVideoUrl(friend.avatarAnimatedUrl);
                                                    
                                                    // Создаем style объект только если есть цвета
                                                    const cardStyle: Record<string, string> = { cursor: 'pointer' };
                                                    if (hasProfileColors && color1 && color2) {
                                                        cardStyle['--friend-color-1'] = color1;
                                                        cardStyle['--friend-color-2'] = color2;
                                                    }
                                                    
                                                    return (
                                                        <div
                                                            key={friend.id}
                                                            className="friend-card"
                                                            onClick={() => friend.username && router.push(`/profile/${friend.username}`)}
                                                            onMouseEnter={() => setHoveredFriendId(friend.id)}
                                                            onMouseLeave={() => setHoveredFriendId(null)}
                                                            data-has-colors={hasProfileColors ? 'true' : 'false'}
                                                            style={cardStyle}
                                                        >
                                                            <div className="banner">
                                                                <div style={{ 
                                                                    position: 'relative',
                                                                    width: '100%', 
                                                                    height: '100%'
                                                                }}>
                                                                    {bannerSrc ? (
                                                                        isBannerVideo ? (
                                                                            <video
                                                                                src={bannerSrc}
                                                                                autoPlay
                                                                                loop
                                                                                muted
                                                                                playsInline
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '100%',
                                                                                    objectFit: 'cover',
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            /* eslint-disable-next-line @next/next/no-img-element */
                                                                            <img
                                                                                src={bannerSrc}
                                                                                alt="Баннер"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '100%',
                                                                                    objectFit: 'cover',
                                                                                }}
                                                                                onError={(e) => {
                                                                                    const target = e.target as HTMLImageElement;
                                                                                    if (target.src !== '/black-banner.svg') {
                                                                                        target.src = '/black-banner.svg';
                                                                                    }
                                                                                }}
                                                                            />
                                                                        )
                                                                    ) : (
                                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                                        <img
                                                                            src="/black-banner.svg"
                                                                            alt="Баннер"
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                objectFit: 'cover',
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="info">
                                                                <div className="avatar">
                                                                    <div style={{ 
                                                                        position: 'relative',
                                                                        width: '56px', 
                                                                        height: '56px',
                                                                        borderRadius: '50%',
                                                                        overflow: 'hidden'
                                                                    }}>
                                                                        {avatarSrc ? (
                                                                            isAvatarVideo ? (
                                                                                <video
                                                                                    src={avatarSrc}
                                                                                    autoPlay
                                                                                    loop
                                                                                    muted
                                                                                    playsInline
                                                                                    style={{
                                                                                        width: '56px',
                                                                                        height: '56px',
                                                                                        objectFit: 'cover',
                                                                                        borderRadius: '50%',
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                                                <img
                                                                                    src={avatarSrc}
                                                                                    alt="Аватар"
                                                                                    style={{
                                                                                        width: '56px',
                                                                                        height: '56px',
                                                                                        objectFit: 'cover',
                                                                                        borderRadius: '50%',
                                                                                    }}
                                                                                    onError={(e) => {
                                                                                        const target = e.target as HTMLImageElement;
                                                                                        if (target.src !== '/black-avatar.svg') {
                                                                                            target.src = '/black-avatar.svg';
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            )
                                                                        ) : (
                                                                            /* eslint-disable-next-line @next/next/no-img-element */
                                                                            <img
                                                                                src="/black-avatar.svg"
                                                                                alt="Аватар"
                                                                                style={{
                                                                                    width: '56px',
                                                                                    height: '56px',
                                                                                    objectFit: 'cover',
                                                                                    borderRadius: '50%',
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="user-info">
                                                                    <div className="name" style={{ color: getNameColor(friend.roles) }}>
                                                                        {friend.name}
                                                                        {friend.verified && (
                                                                            <span className="verified-badge-friends" title="Верифицированный пользователь">
                                                                                <svg className="verified-icon-friends" viewBox="0 0 24 24" width="16" height="16">
                                                                                <g><path fillRule="evenodd" clipRule="evenodd"
                                 d="M14.6563 5.24291C15.4743 5.88358 16 6.8804 16 8C16 9.11964 15.4743 10.1165 14.6562 10.7572C14.7816 11.7886 14.4485 12.8652 13.6568 13.6569C12.8651 14.4486 11.7885 14.7817 10.7571 14.6563C10.1164 15.4743 9.1196 16 8 16C6.88038 16 5.88354 15.4743 5.24288 14.6562C4.21141 14.7817 3.13481 14.4485 2.34312 13.6568C1.55143 12.8652 1.2183 11.7886 1.34372 10.7571C0.525698 10.1164 0 9.1196 0 8C0 6.88038 0.525715 5.88354 1.34376 5.24288C1.21834 4.21141 1.55147 3.13481 2.34316 2.34312C3.13485 1.55143 4.21145 1.2183 5.24291 1.34372C5.88358 0.525698 6.8804 0 8 0C9.11964 0 10.1165 0.525732 10.7572 1.3438C11.7886 1.21838 12.8652 1.55152 13.6569 2.3432C14.4486 3.13488 14.7817 4.21146 14.6563 5.24291ZM12.2071 6.20711L10.7929 4.79289L7 8.58579L5.20711 6.79289L3.79289 8.20711L7 11.4142L12.2071 6.20711Z"
                                 fill="#d60000"></path></g>
                                                                                </svg>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {friend.bio && <div className="bio">{friend.bio}</div>}
                                                                </div>
                                                            </div>
                                                            {!showOnlyFriendsTab && (
                                                                <div className="actions-row">
                                                                    <button 
                                                                        className="btn-danger"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUnfriend(friend.username || friend.name);
                                                                        }}
                                                                    >
                                                                        Удалить из друзей
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!showOnlyFriendsTab && currentTab === 'requests' && (
                                    <div className="tab-content-friends active">
                                        <h3>Входящие заявки ({localRequests.length})</h3>
                                        {localRequests.length === 0 ? (
                                            <div className="empty">У вас нет входящих заявок в друзья</div>
                                        ) : (
                                            <div className="requests-list">
                                                {localRequests.map((request) => (
                                                    <div key={request.id} className="request-item">
                                                        <div className="avatar">
                                                            <OptimizedImage 
                                                                src={hasImage(request, 'avatar') ? getCachedImageUrl(request, 'avatar') : '/black-avatar.svg'} 
                                                                alt="Аватар" 
                                                                width={40} 
                                                                height={40} 
                                                                fallbackSrc="/black-avatar.svg"
                                                                style={{ borderRadius: '50%' }}
                                                            />
                                                        </div>
                                                        <div className="name">{request.name}</div>
                                                        <div className="actions">
                                                            <button 
                                                                className="btn-primary"
                                                                onClick={() => handleAccept(request.username || request.name)}
                                                            >
                                                                Принять
                                                            </button>
                                                            <button 
                                                                className="btn-secondary"
                                                                onClick={() => handleDecline(request.username || request.name)}
                                                            >
                                                                Отклонить
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!showOnlyFriendsTab && currentTab === 'outgoing' && (
                                    <div className="tab-content-friends active">
                                        <h3>Ваши запросы ({localOutgoingRequests.length})</h3>
                                        {localOutgoingRequests.length === 0 ? (
                                            <div className="empty">У вас нет исходящих заявок в друзья</div>
                                        ) : (
                                            <div className="requests-list">
                                                {localOutgoingRequests.map((request) => (
                                                    <div key={request.id} className="request-item">
                                                        <div className="name">{request.name}</div>
                                                        <div className="actions">
                                                            <button 
                                                                className="btn-danger"
                                                                onClick={() => handleCancelOutgoing(request.username || request.name)}
                                                            >
                                                                Отменить
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Используем портал для рендеринга модалки поверх всего
    if (typeof window === 'undefined') return null;
    return createPortal(modalContent, document.body);
};


