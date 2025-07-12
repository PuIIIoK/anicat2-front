'use client';

import { API_SERVER } from "../../../tools/constants";

export interface AnimeEpisode {
    title: string; // Название эпизода
    link?: string;  // Ссылка на эпизод
}

export interface AnimeInfo {
    id: number;
    coverId: number;
    status: string;
    title: string;
    alttitle: string;
    episode_all: string;
    current_episode: string;
    rating: string;
    image_url: { url: string }; // ✅ теперь это объект с полем `url`
    type: string;
    collectionType: string;
    season: string;
    genres: string;
    year: string;
    description: string;
    episodes: AnimeEpisode[];
    screenshots: string[];
    mouth_season: string;
    studio: string;
    realesed_for: string;
    kinescopeVideoId?: string; // ← добавь эту строку
    alias: string;
    kodik: string;
    coverUrl: string;
    bannerUrl: string;
    zametka: string;
}

interface RawAnime {
    id: number;
    status: string;
    title: string;
    alttitle: string;
    episode_all: string;
    current_episode: string;
    rating: string;
    type: string;
    season: string;
    genres: string;
    year: string;
    description: string;
    mouth_season: string;
    studio: string;
    realesed_for: string;
    collectionType: string;
    alias: string;
    kodik: string;
    coverUrl: string;
    bannerUrl: string;
    zametka: string;
    cover: { id: number; name: string }; // ✅ теперь cover берётся отсюда
}

import { fetchCoverUrl } from '../fetch-cover-url';

// Обновленная версия с обязательными значениями для animeInfo
export const fetchAllAnime = async (): Promise<AnimeInfo[]> => {
    const response = await fetch(`${API_SERVER}/api/anime/get-anime`);
    const data: RawAnime[] = await response.json();

    const animeWithCovers = await Promise.all(
        data.map(async (anime: RawAnime) => {
            const animeId = anime.id;
            const coverId = anime.cover?.id ?? 0;

            let imageUrl = '';
            if (coverId > 0) {
                try {
                    imageUrl = await fetchCoverUrl(animeId, coverId);
                } catch (error) {
                    console.error('Ошибка при загрузке изображения:', error);
                }
            }

            // Возвращаем объект AnimeInfo с дефолтными значениями
            return {
                id: anime.id,
                coverId,
                image_url: { url: imageUrl },
                status: anime.status || '',
                title: anime.title || '',
                alttitle: anime.alttitle || '',
                episode_all: anime.episode_all || '',
                current_episode: anime.current_episode || '',
                rating: anime.rating || '',
                type: anime.type || '',
                season: anime.season || '',
                genres: anime.genres || '',
                year: anime.year || '',
                description: anime.description || '',
                mouth_season: anime.mouth_season || '',
                studio: anime.studio || '',
                realesed_for: anime.realesed_for || '',
                episodes: [],
                screenshots: [],
                alias: anime.alias || '',
                kodik: anime.kodik || '',
                coverUrl: anime.coverUrl || '',
                bannerUrl: anime.bannerUrl || '',
                zametka: anime.zametka || '',
                collectionType: anime.collectionType || '',
            } as AnimeInfo;
        })
    );

    return animeWithCovers;
};
