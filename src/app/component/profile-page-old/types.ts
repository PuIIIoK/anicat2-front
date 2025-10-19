export interface DecodedToken {
  sub: string;
  username?: string;
  [key: string]: unknown;
}

export interface UserProfileResponse {
  userId: number;
  username: string;
  roles: string[];
  profileId: number;
  nickname: string | null;
  bio: string | null;
  avatarId: string | null;
  bannerId: string | null;
  verified: boolean;
  badges?: string[];
}

export interface Friend {
  id: number;
  // отображаемое имя
  name: string;
  quote?: string;
  avatar?: string;
  banner?: string;
  // данные с бэка (дополнительно)
  username?: string;
  nickname?: string | null;
  roles?: string[];
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  avatarAnimatedUrl?: string | null;
  bannerAnimatedUrl?: string | null;
  profileColor1?: string | null;
  profileColor2?: string | null;
  verified?: boolean;
}

export interface ProfileAnimeItem {
  id: number;
  title: string;
  coverUrl: string;
  year: string | number;
  /** Отформатированный текст сезона, например "1 сезон" */
  seasonLabel: string;
  /** Текст анонса, если есть (только когда реально анонс) */
  progressText?: string;
  /** Текущий/общий прогресс эпизодов */
  currentEpisodes?: number;
  totalEpisodes?: number;
  /** Прогресс по озвучкам */
  voiceProgress?: Record<string, number>;
  /** Детали прогресса просмотра */
  progressDetails?: ProgressDetail[];
}

export interface ProgressDetail {
  id: number;
  userId: number;
  animeId: string;
  source: string;
  voice?: string;
  episodeId: number;
  time?: number;
  duration?: number;
  updatedAt?: number;
  opened?: boolean;
}

// Совместимость старых имён типов (оба блока используют единый тип карточки)
export type WatchingItem = ProfileAnimeItem;
export type FavoriteItem = ProfileAnimeItem;

export interface UserReview {
  id: number;
  score: number;
  animeTitle: string;
  animeId: number;
  comment: string;
  coverUrl: string;
  createdAt: string; // Дата создания отзыва
}


