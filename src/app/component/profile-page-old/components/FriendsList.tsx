'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import type { Friend } from '../types';

interface FriendsListProps {
  pinnedFriends: Friend[];
  extraFriends: Friend[];
  onOpenModal: () => void;
  incomingCount?: number;
  imageCache?: Map<string, { avatarUrl: string, bannerUrl: string }>;
}

// Функция для определения цвета ника по ролям
const getNameColor = (roles: string[] = []) => {
  if (roles.includes('ADMIN')) return '#ff4e4e';
  if (roles.includes('MODERATOR')) return '#43d6e3';
  return '#fff';
};

export const FriendsList: React.FC<FriendsListProps> = ({ pinnedFriends, onOpenModal, incomingCount = 0, imageCache }) => {
  const router = useRouter();
  const { theme, colorScheme } = useTheme();
  const [hoveredFriendId, setHoveredFriendId] = useState<number | null>(null);
  // Функция для получения кэшированного URL изображения
  const getCachedImageUrl = (friend: Friend, type: 'avatar' | 'banner') => {
    if (imageCache && friend.username) {
      const cached = imageCache.get(friend.username);
      if (cached) {
        return type === 'avatar' ? cached.avatarUrl : cached.bannerUrl;
      }
    }
    return type === 'avatar' ? (friend.avatarUrl || friend.avatar) : (friend.bannerUrl || friend.banner);
  };

  return (
    <div className="profile-block friends" data-theme={theme} data-color-scheme={colorScheme}>
      <h2>Друзья</h2>

      {pinnedFriends.map((friend) => {
        const isCardHovered = hoveredFriendId === friend.id;
        const color1 = friend.profileColor1;
        const color2 = friend.profileColor2;
        const hasProfileColors = !!(color1 && color2);
        
        // URLs для статичных изображений
        const bannerStaticUrl = getCachedImageUrl(friend, 'banner');
        const avatarStaticUrl = getCachedImageUrl(friend, 'avatar');
        
        // Проверяем наличие анимированных версий
        const hasBannerAnimated = friend.bannerAnimatedUrl && friend.bannerAnimatedUrl.trim() !== '';
        const hasAvatarAnimated = friend.avatarAnimatedUrl && friend.avatarAnimatedUrl.trim() !== '';
        
        // Выбор URL в зависимости от hover и наличия анимации
        const bannerSrc = isCardHovered && hasBannerAnimated ? friend.bannerAnimatedUrl! : bannerStaticUrl;
        const avatarSrc = isCardHovered && hasAvatarAnimated ? friend.avatarAnimatedUrl! : avatarStaticUrl;
        
        // Определяем тип медиа (video или image)
        const isVideoUrl = (url: string | null | undefined) => url && (url.includes('.webm') || url.includes('.mp4'));
        const isBannerVideo = isCardHovered && hasBannerAnimated && isVideoUrl(friend.bannerAnimatedUrl);
        const isAvatarVideo = isCardHovered && hasAvatarAnimated && isVideoUrl(friend.avatarAnimatedUrl);
        
        // Функция для конвертации HEX в RGB
        const hexToRgb = (hex: string): string => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '102, 126, 234';
        };
        
        // Создаем style объект только если есть цвета
        const cardStyle: Record<string, string> = { cursor: 'pointer' };
        if (hasProfileColors && color1 && color2) {
          cardStyle['--friend-color-1'] = color1;
          cardStyle['--friend-color-2'] = color2;
          cardStyle['--friend-color-1-rgb'] = hexToRgb(color1);
          cardStyle['--friend-color-2-rgb'] = hexToRgb(color2);
        }
        
        return (
          <div
            className="friends-profile-card"
            key={friend.id}
            onClick={() => friend.username && router.push(`/profile/${friend.username}`)}
            onMouseEnter={() => setHoveredFriendId(friend.id)}
            onMouseLeave={() => setHoveredFriendId(null)}
            data-theme={theme}
            data-color-scheme={colorScheme}
            data-has-colors={hasProfileColors ? 'true' : 'false'}
            style={cardStyle}
          >
            <div className="friends-profile-banner">
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
            <div className="friends-profile-info">
              <div className="friends-profile-left">
                <span className="friends-profile-name" style={{ color: getNameColor(friend.roles) }}>
                  {friend.nickname || friend.name || friend.username}
                </span>
                {friend.verified && (
                  <span className="verified-badge-friends" title="Верифицированный пользователь">
                    <svg className="verified-icon-friends" viewBox="0 0 24 24" width="30" height="30">
                    <g><path fillRule="evenodd" clipRule="evenodd"
                               d="M14.6563 5.24291C15.4743 5.88358 16 6.8804 16 8C16 9.11964 15.4743 10.1165 14.6562 10.7572C14.7816 11.7886 14.4485 12.8652 13.6568 13.6569C12.8651 14.4486 11.7885 14.7817 10.7571 14.6563C10.1164 15.4743 9.1196 16 8 16C6.88038 16 5.88354 15.4743 5.24288 14.6562C4.21141 14.7817 3.13481 14.4485 2.34312 13.6568C1.55143 12.8652 1.2183 11.7886 1.34372 10.7571C0.525698 10.1164 0 9.1196 0 8C0 6.88038 0.525715 5.88354 1.34376 5.24288C1.21834 4.21141 1.55147 3.13481 2.34316 2.34312C3.13485 1.55143 4.21145 1.2183 5.24291 1.34372C5.88358 0.525698 6.8804 0 8 0C9.11964 0 10.1165 0.525732 10.7572 1.3438C11.7886 1.21838 12.8652 1.55152 13.6569 2.3432C14.4486 3.13488 14.7817 4.21146 14.6563 5.24291ZM12.2071 6.20711L10.7929 4.79289L7 8.58579L5.20711 6.79289L3.79289 8.20711L7 11.4142L12.2071 6.20711Z"
                               fill="#d60000"></path></g>
                    </svg>
                  </span>
                )}
              </div>
              <div className="friends-profile-avatar">
                {avatarSrc ? (
                  isAvatarVideo ? (
                    <video
                      src={avatarSrc}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                      }}
                    />
                  ) : (
                    <Image
                      src={avatarSrc}
                      alt="avatar"
                      width={40}
                      height={40}
                      className="friends-profile-avatar-img"
                    />
                  )
                ) : (
                  <Image
                    src="/black-avatar.svg"
                    alt="avatar"
                    width={40}
                    height={40}
                    className="friends-profile-avatar-img"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button 
        className="show-more-btn-friends-list" 
        onClick={onOpenModal}
        data-theme={theme}
        data-color-scheme={colorScheme}
      >
        Загрузить ещё{incomingCount > 0 ? ` +(${incomingCount})` : ''}
      </button>
    </div>
  );
};


