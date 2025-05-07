'use client';

import {API_SERVER} from "../../tools/constants";

export const fetchCoverUrl = async (animeId: number, coverId: number): Promise<string> => {
    try {
        const metaRes = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}/cover/${coverId}`);
        if (!metaRes.ok) throw new Error('Ошибка получения метаданных обложки');

        const meta = await metaRes.json();

        const coverRes = await fetch(`${API_SERVER}/api/stream/anime/${animeId}/cover/${meta.id}`);
        if (!coverRes.ok) throw new Error('Ошибка получения ссылки на обложку');

        const coverData = await coverRes.json();
        return coverData.url;
    } catch (error) {
        console.error(`Ошибка при получении обложки для аниме ID=${animeId}:`, error);
        return '';
    }
};
