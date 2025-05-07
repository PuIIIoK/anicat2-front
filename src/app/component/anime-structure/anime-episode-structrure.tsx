'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimeEpisode, fetchAnimeEpisodes } from './anime-episode-data';

interface AnimeEpisodesProps {
    animeId: number;
}

const AnimeEpisodes: React.FC<AnimeEpisodesProps> = ({ animeId }) => {
    const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEpisodes = async () => {
            const data = await fetchAnimeEpisodes(animeId);
            setEpisodes(data);
            setLoading(false);
        };
        loadEpisodes();
    }, [animeId]);

    if (loading) return <p>Загрузка эпизодов...</p>;

    if (!episodes.length) return <p>Эпизоды для данного аниме не найдены.</p>;

    return (
        <div className="anime-episodes">
            <h3>Эпизоды</h3>
            <ul>
                {episodes.map((episode) => {
                    const firstAudio = episode.availableLanguages[0];
                    const videoLink = firstAudio
                        ? `/watch/${animeId}/episode/${episode.id}/audio/${firstAudio.id}`
                        : '#';

                    return (
                        <li key={episode.id}>
                            <Link href={videoLink}>
                                {episode.title}
                                {firstAudio && ` [${firstAudio.name}]`}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default AnimeEpisodes;
