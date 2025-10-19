import { useState, useEffect, useCallback } from 'react';
import { API_SERVER } from '../../../tools/constants';

interface Screenshot {
    id: number;
    url: string;
    name: string;
}

interface UseLazyScreenshotsReturn {
    screenshots: Screenshot[];
    isLoading: boolean;
    error: string | null;
    loadScreenshots: () => void;
}

const screenshotsCache = new Map<number, Screenshot[]>();

export const useLazyScreenshots = (animeId: number | null): UseLazyScreenshotsReturn => {
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadScreenshots = useCallback(async () => {
        if (!animeId || isLoading) return;

        // Проверяем кэш
        if (screenshotsCache.has(animeId)) {
            const cachedScreenshots = screenshotsCache.get(animeId) || [];
            setScreenshots(cachedScreenshots);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `${API_SERVER}/api/anime/optimized/get-anime/${animeId}/screenshots-urls`
            );

            if (res.ok) {
                const data: Screenshot[] = await res.json();
                setScreenshots(data);
                screenshotsCache.set(animeId, data);
            } else {
                setScreenshots([]);
                screenshotsCache.set(animeId, []);
            }
        } catch (err) {
            console.error('Ошибка загрузки скриншотов:', err);
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
            setScreenshots([]);
        } finally {
            setIsLoading(false);
        }
    }, [animeId, isLoading]);

    // Очистка при изменении animeId
    useEffect(() => {
        if (animeId) {
            setScreenshots([]);
            setError(null);
        }
    }, [animeId]);

    return {
        screenshots,
        isLoading,
        error,
        loadScreenshots
    };
};

// Очистка кэша скриншотов
export const clearScreenshotsCache = () => {
    screenshotsCache.clear();
};
