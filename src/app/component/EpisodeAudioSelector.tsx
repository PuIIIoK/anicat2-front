'use client';

import React, { useState, useEffect } from 'react';
import { AnimeEpisode, AudioOption } from './anime-episode-data';

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
            const episodeId = episodes[selectedEpisode].id;
            const audioName = selectedAudio.name.toLowerCase().replace(/\s+/g, '');

            const response = await fetch(`http://localhost:8080/api/stream/anime/${animeId}/episode/${episodeId}/audio-name/${audioName}`);
            const data = await response.json();

            if (!response.ok) throw new Error('Видео не найдено');
            onFetchVideoUrl?.(data.url);
        } catch (error) {
            console.error('Ошибка при получении видео:', error);
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
                <button className={selectedTab === 'episodes' ? 'active' : ''} onClick={() => setSelectedTab('episodes')}>
                    Выбрать эпизод
                </button>
                <button className={selectedTab === 'audio' ? 'active' : ''} onClick={() => setSelectedTab('audio')}>
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
                            )) || <li>Озвучки недоступны</li>}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EpisodeAudioSelector;
