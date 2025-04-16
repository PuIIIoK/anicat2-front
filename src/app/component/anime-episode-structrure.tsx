'use client';

import React from 'react';
import Link from 'next/link';
import { animeEpisodesData } from './anime-episode-data';

interface AnimeEpisodesProps {
    animeId: string; // ID аниме для получения эпизодов
}

const AnimeEpisodes: React.FC<AnimeEpisodesProps> = ({ animeId }) => {
    // Найти эпизоды по ID аниме
    const animeEpisodes = animeEpisodesData.find((episodes) => episodes.animeId === animeId);

    if (!animeEpisodes) {
        return <p>Эпизоды для данного аниме не найдены.</p>;
    }

    return (
        <div className="anime-episodes">
            <h3>Эпизоды</h3>
            <ul>
                {animeEpisodes.episodes.map((episode, index) => {
                    // Получаем первую доступную ссылку на видео
                    const firstLanguage = Object.keys(episode.languagesLinks)[0]; // Берём первый доступный язык
                    const firstQuality = firstLanguage ? Object.keys(episode.languagesLinks[firstLanguage])[0] : null; // Берём первое качество
                    const videoLink = firstLanguage && firstQuality ? episode.languagesLinks[firstLanguage][firstQuality] : '#';

                    return (
                        <li key={index}>
                            <Link href={videoLink} target="_blank" rel="noopener noreferrer">
                                {episode.title}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default AnimeEpisodes;
