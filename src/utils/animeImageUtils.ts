import { API_SERVER } from '../tools/constants';

interface AnimeWithCover {
    id: number;
    cover?: {
        id: number;
    };
    imageUrl?: string;
}

/**
 * Обрабатывает массив аниме и добавляет imageUrl на основе cover.id
 */
export function processAnimeImages<T extends AnimeWithCover>(animeList: T[]): T[] {
    return animeList.map(anime => processAnimeImage(anime));
}

/**
 * Обрабатывает одно аниме и добавляет imageUrl на основе cover.id
 */
export function processAnimeImage<T extends AnimeWithCover>(anime: T): T {
    let imageUrl: string;
    
    if (anime.cover && anime.cover.id) {
        // Формируем URL для stream API: /api/stream/anime/{animeId}/cover/{coverId}
        imageUrl = `${API_SERVER}/api/stream/anime/${anime.id}/cover/${anime.cover.id}`;
    } else {
        // Используем дефолтную обложку если нет cover
        imageUrl = `${API_SERVER}/anime-cover-default.jpg`;
    }
    
    return {
        ...anime,
        imageUrl: imageUrl
    };
}

/**
 * Генерирует URL обложки для аниме по ID
 */
export function generateAnimeImageUrl(animeId: number, coverId?: number): string {
    if (coverId) {
        return `${API_SERVER}/api/stream/anime/${animeId}/cover/${coverId}`;
    } else {
        return `${API_SERVER}/anime-cover-default.jpg`;
    }
}
