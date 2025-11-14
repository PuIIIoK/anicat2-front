'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';

interface Friend {
    id: number;
    name: string;
    username: string;
    avatarUrl: string | null;
    avatarAnimatedUrl?: string | null;
    bannerUrl?: string | null;
    bannerAnimatedUrl?: string | null;
    profileColor1?: string | null;
    profileColor2?: string | null;
    verified: boolean;
}

interface YumekoFriendsModalProps {
    isOpen: boolean;
    onClose: () => void;
    friends: Friend[];
    incomingCount: number;
}

const YumekoFriendsModal: React.FC<YumekoFriendsModalProps> = ({ isOpen, onClose, friends, incomingCount }) => {
    if (!isOpen) return null;

    const modalContent = (
        <div className="yumeko-modal-overlay" onClick={onClose}>
            <div className="yumeko-modal-content yumeko-friends-list-modal" onClick={(e) => e.stopPropagation()}>
                <div className="yumeko-modal-header">
                    <h2>Друзья ({friends.length})</h2>
                    <button className="yumeko-modal-close" onClick={onClose}>
                        <LucideIcons.X size={24} />
                    </button>
                </div>

                <div className="yumeko-modal-body">
                    {friends.length > 0 ? (
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
                                                    <div 
                                                        className="yumeko-friend-banner-bg"
                                                        style={bannerStyle}
                                                    />
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
                    ) : (
                        <SkeletonLoader type="friends" count={6} grid={true} />
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default YumekoFriendsModal;
