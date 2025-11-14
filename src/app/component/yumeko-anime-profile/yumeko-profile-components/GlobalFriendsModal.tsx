'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { API_SERVER, AUTH_SITE_URL } from '@/hosts/constants';
import { getAuthToken } from '@/app/utils/auth';

interface Friend {
    id: number;
    name: string;
    username: string;
    nickname?: string;
    avatarUrl: string | null;
    avatarAnimatedUrl?: string | null;
    bannerUrl?: string | null;
    bannerAnimatedUrl?: string | null;
    profileColor1?: string | null;
    profileColor2?: string | null;
    verified?: boolean;
}

interface FriendRequest {
    id: number;
    senderId: number;
    senderUsername: string;
    senderNickname: string;
    senderAvatarUrl: string | null;
    avatarAnimatedUrl?: string | null;
    bannerUrl?: string | null;
    bannerAnimatedUrl?: string | null;
    profileColor1?: string | null;
    profileColor2?: string | null;
    verified?: boolean;
    createdAt: string;
}

interface GlobalFriendsModalProps {
    onClose: () => void;
}

const GlobalFriendsModal: React.FC<GlobalFriendsModalProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'friends' | 'incoming' | 'outgoing'>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [username, setUsername] = useState<string>('');
    const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const token = getAuthToken();
            if (!token) {
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }
            
            setIsAuthenticated(true);

            try {
                // Получаем текущего пользователя
                const profileRes = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    const currentUsername = profileData.username;
                    setUsername(currentUsername);

                    // Загружаем друзей
                    const friendsRes = await fetch(`${API_SERVER}/api/friends/list/${encodeURIComponent(currentUsername)}`);
                    if (friendsRes.ok) {
                        const friendsData = await friendsRes.json();
                        setFriends(friendsData || []);
                    }

                    // Загружаем входящие запросы
                    const incomingRes = await fetch(`${API_SERVER}/api/friends/requests/incoming/${encodeURIComponent(currentUsername)}`);
                    if (incomingRes.ok) {
                        const incomingData = await incomingRes.json();
                        setIncomingRequests(incomingData || []);
                    }

                    // Загружаем исходящие запросы
                    const outgoingRes = await fetch(`${API_SERVER}/api/friends/requests/outgoing/${encodeURIComponent(currentUsername)}`);
                    if (outgoingRes.ok) {
                        const outgoingData = await outgoingRes.json();
                        setOutgoingRequests(outgoingData || []);
                    }
                }
            } catch (error) {
                console.error('Error fetching friends data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAcceptRequest = async (requestId: number) => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_SERVER}/api/friends/requests/accept/${requestId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                setIncomingRequests(prev => prev.filter(req => req.id !== requestId));
                // Перезагружаем список друзей
                const friendsRes = await fetch(`${API_SERVER}/api/friends/list/${encodeURIComponent(username)}`);
                if (friendsRes.ok) {
                    const friendsData = await friendsRes.json();
                    setFriends(friendsData || []);
                }
            }
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    const handleRejectRequest = async (requestId: number) => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_SERVER}/api/friends/requests/reject/${requestId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                setIncomingRequests(prev => prev.filter(req => req.id !== requestId));
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const handleCancelRequest = async (requestId: number) => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_SERVER}/api/friends/requests/cancel/${requestId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                setOutgoingRequests(prev => prev.filter(req => req.id !== requestId));
            }
        } catch (error) {
            console.error('Error canceling request:', error);
        }
    };

    const handleDeleteFriend = async () => {
        if (!friendToDelete || !confirmDelete) return;
        
        const token = getAuthToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_SERVER}/api/friends/remove/${friendToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                setFriends(prev => prev.filter(f => f.id !== friendToDelete.id));
                setFriendToDelete(null);
                setConfirmDelete(false);
            }
        } catch (error) {
            console.error('Error deleting friend:', error);
        }
    };

    const modalContent = (
        <>
        <div className="yumeko-modal-overlay" onClick={onClose}>
            <div className="yumeko-modal-content yumeko-friends-modal" onClick={(e) => e.stopPropagation()}>
                <div className="yumeko-friends-tabs">
                    <button 
                        className={`yumeko-friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
                        onClick={() => setActiveTab('friends')}
                    >
                        <LucideIcons.Users size={18} />
                        <span>Друзья</span>
                        <span className="count">{friends.length}</span>
                    </button>
                    <button 
                        className={`yumeko-friends-tab ${activeTab === 'incoming' ? 'active' : ''}`}
                        onClick={() => setActiveTab('incoming')}
                    >
                        <LucideIcons.UserPlus size={18} />
                        <span>Входящие</span>
                        {incomingRequests.length > 0 && <span className="count">{incomingRequests.length}</span>}
                    </button>
                    <button 
                        className={`yumeko-friends-tab ${activeTab === 'outgoing' ? 'active' : ''}`}
                        onClick={() => setActiveTab('outgoing')}
                    >
                        <LucideIcons.Send size={18} />
                        <span>Исходящие</span>
                        {outgoingRequests.length > 0 && <span className="count">{outgoingRequests.length}</span>}
                    </button>
                </div>

                <div className="yumeko-friends-content-wrapper">
                    <div className="yumeko-friends-modal-header">
                        <h2>
                            {activeTab === 'friends' && 'Друзья'}
                            {activeTab === 'incoming' && 'Входящие запросы'}
                            {activeTab === 'outgoing' && 'Исходящие запросы'}
                        </h2>
                        <button className="yumeko-modal-close" onClick={onClose}>
                            <LucideIcons.X size={24} />
                        </button>
                    </div>

                    <div className="yumeko-modal-body">
                    {!isAuthenticated ? (
                        <div className="yumeko-auth-required">
                            <LucideIcons.Lock size={64} className="yumeko-auth-icon" />
                            <h3>Требуется авторизация</h3>
                            <p>Для использования данной вкладки, авторизируйтесь или зарегистрируйтесь на сайте</p>
                            <button 
                                className="yumeko-auth-btn"
                                onClick={() => {
                                    const currentUrl = window.location.href;
                                    window.location.href = `${AUTH_SITE_URL}?redirect_url=${encodeURIComponent(currentUrl)}`;
                                }}
                            >
                                <LucideIcons.LogIn size={20} />
                                Авторизация
                            </button>
                        </div>
                    ) : activeTab === 'friends' && (
                        <>
                            {isLoading ? (
                                <div className="yumeko-friends-modal-grid">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="yumeko-friend-skeleton">
                                            <div className="yumeko-friend-skeleton-banner" />
                                            <div className="yumeko-friend-skeleton-info">
                                                <div className="yumeko-friend-skeleton-text short" />
                                                <div className="yumeko-friend-skeleton-avatar" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : friends.length > 0 ? (
                                <div className="yumeko-friends-modal-grid">
                                    {friends.map((friend) => {
                                        const bannerStyle: React.CSSProperties = {};
                                        
                                        if (!friend.bannerAnimatedUrl && (friend.bannerUrl || (friend.profileColor1 && friend.profileColor2))) {
                                            if (friend.bannerUrl) {
                                                bannerStyle.backgroundImage = `url(${friend.bannerUrl})`;
                                                bannerStyle.backgroundSize = 'cover';
                                                bannerStyle.backgroundPosition = 'center';
                                            } else if (friend.profileColor1 && friend.profileColor2) {
                                                bannerStyle.background = `linear-gradient(135deg, ${friend.profileColor1} 0%, ${friend.profileColor2} 100%)`;
                                            }
                                        }
                                        
                                        const friendStyle = {} as React.CSSProperties & {
                                            [key: string]: string;
                                        };
                                        if (friend.profileColor1 && friend.profileColor2) {
                                            friendStyle['--friend-primary-color'] = friend.profileColor2;
                                            friendStyle['--friend-primary-bg'] = `${friend.profileColor2}20`;
                                            friendStyle['--friend-primary-bg-hover'] = `${friend.profileColor2}30`;
                                        } else {
                                            friendStyle['--friend-primary-color'] = 'rgba(255, 255, 255, 0.2)';
                                            friendStyle['--friend-primary-bg'] = 'rgba(255, 255, 255, 0.03)';
                                            friendStyle['--friend-primary-bg-hover'] = 'var(--primary-bg)';
                                            friendStyle['--friend-border-hover'] = 'var(--primary-color)';
                                        }
                                        
                                        return (
                                            <div key={friend.id} className="yumeko-friend-wrapper">
                                                <button 
                                                    className="yumeko-friend-delete-btn"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setFriendToDelete(friend);
                                                        setConfirmDelete(false);
                                                    }}
                                                    title="Удалить из друзей"
                                                >
                                                    <LucideIcons.X size={16} />
                                                </button>
                                                <Link 
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
                                                            <span className="yumeko-friend-name">{friend.nickname || friend.name}</span>
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
                                                                    alt={friend.name || 'User avatar'} 
                                                                    width={50} 
                                                                    height={50} 
                                                                    className="yumeko-friend-avatar"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="yumeko-modal-empty">
                                    <LucideIcons.Users size={48} />
                                    <p>Нет друзей</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'incoming' && (
                        <>
                            {isLoading ? (
                                <div className="yumeko-requests-list">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="yumeko-request-skeleton">
                                            <div className="yumeko-request-skeleton-avatar" />
                                            <div className="yumeko-request-skeleton-info">
                                                <div className="yumeko-request-skeleton-text long" />
                                                <div className="yumeko-request-skeleton-text short" />
                                            </div>
                                            <div className="yumeko-request-skeleton-actions">
                                                <div className="yumeko-request-skeleton-btn" />
                                                <div className="yumeko-request-skeleton-btn" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : incomingRequests.length > 0 ? (
                                <div className="yumeko-requests-list">
                                    {incomingRequests.map((request) => (
                                        <div key={request.id} className="yumeko-request-item">
                                            <Link href={`/profile/${request.senderUsername}`} className="yumeko-request-user">
                                                <Image 
                                                    src={request.senderAvatarUrl || '/default-avatar.png'} 
                                                    alt={request.senderNickname || 'User avatar'} 
                                                    width={48} 
                                                    height={48} 
                                                    className="yumeko-request-avatar"
                                                />
                                                <div className="yumeko-request-info">
                                                    <span className="yumeko-request-name">{request.senderNickname}</span>
                                                    <span className="yumeko-request-username">@{request.senderUsername}</span>
                                                </div>
                                            </Link>
                                            <div className="yumeko-request-actions">
                                                <button 
                                                    className="yumeko-btn-accept"
                                                    onClick={() => handleAcceptRequest(request.id)}
                                                >
                                                    <LucideIcons.Check size={18} />
                                                    Принять
                                                </button>
                                                <button 
                                                    className="yumeko-btn-reject"
                                                    onClick={() => handleRejectRequest(request.id)}
                                                >
                                                    <LucideIcons.X size={18} />
                                                    Отклонить
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="yumeko-modal-empty">
                                    <LucideIcons.UserPlus size={48} />
                                    <p>Нет входящих запросов</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'outgoing' && (
                        <>
                            {isLoading ? (
                                <div className="yumeko-requests-list">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="yumeko-request-skeleton">
                                            <div className="yumeko-request-skeleton-avatar" />
                                            <div className="yumeko-request-skeleton-info">
                                                <div className="yumeko-request-skeleton-text long" />
                                                <div className="yumeko-request-skeleton-text short" />
                                            </div>
                                            <div className="yumeko-request-skeleton-actions">
                                                <div className="yumeko-request-skeleton-btn wide" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : outgoingRequests.length > 0 ? (
                                <div className="yumeko-requests-list">
                                    {outgoingRequests.map((request) => (
                                        <div key={request.id} className="yumeko-request-item">
                                            <Link href={`/profile/${request.senderUsername}`} className="yumeko-request-user">
                                                <Image 
                                                    src={request.senderAvatarUrl || '/default-avatar.png'} 
                                                    alt={request.senderNickname || 'User avatar'} 
                                                    width={48} 
                                                    height={48} 
                                                    className="yumeko-request-avatar"
                                                />
                                                <div className="yumeko-request-info">
                                                    <span className="yumeko-request-name">{request.senderNickname}</span>
                                                    <span className="yumeko-request-username">@{request.senderUsername}</span>
                                                </div>
                                            </Link>
                                            <button 
                                                className="yumeko-btn-cancel"
                                                onClick={() => handleCancelRequest(request.id)}
                                            >
                                                <LucideIcons.X size={18} />
                                                Отменить
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="yumeko-modal-empty">
                                    <LucideIcons.Send size={48} />
                                    <p>Нет исходящих запросов</p>
                                </div>
                            )}
                        </>
                    )}
                    </div>
                </div>
            </div>
        </div>
        
        {friendToDelete && (
            <div className="yumeko-confirm-modal-overlay" onClick={() => setFriendToDelete(null)}>
                <div className="yumeko-confirm-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="yumeko-confirm-header">
                        <LucideIcons.AlertTriangle size={48} className="yumeko-confirm-icon" />
                        <h3>Удалить из друзей?</h3>
                    </div>
                    <p className="yumeko-confirm-text">
                        Вы уверены, что хотите удалить <strong>{friendToDelete.nickname || friendToDelete.name}</strong> из друзей?
                    </p>
                    <label className="yumeko-confirm-checkbox">
                        <input 
                            type="checkbox" 
                            checked={confirmDelete}
                            onChange={(e) => setConfirmDelete(e.target.checked)}
                        />
                        <span>Я понимаю, что это действие нельзя отменить</span>
                    </label>
                    <div className="yumeko-confirm-actions">
                        <button 
                            className="yumeko-confirm-btn-cancel"
                            onClick={() => {
                                setFriendToDelete(null);
                                setConfirmDelete(false);
                            }}
                        >
                            Отмена
                        </button>
                        <button 
                            className="yumeko-confirm-btn-delete"
                            disabled={!confirmDelete}
                            onClick={handleDeleteFriend}
                        >
                            <LucideIcons.Trash2 size={18} />
                            Удалить
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );

    return createPortal(modalContent, document.body);
};

export default GlobalFriendsModal;
