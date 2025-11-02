'use client';

import React, {useState, useEffect} from 'react';
import { useParams } from 'next/navigation';
import { fetchAllAnime, AnimeInfo } from '../anime-structure/anime-data-info';
import { fetchAnimeEpisodes, AnimeEpisode } from '../anime-structure/anime-episode-data';
import Image from 'next/image';
import { API_SERVER, KODIK_API_TOKEN, KODIK_API_BASE } from '@/hosts/constants';
import PlayerSwitch from '../anime-players/player-switch';
import PlyrPlayer from '../anime-players/plyr-player';
import KinescopePlayer from "../anime-players/KinescopePlayer";
import EpisodeSelector from "../anime-players/EpisodeSelector";

const AnimePage: React.FC = () => {
    const { id } = useParams();
    const animeId = Number(id);

    const [anime, setAnime] = useState<AnimeInfo | undefined>(undefined);
    const [, setEpisodes] = useState<AnimeEpisode[]>([]);
    const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [playerType, setPlayerType] = useState<'kodik' | 'kinescope' | 'plyr'>('kodik');
    const [kodikIframeUrl, setKodikIframeUrl] = useState<string | null>(null);
    const [kinescopeVideoId, setKinescopeVideoId] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
    const [availableEpisodes, setAvailableEpisodes] = useState<number[]>([]);

    useEffect(() => {
        const loadAnimeData = async () => {
            try {
                const allAnime = await fetchAllAnime();
                const selectedAnime = allAnime.find((anime) => anime.id === animeId);

                if (selectedAnime) {
                    setAnime(selectedAnime);
                    const episodesFromApi = await fetchAnimeEpisodes(animeId);
                    setEpisodes(episodesFromApi);

                    const screenshotIdsResponse = await fetch(`${API_SERVER}/api/stream/anime/${animeId}/screenshots`);
                    const ids: { id: number }[] = await screenshotIdsResponse.json();

                    const urls = await Promise.all(
                        ids.map(async (item) => {
                            const urlResp = await fetch(`${API_SERVER}/api/stream/anime/${animeId}/screenshots/${item.id}`);
                            const urlJson = await urlResp.json();
                            return urlJson.url;
                        })
                    );
                    setScreenshotUrls(urls);

                    const coverResp = await fetch(`${API_SERVER}/api/stream/${animeId}/cover`);
                    if (coverResp.ok) {
                        const blob = await coverResp.blob();
                        const url = URL.createObjectURL(blob);
                        setCoverUrl(url);
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке данных аниме:', error);
            }
        };

        loadAnimeData();
    }, [animeId]);

    useEffect(() => {
        const fetchKodikIframe = async () => {
            if (!anime) return;

            try {
                const response = await fetch(
                    `${KODIK_API_BASE}/search?token=${KODIK_API_TOKEN}&title=${encodeURIComponent(anime.kodik)}`
                );
                const data = await response.json();
                const link = data.results?.[0]?.link;

                if (link) setKodikIframeUrl(link);
            } catch (error) {
                console.error('Ошибка при получении Kodik iframe:', error);
            }
        };

        fetchKodikIframe();
    }, [anime]);

    useEffect(() => {
        const fetchKinescopePlaylistEmbed = async () => {
            if (playerType !== 'kinescope' || !anime?.title) return;

            try {
                const response = await fetch(
                    `http://localhost:8080/api/kinescope/search-playlist?title=${encodeURIComponent(anime.title)}`
                );
                const data = await response.json();
                const embedLink = data?.data?.[0]?.embed_link;

                if (embedLink) {
                    const embedId = embedLink.split('/embed/')[1];
                    setKinescopeVideoId(embedId);
                }
            } catch (error) {
                console.error('Ошибка при получении плейлиста с Kinescope:', error);
            }
        };

        fetchKinescopePlaylistEmbed();
    }, [playerType, anime]);

    useEffect(() => {
        interface LibriaEpisode {
            ordinal: number;
            hls_1080?: string;
            hls_720?: string;
            hls_480?: string;
        }

        const fetchLibriaEpisode = async () => {
            if (playerType !== 'plyr' || !animeId || !selectedEpisode) return;

            try {
                const response = await fetch(`${API_SERVER}/api/libria/episodes/${animeId}`);

                if (!response.ok) {
                    const text = await response.text();
                    console.error('❌ Ошибка от сервера AniLibria:', text);
                    return;
                }

                const data: LibriaEpisode[] = await response.json();

                const episode = data.find((ep) => ep.ordinal === selectedEpisode);

                if (episode) {
                    setVideoUrl(episode.hls_1080 || episode.hls_720 || episode.hls_480 || '');
                    setAvailableEpisodes(data.map((ep) => ep.ordinal));
                } else {
                    console.warn('⚠️ Эпизод не найден');
                }
            } catch (error) {
                console.error('❌ Ошибка при загрузке эпизодов с AniLibria:', error);
            }
        };

        fetchLibriaEpisode();
    }, [animeId, playerType, selectedEpisode]);

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

            <div className="anime-player-and-switch-container">
                <div className="anime-player-block">
                    {playerType === 'kinescope' ? (
                        kinescopeVideoId ? (
                            <KinescopePlayer videoId={kinescopeVideoId} />
                        ) : (
                            <p>🎥 Плеер еще не настроен.</p>
                        )
                    ) : playerType === 'plyr' ? (
                        <div style={{ width: '100%' }} key="plyr-player">
                            <div className="anime-episode-selector">
                                <EpisodeSelector
                                    selectedEpisode={selectedEpisode}
                                    onChange={setSelectedEpisode}
                                    availableEpisodes={availableEpisodes}
                                />
                            </div>
                            <PlyrPlayer
                                videoUrl={videoUrl ?? ''}
                                key={videoUrl}
                                onNext={() => {
                                    setSelectedEpisode((prev) =>
                                        prev < Math.max(...availableEpisodes) ? prev + 1 : prev
                                    );
                                }}
                                onPrev={() => {
                                    setSelectedEpisode((prev) =>
                                        prev > Math.min(...availableEpisodes) ? prev - 1 : prev
                                    );
                                }}
                            />
                        </div>
                    ) : kodikIframeUrl ? (
                            <div className="video-rotate-wrapper">
                        <iframe
                            className="video-rotate"
                            key={kodikIframeUrl}
                            src={kodikIframeUrl}
                            width="100%"
                            height="550"
                            allowFullScreen
                            frameBorder="0"
                        />
                            </div>
                    ) : (
                        <p>📡 Плеер не найден.</p>
                    )}
                </div>

                <div className="anime-switch-sidebar">
                    <PlayerSwitch playerType={playerType} onChange={setPlayerType} />
                </div>
            </div>

        </div>
    );
};

export default AnimePage;
