// src/app/component/anime-cards.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimeInfo } from './anime-data-info';

interface AnimeCardProps {
    anime: AnimeInfo; // Добавляем типизацию пропса
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime }) => {
    const router = useRouter();

    const handleClick = (id: number) => {
        router.push(`/anime-page/${id}`);
    };

    return (
        <div className="anime-cards-container">
            <div
                className="anime-title-card"
                onClick={() => handleClick(anime.id)}
                style={{cursor: 'pointer'}}
            >
                <div className="anime-thumbnail">
                    <Image
                        src={anime.imageUrl}
                        alt={anime.title}
                        width={200}
                        height={300}
                        className="anime-thumbnail"
                    />
                    <span className="anime-tag type-tag">{anime.type}</span>
                    <span className="anime-tag episodes-tag">{anime.episode_all}</span>
                </div>
                <div className="anime-info">
                    <p className="anime-title-text">
                        {anime.title}
                        <br/>
                        <span className="season-text">[{anime.season}]</span>
                    </p>
                    <div className="anime-detailed-info">
                        <div className="anime-title-text-info">{anime.title}</div>
                        <p><strong>Тип:</strong> {anime.type}</p>
                        <p><strong>Сезон:</strong> {anime.season}</p>
                        <p><strong>Эпизоды:</strong> {anime.current_episode} / {anime.episode_all}</p>
                        <p>
                            <strong>Жанры:</strong> {anime.genres.split(',').join(', ')}
                        </p>
                        <p><strong>Год:</strong> {anime.year}</p>
                    </div>
                    <p className="anime-hover-text">Смотреть</p>
                </div>
            </div>
        </div>
    );
};

export default AnimeCard;
