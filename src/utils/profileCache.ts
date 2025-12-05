// Глобальный кэш для профиля пользователя
// Предотвращает множественные запросы к /api/auth/get-profile

import { API_SERVER } from '@/hosts/constants';

interface ProfileData {
    username: string;
    roles: string[];
    [key: string]: unknown;
}

interface CacheEntry {
    data: ProfileData | null;
    timestamp: number;
    error?: boolean;
}

declare global {
    // eslint-disable-next-line no-var
    var __profileCache: CacheEntry | undefined;
    // eslint-disable-next-line no-var
    var __profilePendingRequest: Promise<ProfileData | null> | undefined;
}

const CACHE_TTL = 30 * 1000; // 30 секунд

function getAuthToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(^|;\s*)token=([^;]*)/);
    return match?.[2] || null;
}

/**
 * Получает профиль пользователя с кэшированием.
 * Все компоненты должны использовать эту функцию вместо прямых fetch запросов.
 */
export async function getProfile(forceRefresh = false): Promise<ProfileData | null> {
    const token = getAuthToken();
    if (!token) {
        globalThis.__profileCache = undefined;
        return null;
    }

    // Проверяем кэш
    const cached = globalThis.__profileCache;
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL && !cached.error) {
        return cached.data;
    }

    // Если уже есть pending запрос - ждём его
    if (globalThis.__profilePendingRequest) {
        return globalThis.__profilePendingRequest;
    }

    // Создаём новый запрос
    globalThis.__profilePendingRequest = (async () => {
        try {
            const res = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                globalThis.__profileCache = {
                    data,
                    timestamp: Date.now(),
                };
                return data;
            } else {
                globalThis.__profileCache = {
                    data: null,
                    timestamp: Date.now(),
                    error: true,
                };
                return null;
            }
        } catch {
            globalThis.__profileCache = {
                data: null,
                timestamp: Date.now(),
                error: true,
            };
            return null;
        } finally {
            globalThis.__profilePendingRequest = undefined;
        }
    })();

    return globalThis.__profilePendingRequest;
}

/**
 * Очищает кэш профиля (например, при logout)
 */
export function clearProfileCache(): void {
    globalThis.__profileCache = undefined;
    globalThis.__profilePendingRequest = undefined;
}

/**
 * Проверяет, авторизован ли пользователь (используя кэш)
 */
export async function isAuthenticated(): Promise<boolean> {
    const profile = await getProfile();
    return profile !== null;
}

/**
 * Проверяет, есть ли у пользователя определённая роль
 */
export async function hasRole(role: string): Promise<boolean> {
    const profile = await getProfile();
    return profile?.roles?.includes(role) ?? false;
}

/**
 * Проверяет, есть ли у пользователя админ/модератор права
 */
export async function hasAdminAccess(): Promise<boolean> {
    const profile = await getProfile();
    const roles = profile?.roles || [];
    return roles.includes('ADMIN') || roles.includes('MODERATOR');
}

