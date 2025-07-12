'use client';

import React, { useState, useEffect } from 'react';
import { AnimeEpisode, AudioOption } from './anime-episode-data';
import {API_SERVER} from "../../tools/constants";

interface SelectorProps {
    episodes: AnimeEpisode[];
    selectedEpisode: number;
    selectedAudio: AudioOption;
    onEpisodeChange: (index: number) => void;
    onAudioChange: (audio: AudioOption) => void;
    onFetchVideoUrl?: (url: string) => void;
    animeId: number;
}

const EpisodeAudioSelector: React.FC<SelectorProps> = ({
                                                           episodes,
                                                           selectedEpisode,
                                                           selectedAudio,
                                                           onEpisodeChange,
                                                           onAudioChange,
                                                           onFetchVideoUrl,
                                                           animeId
                                                       }) => {
    const [selectedTab, setSelectedTab] = useState<'episodes' | 'audio'>('episodes');

    const fetchVideoUrl = async () => {
        try {
            const episode = episodes[selectedEpisode];
            const episodeId = episode.id;
            const audioName = selectedAudio.name;

            const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

            // 1. Проверка эпизода
            const epRes = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}/episodes/${episodeId}`);
            if (!epRes.ok) {
                console.warn(`❌ Эпизод ${episodeId} не найден`);
                return;
            }

            // 2. Получаем список озвучек
            const audiosRes = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}/episodes/${episodeId}/language`);
            if (!audiosRes.ok) {
                console.warn(`❌ Ошибка при получении озвучек для эпизода ${episodeId}`);
                return;
            }

            const audioList: AudioOption[] = await audiosRes.json();
            const selectedAudioData = audioList.find((audio) => normalize(audio.name) === normalize(audioName));

            if (!selectedAudioData) {
                console.warn(`⚠️ Озвучка "${audioName}" не найдена в списке`, audioList);
                // Не прерываем, пробуем всё равно
            } else {
                // 3. Проверка озвучки по ID
                const audioId = selectedAudioData.id;
                const audioCheckRes = await fetch(
                    `${API_SERVER}/api/anime/get-anime/${animeId}/episodes/${episodeId}/language/${audioId}`
                );
                if (!audioCheckRes.ok) {
                    console.warn(`⚠️ Озвучка с ID ${audioId} не найдена`);
                }
            }

            // 4. Получаем видео по нормализованному имени
            const videoRes = await fetch(
                `${API_SERVER}/api/stream/anime/${animeId}/episode/${episodeId}/audio-name/${normalize(audioName)}`
            );

            if (!videoRes.ok) {
                console.warn(`❌ Видео не найдено для озвучки "${audioName}"`);
                return;
            }

            const data = await videoRes.json();

            // 5. Устанавливаем URL видео с задержкой
            setTimeout(() => {
                onFetchVideoUrl?.(data.url);
            }, );
        } catch (error) {
            console.error('🚨 Ошибка при получении видео:', error);
        }
    };

    useEffect(() => {
        if (episodes.length && selectedAudio) {
            fetchVideoUrl();
        }
    }, [selectedEpisode, selectedAudio]);

    return (
        <div className="tab-player-content-selector">
            <div className={`tab-switcher ${selectedTab}`}>
                <button
                    className={selectedTab === 'episodes' ? 'active' : ''}
                    onClick={() => setSelectedTab('episodes')}
                >
                    Выбрать эпизод
                </button>
                <button
                    className={selectedTab === 'audio' ? 'active' : ''}
                    onClick={() => setSelectedTab('audio')}
                >
                    Выбрать озвучку
                </button>
            </div>

            <div className="tab-content">
                {selectedTab === 'episodes' && (
                    <div className="anime-episodes-page">
                        <ul>
                            {episodes.map((episode, index) => (
                                <li key={episode.id}>
                                    <button
                                        className={selectedEpisode === index ? 'active' : ''}
                                        onClick={() => onEpisodeChange(index)}
                                    >
                                        {episode.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {selectedTab === 'audio' && (
                    <div className="audio-selector-item">
                        <ul>
                            {episodes[selectedEpisode]?.availableLanguages?.map((audio) => (
                                <li key={audio.id}>
                                    <button
                                        className={selectedAudio.id === audio.id ? 'active' : ''}
                                        onClick={() => onAudioChange(audio)}
                                    >
                                        {audio.name}
                                    </button>
                                </li>
                            ))}
                            {episodes[selectedEpisode]?.availableLanguages?.length === 0 && (
                                <li>Озвучки недоступны</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EpisodeAudioSelector;
