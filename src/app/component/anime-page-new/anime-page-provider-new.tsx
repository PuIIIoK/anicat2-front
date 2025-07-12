'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { fetchAllAnime, AnimeInfo } from '../anime-structure/anime-data-info';
import {Calendar, Check, Heart, Pause, Play, Share2, X} from 'lucide-react';
import {API_SERVER} from "../../../tools/constants";
import {AnimeEpisode, fetchAnimeEpisodes} from "../anime-structure/anime-episode-data";
import { useRouter } from 'next/navigation';
import Head from "next/head";
import DiscordStatusTracker from "../DiscordStatusTracker";

const statusOptions = [
    { label: 'Не выбрано', icon: <X size={18} />, value: 'none' }, // 👈 новый пункт
    { label: 'Запланировано', icon: <Calendar size={18} />, value: 'planned' },
    { label: 'Смотрю', icon: <Play size={18} />, value: 'watching' },
    { label: 'Просмотрено', icon: <Check size={18} />, value: 'completed' },
    { label: 'Отложено', icon: <Pause size={18} />, value: 'paused' },
    { label: 'Брошено', icon: <X size={18} />, value: 'dropped' },
];


interface Collection {
    collectionId: number;
    collectionType: string;  // Пример типа, можно использовать ENUM, если значения фиксированы
    anime: {
        id: number;
        title: string;
        // и другие поля из объекта anime
    };
    addedAt: string;
}



