'use client';

import * as LucideIcons from 'lucide-react';
import { BADGE_META } from '../badgeMeta';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { FaUserPlus, FaHourglassHalf, FaUserCheck, FaUserFriends, FaTimes } from 'react-icons/fa';

// Тип для иконок Lucide
type LucideIconComponent = React.ComponentType<{
  className?: string;
  size?: number;
  strokeWidth?: number;
}>;

interface MobileAvatarAndRolesProps {
  avatarUrl?: string | null;
  avatarAnimatedUrl?: string | null;
  userName: string; // display nickname
  isVerified?: boolean;
  userRoles: string[];
  badges: string[];
  // new props to support friend actions
  profileUsername?: string; // username slug of viewed profile
  isOwnProfile?: boolean;
  onFriendsChanged?: () => void; // callback to refresh parent data
  // ban props
  isBanned?: boolean;
  banReason?: string;
  banStartDate?: string;
  banEndDate?: string;
  isPermanentBan?: boolean;
  // mute props
  isMuted?: boolean;
  muteReason?: string;
  muteEndDate?: string;
}

type FriendStatus = 'ADD' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_INCOMING' | 'UNKNOWN';

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

const MobileAvatarAndRoles: React.FC<MobileAvatarAndRolesProps> = ({
  avatarUrl,
  avatarAnimatedUrl,
  userName,
  isVerified,
  userRoles,
  badges,
  profileUsername,
  isOwnProfile,
  onFriendsChanged,
  isBanned,
  banReason,
  banStartDate,
  banEndDate,
  isPermanentBan,
  isMuted,
  muteReason,
  muteEndDate,
}) => {
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('UNKNOWN');
  const [loadingFriendAction, setLoadingFriendAction] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);

  const me = useMemo(() => getMyUsername(), []);
  const canShowFriendButton = !!me && !!profileUsername && me !== profileUsername && !isOwnProfile;

  const fetchFriendStatus = useCallback(async () => {
    if (!canShowFriendButton || !me || !profileUsername) return;
    try {
      const res = await fetch(
        `${API_SERVER}/api/friends/status?me=${encodeURIComponent(me)}&other=${encodeURIComponent(profileUsername)}`
      );
      if (res.ok) {
        const data = await res.json();
        const s = (data.status as FriendStatus) || 'UNKNOWN';
        setFriendStatus(s);
      } else {
        setFriendStatus('UNKNOWN');
      }
    } catch {
      setFriendStatus('UNKNOWN');
    }
  }, [canShowFriendButton, me, profileUsername]);

  useEffect(() => {
    fetchFriendStatus();
    const i = setInterval(fetchFriendStatus, 5000);
    return () => clearInterval(i);
  }, [fetchFriendStatus]);

  const sendFriendRequest = async () => {
    if (!me || !profileUsername) return;
    setLoadingFriendAction(true);
    try {
      const res = await fetch(
        `${API_SERVER}/api/friends/request?from=${encodeURIComponent(me)}&to=${encodeURIComponent(profileUsername)}`,
        { method: 'POST' }
      );
      if (res.ok) {
        await fetchFriendStatus();
        onFriendsChanged?.();
      }
    } finally {
      setLoadingFriendAction(false);
    }
  };

  const acceptIncomingRequest = async () => {
    if (!me || !profileUsername) return;
    setLoadingFriendAction(true);
    try {
      const res = await fetch(
        `${API_SERVER}/api/friends/accept?me=${encodeURIComponent(me)}&from=${encodeURIComponent(profileUsername)}`,
        { method: 'POST' }
      );
      if (res.ok) {
        await fetchFriendStatus();
        onFriendsChanged?.();
      }
    } finally {
      setLoadingFriendAction(false);
    }
  };

  const unfriend = async () => {
    if (!me || !profileUsername) return;
    setLoadingFriendAction(true);
    try {
      const res = await fetch(
        `${API_SERVER}/api/friends/unfriend?me=${encodeURIComponent(me)}&other=${encodeURIComponent(profileUsername)}`,
        { method: 'POST' }
      );
      if (res.ok) {
        setShowUnfriendConfirm(false);
        await fetchFriendStatus();
        onFriendsChanged?.();
      }
    } finally {
      setLoadingFriendAction(false);
    }
  };

  const renderMiniFriendButton = () => {
    if (!canShowFriendButton) return null;

    // 3 explicit states requested: ADD, REQUEST_SENT (pending), FRIENDS
    if (friendStatus === 'FRIENDS') {
      return (
        <button
          className="mobile-add-friends-req-and-sapr-btn mobile-add-friends-req-and-sapr--friends"
          onClick={() => setShowUnfriendConfirm(true)}
          title="В друзьях"
        >
          <FaUserCheck className="mobile-add-friends-req-and-sapr-icon" />
          <FaUserFriends className="mobile-add-friends-req-and-sapr-icon" />
        </button>
      );
    }

    if (friendStatus === 'REQUEST_SENT') {
      return (
        <button
          className="mobile-add-friends-req-and-sapr-btn mobile-add-friends-req-and-sapr--pending"
          disabled
          title="Ожидание запроса"
        >
          <FaHourglassHalf className="mobile-add-friends-req-and-sapr-icon" />
          <FaUserFriends className="mobile-add-friends-req-and-sapr-icon" />
        </button>
      );
    }

    // Treat REQUEST_INCOMING as actionable: tap to accept
    if (friendStatus === 'REQUEST_INCOMING') {
      return (
        <button
          className="mobile-add-friends-req-and-sapr-btn mobile-add-friends-req-and-sapr--add"
          onClick={acceptIncomingRequest}
          disabled={loadingFriendAction}
          title="Принять заявку в друзья"
        >
          <FaUserPlus className="mobile-add-friends-req-and-sapr-icon" />
          <FaUserFriends className="mobile-add-friends-req-and-sapr-icon" />
        </button>
      );
    }

    // Default: ADD
    return (
      <button
        className="mobile-add-friends-req-and-sapr-btn mobile-add-friends-req-and-sapr--add"
        onClick={sendFriendRequest}
        disabled={loadingFriendAction}
        title="Добавить в друзья"
      >
        <FaUserPlus className="mobile-add-friends-req-and-sapr-icon" />
        <FaUserFriends className="mobile-add-friends-req-and-sapr-icon" />
      </button>
    );
  };
  // Определяем, какое медиа использовать (приоритет: анимированное)
  const avatarSrc = avatarAnimatedUrl || avatarUrl || '/default-avatar.png';
  const isAvatarVideo = avatarSrc && (avatarSrc.includes('.webm') || avatarSrc.includes('.mp4'));

  return (
    <>
      <div className="profile-mobile-avatar-block">
        {isAvatarVideo ? (
          <video
            src={avatarSrc}
            autoPlay
            loop
            muted
            playsInline
            className="profile-mobile-avatar"
            style={{
              width: '96px',
              height: '96px',
              objectFit: 'cover',
              objectPosition: 'center',
              borderRadius: '50%',
            }}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarSrc}
            alt="Аватар"
            className="profile-mobile-avatar"
            style={{
              width: '96px',
              height: '96px',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        )}
      </div>

      <div className="profile-mobile-username-block">
        {badges.length > 0 && (
          <div className="profile-mobile-badges">
            {badges.map((badge, idx) => {
              const meta = BADGE_META[badge.toLowerCase()];
              const Icon = meta
                ? (LucideIcons[meta.icon as keyof typeof LucideIcons] as LucideIconComponent)
                : null;
              return (
                <div
                  key={badge + idx}
                  className="profile-badge-icon-wrapper"
                  title={meta ? meta.title + (meta.description ? ' — ' + meta.description : '') : badge}
                >
                  {Icon ? (
                    <Icon className="profile-badge-icon" size={15} strokeWidth={2.2} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/badges/${badge}.svg`} alt={badge} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="nickname-verified-mobile">
          <span className="profile-mobile-username">{userName}</span>
          {isVerified && (
            <span className="verified-badge-mobile" title="Верифицированный пользователь">
              <svg className="verified-icon-mobile" viewBox="0 0 24 24" width={50} height={50}>
                <g>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M14.6563 5.24291C15.4743 5.88358 16 6.8804 16 8C16 9.11964 15.4743 10.1165 14.6562 10.7572C14.7816 11.7886 14.4485 12.8652 13.6568 13.6569C12.8651 14.4486 11.7885 14.7817 10.7571 14.6563C10.1164 15.4743 9.1196 16 8 16C6.88038 16 5.88354 15.4743 5.24288 14.6562C4.21141 14.7817 3.13481 14.4485 2.34312 13.6568C1.55143 12.8652 1.2183 11.7886 1.34372 10.7571C0.525698 10.1164 0 9.1196 0 8C0 6.88038 0.525715 5.88354 1.34376 5.24288C1.21834 4.21141 1.55147 3.13481 2.34316 2.34312C3.13485 1.55143 4.21145 1.2183 5.24291 1.34372C5.88358 0.525698 6.8804 0 8 0C9.11964 0 10.1165 0.525732 10.7572 1.3438C11.7886 1.21838 12.8652 1.55152 13.6569 2.3432C14.4486 3.13488 14.7817 4.21146 14.6563 5.24291ZM12.2071 6.20711L10.7929 4.79289L7 8.58579L5.20711 6.79289L3.79289 8.20711L7 11.4142L12.2071 6.20711Z"
                    fill="#d60000"
                  ></path>
                </g>
              </svg>
            </span>
          )}
          {/* Отображение временного мута для чужого профиля - выше бана */}
          {!isOwnProfile && isMuted && (
            <div className="mobile-temporary-mute-warning">
              <div className="mute-header">
                <LucideIcons.VolumeX size={12} />
                <span>Ограничения комментариев</span>
              </div>
              {muteEndDate && (
                <div className="mute-dates">
                  <LucideIcons.Clock size={10} />
                  <span>До {new Date(muteEndDate).toLocaleDateString('ru-RU')}</span>
                </div>
              )}
              {muteReason && (
                <div className="mute-reason-text">
                  <LucideIcons.MessageCircle size={10} />
                  <span>{muteReason}</span>
                </div>
              )}
            </div>
          )}
          {/* Отображение временного бана для чужого профиля */}
          {!isOwnProfile && isBanned && !isPermanentBan && (
            <div className="mobile-temporary-ban-warning">
              <div className="ban-header">
                <LucideIcons.AlertTriangle size={14} />
                <span>Пользователь заблокирован</span>
              </div>
              {banStartDate && banEndDate && (
                <div className="ban-dates">
                  <LucideIcons.Clock size={12} />
                  <span>{new Date(banStartDate).toLocaleDateString('ru-RU')} - {new Date(banEndDate).toLocaleDateString('ru-RU')}</span>
                </div>
              )}
              {banReason && (
                <div className="ban-reason-text">
                  <LucideIcons.MessageCircle size={12} />
                  <span>{banReason}</span>
                </div>
              )}
            </div>
          )}
          {renderMiniFriendButton()}
        </div>

        <div className="profile-mobile-roles">
          {userRoles.includes('ADMIN') && <span className="role-badge admin">Администратор</span>}
          {userRoles.includes('MODERATOR') && <span className="role-badge moderator">Модератор</span>}
          {userRoles.includes('ANIME_CHECKER') && <span className="role-badge checker">Заливщик</span>}
        </div>
      </div>
      {showUnfriendConfirm && (
        <div className="mobile-add-friends-req-and-sapr-modal-overlay" role="dialog" aria-modal="true">
          <div className="mobile-add-friends-req-and-sapr-modal">
            <div className="mobile-add-friends-req-and-sapr-modal-header">
              <div className="mobile-add-friends-req-and-sapr-modal-title">Удаление друга</div>
              <button
                className="mobile-add-friends-req-and-sapr-modal-close"
                onClick={() => setShowUnfriendConfirm(false)}
                aria-label="Закрыть"
              >
                <FaTimes />
              </button>
            </div>
            <div className="mobile-add-friends-req-and-sapr-modal-body">
              Вы точно собираетесь удалить данного пользователя из друзей?
            </div>
            <div className="mobile-add-friends-req-and-sapr-modal-footer">
              <button
                className="mobile-add-friends-req-and-sapr-btn-danger"
                onClick={unfriend}
                disabled={loadingFriendAction}
              >
                Да
              </button>
              <button
                className="mobile-add-friends-req-and-sapr-btn-secondary"
                onClick={() => setShowUnfriendConfirm(false)}
              >
                Нет
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileAvatarAndRoles;


