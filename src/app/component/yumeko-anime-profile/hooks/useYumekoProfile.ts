'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  sub: string;
  username?: string;
  [key: string]: unknown;
}

export interface YumekoProfileData {
  userName: string;
  userDescription: string | null;
  userRoles: string[];
  avatarUrl: string | null;
  bannerUrl: string | null;
  backgroundUrl: string | null;
  avatarAnimatedUrl: string | null;
  bannerAnimatedUrl: string | null;
  backgroundAnimatedUrl: string | null;
  backgroundStaticUrl: string | null;
  profileColorScheme: string | null;
  profileColor1: string | null;
  profileColor2: string | null;
  isOwnProfile: boolean;
  isLoading: boolean;
  isLoadingFriends: boolean;
  isLoadingStats: boolean;
  isLoadingContent: boolean;
  isNotFound: boolean;
  isVerified: boolean;
  badges: string[];
  canonicalUsername: string;
  isBanned: boolean;
  banReason?: string;
  banEndDate?: string;
  isPermanentBan: boolean;
  isMuted: boolean;
  muteReason?: string;
  muteEndDate?: string;
  friends: Friend[];
  incomingCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watchingAnime: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  favoriteAnime: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userReviews: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentActivity: any[];
  refresh: () => void;
}

interface Friend {
  id: number;
  name: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  avatarAnimatedUrl: string | null;
  bannerAnimatedUrl: string | null;
  profileColor1: string | null;
  profileColor2: string | null;
  verified: boolean;
}

