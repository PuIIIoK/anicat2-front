'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { fetchAllAnime, AnimeInfo } from './anime-data-info';
import { Play} from 'lucide-react';
import {API_SERVER} from "../../tools/constants";
import {AnimeEpisode, fetchAnimeEpisodes} from "./anime-episode-data";
import { useRouter } from 'next/navigation';

//const statusOptions = [
 //   { label: 'Запланировано', icon: <Calendar size={18} />, value: 'planned' },
  //  { label: 'Смотрю', icon: <Play size={18} />, value: 'watching' },
  ///  { label: 'Просмотрено', icon: <Check size={18} />, value: 'completed' },
///{ label: 'Отложено', icon: <Pause size={18} />, value: 'paused' },
 //   { label: 'Брошено', icon: <X size={18} />, value: 'dropped' },
//];

const AnimePageTest: React.FC = () => {
    const params = useParams();
    const animeId = Array.isArray(params?.id) ? params.id[0] : params?.id as string;

   // const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [, setFavorites] = useState(false);
    const [, setSelectedStatus] = useState<string>('planned');
    const [, ] = useState(false);
    const [isAccessible, setIsAccessible] = useState<boolean | null>(null);
    const [anime, setAnime] = useState<AnimeInfo | undefined>(undefined);
    const [, setEpisodes] = useState<AnimeEpisode[]>([]);
    const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!animeId) {
            console.warn('❌ animeId не получен из URL');
            return;
        }

        fetch(`${API_SERVER}/api/anime/get-anime/${animeId}/availability`)
            .then(res => res.json())
            .then(data => {
                setIsAccessible(data.accessible);
            })
            .catch(err => {
                console.error('Ошибка при получении доступности аниме:', err);
                setIsAccessible(true);
            });
    }, [animeId]);

    useEffect(() => {
        if (!animeId) return;

        fetchAllAnime()
            .then((all) => {
                const found = all.find(a => a.id === Number(animeId));
                if (found) setAnime(found);
            })
            .catch(console.error);
    }, [animeId]);

    useEffect(() => {
        const savedFavorite = localStorage.getItem('favorite_witchwatch');
        if (savedFavorite === 'true') setFavorites(true);

        const savedStatus = localStorage.getItem('anime_collection_status');
        if (savedStatus) setSelectedStatus(savedStatus);
    }, []);

  //  const toggleFavorite = () => {
      //  const newFavorite = !favorites;
    //    setFavorites(newFavorite);
 //       localStorage.setItem('favorite_witchwatch', newFavorite.toString());
 //   };

    useEffect(() => {
        const loadAnimeData = async () => {
            try {
                const allAnime = await fetchAllAnime();
                const selectedAnime = allAnime.find((anime) => anime.id === Number(animeId));


                if (selectedAnime) {
                    setAnime(selectedAnime);
                    const episodesFromApi = await fetchAnimeEpisodes(Number(animeId));
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

 ///   const markAsWatched = (id: number) => {
   //    setEpisodes(prev => prev.map(ep => (ep.id === id ? { ...ep, watched: true } : ep)));
  //  };

   // const unmarkAsWatched = (id: number) => {
   //     setEpisodes(prev => prev.map(ep => (ep.id === id ? { ...ep, watched: false } : ep)));
  //  };

    //const handleStatusSelect = (value: string) => {
       // setSelectedStatus(value);
     //   localStorage.setItem('anime_collection_status', value);
  //      setShowStatusDropdown(false);
 //   };

 //   const currentStatus = statusOptions.find(opt => opt.value === selectedStatus);

    //const handleMenuToggle = (id: number) => {
    //    setOpenMenuId(prev => (prev === id ? null : id));
   // };
    if (!anime) return <div>Загрузка аниме...</div>;

    return (
        <div className="test-anime-page">
            <div className="test-top-section">
                <div className="test-background">
                    <Image src="/" alt="Фон" fill className="test-background-image" />
                    <div className="test-background-overlay"></div>
                </div>

                <div className="test-top-content">
                    <div className="test-poster">
                        {coverUrl ? (
                        <Image src={coverUrl} alt="Постер" width={220} height={320} className="test-poster-image" />
                        ) : (
                            <p>Загрузка обложки...</p>
                        )}
                    </div>

                    <div className="test-info-section">

                        <div className="test-header-block">
                            <div className="test-header-title-row">
                                <h1 className="test-title">{anime.title}</h1>
                                <span
                                    className="test-episode-progress">{anime.current_episode} из {anime.episode_all}</span>
                            </div>
                            <div className="test-alt-title">
                                {anime.alttitle}
                            </div>

                        </div>

                        <div className="test-meta">
                            <span>{anime.rating}</span> <a
                            style={{textDecoration: 'none'}}>{anime.genres.split(',').join(', ')}</a>
                        </div>

                        <div className="test-rating">Рейтинг: Скоро...</div>

                        <div className="test-buttons">
                            <div className="test-watch-button-wrapper">
                                <button
                                    className="test-watch-button"
                                    onClick={() => router.push(`/watch/anime/${animeId}`)}  // Передаем animeId
                                >
                                    <Play size={20} style={{marginRight: '8px'}}/>
                                    Смотреть
                                </button>

                                {/* <div className="test-episode-status">Добавлена серия 3</div>*/}
                            </div>

                            {/*   <div className="collection-status-wrapper">
                                <button className="collection-status-button"
                                        onClick={() => setShowStatusDropdown(prev => !prev)}>
                                {currentStatus?.icon}
                                    <span>{currentStatus?.label}</span>
                                    <svg className="arrow" width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                                    </svg>
                                </button>

                                {showStatusDropdown && (
                                    <div className="collection-status-dropdown">
                                        {statusOptions.map(option => (
                                            <div
                                                key={option.value}
                                                className={`collection-status-item ${selectedStatus === option.value ? 'active' : ''}`}
                                                onClick={() => handleStatusSelect(option.value)}
                                            >
                                                {option.icon}
                                                <span>{option.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
*/}
                            {/* <button className={`test-favorite-button ${favorites ? 'active' : ''}`}
                                    onClick={toggleFavorite}>
                                <Heart size={20} fill={favorites ? '#e50914' : 'none'} stroke="#fff"/>
                            </button>*/}

                            {/* <button className="test-share-button">
                                <Share2 size={20} />
                            </button> */}
                        </div>


                        {isAccessible === false && (
                            <div className="test-restriction-warning">
                                Данный контент недоступен на территории вашей страны
                            </div>
                        )}
                        <div className="test-extra-info">
                            <div><strong>Тип:</strong> {anime.type}</div>
                            <div><strong>Эпизодов:</strong> {anime.episode_all}</div>
                            <div><strong>Статус:</strong> {anime.status}</div>
                            <div><strong>Снято по:</strong> {anime.realesed_for}</div>
                            <div><strong>Сезон:</strong> {anime.mouth_season}</div>
                            <div><strong>Студия:</strong> {anime.studio}</div>
                        </div>
                        <p className="test-description">
                            {anime.description}
                        </p>
                    </div>
                </div>
            </div>

            <div className="test-main-content">
                <div className="test-screenshots-section">
                    <h2>Скриншоты</h2>
                    <div className="test-screenshots">
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

                {/* <div className="test-episodes-section">
                    <h2>Эпизоды</h2>
                    <div className="test-episodes-list">
                        {episodes.map((episode) => (
                            <div key={episode.id} className="test-episode-card">
                                <div className="test-episode-thumbnail">
                                    <Image src="/episode-thumbnail.jpg" alt={`Эпизод ${episode.id}`} width={90} height={50} />
                                    <span className="test-episode-duration">{episode.duration}</span>
                                </div>

                                <div className="test-episode-info">
                                    <strong>{episode.id} эпизод</strong> {episode.title}
                                    <div className="test-episode-subtitle">{episode.subtitle}</div>
                                </div>

                                <div className="test-episode-actions">
                                    <button className="test-episode-menu-button" onClick={() => handleMenuToggle(episode.id)}>⋮</button>
                                    {openMenuId === episode.id && (
                                        <div className="test-episode-dropdown">
                                            <div className="test-episode-dropdown-item" onClick={() => markAsWatched(episode.id)}>
                                                <Check size={16} /> Отметить как просмотренный
                                            </div>
                                            <div className="test-episode-dropdown-item" onClick={() => unmarkAsWatched(episode.id)}>
                                                <X size={16} /> Снять отметку о просмотре
                                            </div>
                                            <div className="test-episode-dropdown-item" onClick={() => window.open('/player', '_blank')}>
                                                <ExternalLink size={16} /> Открыть в новой вкладке
                                            </div>
                                            <div className="test-episode-dropdown-item">
                                                <Plus size={16} /> Добавить в очередь
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div> */}
            </div>
        </div>
    );
};

export default AnimePageTest;