const AnimePageTest: React.FC = () => {
    const params = useParams();
    const animeId = Array.isArray(params?.id) ? params.id[0] : params?.id as string;

 //  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [favorites, setFavorites] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('none');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [isAccessible, setIsAccessible] = useState<boolean | null>(null);
    const [anime, setAnime] = useState<AnimeInfo | undefined>(undefined);
    const [, setEpisodes] = useState<AnimeEpisode[]>([]);
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
    const [notification, setNotification] = useState<string | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();
   // const sampleEpisodes: AnimeEpisode[] = [
    //    {
    //        id: 1,
    //        title: 'Встреча с судьбой',
     //       duration: '24:00',
    //        watched: false,
      //      url: '/watch/1',
     //       availableLanguages: [],
    //        language: 'ja',
     //   },
     //   {
    //        id: 2,
    //        title: 'Первый бой',
       //     duration: '23:45',
     //       watched: false,
      //      url: '/watch/2',
       //     availableLanguages: [],
      //      language: 'ja',
       // },
       // {
       //     id: 3,
       //     title: 'Новый союзник',
      //      duration: '24:10',
       //     watched: false,
      //      url: '/watch/3',
      //      availableLanguages: [],
       //     language: 'ja',
     //   },
  //  ];
    useEffect(() => {
        if (anime) {
            const season = anime.season ? `${anime.season}` : '';
            document.title = `${anime.title}${season ? ` | ${season}` : ''} | AniCat`;
        }
    }, [anime]);

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
                setIsAccessible(true); // Если ошибка, считаем, что доступно
            });
    }, [animeId]);

    useEffect(() => {
        if (!animeId) return;

        fetchAllAnime()
            .then((all) => {
                const found = all.find(a => a.id === Number(animeId));
                if (found) {
                    setAnime(found);

                    // Новый код для проверки статуса коллекции
                    const loadCollectionStatus = async () => {
                        try {
                            const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1");

                            const res = await fetch(`${API_SERVER}/api/collection/my`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            });
                            const collectionsData: Collection[] = await res.json();

                            // Найдем коллекцию для этого аниме
                            const current = collectionsData.find((collection) => collection.anime.id === Number(animeId));

                            if (current) {
                                // Установить статус из найденной коллекции
                                setSelectedStatus(current.collectionType.toLowerCase()); // 'PLANNED', 'COMPLETED', и т.д.
                            } else {
                                // Если аниме нет в коллекции, установить статус "не выбрано"
                                setSelectedStatus('none');
                            }

                            // Новый код для проверки, есть ли аниме в избранном
                            const isFavorite = collectionsData.some((collection) => collection.collectionType === "FAVORITE" && collection.anime.id === Number(animeId));
                            setFavorites(isFavorite); // Обновляем состояние для кнопки избранного
                        } catch (e) {
                            console.error('Ошибка при получении статуса коллекции:', e);
                            setSelectedStatus('none'); // В случае ошибки, выставляем статус 'none'
                            setFavorites(false); // Если ошибка, считаем, что аниме не в избранном
                        }
                    };

                    loadCollectionStatus(); // Вызовем функцию после того как аниме найдено
                }
            })
            .catch(console.error);
    }, [animeId]);  // Это отслеживает изменения в animeId и перезапускает запрос при его изменении



    const toggleFavorite = async () => {
        const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1");
        const newFavorite = !favorites;
        setFavorites(newFavorite);

        try {
            if (newFavorite) {
                // Добавить в избранное
                const res = await fetch(`${API_SERVER}/api/collection/favorite/add`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        animeId: animeId.toString(),
                    }),
                });

                if (!res.ok) throw new Error('Ошибка при добавлении в избранное');
                setNotification('❤️ Добавлено в избранное');
            } else {
                // Удалить из избранного
                const res = await fetch(`${API_SERVER}/api/collection/favorite/remove?animeId=${animeId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error('Ошибка при удалении из избранного');
                setNotification('🗑️ Удалено из избранного');
            }

            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            console.error('Ошибка избранного:', error);
            setNotification('⚠️ Ошибка при изменении избранного');
            setFavorites(!newFavorite);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    useEffect(() => {
        const loadAnimeData = async () => {
            try {
                const allAnime = await fetchAllAnime();
                const selectedAnime = allAnime.find((anime) => anime.id === Number(animeId));

                if (selectedAnime) {
                    setAnime(selectedAnime);

                    const episodesFromApi = await fetchAnimeEpisodes(Number(animeId));
                    setEpisodes(episodesFromApi);

                    // Проверим ответы от сервера на ошибки в JSON
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

                    const bannerResp = await fetch(`${API_SERVER}/api/stream/${animeId}/banner-direct`);
                    if (bannerResp.ok) {
                        const bannerBlob = await bannerResp.blob();
                        const bannerObjectUrl = URL.createObjectURL(bannerBlob);
                        setBannerUrl(bannerObjectUrl);
                    }

                    const coverResp = await fetch(`${API_SERVER}/api/stream/${animeId}/cover`);
                    if (coverResp.ok) {
                        const blob = await coverResp.blob();
                        const url = URL.createObjectURL(blob);
                        setCoverUrl(url);
                    }
                }
            } catch (error) {
                console.error('Ошибка при загрузке данных аниме:', error);
            } finally {
                // ✅ Завершаем загрузку в любом случае
                setIsLoading(false);
            }
        };

        loadAnimeData();
    }, [animeId]);

   // const markAsWatched = (id: number) => {
  // setEpisodes(prev => prev.map(ep => (ep.id === id ? { ...ep, watched: true } : ep)));
 // };

  // const unmarkAsWatched = (id: number) => {
   //    setEpisodes(prev => prev.map(ep => (ep.id === id ? { ...ep, watched: false } : ep)));
//  };

    const handleStatusSelect = async (value: string) => {
        setIsSavingStatus(true);

        try {
            const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1");

            // 1. Получаем все коллекции пользователя
            const response = await fetch(`${API_SERVER}/api/collection/my`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const collectionsData = await response.json();

            // 2. Находим текущую коллекцию с этим аниме
            const currentCollection = collectionsData.find((collection: Collection) => collection.anime.id === Number(animeId));

            if (currentCollection) {
                // 3. Если аниме уже в коллекции, удаляем его из старой коллекции
                const resRemove = await fetch(`${API_SERVER}/api/collection/remove?animeId=${animeId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!resRemove.ok) throw new Error('Ошибка при удалении из предыдущей коллекции');

                // Уведомление при удалении из коллекции
                setNotification('Аниме удалено из вашей коллекции');
            }

            // 4. Добавляем аниме в новую коллекцию
            const resAdd = await fetch(`${API_SERVER}/api/collection/set`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    animeId: animeId.toString(),
                    type: value.toUpperCase(),
                }),
            });

            if (!resAdd.ok) throw new Error('Ошибка при добавлении в коллекцию');

            // Уведомление при добавлении в коллекцию
            setNotification(`Аниме добавлено в коллекцию "${value}"`);

            setSelectedStatus(value); // Обновляем статус в локальном состоянии

        } catch (err) {
            console.error('Ошибка при обновлении коллекции:', err);
            setNotification('⚠️ Ошибка при обновлении коллекции');
        } finally {
            setIsSavingStatus(false);
        }
    };

    const currentStatus = statusOptions.find(opt => opt.value === selectedStatus);

    //const handleMenuToggle = (id: number) => {
     //setOpenMenuId(prev => (prev === id ? null : id));
   //};
    if (isLoading || !anime) {
        return (
            <div className="anime-loading-screen">
                <div className="spinner"></div>
                <p className="loading-text">
                    Загрузка аниме{anime?.title ? `: ${anime.title}` : '...'}
                </p>
            </div>
        );
    }

    return (
        <>
            <DiscordStatusTracker status={`На странице аниме ${anime.title}`} />
            <Head>
                <title>{anime.title} | {anime.mouth_season} сезон | AniCat</title>
                <meta name="description" content={`${anime.title} — ${anime.type}. Жанры: ${anime.genres}. ${anime.description?.substring(0, 160)}...`} />

                {/* Open Graph / Telegram preview */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content={`${anime.title} | ${anime.mouth_season} сезон | ${anime.type}`} />
                <meta property="og:description" content={anime.description?.substring(0, 160)} />
                {coverUrl && <meta property="og:image" content={coverUrl} />}
                <meta property="og:url" content={`https://anicat.ru/anime/${anime.id}`} />
                {bannerUrl && <meta property="og:image:alt" content={`Баннер ${anime.title}`} />}
                <meta name="keywords" content={`${anime.genres}, аниме, смотреть аниме, ${anime.title}`} />
            </Head>
        <div className="test-anime-page">
            <div className="test-top-section">
                <div className="test-background">
                    {bannerUrl ? (
                        <Image src={bannerUrl} alt="Фон" fill className="test-background-image" />
                    ) : (
                        <div style={{ width: '100%', height: '100%' }}>Загрузка баннера...</div>
                    )}
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
                                <div className="test-title-wrapper">
                                <h1 className="test-title">{anime.title}</h1>
                                <span
                                    className="test-episode-progress">{anime.current_episode} из {anime.episode_all}</span>
                                </div>
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

                        <div className="test-buttons-wrapper">
                            <div className="test-buttons">
                                <button
                                    className={`test-watch-button ${!isAccessible ? 'disabled' : ''}`}
                                    onClick={() => {
                                        if (isAccessible) {
                                            router.push(`/watch/anime/${animeId}`);
                                        }
                                    }}
                                    disabled={!isAccessible}
                                >
                                    <Play size={20} style={{marginRight: '8px'}}/>
                                    Смотреть
                                </button>

                                <div className="collection-status-wrapper">
                                    <button
                                        className={`collection-status-button ${isSavingStatus ? 'loading' : ''}`}
                                        onClick={() => setShowStatusDropdown(prev => !prev)}
                                        disabled={isSavingStatus}
                                    >
                                        {isSavingStatus ? (
                                            <span className="loader-mini"></span> // Добавь spinner или индикатор
                                        ) : (
                                            <>
                                                {currentStatus?.icon}
                                                <span>{currentStatus?.label}</span>
                                                <svg className="arrow" width="16" height="16" viewBox="0 0 24 24">
                                                    <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                                                </svg>
                                            </>
                                        )}
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
                                {notification && (
                                    <div className="collection-notification">
                                        {notification}
                                    </div>
                                )}

                                <button
                                    className={`test-favorite-button ${favorites ? 'active' : ''}`}
                                    onClick={toggleFavorite}
                                >
                                    <Heart size={20} fill={favorites ? '#e50914' : 'none'} stroke="#fff"/>
                                </button>

                                <button className="test-share-button">
                                    <Share2 size={20}/>
                                </button>
                            </div>

                            {anime.zametka && (
                                <div className="test-episode-status">
                                    {anime.zametka}
                                </div>
                            )}

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

                <div className="test-episodes-section">
                    <h2>Скоро...</h2>
                </div>
            </div>
        </div>
            </>
    );
};

export default AnimePageTest;
