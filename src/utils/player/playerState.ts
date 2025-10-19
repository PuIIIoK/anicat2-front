/**
 * Утилиты для сохранения и получения состояния плеера
 */

export interface PlayerState {
    episode?: number;
    source?: 'kodik' | 'libria';
    voice?: string;
    time?: number;
}

const PLAYER_STATE_KEY = 'anicat-player-state';

/**
 * Сохранить состояние плеера для конкретного аниме
 */
export function savePlayerState(animeId: string, state: PlayerState): void {
    try {
        const allStates = getAllPlayerStates();
        allStates[animeId] = {
            ...allStates[animeId],
            ...state,
            updatedAt: Date.now()
        };
        localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(allStates));
    } catch (error) {
        console.warn('Failed to save player state:', error);
    }
}

/**
 * Получить состояние плеера для конкретного аниме
 */
export function getPlayerState(animeId: string): PlayerState | null {
    try {
        const allStates = getAllPlayerStates();
        return allStates[animeId] || null;
    } catch (error) {
        console.warn('Failed to get player state:', error);
        return null;
    }
}

/**
 * Получить все состояния плееров
 */
function getAllPlayerStates(): Record<string, PlayerState & { updatedAt?: number }> {
    try {
        const stored = localStorage.getItem(PLAYER_STATE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.warn('Failed to parse player states:', error);
        return {};
    }
}

/**
 * Очистить старые состояния (старше 30 дней)
 */
export function cleanupOldPlayerStates(): void {
    try {
        const allStates = getAllPlayerStates();
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        Object.keys(allStates).forEach(animeId => {
            const state = allStates[animeId];
            if (state.updatedAt && state.updatedAt < thirtyDaysAgo) {
                delete allStates[animeId];
            }
        });
        
        localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(allStates));
    } catch (error) {
        console.warn('Failed to cleanup old player states:', error);
    }
}
