import { useEffect, useState } from 'react';
import { API_SERVER, KODIK_API_BASE, KODIK_API_TOKEN } from '@/hosts/constants';
import { AnimeInfo } from "./anime-structure/anime-data-info";

export type PlayerType = 'kodik' | 'anicat' | 'kinescope';

export interface LibriaEpisode {
    ordinal: number;
    title: string;
    hls_1080?: string;
    hls_720?: string;
    hls_480?: string;
}

export interface PlayerData {
    selectedPlayer: PlayerType;
    setSelectedPlayer: (val: PlayerType) => void;
    selectedEpisode: number;
    setSelectedEpisode: (val: number) => void;
    availableEpisodes: LibriaEpisode[]; // Теперь тип должен быть объектами типа LibriaEpisode
    libriaUrl: string;
    kodikIframeUrl: string;
    kinescopeEmbedId: string;
}

export const usePlayerData = (
    animeId: number,
    anime: AnimeInfo,
    selectedPlayer: PlayerType,
    selectedEpisode: number,
    setSelectedEpisode: (val: number) => void
): PlayerData => {
    const [availableEpisodes, setAvailableEpisodes] = useState<LibriaEpisode[]>([]); // Правильный тип состояния

    const [libriaUrl, setLibriaUrl] = useState<string>('');
    const [kodikIframeUrl, setKodikIframeUrl] = useState<string>('');
    const [kinescopeEmbedId, setKinescopeEmbedId] = useState<string>('');
    const [currentPlayer, setCurrentPlayer] = useState<PlayerType>(selectedPlayer);

    // Проверка animeId перед использованием
    useEffect(() => {
        if (!animeId || isNaN(animeId)) {
            console.error('Invalid animeId:', animeId); // Логирование ошибки
            return; // Прерываем выполнение, если animeId некорректно
        }

        // Kodik
        if (anime?.kodik) {
            const fetchKodik = async () => {
                try {
                    const res = await fetch(`${KODIK_API_BASE}/search?token=${KODIK_API_TOKEN}&title=${encodeURIComponent(anime.kodik)}`);
                    const data = await res.json();
                    const link = data.results?.[0]?.link;
                    if (link) setKodikIframeUrl(link);
                } catch (e) {
                    console.error('Ошибка Kodik:', e);
                }
            };
            fetchKodik();
        }

        // AniLibria
        if (currentPlayer === 'anicat') {
            const fetchLibria = async () => {
                try {
                    const res = await fetch(`${API_SERVER}/api/libria/episodes/${animeId}`);
                    if (!res.ok) return;

                    const data: LibriaEpisode[] = await res.json();
                    if (!data || data.length === 0) return;

                    // Логируем полученные эпизоды и ссылки на видео
                    console.log('Полученные эпизоды и их ссылки на видео:');
                    data.forEach((episode, index) => {
                        console.log(`Эпизод ${index + 1}:`);
                        console.log('Название:', episode.title);
                        console.log('Ссылки на видео:');
                        console.log('HLS 1080p:', episode.hls_1080);
                        console.log('HLS 720p:', episode.hls_720);
                        console.log('HLS 480p:', episode.hls_480);
                    });

                    // Обновляем список эпизодов с ссылками на видео в разных качествах
                    setAvailableEpisodes(data);

                    // Устанавливаем ссылку на видео для первого эпизода (при наличии)
                    setLibriaUrl(data[0]?.hls_1080 || data[0]?.hls_720 || data[0]?.hls_480 || '');

                } catch (e) {
                    console.error('Ошибка Libria:', e);
                }
            };

            fetchLibria();
        }


        // Kinescope
        if (currentPlayer === 'kinescope' && anime?.title) {
            const fetchKinescope = async () => {
                try {
                    const res = await fetch(`${API_SERVER}/api/kinescope/search-playlist?title=${encodeURIComponent(anime.title)}`);
                    const data = await res.json();
                    const embedLink = data?.data?.[0]?.embed_link;
                    if (embedLink) {
                        const embedId = embedLink.split('/embed/')[1];
                        setKinescopeEmbedId(embedId);
                    }
                } catch (e) {
                    console.error('Ошибка Kinescope:', e);
                }
            };
            fetchKinescope();
        }
    }, [animeId, anime, selectedEpisode, currentPlayer]);

    return {
        selectedPlayer: currentPlayer,
        setSelectedPlayer: setCurrentPlayer,
        selectedEpisode,
        setSelectedEpisode,
        availableEpisodes,  // Теперь это массив объектов типа LibriaEpisode
        libriaUrl,
        kodikIframeUrl,
        kinescopeEmbedId,
    };
};