export function useYumekoProfile(username?: string): YumekoProfileData {
  const [userName, setUserName] = useState<string>('Загрузка...');
  const [userDescription, setUserDescription] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [avatarAnimatedUrl, setAvatarAnimatedUrl] = useState<string | null>(null);
  const [bannerAnimatedUrl, setBannerAnimatedUrl] = useState<string | null>(null);
  const [backgroundAnimatedUrl, setBackgroundAnimatedUrl] = useState<string | null>(null);
  const [backgroundStaticUrl, setBackgroundStaticUrl] = useState<string | null>(null);
  const [profileColorScheme, setProfileColorScheme] = useState<string | null>(null);
  const [profileColor1, setProfileColor1] = useState<string | null>(null);
  const [profileColor2, setProfileColor2] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(true);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [badges, setBadges] = useState<string[]>([]);
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string | undefined>(undefined);
  const [banEndDate, setBanEndDate] = useState<string | undefined>(undefined);
  const [isPermanentBan, setIsPermanentBan] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [muteReason, setMuteReason] = useState<string | undefined>(undefined);
  const [muteEndDate, setMuteEndDate] = useState<string | undefined>(undefined);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingCount, setIncomingCount] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [watchingAnime, setWatchingAnime] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [favoriteAnime, setFavoriteAnime] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userReviews, setUserReviews] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const getCookieToken = useCallback((): string => {
    const match = typeof document !== 'undefined' ? document.cookie.match(/token=([^;]+)/) : null;
    return match ? match[1] : '';
  }, []);

  const token = getCookieToken();

  const getTokenUsername = useCallback((): string => {
    const token = getCookieToken();
    if (!token) return '';
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return (decoded.username || decoded.sub || '').trim();
    } catch {
      return '';
    }
  }, [getCookieToken]);

  const tokenUsernameRaw = getTokenUsername();
  const routeUsernameRaw = (username || '').trim();
  const isOwnProfile = !!tokenUsernameRaw && tokenUsernameRaw.toLowerCase() === routeUsernameRaw.toLowerCase();
  const [resolvedUsername, setResolvedUsername] = useState<string>(routeUsernameRaw);
  const canonicalUsername = isOwnProfile ? tokenUsernameRaw : (resolvedUsername || routeUsernameRaw);

  const fetchProfile = useCallback(async () => {
    if (!canonicalUsername) return;
    
    setIsLoading(true);
    
    try {
      // Быстрая проверка на перманентный бан
      const quickBanCheck = await fetch(`${API_SERVER}/api/profiles/get-profile?username=${canonicalUsername}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (quickBanCheck.ok) {
        const quickData = await quickBanCheck.json();
        
        if (quickData.banned === true && quickData.isPermanentBan === true) {
          setIsBanned(true);
          setBanReason(quickData.banReason);
          setBanEndDate(quickData.banEndDate);
          setIsPermanentBan(true);
          setIsLoading(false);
          setUserName(quickData.nickname || quickData.username || 'Пользователь');
          setResolvedUsername(quickData.username || '');
          setProfileColorScheme(quickData.profileColorScheme || null);
          setProfileColor1(quickData.profileColor1 || null);
          setProfileColor2(quickData.profileColor2 || null);
          
          // Загружаем фоны для страницы бана
          const backgroundRes = await fetch(`${API_SERVER}/api/profiles/background?username=${canonicalUsername}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (backgroundRes.ok) {
            const backgroundData = await backgroundRes.json();
            if (backgroundData.animatedUrl) {
              setBackgroundAnimatedUrl(backgroundData.animatedUrl);
              setBackgroundStaticUrl(backgroundData.staticUrl || backgroundData.url);
            } else if (backgroundData.url) {
              setBackgroundUrl(backgroundData.url);
            }
          }
          
          return;
        }
      }
      
      // Загружаем полный профиль
      const [profileRes, badgesRes, avatarRes, bannerRes, backgroundRes] = await Promise.all([
        fetch(`${API_SERVER}/api/profiles/get-profile?username=${canonicalUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_SERVER}/api/badges/user/${encodeURIComponent(canonicalUsername)}`),
        fetch(`${API_SERVER}/api/profiles/avatar?username=${canonicalUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_SERVER}/api/profiles/banner?username=${canonicalUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_SERVER}/api/profiles/background?username=${canonicalUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setUserName(data.nickname || data.username || 'Пользователь');
        setUserDescription(data.bio);
        setProfileColorScheme(data.profileColorScheme || null);
        setProfileColor1(data.profileColor1 || null);
        setProfileColor2(data.profileColor2 || null);
        const cleanRoles = (data.roles || []).map((role: string) => role.replace('ROLE_', ''));
        setUserRoles(cleanRoles);
        setResolvedUsername(data.username || '');
        setIsVerified(data.verified || false);
        
        if (data.banned === true) {
          setIsBanned(true);
          setBanReason(data.banReason);
          setBanEndDate(data.banEndDate);
          setIsPermanentBan(data.isPermanentBan === true);
        }
        
        if (data.muted === true) {
          setIsMuted(true);
          setMuteReason(data.muteReason);
          setMuteEndDate(data.muteEndDate);
        }
      }

      if (badgesRes.ok) {
        const data = await badgesRes.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const badgeList = Array.isArray(data) ? data.map((b: any) => b.badgeName) : [];
        setBadges(badgeList);
      }

      if (avatarRes.ok) {
        const avatarData = await avatarRes.json();
        if (avatarData.animatedUrl) {
          setAvatarAnimatedUrl(avatarData.animatedUrl);
        }
        if (avatarData.url) {
          setAvatarUrl(avatarData.url);
        }
      }

      if (bannerRes.ok) {
        const bannerData = await bannerRes.json();
        if (bannerData.animatedUrl) {
          setBannerAnimatedUrl(bannerData.animatedUrl);
        }
        if (bannerData.url) {
          setBannerUrl(bannerData.url);
        }
      }

      if (backgroundRes.ok) {
        const backgroundData = await backgroundRes.json();
        if (backgroundData.animatedUrl) {
          setBackgroundAnimatedUrl(backgroundData.animatedUrl);
          setBackgroundStaticUrl(backgroundData.staticUrl || backgroundData.url);
        } else if (backgroundData.url) {
          setBackgroundUrl(backgroundData.url);
        }
      }

      // ЭТАП 1: Основная информация профиля загружена
      setIsLoading(false);

      // ЭТАП 2: Загружаем друзей
      const friendsRes = await fetch(`${API_SERVER}/api/friends/list/${encodeURIComponent(canonicalUsername)}`);
      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (friendsData || []).map((d: any, idx: number) => ({
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
          verified: d.verified,
        }));
        setFriends(mapped);
      }

      if (isOwnProfile) {
        const inc = await fetch(`${API_SERVER}/api/friends/requests/incoming/${encodeURIComponent(canonicalUsername)}`);
        if (inc.ok) {
          const incData = await inc.json();
          setIncomingCount((incData || []).length);
        }
      }
      
      setIsLoadingFriends(false);

      // ЭТАП 3: Загружаем статистику (аниме которое смотрит и избранное)
      try {
        const watchingRes = await fetch(`${API_SERVER}/api/player/progress/watching-anime/${encodeURIComponent(canonicalUsername)}`);
        if (watchingRes.ok) {
          const watchingData = await watchingRes.json();
          setWatchingAnime(watchingData || []);
        }
      } catch (e) {
        console.error('Ошибка загрузки watching anime:', e);
      }

      try {
        const favoriteRes = await fetch(`${API_SERVER}/api/collection/user/${encodeURIComponent(canonicalUsername)}?type=FAVORITE`);
        if (favoriteRes.ok) {
          const favoriteData = await favoriteRes.json();
          setFavoriteAnime(favoriteData || []);
        }
      } catch (e) {
        console.error('Ошибка загрузки favorite anime:', e);
      }
      
      setIsLoadingStats(false);

      // ЭТАП 4: Загружаем остальной контент (отзывы и активность)
      try {
        const reviewsRes = await fetch(`${API_SERVER}/api/anime/ratings/user/${encodeURIComponent(canonicalUsername)}`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setUserReviews(reviewsData || []);
        }
      } catch (e) {
        console.error('Ошибка загрузки reviews:', e);
      }

      try {
        const activityRes = await fetch(`${API_SERVER}/api/activity/user/${encodeURIComponent(canonicalUsername)}?limit=20`);
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setRecentActivity(activityData || []);
        }
      } catch (e) {
        console.error('Ошибка загрузки activity:', e);
      }
      
      setIsLoadingContent(false);

    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      setIsNotFound(true);
      setUserName('Ошибка');
      setUserDescription('Профиль не найден');
      setIsLoading(false);
      setIsLoadingFriends(false);
      setIsLoadingStats(false);
      setIsLoadingContent(false);
    }
  }, [canonicalUsername, token, isOwnProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
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
    isLoadingFriends,
    isLoadingStats,
    isLoadingContent,
    isNotFound,
    isVerified,
    badges,
    canonicalUsername,
    isBanned,
    banReason,
    banEndDate,
    isPermanentBan,
    isMuted,
    muteReason,
    muteEndDate,
    friends,
    incomingCount,
    watchingAnime,
    favoriteAnime,
    userReviews,
    recentActivity,
    refresh: fetchProfile,
  };
}
