// src/utils/player/api.ts

import { Episode } from './types';
import {API_SERVER, KODIK_API_BASE, KODIK_API_TOKEN} from "../../tools/constants";

// Функция для получения эпизодов аниме
export const fetchEpisodes = async (animeId: string): Promise<Episode[]> => {
    const response = await fetch(`${API_SERVER}/api/libria/episodes/${animeId}`);
    const data = await response.json();
    return data;
};

// src/utils/player/api.ts

export const fetchKodikPlayerData = async (animeId: string) => {
    try {
        // 1. Получаем данные о аниме по ID
        const animeResponse = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
        const animeData = await animeResponse.json();

        // 2. Извлекаем значение kodik из данных аниме
        const kodikTitle = animeData.kodik;
        if (!kodikTitle) {
            console.error('Кодик не найден для этого аниме');
            return null;
        }

        // 3. Отправляем запрос к API Kodik с использованием kodikTitle
        const res = await fetch(`${KODIK_API_BASE}/search?token=${KODIK_API_TOKEN}&title=${encodeURIComponent(kodikTitle)}`);
        const data = await res.json();
        const link = data.results?.[0]?.link;

        return link;
    } catch (e) {
        console.error('Ошибка при получении данных Kodik:', e);
        return null; // Возвращаем null в случае ошибки
    }
};
