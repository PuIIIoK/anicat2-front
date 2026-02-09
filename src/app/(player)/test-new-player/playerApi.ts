import { API_SERVER } from '@/hosts/constants';

// --- DTO / response interfaces ---
export interface AnimeMeta {
    // Для внешних источников (Kodik)
    kodik?: string;
    alias?: string;

    // Для источника Yumeko
    source?: 'kodik' | 'yumeko' | 'libria';
    voiceId?: number;
    voiceName?: string;
    episodeId?: number;
    episodeNumber?: number;

    // Общие поля
    title?: string;
    name?: string;
    ru?: string;
    en?: string;
    coverUrl?: string;
    season?: string;
    [key: string]: unknown;
}

export interface KodikTranslation {
    title?: string;
    name?: string;
    [key: string]: unknown;
}

export interface KodikSearchItem {
    translations?: KodikTranslation[];
    translation?: KodikTranslation | unknown;
    episodes?: unknown[];
    list?: unknown[];
    seasons?: Record<string, unknown>;
    [key: string]: unknown;
}

export type KodikSearchResult = KodikSearchItem[] | { items?: KodikSearchItem[]; results?: KodikSearchItem[] };

export interface KodikSegment {
    start: number;
    end: number;
}

export interface KodikSegments {
    ad?: KodikSegment[];
    skip?: KodikSegment[];
}

export interface KodikStreamResponse {
    links?: Record<string, { Src?: string } | unknown>;
    link?: string;
    hls?: string;
    url?: string;
    segments?: KodikSegments;
    [key: string]: unknown;
}

export interface LibriaEpisode {
    id?: string;
    ordinal?: number | string;
    number?: number | string;
    name?: string;
    duration?: number | string;
    hls_480?: string;
    hls_720?: string;
    hls_1080?: string;
    preview?: {
        src?: string;
        thumbnail?: string;
        optimized?: {
            src?: string;
            thumbnail?: string;
        };
    };
    opening?: {
        start?: number | null;
        stop?: number | null;
    };
    ending?: {
        start?: number | null;
        stop?: number | null;
    };
    [key: string]: unknown;
}

export interface ProgressEntryDto {
    id?: number | null;
    userId?: number | null;
    animeId: string;
    source: string;
    voice?: string | null;
    episodeId: number;
    time?: number | null;
    duration?: number | null;
    updatedAt?: number | null;
    opened?: boolean | null;
}

export async function fetchPlayerHls(animeId: string, source: 'kodik' | 'libria' | 'yumeko' = 'kodik'): Promise<string | null> {
    // Kept for backward compatibility but prefer specialized endpoints below
    // For Yumeko, return null as it uses episode-specific streams
    if (source === 'yumeko') {
        return null;
    }

    try {
        const res = await fetch(`${API_SERVER}/api/player/${source}/${animeId}`);
        if (!res.ok) {
            console.error('Failed to fetch player HLS', res.status);
            return null;
        }
        const data = await res.json();
        return data.src ?? data.url ?? data.hls ?? null;
    } catch (err) {
        console.error('fetchPlayerHls error', err);
        return null;
    }
}

export async function fetchAnimeMeta(animeId: string): Promise<AnimeMeta | null> {
    try {
        const res = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
        if (!res.ok) return null;
        return await res.json() as AnimeMeta;
    } catch (err) {
        console.error('fetchAnimeMeta error', err);
        return null;
    }
}

export async function fetchAnimeMetaWithStatus(animeId: string): Promise<{ status: number; data: AnimeMeta | null }> {
    try {
        const res = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
        const status = res.status;
        const data = res.ok ? await res.json() as AnimeMeta : null;
        return { status, data };
    } catch (err) {
        console.error('fetchAnimeMetaWithStatus error', err);
        return { status: 0, data: null };
    }
}

export async function fetchKodikSearch(title: string): Promise<KodikSearchResult | null> {
    try {
        const res = await fetch(`${API_SERVER}/api/kodik/anime/search?title=${encodeURIComponent(title)}`);
        if (!res.ok) return null;
        return await res.json() as KodikSearchResult;
    } catch (err) {
        console.error('fetchKodikSearch error', err);
        return null;
    }
}

export async function fetchKodikStream(anime: string, translation: string, episode: number | string, skipSegments = false): Promise<KodikStreamResponse | null> {
    try {
        let url = `${API_SERVER}/api/kodik/anime/stream?anime=${encodeURIComponent(anime)}&translation=${encodeURIComponent(translation)}&episode=${episode}`;
        if (skipSegments) {
            url += '&skip_segments=true';
        }
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json() as KodikStreamResponse;
    } catch (err) {
        console.error('fetchKodikStream error', err);
        return null;
    }
}

// Response from our server's libria endpoint
interface LibriaApiResponse {
    apiUrl?: string;
    alias?: string;
}

// Full response from Libria API
interface LibriaFullResponse {
    episodes?: LibriaEpisode[];
    alias?: string;
    [key: string]: unknown;
}

