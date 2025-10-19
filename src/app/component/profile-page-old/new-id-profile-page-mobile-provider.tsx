'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_SERVER } from '../../../tools/constants';
import { useProfile } from './hooks/useProfile';
import * as LucideIcons from 'lucide-react';
import { StatsChart } from './components/StatsChart';
import MobileBanner from './components/mobile-Banner';
import MobileAvatarAndRoles from './components/mobile-AvatarAndRoles';
import MobileBio from './components/mobile-Bio';
import MobileStatsSummary from './components/mobile-StatsSummary';
import MobileTabsBar from './components/mobile-TabsBar';
// import MobileOverviewFavorites from './components/mobile-OverviewFavorites';
// import MobileCollections from './components/mobile-Collections';
import MobileFriends from './components/mobile-Friends';
import MobileActivity from './components/mobile-Activity';
import MobileReviews from './components/mobile-Reviews';
import MobileUtils from './components/mobile-Utils';
import MobileUserCollectionModal from './components/mobile-UserCollectionModal';

type Tab = 'overview' | 'collections' | 'friends' | 'activity' | 'reviews' | 'utils';

interface ProfileMainInfoProps { username?: string; }

const COLORS = ['#43d675', '#c4c4c4', '#ffd93a', '#ff4e4e', '#b97aff'];

type CollectionStats = Partial<Record<'PLANNED' | 'WATCHING' | 'PAUSED' | 'COMPLETED' | 'DROPPED' | 'FAVORITE', number>>;

// API response types
interface ApiActivityItem {
  createdAt?: string;
}

