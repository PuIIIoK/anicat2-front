'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimeInfo } from './anime-data-info';
import {API_SERVER} from "../../../tools/constants";

interface AnimeCardProps {
    anime: AnimeInfo;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime }) => {
    const router = useRouter();
    const [coverUrl, setCoverUrl] = useState<string>('');

    const handleClick = (id: number) => {
        router.push(`/anime-page/${id}`);
    };

    useEffect(() => {
        const fetchCoverBlob = async () => {
            try {
                const coverResp = await fetch(`${API_SERVER}/api/stream/${anime.id}/cover`);
                if (coverResp.ok) {
                    const blob = await coverResp.blob();
                    const url = URL.createObjectURL(blob);
                    setCoverUrl(url);
                } else {
                    console.error('Ошибка загрузки обложки:', coverResp.status);
                }
            } catch (error) {
                console.error('Ошибка запроса обложки:', error);
            }
        };

        fetchCoverBlob();
    }, [anime.id]);

    return (
        <div className="anime-cards-container">
            <div
                className="anime-title-card"
                onClick={() => handleClick(anime.id)}
                style={{ cursor: 'pointer' }}
            >
                <div className="anime-thumbnail">
                    {coverUrl && (
                        <Image
                            src={coverUrl}
                            alt={anime.title}
                            width={200}
                            height={300}
                        />
                    )}
                    <span className="anime-tag type-tag">{anime.type}</span>
                    <span className="anime-tag episodes-tag">{anime.episode_all}</span>
                </div>
                <div className="anime-info">
                    <p className="anime-title-text">
                        {anime.title}
                        <br />
                        <span className="season-text">[{anime.season}]</span>
                    </p>
                    <div className="anime-detailed-info">
                        <div className="anime-title-text-info">{anime.title}</div>
                        <p><strong>Тип:</strong> {anime.type}</p>
                        <p><strong>Сезон:</strong> {anime.season}</p>
                        <p><strong>Эпизоды:</strong> {anime.current_episode} / {anime.episode_all}</p>
                        <p><strong>Жанры:</strong> {anime.genres.split(',').join(', ')}</p>
                        <p><strong>Год:</strong> {anime.year}</p>
                    </div>
                    <p className="anime-hover-text">Смотреть</p>
                </div>
            </div>
        </div>
    );
};

export default AnimeCard;
