'use client';

import {API_SERVER} from '@/hosts/constants';

export const fetchCoverUrl = async (animeId: number, coverId?: number): Promise<string> => {
    try {
        if (coverId) {
            // Пытаемся загрузить конкретную обложку
            const coverRes = await fetch(`${API_SERVER}/api/stream/anime/${animeId}/cover/${coverId}`);
            if (coverRes.ok) {
                const blob = await coverRes.blob();
                return URL.createObjectURL(blob);
            }
        }
        
        // Fallback: пытаемся загрузить первую доступную обложку
        const coverRes = await fetch(`${API_SERVER}/api/stream/${animeId}/cover`);
        if (coverRes.ok) {
            const blob = await coverRes.blob();
            return URL.createObjectURL(blob);
        }
        
        throw new Error('Обложка не найдена');
    } catch (error) {
        console.error(`Ошибка при получении обложки для аниме ID=${animeId}:`, error);
        return '';
    }
};

// Новая функция для быстрой загрузки обложки без метаданных
export const fetchCoverBlob = async (animeId: number): Promise<string> => {
    try {
        const coverRes = await fetch(`${API_SERVER}/api/stream/${animeId}/cover`);
        if (coverRes.ok) {
            const blob = await coverRes.blob();
            return URL.createObjectURL(blob);
        }
        throw new Error('Обложка не найдена');
    } catch (error) {
        console.error(`Ошибка при получении обложки для аниме ID=${animeId}:`, error);
        return '';
    }
};
