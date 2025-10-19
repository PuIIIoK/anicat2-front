/**
 * Утилита для работы с токенами авторизации через localStorage и куки браузера
 */

/**
 * Получает токен авторизации из localStorage или куки браузера
 * @returns токен или null если не найден
 */
export const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null; // SSR guard
    
    // Приоритет localStorage для постоянного хранения
    const localToken = localStorage.getItem('token');
    if (localToken) {
        return localToken;
    }
    
    // Fallback на cookies для совместимости
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
        if (match) {
            const cookieToken = match[1];
            // Сохраняем в localStorage для постоянного хранения
            localStorage.setItem('token', cookieToken);
            return cookieToken;
        }
    }
    
    return null;
};

/**
 * Сохраняет токен авторизации в localStorage и cookies
 * @param token токен для сохранения
 */
export const setAuthToken = (token: string): void => {
    if (typeof window === 'undefined') return; // SSR guard
    
    // Сохраняем в localStorage для постоянного хранения
    localStorage.setItem('token', token);
    
    // Также сохраняем в cookies с длительным сроком действия
    if (typeof document !== 'undefined') {
        const maxAge = 365 * 24 * 60 * 60; // 1 год в секундах
        document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
};

/**
 * Удаляет токен авторизации из localStorage и cookies
 */
export const removeAuthToken = (): void => {
    if (typeof window === 'undefined') return; // SSR guard
    
    // Удаляем из localStorage
    localStorage.removeItem('token');
    
    // Удаляем из cookies
    if (typeof document !== 'undefined') {
        document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    }
};

/**
 * Проверяет наличие токена авторизации
 * @returns true если токен найден
 */
export const isAuthenticated = (): boolean => {
    return !!getAuthToken();
};

/**
 * Проверяет наличие токена авторизации
 * @returns true если токен есть, false если нет
 */
export const hasToken = (): boolean => {
    return !!getAuthToken();
};

/**
 * Интерфейс для данных пользователя из JWT токена
 */
export interface CurrentUser {
    id: number;
    username: string;
    roles?: string;
}

/**
 * Декодирует JWT токен и извлекает информацию о текущем пользователе
 * @returns информация о пользователе или null
 */
export const getCurrentUser = (): CurrentUser | null => {
    const token = getAuthToken();
    if (!token) return null;

    try {
        // JWT токен состоит из 3 частей разделенных точкой: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // Декодируем payload (вторая часть)
        const payload = parts[1];
        const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

        return {
            id: decodedPayload.userId || decodedPayload.id || null,
            username: decodedPayload.sub || decodedPayload.username || null,
            roles: decodedPayload.roles || null,
        };
    } catch (error) {
        console.error('Ошибка декодирования JWT токена:', error);
        return null;
    }
};