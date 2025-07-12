'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { API_SERVER } from '../../../tools/constants';
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import { useRouter } from 'next/navigation';


type Tab = 'friends' | 'stats' | 'watching' | 'history' | 'activity' | 'favorites' | 'reviews' | 'utils';


interface ProfileMainInfoProps {
    username?: string;
}

const TAB_LABELS: Record<Tab, string> = {
    friends: "Друзья",
    stats: "Статистика",
    watching: "Сейчас смотрит",
    history: "История",
    activity: "Активность",
    favorites: "Избранное",
    reviews: "Отзывы",
    utils: "Утилиты"
};

// Описываем тип ответа
interface UserProfileResponse {
    userId: number;
    username: string;
    roles: string[];
    profileId: number;
    nickname: string | null;
    bio: string | null;
    avatarId: string | null;
    bannerId: string | null;
}

// Функция получения токена из cookie
const getCookieToken = () => {
    const match = document.cookie.match(/token=([^;]+)/);
    return match ? match[1] : '';
};


const NewIdProfilePageMobileProvider: React.FC<ProfileMainInfoProps> = ({ username }) => {
    // --- Стейты ---
    const [activeTab, setActiveTab] = useState<Tab>('friends');
    const [userName, setUserName] = useState<string>('Загрузка...');
    const [userDescription, setUserDescription] = useState<string | null>('...');
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(2);
    const [showAll, setShowAll] = useState(false);
    const router = useRouter();
    // --- Данные (mock) ---
    // ... сюда подставь свои мок-данные, либо реальные

    // --- Фетч профиля ---
    useEffect(() => {
        if (!username) return;

        // ======= ВСЁ КАК ТЫ КИДАЛ В useEffect =======
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/profiles/get-profile?username=${username}`, {
                    headers: { Authorization: `Bearer ${getCookieToken()}` }
                });
                if (res.ok) {
                    const data: UserProfileResponse = await res.json();
                    setUserName(data.nickname || data.username || 'Пользователь');
                    setUserDescription(data.bio); // или "" если не нужен null
                    const cleanRoles = data.roles.map((role: string) => role.replace('ROLE_', ''));
                    setUserRoles(cleanRoles);
                } else {
                    setUserName('Ошибка');
                    setUserDescription('Профиль не найден');
                }
            } catch {
                setUserName('Ошибка');
                setUserDescription('Ошибка загрузки профиля');
            }
        };

        const fetchBio = async () => {
            try {
                const bioRes = await fetch(`${API_SERVER}/api/profiles/bio?username=${username}`);
                if (bioRes.ok) {
                    const bioData = await bioRes.json();
                    setUserDescription(bioData.bio ?? null);
                } else {
                    setUserDescription(null);
                }
            } catch {
                setUserDescription(null);
            }
        };

        const fetchImages = async () => {
            try {
                const token = getCookieToken();

                // Аватар
                const avatarRes = await fetch(`${API_SERVER}/api/profiles/avatar?username=${username}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (avatarRes.ok) {
                    const avatarData = await avatarRes.json();
                    if (avatarData.url) setAvatarUrl(avatarData.url);
                    else setAvatarUrl('/default-avatar.png');
                } else {
                    setAvatarUrl('/default-avatar.png');
                }

                // Баннер
                const bannerRes = await fetch(`${API_SERVER}/api/profiles/banner?username=${username}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (bannerRes.ok) {
                    const bannerData = await bannerRes.json();
                    if (bannerData.url) setBannerUrl(bannerData.url);
                    else setBannerUrl('/default-banner.jpg');
                } else {
                    setBannerUrl('/default-banner.jpg');
                }
            } catch (err) {
                setAvatarUrl('/default-avatar.png');
                setBannerUrl('/default-banner.jpg');
                console.error('Ошибка загрузки изображений профиля', err);
            }
        };

        // Запуск всех асинхронных загрузок
        fetchProfile();
        fetchBio();
        fetchImages();
    }, [username]);

// Пример статистики — можешь подставить свои значения:
    const data = [
        { name: 'Просмотрено', value: 32 },
        { name: 'Смотрю', value: 2 },
        { name: 'Отложено', value: 5 },
        { name: 'Брошено', value: 11 },
        { name: 'В планах', value: 59 },
    ];
    const watchingList = [
        { title: 'Лазарь', year: '2025', episodes: '12 эпизодов', season: '1 сезон' },
        { title: 'Лазарь', year: '2025', episodes: '12 эпизодов', season: '1 сезон' },
        { title: 'Лазарь', year: '2025', episodes: '12 эпизодов', season: '1 сезон' },
        { title: 'Лазарь', year: '2025', episodes: '12 эпизодов', season: '1 сезон' },
        { title: 'Лазарь', year: '2025', episodes: '12 эпизодов', season: '1 сезон' },
        { title: 'Лазарь', year: '2025', episodes: '12 эпизодов', season: '1 сезон' },
    ];
    const showMore = () => {
        setVisibleCount(prev => prev + 2);
    };
    const favorites = [
        {
            title: "Эксперименты Лэйн",
            coverUrl: "/anime-cover-default.jpg",
            year: 1998,
            episodes: 13,
            season: 1,
        },
        {
            title: "Азумага",
            coverUrl: "/anime-cover-default.jpg",
            year: 2002,
            episodes: 26,
            season: 1,
        },
        {
            title: "Лаки Стар",
            coverUrl: "/anime-cover-default.jpg",
            year: 2007,
            episodes: 24,
            season: 1,
        },
    ];
    const reviews = [
        {
            animeTitle: "Эксперименты Лэйн",
            coverUrl: "/anime-cover-default.jpg",
            rating: 8,
            text: "Очень атмосферное аниме, затрагивающее тему одиночества и цифровой личности.",
            timestamp: "2 дня назад",
        },
        {
            animeTitle: "Азумага",
            coverUrl: "/anime-cover-default.jpg",
            rating: 7,
            text: "Доброе, весёлое и странное — всё, что нужно для расслабления.",
            timestamp: "5 дней назад",
        },
        {
            animeTitle: "Азумага",
            coverUrl: "/anime-cover-default.jpg",
            rating: 7,
            text: "Доброе, весёлое и странное — всё, что нужно для расслабления.",
            timestamp: "5 дней назад",
        },
        {
            animeTitle: "Азумага",
            coverUrl: "/anime-cover-default.jpg",
            rating: 7,
            text: "Доброе, весёлое и странное — всё, что нужно для расслабления.",
            timestamp: "5 дней назад",
        }
    ];
    const historyDays = [
        {
            date: '29 мая',
            episodes: [
                { title: 'Лазарь', episode: '6 Серия', image: '/default-screenshot.png' }
            ]
        },
        {
            date: '28 мая',
            episodes: [
                { title: 'Непостижимая Ахарэн', episode: '1 Серия', image: '/default-screenshot.png' }
            ]
        },
        {
            date: '27 мая',
            episodes: [
                { title: 'Атака титанов', episode: '3 Серия', image: '/default-screenshot.png' }
            ]
        },
        // ...
    ];
    const COLORS = ['#43d675', '#c4c4c4', '#ffd93a', '#ff4e4e', '#b97aff'];
    const handleLogout = () => {
        document.cookie = "token=; path=/; max-age=0";
        router.replace('/login');
    };
    // --- Отдельные компоненты для каждой вкладки ---
    function TabFriends() {
        return (
            <div className="profile-block friends">
                <h2>Друзья</h2>
                <div className="friend-card">
                    <div className="friend-bg" style={{backgroundImage: "url('/banner_user.webp')"}}/>
                    <div className="friend-info">
                        <div className="friend-top">
                            <span className="friend-name">Hodyachilimplant</span>
                            <span className="friend-rank">#57 в Лидерборде</span>
                        </div>
                        <div className="friend-quote">“SVO”</div>
                        <Image src="/cover_user.webp" alt="avatar" width={32} height={32}
                               className="friend-avatar"/>
                    </div>
                </div>
                <div className="friend-card">
                    <div className="friend-bg" style={{backgroundImage: "url('/')"}}/>
                    <div className="friend-info">
                        <div className="friend-top">
                            <span className="friend-name">DvaceW</span>
                            <span className="friend-rank">#6 в Лидерборде</span>
                        </div>
                        <div className="friend-quote">“Главный за поставки — героиня”</div>
                        <Image src="/mock/avatar2.jpg" alt="avatar" width={32} height={32}
                               className="friend-avatar"/>
                    </div>
                </div>
            </div>
        );
    }

    function TabStats() {
        return (
            <div className="stats-chart-container">
                <h2>Статистика</h2>
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart width={220} height={220}>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                            ))}
                        </Pie>
                        <Tooltip/>
                    </PieChart>
                </ResponsiveContainer>
                <div className="stats-list">
                    {data.map((item, idx) => (
                        <div key={idx} className="stat-line">
                            <span style={{color: COLORS[idx]}}>{item.name}</span>
                            <span>{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    function TabWatching() {
        return (
            <div className="now-watching">
                <h2>Сейчас смотрит</h2>

                <div className={`watching-list ${showAll ? 'expanded' : ''}`}>
                    <div className="watching-list-container">
                        {(showAll ? watchingList : watchingList.slice(0, 4)).map((anime, i) => (
                            <div className="watching-card" key={i}>
                                <img src="/anime-cover-default.jpg" alt={anime.title}/>
                                <div className="watching-text">
                                    <div className="watching-left">
                                        <div className="title">{anime.title}</div>
                                        <div className="year">{anime.year}</div>
                                    </div>
                                    <div className="watching-right">
                                        <div className="episodes">{anime.episodes}<br/>{anime.season}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {watchingList.length > 4 && (
                    <div className="show-more-btn" onClick={() => setShowAll(prev => !prev)}>
                        {showAll ? 'Свернуть' : 'Посмотреть больше'}
                    </div>
                )}
            </div>
        );
    }

    function TabHistory() {
        return (
            <div className="watch-history">
                <h2>История просмотра</h2>

                {historyDays.slice(0, visibleCount).map((day, index) => (
                    <div key={index} className="history-day">
                        <div className="history-date">{day.date}</div>
                        <div className="episode-list">
                            {day.episodes.map((ep, i) => (
                                <div key={i} className="episode-card">
                                    <img src={ep.image} alt={ep.title}/>
                                    <div className="episode-overlay">
                                        <div className="anime-title">{ep.title}</div>
                                        <div className="episode-number">{ep.episode}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {historyDays.length > visibleCount && (
                    <div className="load-more" onClick={showMore}>
                        Загрузить ещё
                    </div>
                )}
            </div>
        );
    }

    function TabActivity() {
        return (
            <div className="recent-activity">
                <h2>Последняя активность</h2>
                <ul className="activity-list">
                    <li>
                        <span className="icon">⭐</span>
                        <span className="text">
                Поставил оценку аниме <strong>«Ангел по соседству»</strong> 8/10
                <span className="time">2 часа назад</span>
            </span>
                    </li>
                    <li>
                        <span className="icon">🎬</span>
                        <span className="text">
                Просмотрел все серии аниме <strong>«Ангел по соседству»</strong>
                <span className="time">Вчера</span>
            </span>
                    </li>
                    <li>
                        <span className="icon">🏅</span>
                        <span className="text">
                Получил ачивку <a href="#">«Храбрый рыцарь»</a>
                <span className="time">2 дня назад</span>
            </span>
                    </li>
                    <li>
                        <span className="icon">📌</span>
                        <span className="text">
                Добавил в коллекцию <strong>«Запланировано»</strong> аниме <strong>«Ангел по соседству»</strong>
                <span className="time">3 дня назад</span>
            </span>
                    </li>
                </ul>
            </div>
        );
    }

    function TabFavorites() {
        return (
            <div className="favorites-block">
                <h2>Избранное {userName}</h2>
                <div className="favorites-grid">
                    {favorites.map((anime, index) => (
                        <div key={index} className="anime-card">
                            <img src={anime.coverUrl} alt={anime.title}/>
                            <div className="anime-info">
                                <h3>{anime.title}</h3>
                                <div className="meta">
                                    <span>{anime.year}</span>
                                    <span>{anime.episodes} эпизодов {anime.season} сезон</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    function TabReviews() {
        return (
            <div className="user-reviews-block">
                <h2>Отзывы {userName}</h2>
                <div className="reviews-list">
                    {reviews.slice(0, visibleCount).map((review, index) => (
                        <div key={index} className="review-card">
                            <div className="anime-header-review">
                                <img src={review.coverUrl} alt={review.animeTitle}/>
                                <div className="anime-info-review">
                                    <h3>{review.animeTitle}</h3>
                                    <span className="rating">Оценка: {review.rating}/10</span>
                                </div>
                            </div>
                            <p className="review-text">{review.text}</p>
                            <span className="timestamp">{review.timestamp}</span>
                        </div>
                    ))}
                </div>

                {reviews.length > visibleCount && (
                    <div className="load-more-reviews" onClick={showMore}>
                        Загрузить ещё
                    </div>
                )}
            </div>
        );
    }

    function TabUtils() {
        return (
            <div className="profile-mobile-tab-content profile-mobile-utils">
                <button className="utils-btn" onClick={() => {
                    router.push("/profile/settings");
                }}>
        <span className="icon">
          {/* Иконка "настройки" */}
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3"/>
            <path
                d="M19.4 15A1.65 1.65 0 0 0 21 13.35V10.65A1.65 1.65 0 0 0 19.4 9l-1.38-.8a1.65 1.65 0 0 1-.67-2.26l.27-.47A1.65 1.65 0 0 0 16.65 3.6l-2.7-.02A1.65 1.65 0 0 0 12 2a1.65 1.65 0 0 0-1.65 1.58l-2.7.02A1.65 1.65 0 0 0 4.38 5.47l.27.47a1.65 1.65 0 0 1-.67 2.26L2.6 9A1.65 1.65 0 0 0 1 10.65v2.7A1.65 1.65 0 0 0 2.6 15l1.38.8a1.65 1.65 0 0 1 .67 2.26l-.27.47A1.65 1.65 0 0 0 7.35 20.4l2.7.02A1.65 1.65 0 0 0 12 22a1.65 1.65 0 0 0 1.65-1.58l2.7-.02a1.65 1.65 0 0 0 2.25-1.07l-.27-.47a1.65 1.65 0 0 1 .67-2.26L19.4 15z"/>
          </svg>
        </span>
                    Настройки профиля
                </button>
                <button className="utils-btn logout" onClick={handleLogout}>
      <span className="icon">
        {/* Иконка "выход" */}
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </span>
                    Выйти из аккаунта
                </button>
                <button className="utils-btn admin" onClick={() => {
                    router.push("/admin_panel");
                }}>
        <span className="icon">
          {/* Иконка "щит" */}
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </span>
                    Админ-панель
                </button>
                <button className="utils-btn old-site" onClick={() => {
                    window.open("https://anicat.fun", "_blank");
                }}>
        <span className="icon">
          {/* Иконка "rewind/undo" */}
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-7.5L1 10"/>
          </svg>
        </span>
                    Открыть старую версию AniCat
                </button>
            </div>
        );
    }


    // --- Вкладки-компоненты ---
    const tabComponents: Record<Tab, JSX.Element> = {
        friends: <TabFriends/>,
        stats: <TabStats/>,
        watching: <TabWatching/>,
        history: <TabHistory/>,
        activity: <TabActivity/>,
        favorites: <TabFavorites/>,
        reviews: <TabReviews/>,
        utils: <TabUtils/>,
    };

    return (
        <div className="profile-mobile-wrapper">
            {/* Баннер */}
            <div className="profile-mobile-banner">
                {bannerUrl ? (
                    <Image src={bannerUrl} alt="Баннер" fill style={{objectFit: 'cover'}}/>
                ) : <div className="banner-placeholder">Баннер</div>}
            </div>
            {/* Аватар */}
            <div className="profile-mobile-avatar-block">
                <Image src={avatarUrl || "/default-avatar.png"} alt="Аватар" width={96} height={96}
                       className="profile-mobile-avatar"/>
            </div>
            {/* ====== БЛОК НИКА, ЗНАЧКОВ И РОЛЕЙ ====== */}
            <div className="profile-mobile-username-block">
                {/* Значки (подставь свои иконки или любые SVG, можно src="/discord.svg" и т.д.) */}
                <div className="profile-mobile-badges">
                    <img src="/bage1.png" alt="Discord"/>
                    <img src="/bage1.png" alt="Звезда"/>
                    {/* ... любые свои */}
                </div>
                <div className="profile-mobile-username">{userName}</div>
                <div className="profile-mobile-roles">
                    {userRoles.includes("ADMIN") && <span className="role-badge admin">Администратор</span>}
                    {userRoles.includes("MODERATOR") && <span className="role-badge moderator">Модератор</span>}
                    {userRoles.includes("ANIME_CHECKER") && <span className="role-badge checker">Заливщик</span>}
                </div>
            </div>
            {/* ====== БЛОК БИО ====== */}
            <div className="profile-mobile-bio">
                {userDescription && userDescription.trim() !== ""
                    ? userDescription
                    : <span style={{opacity: 0.6}}>Без описания</span>
                }
            </div>

            {/* Tabs */}
            <div className="profile-mobile-tabs-bar">
                {Object.entries(TAB_LABELS).map(([tab, label]) => (
                    <button
                        key={tab}
                        className={`profile-mobile-tab-btn${activeTab === tab ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab as Tab)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {/* Контент активной вкладки */}
            <div className="profile-mobile-tabs-content">
                {tabComponents[activeTab]}
            </div>
        </div>


    );
};

export default NewIdProfilePageMobileProvider;