export async function fetchLibriaEpisodes(animeId: string): Promise<LibriaEpisode[] | null> {
    try {
        // Step 1: Get apiUrl from our server
        const res = await fetch(`${API_SERVER}/api/libria/episodes/${encodeURIComponent(animeId)}`);
        if (!res.ok) return null;

        const data = await res.json() as LibriaApiResponse;

        if (!data.apiUrl) {
            console.error('fetchLibriaEpisodes: no apiUrl in response');
            return null;
        }

        // Step 2: Fetch full data from Libria API
        const libriaRes = await fetch(data.apiUrl);
        if (!libriaRes.ok) return null;

        const libriaData = await libriaRes.json() as LibriaFullResponse;

        if (libriaData.episodes && Array.isArray(libriaData.episodes)) {
            return libriaData.episodes;
        }

        return null;
    } catch (err) {
        console.error('fetchLibriaEpisodes error', err);
        return null;
    }
}

export async function fetchKodikEpisodesFromSearch(searchResponse: unknown): Promise<KodikSearchItem[]> {
    // Try to extract episodes list from common Kodik search result shapes
    if (!searchResponse) return [];
    if (Array.isArray(searchResponse)) return searchResponse as KodikSearchItem[];
    const sr = searchResponse as Record<string, unknown>;
    const items = sr.items as KodikSearchItem[] | undefined;
    if (Array.isArray(items)) return items;
    const results = sr.results as KodikSearchItem[] | undefined;
    if (Array.isArray(results)) return results;
    return [];
}

// --- Player progress API ---
function getLocalToken() {
    try {
        // Prefer token in localStorage (dev) then fallback to cookie values
        const local = localStorage.getItem('token') || localStorage.getItem('auth.token');
        if (local) return local;
        const nameCandidates = ['auth.token', 'token'];
        const cookies = document.cookie;
        if (!cookies) return null;
        for (const name of nameCandidates) {
            const match = cookies.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]+)'));
            if (match && match[1]) return decodeURIComponent(match[1]);
        }
        return null;
    } catch { return null; }
}

export async function fetchProgressForAnime(animeId: string): Promise<ProgressEntryDto[]> {
    try {
        const token = getLocalToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_SERVER}/api/player/progress?animeId=${encodeURIComponent(animeId)}`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });
        if (!res.ok) return [];
        return await res.json() as ProgressEntryDto[];
    } catch (err) {
        console.error('fetchProgressForAnime error', err);
        return [];
    }
}

// Получить последний просмотренный эпизод для аниме
export async function fetchLastWatchedProgress(animeId: string): Promise<ProgressEntryDto | null> {
    try {
        const allProgress = await fetchProgressForAnime(animeId);
        if (allProgress.length === 0) return null;

        // Находим запись с самым поздним updatedAt
        const sorted = allProgress.sort((a, b) => {
            const timeA = a.updatedAt || 0;
            const timeB = b.updatedAt || 0;
            return timeB - timeA;
        });

        return sorted[0];
    } catch (err) {
        console.error('fetchLastWatchedProgress error', err);
        return null;
    }
}

export async function upsertProgressEntry(entry: Partial<ProgressEntryDto>): Promise<ProgressEntryDto | null> {
    try {
        const token = getLocalToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_SERVER}/api/player/progress/upsert`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(entry)
        });
        if (!res.ok) return null;
        return await res.json() as ProgressEntryDto;
    } catch (err) {
        console.error('upsertProgressEntry error', err);
        return null;
    }
}

export async function upsertProgressBulk(entries: Array<Partial<ProgressEntryDto>>): Promise<ProgressEntryDto[] | null> {
    try {
        const token = getLocalToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_SERVER}/api/player/progress/bulk`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(entries)
        });
        if (!res.ok) return null;
        return await res.json() as ProgressEntryDto[];
    } catch (err) {
        console.error('upsertProgressBulk error', err);
        return null;
    }
}

// --- Yumeko API ---

export interface YumekoVoice {
    id: number;
    animeId: number;
    name: string;
    voiceType: string;
    language: string;
    episodesCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface YumekoEpisode {
    id: number;
    voiceId: number;
    episodeNumber: number;
    title: string | null;
    durationSeconds: number;
    maxQuality: string;
    screenshotPath: string | null;
    videoStatus: string;
    conversionProgress: number | null;
    hlsBasePath: string;
}

// Получить список готовых озвучек для аниме
export async function fetchYumekoVoices(animeId: string): Promise<YumekoVoice[] | null> {
    try {
        const res = await fetch(`${API_SERVER}/api/yumeko/anime/${animeId}/voices`);
        if (!res.ok) return null;
        return await res.json() as YumekoVoice[];
    } catch (err) {
        console.error('fetchYumekoVoices error', err);
        return null;
    }
}

// Получить список готовых эпизодов для озвучки
export async function fetchYumekoEpisodes(voiceId: number): Promise<YumekoEpisode[] | null> {
    try {
        const res = await fetch(`${API_SERVER}/api/yumeko/voices/${voiceId}/episodes`);
        if (!res.ok) return null;
        return await res.json() as YumekoEpisode[];
    } catch (err) {
        console.error('fetchYumekoEpisodes error', err);
        return null;
    }
}

// Получить HLS ссылку для конкретного эпизода Yumeko
export async function fetchYumekoEpisodeStream(episodeId: number): Promise<string | null> {
    try {
        const res = await fetch(`${API_SERVER}/api/yumeko/episodes/${episodeId}/stream`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.hlsUrl || data.url || null;
    } catch (err) {
        console.error('fetchYumekoEpisodeStream error', err);
        return null;
    }
}


