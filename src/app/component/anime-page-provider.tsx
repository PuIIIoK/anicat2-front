'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAllAnime, AnimeInfo } from './anime-data-info';
import { fetchAnimeEpisodes, AnimeEpisode, AudioOption } from './anime-episode-data';
import Image from 'next/image';
import AnimePlayer from '../component/AnimePlayer';
import EpisodeAudioSelector from '../component/EpisodeAudioSelector';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AnimePage: React.FC = () => {
    const { id } = useParams();
    const animeId = Number(id);

    const [anime, setAnime] = useState<AnimeInfo | undefined>(undefined);
    const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
    const [selectedEpisode, setSelectedEpisode] = useState<number>(0);
    const [selectedAudio, setSelectedAudio] = useState<AudioOption>({ id: 1, name: 'Anilibria' });
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
    const [coverUrl, setCoverUrl] = useState<string | null>(null); // 👈 добавляем обложку

    useEffect(() => {
        const loadAnimeData = async () => {
            try {
                const allAnime = await fetchAllAnime();
                const selectedAnime = allAnime.find((anime) => anime.id === animeId);

                if (selectedAnime) {
                    setAnime(selectedAnime);

                    const episodesFromApi = await fetchAnimeEpisodes(animeId);
                    setEpisodes(episodesFromApi);

                    // 🎞 Скриншоты
                    const screenshotIdsResponse = await fetch(`http://localhost:8080/api/stream/anime/${animeId}/screenshots`);
                    const ids: { id: number }[] = await screenshotIdsResponse.json();

                    const urls = await Promise.all(
                        ids.map(async (item) => {
                            const urlResp = await fetch(`http://localhost:8080/api/stream/anime/${animeId}/screenshots/${item.id}`);
                            const urlJson = await urlResp.json();
                            return urlJson.url;
                        })
                    );
                    setScreenshotUrls(urls);

                    // 📦 Обложка
                    const coverResp = await fetch(`http://localhost:8080/api/stream/anime/${animeId}/cover/1`);
                    if (coverResp.ok) {
                        const coverData = await coverResp.json();
                        setCoverUrl(coverData.url);
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке данных аниме:', error);
            }
        };

        loadAnimeData();
    }, [animeId]);

    useEffect(() => {
        if (episodes.length > 0 && selectedEpisode < episodes.length) {
            const current = episodes[selectedEpisode];
            if (current?.availableLanguages?.length > 0) {
                setSelectedAudio(current.availableLanguages[0]);
            }
        }
    }, [episodes, selectedEpisode]);

    if (!anime) return <p>Аниме не найдено.</p>;

    return (
        <div className="anime-page">
            <div className="anime-header">
                <div className="anime-cover">
                    {coverUrl ? (
                        <Image src={coverUrl} alt="cover" width={300} height={400} className="anime-thumbnail" />
                    ) : (
                        <p>Загрузка обложки...</p>
                    )}
                </div>

                <div className="anime-info-page-title">
                    <div className="anime-info-page-title-info">
                        <h1 className="anime-title-page">{anime.title}</h1>
                        <h4 className="anime-episodes-page-current">{anime.current_episode} из {anime.episode_all}</h4>
                    </div>
                    <div className="anime-title-alt-info">
                        <h1 className="anime-title-alt-page">{anime.alttitle}</h1>
                        <h1 className="anime-rating-page">{anime.rating}</h1>
                    </div>
                    <div className="anime-info-page">
                        <p><strong>Тип:</strong> {anime.type}</p>
                        <p><strong>Эпизодов:</strong> {anime.episode_all}</p>
                        <p><strong>Статус:</strong> {anime.status}</p>
                        <p><strong>Жанры:</strong> {anime.genres.split(',').join(', ')}</p>
                        <p><strong>Снято по:</strong> {anime.realesed_for}</p>
                        <p><strong>Сезон:</strong> {anime.mouth_season}</p>
                        <p><strong>Студия:</strong> {anime.studio}</p>
                    </div>
                </div>

                <div className="anime-description-page">
                    <h2>О чем аниме?</h2>
                    <p>{anime.description}</p>
                </div>
            </div>

            <div className="anime-screenshots">
                <h2>Кадры</h2>
                <div className="screenshots-gallery">
                    {screenshotUrls.length > 0 ? (
                        screenshotUrls.map((url, index) => (
                            <Image
                                key={index}
                                src={url}
                                alt={`Screenshot ${index + 1}`}
                                width={400}
                                height={300}
                                className="screenshot"
                            />
                        ))
                    ) : (
                        <p>Кадры не доступны.</p>
                    )}
                </div>
            </div>

            {episodes.length > 0 && (
                <div className="anime-player-wrapper">
                    <AnimePlayer title={episodes[selectedEpisode]?.title || ''} videoUrl={videoUrl} />
                    <EpisodeAudioSelector
                        episodes={episodes}
                        selectedEpisode={selectedEpisode}
                        selectedAudio={selectedAudio}
                        onEpisodeChange={setSelectedEpisode}
                        onAudioChange={setSelectedAudio}
                        onFetchVideoUrl={(url) => setVideoUrl(url)}
                        animeId={animeId}
                    />
                </div>
            )}
            <ToastContainer />
        </div>
    );
};

export default AnimePage;