const NewIdProfilePageMobileProvider: React.FC<ProfileMainInfoProps> = ({ username }) => {
  const router = useRouter();
  const {
    userName,
    userDescription,
    userRoles,
    avatarUrl,
    bannerUrl,
    avatarAnimatedUrl,
    bannerAnimatedUrl,
    profileColorScheme,
    profileColor1,
    profileColor2,
    isOwnProfile,
    isLoading,
    isVerified,
    userReviews,
    badges = [],
    friends,
    incoming,
    recentActivity,
    refresh,
    canonicalUsername,
    isBanned,
    banReason,
    banStartDate,
    banEndDate,
    isPermanentBan,
    isMuted,
    muteReason,
    muteEndDate,
  } = useProfile(username);

  // Определяем тему профиля: применяем только для СВОЕГО профиля
  const effectiveProfileTheme = isOwnProfile ? profileColorScheme : null;

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [stats, setStats] = useState<CollectionStats>({});
  const [userCollectionOpen, setUserCollectionOpen] = useState(false);
  
  // Состояния загрузки для фоновых данных
  const [isFriendsLoading, setIsFriendsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [isReviewsLoading, setIsReviewsLoading] = useState(true);
  
  // Сброс состояний загрузки при смене пользователя
  useEffect(() => {
    setIsFriendsLoading(true);
    setIsActivityLoading(true);
    setIsReviewsLoading(true);
  }, [username]);

  // Отслеживаем загрузку данных из useProfile
  useEffect(() => {
    if (!isLoading) {
      // Проверяем, загружены ли друзья (массив существует)
      if (friends !== undefined) {
        setIsFriendsLoading(false);
      }
      // Проверяем, загружена ли активность
      if (recentActivity !== undefined) {
        setIsActivityLoading(false);
      }
      // Проверяем, загружены ли отзывы
      if (userReviews !== undefined && userReviews.length >= 0) {
        setIsReviewsLoading(false);
      }
    }
  }, [isLoading, friends, recentActivity, userReviews]);

  useEffect(() => {
    let ignore = false;
    let timeoutId: NodeJS.Timeout;
    
    async function loadStats() {
      const who = canonicalUsername || username;
      if (!who) return;
      try {
        const res = await fetch(`${API_SERVER}/api/collection/stats/user/${who}`);
        if (!res.ok) throw new Error('stats');
        const data = await res.json();
        if (!ignore) setStats(data);
      } catch {
        if (!ignore) setStats({});
      }
    }
    
    // Для мобильных устройств добавляем небольшую задержку,
    // чтобы не блокировать рендеринг основного контента
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    if (isMobile) {
      timeoutId = setTimeout(() => {
        if (!ignore) loadStats();
      }, 100); // Задержка 100ms для приоритизации рендеринга
    } else {
      loadStats(); // Для десктопа загружаем сразу
    }
    
    return () => { 
      ignore = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [username, canonicalUsername]);

  const completedCount = stats.COMPLETED || 0;
  const reviewsCount = userReviews.length;
  const friendsCount = friends.length;
  const sinceYear = useMemo(() => {
    const times = (recentActivity || [])
      .map((a: ApiActivityItem) => a?.createdAt ? new Date(a.createdAt).getTime() : null)
      .filter((t: number | null) => typeof t === 'number') as number[];
    if (times.length === 0) return null;
    const min = Math.min(...times);
    return new Date(min).getFullYear();
  }, [recentActivity]);
  const yearsOnSite = useMemo(() => {
    if (!sinceYear) return null;
    const nowYear = new Date().getFullYear();
    return Math.max(0, nowYear - sinceYear);
  }, [sinceYear]);

  // Применяем CSS переменные для цветов профиля
  useEffect(() => {
    const wrapper = document.querySelector('.profile-mobile-wrapper, .permanent-ban-page');
    if (wrapper) {
      const htmlElement = wrapper as HTMLElement;
      
      // Функция для конвертации HEX в RGB
      const hexToRgb = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '13, 13, 13';
      };
      
      // Цвета применяются ВСЕГДА если они установлены
      if (profileColor1) {
        htmlElement.style.setProperty('--profile-color-1', profileColor1);
        htmlElement.style.setProperty('--profile-color-1-rgb', hexToRgb(profileColor1));
      } else {
        htmlElement.style.removeProperty('--profile-color-1');
        htmlElement.style.removeProperty('--profile-color-1-rgb');
      }
      
      if (profileColor2) {
        htmlElement.style.setProperty('--profile-color-2', profileColor2);
        htmlElement.style.setProperty('--profile-color-2-rgb', hexToRgb(profileColor2));
      } else {
        htmlElement.style.removeProperty('--profile-color-2');
        htmlElement.style.removeProperty('--profile-color-2-rgb');
      }
    }
  }, [profileColor1, profileColor2]);

  if (isLoading) return <div style={{ padding: 32, textAlign: 'center' }}>Загрузка...</div>;

  // Градиентный фон для мобильной версии
  const mobileGradientStyle: React.CSSProperties = {
    backgroundImage: profileColor1 && profileColor2
      ? `linear-gradient(180deg, rgba(13, 13, 13, 0.6) 0%, rgba(13, 13, 13, 0.6) 100%), linear-gradient(180deg, ${profileColor1} 0%, ${profileColor2} 100%)`
      : 'linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%)',
    backgroundAttachment: 'fixed',
  };

  // Если пользователь забанен перманентно - показываем только страницу с баном
  if (isPermanentBan) {
    return (
      <div 
        className="permanent-ban-page" 
        data-profile-theme={effectiveProfileTheme || 'default'}
        style={mobileGradientStyle}
      >
        <div className="permanent-ban-container">
          <div className="ban-icon">
            <LucideIcons.ShieldX size={48} />
          </div>
          <h1>Данный пользователь был навсегда забанен из-за нарушение правил сообщества</h1>
          {banReason && (
            <div className="ban-reason">
              <LucideIcons.FileText size={16} />
              <div>
                <strong>Причина:</strong> {banReason}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="profile-mobile-wrapper" 
      data-profile-theme={effectiveProfileTheme || 'default'}
      style={mobileGradientStyle}
    >
      {/* Баннер */}
      <MobileBanner bannerUrl={bannerUrl || undefined} bannerAnimatedUrl={bannerAnimatedUrl || undefined} />

      {/* Временный мут для собственного профиля - отображаем на баннере, выше бана */}
      {!isLoading && isOwnProfile && isMuted && (
        <div className="temporary-mute-banner own-profile mobile">
          <div className="mute-header">
            <LucideIcons.VolumeX size={14} />
            <strong>У вас ограничения комментариев</strong>
          </div>
          {muteEndDate && (
            <div className="mute-dates">
              <LucideIcons.Clock size={11} />
              <span>До {new Date(muteEndDate).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
          {muteReason && (
            <div className="mute-reason-text">
              <LucideIcons.MessageCircle size={11} />
              <div>
                <strong>Причина:</strong> {muteReason}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Временный бан для собственного профиля - отображаем на баннере */}
      {!isLoading && isOwnProfile && isBanned && !isPermanentBan && (
        <div className="temporary-ban-banner own-profile mobile">
          <div className="ban-header">
            <LucideIcons.AlertTriangle size={16} />
            <strong>У вас имеется блокировка</strong>
          </div>
          {banStartDate && banEndDate && (
            <div className="ban-dates">
              <LucideIcons.Clock size={12} />
              <span>От {new Date(banStartDate).toLocaleDateString('ru-RU')} до {new Date(banEndDate).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
          {banReason && (
            <div className="ban-reason-text">
              <LucideIcons.MessageCircle size={12} />
              <div>
                <strong>Причина:</strong> {banReason}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Аватар, ник, роли, бейджи */}
      <MobileAvatarAndRoles
        avatarUrl={avatarUrl}
        avatarAnimatedUrl={avatarAnimatedUrl}
        userName={userName}
        isVerified={isVerified}
        userRoles={userRoles}
        badges={badges}
        profileUsername={canonicalUsername || username}
        isOwnProfile={isOwnProfile}
        onFriendsChanged={refresh}
        isBanned={isBanned}
        banReason={banReason}
        banStartDate={banStartDate}
        banEndDate={banEndDate}
        isPermanentBan={isPermanentBan}
        isMuted={isMuted}
        muteReason={muteReason}
        muteEndDate={muteEndDate}
      />

      {/* Био */}
      <MobileBio userDescription={userDescription} />

      {/* Диаграмма статистики */}
      <div className="stats-chart-container-mobile">
        <StatsChart username={canonicalUsername || username} colors={COLORS} />
            </div>
      {/* Кнопка просмотра коллекции */}
      <div className="view-collection-container">
        <button
          className="view-collection-btn"
          onClick={() => {
            if (isOwnProfile) {
              router.push('/profile/collection');
             } else if (canonicalUsername || username) {
              setUserCollectionOpen(true);
            }
          }}
        >
          Посмотреть коллекцию
        </button>
      </div>
      {/* Блок общей статистики (2 в ряд) */}
      <MobileStatsSummary
        yearsOnSite={yearsOnSite}
        sinceYear={sinceYear}
        friendsCount={friendsCount}
        completedCount={completedCount}
        reviewsCount={reviewsCount}
      />

      {/* Табы */}
      <MobileTabsBar
        activeTab={activeTab}
        isOwnProfile={isOwnProfile}
        onChange={setActiveTab}
        tabs={isOwnProfile ? ['friends', 'activity', 'reviews', 'utils'] : ['friends', 'activity', 'reviews']}
      />

      <div className="profile-mobile-tabs-content">
        {/* Вкладка "Обзор" удалена */}

        {/* Вкладка "Коллекции" удалена; переход через кнопку выше */}

        {activeTab === 'friends' && (
          <MobileFriends
            isOwnProfile={isOwnProfile}
            incoming={incoming}
            friends={friends}
            username={canonicalUsername || username}
            refresh={refresh}
            isLoading={isFriendsLoading}
          />
        )}

        {activeTab === 'activity' && (
          <MobileActivity recentActivity={recentActivity} isLoading={isActivityLoading} />
        )}

        {activeTab === 'reviews' && (
          <MobileReviews userName={userName} userReviews={userReviews} isLoading={isReviewsLoading} />
        )}

        {activeTab === 'utils' && isOwnProfile && (
          <MobileUtils isOwnProfile={isOwnProfile} userRoles={userRoles} />
        )}
      </div>

      <MobileUserCollectionModal isOpen={!isOwnProfile && userCollectionOpen} onClose={() => setUserCollectionOpen(false)} username={canonicalUsername || username} />

      {/* Десктопное модальное окно друзей не используется в мобильном UI */}
    </div>
  );
};

export default NewIdProfilePageMobileProvider;
