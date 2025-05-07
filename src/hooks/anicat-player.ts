// src/hooks/anicat-player.ts
"use client"

import { useState, useEffect } from 'react';
import Hls from 'hls.js';
import { Episode } from './player/types'; // Путь к типам
import { fetchEpisodes } from './player/api'; // Путь к функции для получения эпизодов

// Экспортируем хук
export const useAnimePlayer = (animeId: string) => {
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
    const [selectedQuality, setSelectedQuality] = useState<'480' | '720' | '1080'>('720');
    const [videoSrc, setVideoSrc] = useState<string>('');

    // Загружаем данные эпизодов при изменении animeId
    useEffect(() => {
        const fetchData = async () => {
            const data = await fetchEpisodes(animeId);
            setEpisodes(data);
            if (data.length > 0) {
                setSelectedEpisode(data[0]); // Выбираем первый эпизод по умолчанию
            }
        };

        fetchData();
    }, [animeId]);

    // Обновляем ссылку на видео при изменении эпизода или качества
    useEffect(() => {
        if (selectedEpisode) {
            switch (selectedQuality) {
                case '480':
                    setVideoSrc(selectedEpisode.hls_480);
                    break;
                case '720':
                    setVideoSrc(selectedEpisode.hls_720);
                    break;
                case '1080':
                    setVideoSrc(selectedEpisode.hls_1080);
                    break;
                default:
                    setVideoSrc(selectedEpisode.hls_720);
            }
        }
    }, [selectedEpisode, selectedQuality]);

    // Инициализируем HLS.js для воспроизведения видео
    useEffect(() => {
        const video = document.getElementById('anime-video') as HTMLVideoElement;
        if (Hls.isSupported() && videoSrc) {
            const hls = new Hls();
            hls.loadSource(videoSrc);
            hls.attachMedia(video);
            return () => {
                hls.destroy();
            };
        }
    }, [videoSrc]);

    const handleQualityChange = (quality: '480' | '720' | '1080') => {
        setSelectedQuality(quality);
    };

    const handleEpisodeChange = (episode: Episode) => {
        setSelectedEpisode(episode);
    };

    return {
        episodes,
        selectedEpisode,
        selectedQuality,
        videoSrc,
        handleQualityChange,
        handleEpisodeChange,
    };
};
