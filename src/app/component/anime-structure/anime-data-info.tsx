'use client';

import { API_SERVER } from '@/hosts/constants';

export interface AnimeEpisode {
    title: string;
    link?: string;
}

export interface AnimeInfo {
    id: number;
    coverId?: number;
    status: string;
    title: string;
    alttitle: string;
    episode_all: string;
    current_episode: string;
    rating: string;
    image_url: { url: string };
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
    kinescopeVideoId?: string;
    alias: string;
    kodik: string;
    coverUrl: string;
    bannerUrl: string;
    zametka: string;
    anons: string;           // новое поле
    opened: boolean;         // новое поле
    blockedCountries: string[] | null;
    
    // Поддержка разных форматов cover
    cover?: {
        id: number;
        name?: string;
    };

    note?: string;           // новое поле — заметки (опционально)
    blocked_note?: string;   // новое поле — причина блокировки (опционально)
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
    cover: { id: number; name: string };
    allowedCountries: string[] | null;
    anons?: string;         // возможно отсутствует, поэтому опционально
    opened?: boolean;       // возможно отсутствует, поэтому опционально

    // Новые поля, которые могут отсутствовать
    note?: string;
    blockedCountries: string;
    blocked_note?: string;
}


import { fetchCoverUrl } from '../fetch-cover-url';

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
                blockedCountries: (anime.blockedCountries && anime.blockedCountries.length > 0) ? anime.blockedCountries : null,
                anons: anime.anons || '',    // новое поле с дефолтом
                opened: anime.opened ?? true, // новое поле с дефолтом

                // Добавляем новые поля с дефолтами
                note: anime.note || '',
                blocked_where: anime.blockedCountries || '',
                blocked_note: anime.blocked_note || '',
            } as AnimeInfo;
        })
    );

    return animeWithCovers;
};
