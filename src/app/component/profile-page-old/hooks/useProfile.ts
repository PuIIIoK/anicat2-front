'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { jwtDecode } from 'jwt-decode';
import type { WatchingItem, FavoriteItem, UserReview } from '../types';

interface DecodedToken {
  sub: string;
  username?: string;
  [key: string]: unknown;
}

// interface UserProfileResponse {
//   userId: number;
//   username: string;
//   roles: string[];
//   profileId: number;
//   nickname: string | null;
//   bio: string | null;
//   avatarId: string | null;
//   bannerId: string | null;
//   verified: boolean;
// }

interface AnimeData {
  id: number;
  title: string;
  alttitle?: string;
  description?: string;
  genres?: string;
  status?: string;
  type?: string;
  episode_all?: string;
  current_episode?: string;
  rating?: string;
  year?: string;
  season?: string;
  mouth_season?: string;
  studio?: string;
  kodik?: string;
  alias?: string;
  realesed_for?: string;
  imageUrl?: string;
  zametka?: string | null;
  anons?: string | null;
  opened?: boolean;
  allowedCountries?: string[];
  cover?: {
    id: number;
    name?: string;
  };
}

interface CollectionItem {
  collectionId: number;
  collectionType: string;
  addedAt: string;
  anime: AnimeData;
}

// type FormattedAnimeItem = WatchingItem | FavoriteItem;

interface UseProfileResult {
  userName: string;
  userDescription: string | null;
  userRoles: string[];
  avatarUrl: string | null;
  bannerUrl: string | null;
  backgroundUrl: string | null;
  avatarAnimatedUrl: string | null;
  avatarStaticUrl: string | null;
  bannerAnimatedUrl: string | null;
  bannerStaticUrl: string | null;
  backgroundAnimatedUrl: string | null;
  backgroundStaticUrl: string | null;
  profileColorScheme: string | null;
  profileColor1: string | null;
  profileColor2: string | null;
  isOwnProfile: boolean;
  isLoading: boolean;
  isVerified: boolean;
  watchingAnime: WatchingItem[];
  favoriteAnime: FavoriteItem[];
  recentActivity: Record<string, unknown>[];
  friends: Friend[];
  incoming: Friend[];
  incomingCount: number;
  userReviews: UserReview[];
  refresh: () => void;
  badges: string[];
  canonicalUsername: string;
  isBanned?: boolean;
  banReason?: string;
  banStartDate?: string;
  banEndDate?: string;
  isPermanentBan?: boolean;
  isMuted?: boolean;
  muteReason?: string;
  muteEndDate?: string;
}

interface Friend {
  id: number;
  name: string;
  username: string;
  nickname: string | null;
  roles: string[];
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  verified: boolean;
}

type ProfileCacheData = Partial<{
  userName: string;
  userDescription: string | null;
  userRoles: string[];
  avatarUrl: string | null;
  bannerUrl: string | null;
  backgroundUrl: string | null;
  avatarAnimatedUrl: string | null;
  avatarStaticUrl: string | null;
  bannerAnimatedUrl: string | null;
  bannerStaticUrl: string | null;
  backgroundAnimatedUrl: string | null;
  backgroundStaticUrl: string | null;
  profileColorScheme: string | null;
  profileColor1: string | null;
  profileColor2: string | null;
  isVerified: boolean;
  watchingAnime: WatchingItem[];
  favoriteAnime: FavoriteItem[];
  recentActivity: Record<string, unknown>[];
  friends: Friend[];
  incoming: Friend[];
  incomingCount: number;
  userReviews: UserReview[];
  badges: string[];
  canonicalUsername: string;
}>;

type ProfileCacheEntry = { data: ProfileCacheData; lastUpdated: number; fullyLoaded: boolean };

declare global {
  // eslint-disable-next-line no-var
  var __profilePageCache: Map<string, ProfileCacheEntry> | undefined;
}



// Определяем, работаем ли мы на мобильном устройстве
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
};

