'use client';

import {API_SERVER} from '@/hosts/constants';

export interface AudioOption {
    url: string;
    id: number;
    name: string;
}

export interface AnimeEpisode {
    id: number;
    title: string;
    availableLanguages: AudioOption[];
    url: string;
    duration: string;
    watched: boolean;
    thumbnailUrl?: string;
    releaseDate?: string;
    language: string;
}


export interface AnimeEpisodeData {
    animeId: number;
    episodes: AnimeEpisode[];
}

// Новый способ загрузки данных по API
export const fetchAnimeEpisodes = async (animeId: number): Promise<AnimeEpisode[]> => {
    try {
        const response = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}/episodes`);
        if (!response.ok) {
            throw new Error('Ошибка при получении эпизодов');
        }
        const episodesData = await response.json();

        // Загружаем озвучки для каждого эпизода
        const episodesWithAudio = await Promise.all(
            episodesData.map(async (episode: { id: number; title: string }) => {
                try {
                    const audioResponse = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}/episodes/${episode.id}/language`);
                    const audioData = await audioResponse.json();
                    return {
                        ...episode,
                        availableLanguages: audioData || [],
                    };
                } catch (err) {
                    console.error(`Ошибка при загрузке озвучек для эпизода ${episode.id}:`, err);
                    return {
                        ...episode,
                        availableLanguages: [],
                    };
                }
            })
        );

        return episodesWithAudio;
    } catch (error) {
        console.error('Ошибка загрузки эпизодов:', error);
        return [];
    }
};