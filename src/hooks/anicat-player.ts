// src/hooks/anicat-player.ts

"use client"

import { useState, useEffect } from 'react';
import { fetchEpisodes, fetchKodikPlayerData } from '../utils/player/api';
import Hls from 'hls.js';
import {Episode} from "../utils/player/types"; // Импортируем функции для получения данных

export const useAnimePlayer = (animeId: string) => {
    const [episodes, setEpisodes] = useState<Episode[]>([]); // Стейт для эпизодов
    const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null); // Стейт для выбранного эпизода
    const [selectedQuality, setSelectedQuality] = useState<'480' | '720' | '1080'>('720'); // Стейт для качества
    const [videoSrc, setVideoSrc] = useState<string>(''); // Стейт для ссылки на видео
    const [selectedPlayer, setSelectedPlayer] = useState<string>('my-player'); // Стейт для выбранного плеера
    const [kodikIframeUrl, setKodikIframeUrl] = useState<string>(''); // Стейт для URL плеера Kodik

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

    // Загружаем данные для плеера Kodik, если выбран плеер Kodik
    useEffect(() => {
        if (selectedPlayer === 'kodik') {
            const fetchKodik = async () => {
                const link = await fetchKodikPlayerData(animeId);
                if (link) {
                    setKodikIframeUrl(link); // Устанавливаем ссылку для Kodik
                }
            };
            fetchKodik();
        }
    }, [selectedPlayer, animeId]);

    const handleQualityChange = (quality: '480' | '720' | '1080') => {
        setSelectedQuality(quality); // Меняем качество
    };

    const handleEpisodeChange = (episode: Episode) => {
        setSelectedEpisode(episode); // Меняем эпизод
    };

    const handlePlayerChange = (player: string) => {
        setSelectedPlayer(player); // Меняем плеер
    };

    return {
        episodes,
        selectedEpisode,
        selectedQuality,
        videoSrc,
        selectedPlayer,
        kodikIframeUrl,
        handleQualityChange,
        handleEpisodeChange,
        handlePlayerChange,
    };
};