export function useProfile(username?: string): UseProfileResult {
  const [userName, setUserName] = useState<string>('Загрузка...');
  const [userDescription, setUserDescription] = useState<string | null>('...');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [avatarAnimatedUrl, setAvatarAnimatedUrl] = useState<string | null>(null);
  const [avatarStaticUrl, setAvatarStaticUrl] = useState<string | null>(null);
  const [bannerAnimatedUrl, setBannerAnimatedUrl] = useState<string | null>(null);
  const [bannerStaticUrl, setBannerStaticUrl] = useState<string | null>(null);
  const [backgroundAnimatedUrl, setBackgroundAnimatedUrl] = useState<string | null>(null);
  const [backgroundStaticUrl, setBackgroundStaticUrl] = useState<string | null>(null);
  const [profileColorScheme, setProfileColorScheme] = useState<string | null>(null);
  const [profileColor1, setProfileColor1] = useState<string | null>(null);
  const [profileColor2, setProfileColor2] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [watchingAnime, setWatchingAnime] = useState<WatchingItem[]>([]);
  const [favoriteAnime, setFavoriteAnime] = useState<FavoriteItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<Record<string, unknown>[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingCount, setIncomingCount] = useState<number>(0);
  const [incoming, setIncoming] = useState<Friend[]>([]);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string | undefined>(undefined);
  const [banStartDate, setBanStartDate] = useState<string | undefined>(undefined);
  const [banEndDate, setBanEndDate] = useState<string | undefined>(undefined);
  const [isPermanentBan, setIsPermanentBan] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [muteReason, setMuteReason] = useState<string | undefined>(undefined);
  const [muteEndDate, setMuteEndDate] = useState<string | undefined>(undefined);

  const getCookieToken = useCallback((): string => {
    const match = typeof document !== 'undefined' ? document.cookie.match(/token=([^;]+)/) : null;
    return match ? match[1] : '';
  }, []);

  const token = useMemo(() => getCookieToken(), [getCookieToken]);

  // Получаем username из токена
  const getTokenUsername = useCallback((): string => {
    const token = getCookieToken();
    if (!token) return '';
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      // ВАЖНО: сохраняем исходный регистр username из токена
      return (decoded.username || decoded.sub || '').trim();
    } catch {
      return '';
    }
  }, [getCookieToken]);

  const tokenUsernameRaw = getTokenUsername();
  const routeUsernameRaw = (username || '').trim();
  const isOwnProfile = !!tokenUsernameRaw && tokenUsernameRaw.toLowerCase() === routeUsernameRaw.toLowerCase();
  // Разрешённое сервером имя пользователя (с правильным регистром),
  // обновится после первого успешного профайл-запроса
  const [resolvedUsername, setResolvedUsername] = useState<string>(routeUsernameRaw);
  // Каноническое имя пользователя: для своего профиля берём из токена (с исходным регистром),
  // для чужого — берём подтверждённое сервером имя (fallback: из URL)
  const canonicalUsername = isOwnProfile ? tokenUsernameRaw : (resolvedUsername || routeUsernameRaw);

  // Глобальный кэш профиля на время жизни вкладки
  function getProfileCache(): Map<string, ProfileCacheEntry> {
    if (!globalThis.__profilePageCache) {
      globalThis.__profilePageCache = new Map<string, ProfileCacheEntry>();
    }
    return globalThis.__profilePageCache;
  }

  const mergeIntoProfileCache = useCallback((usernameKey: string, partial: Partial<ProfileCacheData>) => {
    const cache = getProfileCache();
    const current = cache.get(usernameKey)?.data || {};
    const merged: ProfileCacheData = { ...current, ...partial } as ProfileCacheData;
    cache.set(usernameKey, { data: merged, lastUpdated: Date.now(), fullyLoaded: true });
  }, []);

  function isHardReload(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (entries && entries.length > 0) return entries[0].type === 'reload';
      // fallback for older browsers
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (performance && performance.navigation) {
        // 1 === TYPE_RELOAD
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return performance.navigation.type === 1;
      }
    } catch {}
    return false;
  }

  const fetchWatchingAnime = useCallback(async (targetIdentifier?: string) => {
    try {
      const identifier = targetIdentifier || canonicalUsername;
      if (!identifier) return;
      
      // Используем новый оптимизированный endpoint
      const watchingRes = await fetch(`${API_SERVER}/api/player/progress/watching-anime/${encodeURIComponent(identifier)}`);
      
      if (watchingRes.ok) {
        const watchingData = await watchingRes.json();
        
        if (!Array.isArray(watchingData) || watchingData.length === 0) {
          setWatchingAnime([]);
          return;
        }
        
        // Преобразуем данные в нужный формат
        const formattedData: WatchingItem[] = watchingData.map((item: Record<string, unknown>) => {
          const year = String(item.year || 'N/A');
          const totalEpisodes = item.episode_all ? parseInt(String(item.episode_all)) : undefined;
          const isAnons = String(item.status || '').toLowerCase() === 'скоро' || (item.anons && String(item.anons).trim().length > 0);
          const progressText: string | undefined = isAnons ? (String(item.anons) || 'скоро') : undefined;
          
          return {
            id: Number(item.id),
            title: String(item.title),
            coverUrl: `${API_SERVER}/api/stream/${item.id}/cover`,
            year,
            seasonLabel: item.season ? String(item.season) : 'N/A',
            progressText,
            currentEpisodes: Number(item.totalWatchedEpisodes) || 0,
            totalEpisodes: typeof totalEpisodes === 'number' && !isNaN(totalEpisodes) ? totalEpisodes : undefined,
            voiceProgress: (item.voiceProgress as Record<string, unknown>) || {},
            progressDetails: (item.progressDetails as unknown[]) || [],
          } as WatchingItem;
        });
        
        setWatchingAnime(formattedData);
        mergeIntoProfileCache(identifier, { watchingAnime: formattedData });
      } else {
        // Fallback на старый метод через коллекции
        const res = await fetch(`${API_SERVER}/api/collection/user/${encodeURIComponent(identifier)}?type=WATCHING`);
        if (res.ok) {
          const data: CollectionItem[] = await res.json();
          const formattedData: WatchingItem[] = data.map((item: CollectionItem) => {
            const anime = item.anime;
            const year = anime.year || 'N/A';
            const totalEpisodes = anime.episode_all ? parseInt(anime.episode_all) : undefined;
            const currentEpisodes = anime.current_episode ? parseInt(anime.current_episode) : undefined;
            const isAnons = (anime.status || '').toLowerCase() === 'скоро' || (anime.anons && anime.anons.trim().length > 0);
            const progressText: string | undefined = isAnons ? (anime.anons || 'скоро') : undefined;
            return {
              id: anime.id,
              title: anime.title,
              coverUrl: `${API_SERVER}/api/stream/${anime.id}/cover`,
              year,
              seasonLabel: anime.season ? `${anime.season}` : 'N/A',
              progressText,
              currentEpisodes: typeof currentEpisodes === 'number' && !isNaN(currentEpisodes) ? currentEpisodes : undefined,
              totalEpisodes: typeof totalEpisodes === 'number' && !isNaN(totalEpisodes) ? totalEpisodes : undefined,
            } as WatchingItem;
          });
          setWatchingAnime(formattedData);
          mergeIntoProfileCache(identifier, { watchingAnime: formattedData });
        } else {
          setWatchingAnime([]);
        }
      }
    } catch {
      setWatchingAnime([]);
    }
  }, [mergeIntoProfileCache]);

  const fetchFavoriteAnime = useCallback(async (targetIdentifier?: string) => {
    try {
      const identifier = targetIdentifier || canonicalUsername;
      if (!identifier) return;
      const res = await fetch(`${API_SERVER}/api/collection/user/${encodeURIComponent(identifier)}?type=FAVORITE`);
      if (res.ok) {
        const data: CollectionItem[] = await res.json();
        const formattedData: FavoriteItem[] = data.map((item: CollectionItem) => {
          const anime = item.anime;
          const totalEpisodes = anime.episode_all ? parseInt(anime.episode_all) : undefined;
          const isAnons = (anime.status || '').toLowerCase() === 'скоро' || (anime.anons && anime.anons.trim().length > 0);
          let progressText: string | undefined;
          if (isAnons && (!totalEpisodes || isNaN(totalEpisodes))) {
            progressText = anime.anons || 'скоро';
          }
          return {
            id: anime.id,
            title: anime.title,
            coverUrl: `${API_SERVER}/api/stream/${anime.id}/cover`,
            year: anime.year ? parseInt(anime.year.split('-')[0]) || 0 : 0,
            seasonLabel: anime.season ? `${parseInt(anime.season.match(/\d+/)?.[0] || '1')} сезон` : '1 сезон',
            progressText,
            totalEpisodes: typeof totalEpisodes === 'number' && !isNaN(totalEpisodes) ? totalEpisodes : undefined,
          } as FavoriteItem;
        });
        setFavoriteAnime(formattedData);
        mergeIntoProfileCache(identifier, { favoriteAnime: formattedData });
      } else {
        setFavoriteAnime([]);
      }
    } catch {
      setFavoriteAnime([]);
    }
  }, [mergeIntoProfileCache]);

  const fetchRecentActivity = useCallback(async (targetIdentifier?: string) => {
    try {
      const identifier = targetIdentifier || canonicalUsername;
      if (!identifier) return;
      const res = await fetch(`${API_SERVER}/api/activity/user/${encodeURIComponent(identifier)}?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setRecentActivity(data);
        mergeIntoProfileCache(identifier, { recentActivity: data });
      } else {
        setRecentActivity([]);
      }
    } catch {
      setRecentActivity([]);
    }
  }, [mergeIntoProfileCache]);

  const fetchFriends = useCallback(async (targetIdentifier?: string, isOwn: boolean = false) => {
    try {
      const identifier = targetIdentifier || canonicalUsername;
      if (!identifier) return;
      if (isOwn) {
        // Для своего профиля: полный API с заявками
        const res = await fetch(`${API_SERVER}/api/friends/list/${encodeURIComponent(identifier)}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = (data || []).map((d: Record<string, unknown>, idx: number) => ({
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
          setFriends(mapped as Friend[]);
          mergeIntoProfileCache(identifier, { friends: mapped });
        } else {
          setFriends([]);
        }
        // Загрузить входящие заявки
        const inc = await fetch(`${API_SERVER}/api/friends/requests/incoming/${encodeURIComponent(identifier)}`);
        if (inc.ok) {
          const incData = await inc.json();
          const mappedInc = (incData || []).map((d: Record<string, unknown>, idx: number) => ({
            id: d.id ?? idx,
            name: d.nickname || d.username,
            username: d.username,
            nickname: d.nickname,
            avatarUrl: d.avatarUrl,
            bannerUrl: d.bannerUrl,
          }));
          setIncoming(mappedInc as Friend[]);
          setIncomingCount((incData || []).length);
          mergeIntoProfileCache(identifier, { incoming: mappedInc, incomingCount: (incData || []).length });
        } else {
          setIncoming([]);
          setIncomingCount(0);
        }
      } else {
        // Для чужого профиля: только друзья
        const res = await fetch(`${API_SERVER}/api/friends/list/${encodeURIComponent(identifier)}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = (data || []).map((d: Record<string, unknown>, idx: number) => ({
            id: idx,
            name: d.nickname || d.username,
            username: d.username,
            nickname: d.nickname,
            roles: d.roles as string[] | undefined,
            bio: d.bio as string | undefined,
            avatarUrl: d.avatarUrl,
            bannerUrl: d.bannerUrl,
            avatarAnimatedUrl: d.avatarAnimatedUrl,
            bannerAnimatedUrl: d.bannerAnimatedUrl,
            profileColor1: d.profileColor1,
            profileColor2: d.profileColor2,
            verified: Boolean(d.verified),
          }));
          setFriends(mapped as Friend[]);
          mergeIntoProfileCache(identifier, { friends: mapped });
        } else {
          setFriends([]);
        }
        setIncoming([]);
        setIncomingCount(0);
        mergeIntoProfileCache(identifier, { incoming: [], incomingCount: 0 });
      }
    } catch {
      setFriends([]);
      setIncoming([]);
      setIncomingCount(0);
    }
  }, [mergeIntoProfileCache]);

  const fetchUserReviews = useCallback(async (targetIdentifier?: string) => {
    try {
      const identifier = targetIdentifier || canonicalUsername;
      if (!identifier) return;
      
      // Используем API endpoint для получения рейтингов пользователя
      const res = await fetch(`${API_SERVER}/api/anime/ratings/user/${encodeURIComponent(identifier)}`);
      if (res.ok) {
        const data = await res.json();
        const reviews: UserReview[] = data.map((rating: Record<string, unknown>) => ({
          id: rating.id,
          score: rating.score,
          animeTitle: rating.animeTitle,
          animeId: rating.animeId,
          comment: rating.comment || '',
          coverUrl: `${API_SERVER}/api/stream/${rating.animeId}/cover`
        }));
        setUserReviews(reviews);
        mergeIntoProfileCache(identifier, { userReviews: reviews });
      } else {
        setUserReviews([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки отзывов:', error);
      setUserReviews([]);
    }
  }, [mergeIntoProfileCache]);

  const fetchProfile = useCallback(async () => {
    if (!canonicalUsername) return;
    // Попытка восстановить из кэша и не перезагружать
    const cache = getProfileCache();
    const forceFresh = isHardReload();
    if (forceFresh) {
      try { cache.clear(); } catch {}
    }
    const cached = cache.get(canonicalUsername);
    const hasCache = !!(cached && cached.data);
    if (hasCache && !forceFresh) {
      const d = cached!.data;
      setUserName(d.userName ?? 'Пользователь');
      setUserDescription((d.userDescription ?? null) as string | null);
      setUserRoles(d.userRoles || []);
      setAvatarUrl(d.avatarUrl || null);
      setBannerUrl(d.bannerUrl || null);
      setBackgroundUrl(d.backgroundUrl || null);
      setBackgroundAnimatedUrl(d.backgroundAnimatedUrl || null);
      setBackgroundStaticUrl(d.backgroundStaticUrl || null);
      setProfileColorScheme(d.profileColorScheme || null);
      setProfileColor1(d.profileColor1 || null);
      setProfileColor2(d.profileColor2 || null);
      setIsVerified(Boolean(d.isVerified));
      setBadges(Array.isArray(d.badges) ? d.badges : []);
      setRecentActivity(Array.isArray(d.recentActivity) ? d.recentActivity : []);
      setWatchingAnime(Array.isArray(d.watchingAnime) ? d.watchingAnime : []);
      setFavoriteAnime(Array.isArray(d.favoriteAnime) ? d.favoriteAnime : []);
      setFriends(Array.isArray(d.friends) ? d.friends : []);
      setIncoming(Array.isArray(d.incoming) ? d.incoming : []);
      setIncomingCount(typeof d.incomingCount === 'number' ? d.incomingCount : 0);
      setUserReviews(Array.isArray(d.userReviews) ? d.userReviews : []);
      if (typeof d.canonicalUsername === 'string' && d.canonicalUsername) {
        setResolvedUsername(d.canonicalUsername);
      }
      // Ключевое: НЕ включаем глобальную загрузку — UI остаётся без скелета
      setIsLoading(false);
    } else {
      // Нет кэша — обычная первичная загрузка с индикатором
      setIsVerified(false);
      setIsLoading(true);
    }
    try {
      // 🚀 БЫСТРАЯ ПРОВЕРКА НА ПЕРМАНЕНТНЫЙ БАН (приоритет!)
      const quickBanCheck = await fetch(`${API_SERVER}/api/profiles/get-profile?username=${canonicalUsername}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (quickBanCheck.ok) {
        const quickData = await quickBanCheck.json();
        
        // Если перманентный бан - сразу останавливаемся и не грузим остальное
        if (quickData.banned === true && quickData.isPermanentBan === true) {
          setIsBanned(true);
          setBanReason(quickData.banReason);
          setBanEndDate(quickData.banEndDate);
          setIsPermanentBan(true);
          setIsLoading(false);
          
          // Устанавливаем базовую информацию для отображения страницы бана
          setUserName((quickData.nickname as string) || (quickData.username as string) || 'Пользователь');
          if (typeof quickData.username === 'string' && quickData.username.trim().length > 0) {
            setResolvedUsername(String(quickData.username).trim());
          }
          
          // Загружаем цвета профиля для красивой страницы бана
          setProfileColorScheme(quickData.profileColorScheme || null);
          setProfileColor1(quickData.profileColor1 || null);
          setProfileColor2(quickData.profileColor2 || null);
          
          // Загружаем только фоны для страницы бана (если есть)
          const [backgroundRes, bannerRes, avatarRes] = await Promise.all([
            fetch(`${API_SERVER}/api/profiles/background?username=${canonicalUsername}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_SERVER}/api/profiles/banner?username=${canonicalUsername}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_SERVER}/api/profiles/avatar?username=${canonicalUsername}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          ]);
          
          if (backgroundRes.ok) {
            const backgroundData = await backgroundRes.json();
            if (backgroundData.animatedUrl) {
              setBackgroundAnimatedUrl(backgroundData.animatedUrl);
              setBackgroundStaticUrl(backgroundData.staticUrl || backgroundData.url);
            } else if (backgroundData.url) {
              setBackgroundUrl(backgroundData.url);
            }
          }
          
          if (bannerRes.ok) {
            const bannerData = await bannerRes.json();
            if (bannerData.animatedUrl) {
              setBannerAnimatedUrl(bannerData.animatedUrl);
              setBannerStaticUrl(bannerData.staticUrl || bannerData.url);
            } else if (bannerData.url) {
              setBannerUrl(bannerData.url);
            }
          }
          
          if (avatarRes.ok) {
            const avatarData = await avatarRes.json();
            if (avatarData.animatedUrl) {
              setAvatarAnimatedUrl(avatarData.animatedUrl);
              setAvatarStaticUrl(avatarData.staticUrl || avatarData.url);
            } else if (avatarData.url) {
              setAvatarUrl(avatarData.url);
            }
          }
          
          return; // ⛔ Останавливаемся здесь, не грузим остальное
        }
      }
      
      // Если бана нет или не перманентный - грузим весь профиль
      const [profileRes, badgesRes] = await Promise.all([
        fetch(`${API_SERVER}/api/profiles/get-profile?username=${canonicalUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_SERVER}/api/badges/user/${encodeURIComponent(canonicalUsername)}`)
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        console.log('🔍 API Response for profile (FULL):', JSON.stringify(data, null, 2));
        console.log('🎨 profileColorScheme from API:', data.profileColorScheme);
        console.log('📋 All keys in response:', Object.keys(data));
        console.log('❓ Has profileColorScheme key?', 'profileColorScheme' in data);
        setUserName((data.nickname as string) || (data.username as string) || 'Пользователь');
        setUserDescription(data.bio as string);
        setProfileColorScheme(data.profileColorScheme || null);
        setProfileColor1(data.profileColor1 || null);
        setProfileColor2(data.profileColor2 || null);
        console.log('✅ Set profileColorScheme to:', data.profileColorScheme || null);
        console.log('🎨 Set profileColor1 to:', data.profileColor1 || null);
        console.log('🎨 Set profileColor2 to:', data.profileColor2 || null);
        const cleanRoles = (data.roles as string[] || []).map((role: string) => role.replace('ROLE_', ''));
        setUserRoles(cleanRoles);
        // Обновляем каноническое имя с сервера, если оно пришло
        if (typeof data.username === 'string' && data.username.trim().length > 0) {
          setResolvedUsername(String(data.username).trim());
        }
        // take verified from public profile if provided
        if (typeof data.verified === 'boolean') {
          setIsVerified(data.verified);
        }
        
        // Set ban information
        if (data.banned === true) {
          setIsBanned(true);
          setBanReason(data.banReason);
          setBanStartDate(data.banStartDate);
          setBanEndDate(data.banEndDate);
          setIsPermanentBan(data.isPermanentBan === true);
        } else {
          setIsBanned(false);
          setBanReason(undefined);
          setBanStartDate(undefined);
          setBanEndDate(undefined);
          setIsPermanentBan(false);
        }
        
        // Set mute information
        if (data.muted === true) {
          setIsMuted(true);
          setMuteReason(data.muteReason);
          setMuteEndDate(data.muteEndDate);
        } else {
          setIsMuted(false);
          setMuteReason(undefined);
          setMuteEndDate(undefined);
        }
        
        mergeIntoProfileCache(canonicalUsername, {
          userName: (data.nickname as string) || (data.username as string) || 'Пользователь',
          userDescription: data.bio as string,
          userRoles: cleanRoles,
          profileColorScheme: data.profileColorScheme || null,
          profileColor1: data.profileColor1 || null,
          profileColor2: data.profileColor2 || null,
          isVerified: typeof data.verified === 'boolean' ? data.verified : isVerified,
          canonicalUsername: typeof data.username === 'string' ? String(data.username).trim() : canonicalUsername,
        });
      } else {
        setUserName('Ошибка');
        setUserDescription('Профиль не найден');
      }

      if (badgesRes.ok) {
        const data = await badgesRes.json();
        const badgeList = Array.isArray(data) ? data.map((b: Record<string, unknown>) => b.badgeName as string) : [];
        setBadges(badgeList);
        mergeIntoProfileCache(canonicalUsername, { badges: badgeList });
      } else {
        setBadges([]);
      }

      // Fallback: if public profile didn't include verified, query auth endpoint
      if (isVerified === false) {
        const verRes = await fetch(`${API_SERVER}/api/auth/get-profile/id?username=${canonicalUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (verRes.ok) {
          const verData = await verRes.json();
          if (typeof verData.verified === 'boolean') {
            setIsVerified(verData.verified === true);
          }
        }
      }

      // Оптимизация: загружаем критичные медиа (аватар + баннер) параллельно
      const [avatarRes, bannerRes] = await Promise.all([
        fetch(`${API_SERVER}/api/profiles/avatar?username=${canonicalUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_SERVER}/api/profiles/banner?username=${canonicalUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      if (avatarRes.ok) {
        const avatarData = await avatarRes.json();
        if (avatarData.url) {
          setAvatarUrl(avatarData.url);
          mergeIntoProfileCache(canonicalUsername, { avatarUrl: avatarData.url });
        }
        // Если есть анимированная и статическая версии
        if (avatarData.animatedUrl) {
          setAvatarAnimatedUrl(avatarData.animatedUrl);
          setAvatarStaticUrl(avatarData.staticUrl || avatarData.url);
        }
      }

      if (bannerRes.ok) {
        const bannerData = await bannerRes.json();
        if (bannerData.url) {
          setBannerUrl(bannerData.url);
          mergeIntoProfileCache(canonicalUsername, { bannerUrl: bannerData.url });
        }
        // Если есть анимированная и статическая версии
        if (bannerData.animatedUrl) {
          setBannerAnimatedUrl(bannerData.animatedUrl);
          setBannerStaticUrl(bannerData.staticUrl || bannerData.url);
        }
      }
      
      // Фон загружаем в фоне для мобильных (некритично)
      const loadBackground = async () => {
        try {
          const backgroundRes = await fetch(`${API_SERVER}/api/profiles/background?username=${canonicalUsername}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (backgroundRes.ok) {
            const backgroundData = await backgroundRes.json();
            if (backgroundData.url) {
              setBackgroundUrl(backgroundData.url);
            }
            if (backgroundData.animatedUrl) {
              setBackgroundAnimatedUrl(backgroundData.animatedUrl);
              setBackgroundStaticUrl(backgroundData.staticUrl || backgroundData.url);
            }
            mergeIntoProfileCache(canonicalUsername, { 
              backgroundUrl: backgroundData.url || null,
              backgroundAnimatedUrl: backgroundData.animatedUrl || null,
              backgroundStaticUrl: backgroundData.staticUrl || backgroundData.url || null,
            });
          }
        } catch {
          // Игнорируем ошибки фоновой загрузки
        }
      };
      
      // Для мобильных - загружаем фон в фоне, для десктопа - сразу
      if (isMobileDevice()) {
        loadBackground(); // Неблокирующая загрузка
      } else {
        await loadBackground(); // Ждём загрузки
      }

      // Оптимизация для мобильных устройств: загружаем критичные данные сразу,
      // а некритичные - в фоне или по требованию
      const isMobile = isMobileDevice();
      
      if (isMobile) {
        // Для мобильных: сначала только watching/favorite (видны сразу на графике)
        await Promise.all([
          fetchWatchingAnime(canonicalUsername),
          fetchFavoriteAnime(canonicalUsername),
        ]);
        
        // Выключаем загрузку сразу, чтобы показать UI
        setIsLoading(false);
        
        // Остальные данные загружаем в фоне (неблокирующе)
        Promise.all([
          fetchRecentActivity(canonicalUsername),
          fetchFriends(canonicalUsername, !!isOwnProfile),
          fetchUserReviews(canonicalUsername)
        ]).catch(() => {
          // Игнорируем ошибки фоновой загрузки
        });
      } else {
        // Для десктопа: загружаем всё сразу как раньше
        await Promise.all([
          fetchWatchingAnime(canonicalUsername),
          fetchFavoriteAnime(canonicalUsername),
          fetchRecentActivity(canonicalUsername),
          fetchFriends(canonicalUsername, !!isOwnProfile),
          fetchUserReviews(canonicalUsername)
        ]);
      }

    } catch {
      setUserName('Ошибка');
      setUserDescription('Ошибка загрузки профиля');
      setIsVerified(false);
    } finally {
      // Для мобильных setIsLoading(false) уже вызван ранее,
      // для десктопа вызываем здесь
      if (!isMobileDevice()) {
        setIsLoading(false);
      }
      // финальная пометка о полной загрузке
      const cache = getProfileCache();
      const current = cache.get(canonicalUsername)?.data || {};
      cache.set(canonicalUsername, { data: current, lastUpdated: Date.now(), fullyLoaded: true });
    }
  }, [token, fetchWatchingAnime, fetchFavoriteAnime, fetchRecentActivity, fetchFriends, fetchUserReviews, isOwnProfile, mergeIntoProfileCache]);

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
    avatarStaticUrl,
    bannerAnimatedUrl,
    bannerStaticUrl,
    backgroundAnimatedUrl,
    backgroundStaticUrl,
    profileColorScheme,
    profileColor1,
    profileColor2,
    isOwnProfile: !!isOwnProfile,
    isLoading,
    isVerified,
    watchingAnime,
    favoriteAnime,
    recentActivity,
    friends,
    incoming,
    incomingCount,
    userReviews,
    refresh: fetchProfile,
    badges,
    canonicalUsername,
    isBanned,
    banReason,
    banStartDate,
    banEndDate,
    isPermanentBan,
    isMuted,
    muteReason,
    muteEndDate,
  };
}

// Экспортируемая утилита для обновления кэша профиля частичными данными
export function updateProfileCache(username: string, partial: Partial<{
  userName: string;
  userDescription: string | null;
  userRoles: string[];
  avatarUrl: string | null;
  bannerUrl: string | null;
  backgroundUrl: string | null;
  avatarAnimatedUrl: string | null;
  avatarStaticUrl: string | null;
  bannerAnimatedUrl: string | null;
  bannerStaticUrl: string | null;
  backgroundAnimatedUrl: string | null;
  backgroundStaticUrl: string | null;
  isVerified: boolean;
  watchingAnime: WatchingItem[];
  favoriteAnime: FavoriteItem[];
  recentActivity: Record<string, unknown>[];
  friends: Friend[];
  incoming: Friend[];
  incomingCount: number;
  userReviews: UserReview[];
  badges: string[];
  canonicalUsername: string;
}>) {
  if (!globalThis.__profilePageCache) {
    globalThis.__profilePageCache = new Map<string, ProfileCacheEntry>();
  }
  const profileCache = globalThis.__profilePageCache;
  const current: ProfileCacheData = (profileCache.get(username)?.data || {}) as ProfileCacheData;
  const merged: ProfileCacheData = { ...current, ...partial } as ProfileCacheData;
  profileCache.set(username, { data: merged, lastUpdated: Date.now(), fullyLoaded: true });
}
