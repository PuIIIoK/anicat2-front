'use client';

import React, {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {Play, Heart, Calendar, Check, Pause, X, Film, ListVideo, Info, BookMarked, Building2, Tags} from 'lucide-react';
import { AnimeInfo } from '../anime-structure/anime-data-info';
import { API_SERVER } from '@/hosts/constants';
import AnimeRatingSection from "./AnimeRatingSection";
import AnimeCommentsSimple from "./AnimeComments";
import CollectionStats from "./CollectionStats";
import CommentsModalNew from "./CommentsModalNew";

const statusOptions = [
    { label: 'Не выбрано', icon: <X size={18} />, value: 'none' },
    { label: 'Смотрю', icon: <Play size={18} />, value: 'watching' },
    { label: 'В планах', icon: <Calendar size={18} />, value: 'planned' },
    { label: 'Просмотрено', icon: <Check size={18} />, value: 'completed' },
    { label: 'Отложено', icon: <Pause size={18} />, value: 'paused' },
    { label: 'Брошено', icon: <X size={18} />, value: 'dropped' },
];

interface Collection {
    collectionId: number;
    collectionType: string;
    anime: { id: number; title: string; };
    addedAt: string;
}

const MobileAnimePageTest: React.FC = () => {
    const params = useParams();
    const animeId = Array.isArray(params?.id) ? params.id[0] : params?.id as string;

    const [favorites, setFavorites] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('none');
    const [showStatusDropdown, ] = useState(false);
    const [isAccessible, setIsAccessible] = useState<boolean | null>(null);
    const [anime, setAnime] = useState<AnimeInfo | undefined>(undefined);
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
    const [, setNotification] = useState<string | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zametka_blocked, setZametka_blocked] = useState<string>('');
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showFullDesc, setShowFullDesc] = useState(false);
    const [usernameFromToken, setUsernameFromToken] = useState<string | null>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [copiedField, setCopiedField] = useState<null | "title" | "alttitle">(null);
    const [showAuthFullScreen, setShowAuthFullScreen] = useState(false);


    const router = useRouter();


    useEffect(() => {
        const match = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
        const token = match ? match[1] : null;
        if (!token) return;

        // Теперь вызов API с передачей токена в Authorization
        fetch(`${API_SERVER}/api/auth/username-from-token`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Ошибка при получении username');
                return res.json();
            })
            .then(data => {
                if (data.username) {
                    setUsernameFromToken(data.username);
                } else {
                    console.warn('Username не найден в ответе', data);
                }
            })
            .catch(err => {
                console.error('Ошибка вызова API:', err);
            });
    }, []);
    // Аналогично ПК-версии: загрузка напрямую по id (без кэша)
    useEffect(() => {
        if (!animeId) return;

        (async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
                if (res.ok) {
                    const dto = await res.json();
                    const mapped: AnimeInfo = {
                        id: dto.id,
                        coverId: 0,
                        status: dto.status || '',
                        title: dto.title || '',
                        alttitle: dto.alttitle || '',
                        episode_all: dto.episode_all || '',
                        current_episode: dto.current_episode || '',
                        rating: dto.rating || '',
                        image_url: { url: dto.imageUrl || '' },
                        type: dto.type || '',
                        collectionType: '',
                        season: dto.season || '',
                        genres: dto.genres || '',
                        year: dto.year || '',
                        description: dto.description || '',
                        episodes: [],
                        screenshots: [],
                        mouth_season: dto.mouth_season || '',
                        studio: dto.studio || '',
                        realesed_for: dto.realesed_for || '',
                        alias: dto.alias || '',
                        kodik: dto.kodik || '',
                        coverUrl: dto.imageUrl || '',
                        bannerUrl: '',
                        zametka: dto.zametka || '',
                        anons: dto.anons || '',
                        opened: dto.opened ?? true,
                        blockedCountries: null,
                        note: '',
                        blocked_note: '',
                    };
                    setAnime(mapped);
                    // Устанавливаем прямой URL для загрузки с API
                    setCoverUrl(`${API_SERVER}/api/stream/${animeId}/cover`);
                }
            } catch (e) {
                console.error('Ошибка загрузки аниме по id:', e);
            }

            // Проверка коллекции (статус и фаворит)
            const token = document.cookie.replace(/(?:^|.*;\s*)token\s*=\s*([^;]*).*$|^.*$/, "$1");
            fetch(`${API_SERVER}/api/collection/my`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(res => res.json())
                .then((collectionsData: Collection[]) => {
                    const entriesForAnime = collectionsData.filter(c => c.anime.id === Number(animeId));
                    const statusEntry = entriesForAnime.find(c => c.collectionType !== 'FAVORITE');
                    setSelectedStatus(statusEntry ? statusEntry.collectionType.toLowerCase() : 'none');
                    setFavorites(entriesForAnime.some(c => c.collectionType === 'FAVORITE'));
                })
                .catch(() => {
                    setSelectedStatus('none');
                    setFavorites(false);
                });
        })();

        // Загрузка дополнительных медиа (баннер, скриншоты)
        (async () => {
            try {
                // === Загрузка баннера ===
                const bannerResp = await fetch(`${API_SERVER}/api/stream/${animeId}/banner-direct`);
                if (bannerResp.ok) {
                    const bannerBlob = await bannerResp.blob();
                    const bannerObjectUrl = URL.createObjectURL(bannerBlob);
                    setBannerUrl(bannerObjectUrl);
                } else {
                    console.warn('Баннер не найден:', bannerResp.status);
                }
                // === Загрузка скриншотов ===
                const screenshotsResp = await fetch(`${API_SERVER}/api/stream/anime/${animeId}/screenshots`);
                if (screenshotsResp.ok) {
                    const ids = await screenshotsResp.json();
                    if (Array.isArray(ids)) {
                        const urls = await Promise.all(ids.map(async (item) => {
                            try {
                                const urlResp = await fetch(`${API_SERVER}/api/stream/anime/${animeId}/screenshots/${item.id}`);
                                if (urlResp.ok) {
                                    const urlJson = await urlResp.json();
                                    return urlJson.url;
                                }
                                return null;
                            } catch (error) {
                                console.warn('Ошибка загрузки скриншота:', error);
                                return null;
                            }
                        }));
                        setScreenshotUrls(urls.filter(url => url !== null));
                    } else {
                        setScreenshotUrls([]);
                    }
                } else {
                    console.warn('Скриншоты не найдены:', screenshotsResp.status);
                    setScreenshotUrls([]);
                }
            } catch (error) {
                console.error('Ошибка загрузки медиа контента:', error);
            }
        })();

        // Accessibility, block note
        fetch(`${API_SERVER}/api/admin/avaibility/check-avaibility/${animeId}`)
            .then(res => res.json())
            .then(data => {
                setIsAccessible(!(data.blocked_in_countries && data.blocked_in_countries !== 'empty'));
                setZametka_blocked(data.zametka_blocked || '');
            })
            .catch(() => setIsAccessible(true));

        // Rating
        fetch(`${API_SERVER}/api/anime/ratings/${animeId}/rating`)
            .then(res => res.json())
            .then(data => setAverageRating(data.average ?? null))
            .catch(() => setAverageRating(null));

        setIsLoading(false);
    }, [animeId]);

    // Cleanup blob URLs при размонтировании компонента (только для bannerUrl)
    useEffect(() => {
        return () => {
            if (bannerUrl && bannerUrl.startsWith('blob:')) {
                URL.revokeObjectURL(bannerUrl);
            }
        };
    }, [bannerUrl]);

    const getToken = () => {
        const match = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
        return match ? match[1] : null;
    };

    const handleStatusSelect = async (value: string) => {
        if (selectedStatus === value) {
            return;  // Если статус не изменился, просто выходим из функции.
        }

        const token = getToken();
        if (!token) {
            setShowAuthFullScreen(true);
            return;
        }

        setIsSavingStatus(true);
        try {
            const token = getToken()!;
            const typeParam = value === 'none' ? 'NONE' : value.toUpperCase();
            const res = await fetch(`${API_SERVER}/api/collection/set`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    animeId: animeId.toString(),
                    type: typeParam,
                }),
            });
            if (!res.ok) throw new Error('Ошибка при обновлении коллекции');

            setSelectedStatus(value);
            setNotification(value === 'none' ? 'Аниме удалено из вашей коллекции' : `Аниме добавлено в коллекцию "${value}"`);
            setTimeout(() => setNotification(null), 2000);
        } catch (error) {
            console.error('Ошибка при обновлении коллекции:', error);  // Логируем ошибку
            setNotification('Ошибка при обновлении коллекции');
            setTimeout(() => setNotification(null), 2000);
        } finally {
            setIsSavingStatus(false);  // Останавливаем загрузку
        }
    };

    const toggleFavorite = async () => {
        const token = getToken();
        if (!token) {
            setShowAuthFullScreen(true);
            return;
        }
        const newFavorite = !favorites;
        setFavorites(newFavorite);
        try {
            if (newFavorite) {
                await fetch(`${API_SERVER}/api/collection/favorite/add`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({ animeId: animeId.toString() }),
                });
                setNotification('❤️ Добавлено в избранное');
            } else {
                await fetch(`${API_SERVER}/api/collection/favorite/remove?animeId=${animeId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });
                setNotification('🗑️ Удалено из избранного');
            }
            setTimeout(() => setNotification(null), 2000);
        } catch {
            setNotification('Ошибка при изменении избранного');
            setFavorites(!newFavorite);
            setTimeout(() => setNotification(null), 2000);
        }
    };
    // Функция копирования
    const handleCopy = (text: string, field: "title" | "alttitle") => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1800); // 1.8 сек (или сколько хочешь)
    };

    if (isLoading || !anime) {
        return <div className="anime-loading-screen"><div className="spinner"></div></div>;
    }

    const isOpened = anime.opened;
    const currentStatus = statusOptions.find(opt => opt.value === selectedStatus);

    const DESCRIPTION_MAX = 350; // сколько символов показывать изначально

    const getShortDesc = (text: string) => {
        if (!text) return "";
        if (text.length <= DESCRIPTION_MAX) return text;
        return text.slice(0, DESCRIPTION_MAX) + "…";
    };

    return (
        <div className="mobile-anime-page">
            <div className="mobile-anime-header">
                {bannerUrl ? (
                    <Image src={bannerUrl} alt="Фон" width={800} height={260} className="mobile-anime-banner" />
                ) : (
                    <div className="mobile-anime-banner-placeholder" />
                )}

                <div className="mobile-anime-poster-wrap">
                    {coverUrl ? (
                        <>
                            <Image 
                                src={coverUrl} 
                                alt="Постер" 
                                width={120} 
                                height={180} 
                                className="mobile-anime-poster"
                                unoptimized={true}
                            />
                        </>
                    ) : (
                        <div className="mobile-anime-poster-placeholder" />
                    )}
                </div>
                <div className="mobile-anime-title-block">

                    <>
                        <h1
                            className="mobile-anime-title"
                            ref={titleRef}
                            onClick={() => setModalOpen(true)}
                            style={{cursor: "pointer"}}
                            title={anime.title}
                        >
                            {anime.title}
                        </h1>

                        {modalOpen && (
                            <div className="android-bottom-sheet-overlay" onClick={() => setModalOpen(false)}>
                                <div className="android-bottom-sheet" onClick={e => e.stopPropagation()}>
                                    <div className="sheet-title">Информация о названии</div>

                                    <div className="sheet-option">
                                        <span>{anime.title}</span>
                                        <button
                                            className="copy-btn"
                                            onClick={() => handleCopy(anime.title, "title")}
                                            disabled={copiedField === "title"}
                                        >
                                            {copiedField === "title" ? (
                                                <span style={{ color: "#888", transition: "color 0.3s", fontSize: "12px" }}>Скопировано</span>
                                            ) : (
                                                "Копировать"
                                            )}
                                        </button>
                                    </div>

                                    {anime.alttitle && (
                                        <div className="sheet-option">
                                            <span>{anime.alttitle}</span>
                                            <button
                                                className="copy-btn"
                                                onClick={() => handleCopy(anime.alttitle!, "alttitle")}
                                                disabled={copiedField === "alttitle"}
                                            >
                                                {copiedField === "alttitle" ? (
                                                    <span style={{ color: "#888", transition: "color 0.3s", fontSize: "12px" }}>Скопировано</span>
                                                ) : (
                                                    "Копировать"
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <button className="sheet-close" onClick={() => setModalOpen(false)}>Закрыть</button>
                                </div>
                            </div>
                        )}
                    </>
                    {anime.status !== 'Скоро' && (
                        <span className="mobile-episode-progress">{anime.current_episode} из {anime.episode_all}</span>
                    )}
                    <span className="mobile-rating-block">
                        <svg className="rating-icon-anime" xmlns="http://www.w3.org/2000/svg" fill="gold"
                             viewBox="0 0 24 24" width="20" height="20">
                            <path
                                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                        {averageRating !== null ? averageRating.toFixed(1) : 'Нет оценок'}
                    </span>
                    <div className="mobile-anime-fav-row">
                        <button className={`mobile-fav-btn ${favorites ? 'active' : ''}`} onClick={toggleFavorite}>
                            <Heart size={20} fill={favorites ? '#e50914' : 'none'} stroke="#fff"/>
                        </button>
                        <button
                            className={`mobile-status-btn ${isSavingStatus ? 'loading' : ''}`}
                            onClick={() => setShowStatusMenu(true)} // Показываем модалку-меню
                            disabled={isSavingStatus}
                        >
                            {isSavingStatus ? (
                                <span className="loader-mini"></span>
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
                        {showStatusMenu && (
                            <div className="mobile-collection-overlay" onClick={() => setShowStatusMenu(false)}>
                                <div className="mobile-collection-menu" onClick={e => e.stopPropagation()}>
                                    <h4>Добавить в коллекцию</h4>
                                    {statusOptions.map(option => (
                                        <button
                                            key={option.value}
                                            className={`mobile-collection-option ${selectedStatus === option.value ? 'active' : ''}`}
                                            onClick={() => {
                                                setShowStatusMenu(false);
                                                handleStatusSelect(option.value);
                                            }}
                                        >
                                            {option.icon}
                                            <span>{option.label}</span>
                                        </button>
                                    ))}
                                    <button
                                        className="mobile-collection-cancel"
                                        onClick={() => setShowStatusMenu(false)}
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        )}
                        {showStatusDropdown && (
                            <div className="mobile-status-dropdown">
                                {statusOptions.map(option => (
                                    <div
                                        key={option.value}
                                        className={`mobile-status-item ${selectedStatus === option.value ? 'active' : ''}`}
                                        onClick={() => handleStatusSelect(option.value)}
                                    >
                                        {option.icon}
                                        <span>{option.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="mobile-anime-main">
                <div className="mobile-anime-meta">
                    <div><Film size={18}/> <span>Тип:</span> {anime.type}</div>
                    <div><Calendar size={18}/> <span>Год:</span> {typeof anime.year === 'string' && anime.year.includes('-') ? anime.year.split('-')[0] + 'г' : anime.year}</div>
                    <div><ListVideo size={18}/> <span>Эпизодов:</span> {anime.episode_all || "Неизвестно"}</div>
                    <div><Info size={18}/> <span>Статус:</span> {anime.status}</div>
                    <div><BookMarked size={18}/> <span>Снято по:</span> {anime.realesed_for}</div>
                    <div><Calendar size={18}/> <span>Сезон:</span> {anime.mouth_season}</div>
                    <div><Building2 size={18}/> <span>Студия:</span> {anime.studio}</div>
                    <div><Tags size={18}/> <span>Жанры:</span> {anime.genres}</div>
                </div>
                <div className="mobile-anime-actions">
                    <button
                        className={`mobile-watch-btn ${!isAccessible || !isOpened ? 'disabled' : ''}`}
                        onClick={() => {
                            if (isAccessible && isOpened) {
                                const baseParams = new URLSearchParams({
                                    kodik: anime.kodik || anime.title || '',
                                    alias: anime.alias || '',
                                    title: anime.title || '',
                                    cover: coverUrl || ''
                                });
                                
                                router.push(`/watch/anime/${animeId}?${baseParams.toString()}`);
                            }
                        }}
                        disabled={!isAccessible || !isOpened}
                    >
                        {isOpened ? (
                            <>
                                <Play size={20} style={{marginRight: '6px'}}/>
                                Смотреть
                            </>
                        ) : (
                            anime.anons && anime.anons.trim() !== '' ? anime.anons : 'Скоро'
                        )}
                    </button>
                    <>
                        {/* ...основной контент... */}
                        <button
                            className="mobile-comments-btn"
                            onClick={() => setShowCommentsModal(true)}
                        >
                            Комментарии
                        </button>
                        <CommentsModalNew
                            show={showCommentsModal}
                            onClose={() => setShowCommentsModal(false)}
                            myUsername={usernameFromToken}
                            animeId={animeId}
                            isModernDesign={false}
                        />
                    </>
                </div>
                {/* Обычная заметка */}
                {anime.zametka && (
                    <div className="mobile-anime-zametka">
                        {anime.zametka}
                    </div>
                )}
                {/* Заметка о блокировке */}
                {isAccessible === false && (
                    <div className="mobile-block-warning">
                        {zametka_blocked && zametka_blocked.trim() !== ''
                            ? zametka_blocked
                            : 'ЗАБЛОКИРОВАНО ПО ПРОСЬБЕ ПРАВООБЛАДАТЕЛЯ'}
                    </div>
                )}
                <div className="mobile-anime-desc-block">
                    <p className={`mobile-anime-desc${showFullDesc ? " full" : ""}`}>
                        {showFullDesc ? anime.description : getShortDesc(anime.description)}
                    </p>
                    {anime.description.length > DESCRIPTION_MAX && (
                        <button
                            className="mobile-anime-desc-toggle"
                            onClick={() => setShowFullDesc((v) => !v)}
                        >
                            {showFullDesc ? "Скрыть" : "Читать полностью"}
                        </button>
                    )}
                </div>
                <div className="mobile-screenshots">
                    <h3>Скриншоты</h3>
                    <div className="mobile-screenshot-row">
                        {screenshotUrls.length > 0 ? (
                            screenshotUrls.map((url, idx) => (
                                <Image key={idx} src={url} alt={`Кадр ${idx + 1}`} width={200} height={130}
                                       className="mobile-screenshot"/>
                            ))
                        ) : <p>Нет кадров</p>}
                    </div>
                </div>
            </div>
            {anime.status !== 'Скоро' && (
                <AnimeRatingSection
                    animeId={animeId}
                    onRequireAuth={() => setShowAuthFullScreen(true)}
                />
            )}
            {showAuthFullScreen && (
                <div className="mobile-auth-required-overlay" onClick={() => setShowAuthFullScreen(false)}>
                    <div className="mobile-auth-required" onClick={e => e.stopPropagation()}>
                        <button
                            className="mobile-auth-required-close"
                            aria-label="Закрыть"
                            onClick={() => setShowAuthFullScreen(false)}
                        >
                            ✕
                        </button>
                        <div className="mobile-auth-required-title">Йоу, братишь</div>
                        <div className="mobile-auth-required-text">
                            если ты хочешь такие возможности:
                            <ul>
                                <li>Добавление в коллекцию</li>
                                <li>Добавление в избранное</li>
                                <li>Оставлять свой рейтинг</li>
                                <li>Оставлять свой комментарий</li>
                                <li>Делать свою коллекцию для других пользователей</li>
                                <li>Возможность редактировать свой профиль</li>
                            </ul>
                            То пожалуйста, авторизируйся или зарегистрируйся на сайте, если ты у нас впервые)
                        </div>
                        <div className="mobile-auth-required-actions">
                            <a href="/login" className="mobile-auth-btn primary">Авторизироваться</a>
                            <a href="/register" className="mobile-auth-btn secondary">Зарегистрироваться</a>
                        </div>
                    </div>
                </div>
            )}
            <div className="anime-section-row">
                <CollectionStats animeId={animeId} />
                <AnimeCommentsSimple animeId={animeId} />
            </div>
        </div>
    );
};

export default MobileAnimePageTest;
