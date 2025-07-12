'use client';

import React, {useEffect, useState} from 'react';
import Image from 'next/image';
import { API_SERVER } from '../../../tools/constants';
import Head from "next/head";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ProfileMainInfoProps {
    username?: string; // если не всегда нужен, делай опциональным
}


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

const ProfileMainInfo: React.FC<ProfileMainInfoProps> = ({ username }) => {
    const [userName, setUserName] = useState<string>('Загрузка...');
    const [userDescription, setUserDescription] = useState<string | null>('...');
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);




    const getCookieToken = () => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : '';
    };


    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_SERVER}/api/profiles/get-profile?username=${username}`, {
                headers: { Authorization: `Bearer ${getCookieToken()}` }
            });
            if (res.ok) {
                const data: UserProfileResponse = await res.json();
                setUserName(data.nickname || data.username || 'Пользователь');
                setUserDescription(data.bio);
                const cleanRoles = data.roles.map(role => role.replace('ROLE_', ''));
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

    useEffect(() => {
        if (!username) return;

        // Получаем био отдельно
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

        fetchBio();
    }, [username]);

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
    const data = [
        { name: 'Просмотрено', value: 32 },
        { name: 'Смотрю', value: 2 },
        { name: 'Отложено', value: 5 },
        { name: 'Брошено', value: 11 },
        { name: 'В планах', value: 59 },
    ];

    const COLORS = ['#43d675', '#c4c4c4', '#ffd93a', '#ff4e4e', '#b97aff'];

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
            }

            // Баннер
            const bannerRes = await fetch(`${API_SERVER}/api/profiles/banner?username=${username}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (bannerRes.ok) {
                const bannerData = await bannerRes.json();
                if (bannerData.url) setBannerUrl(bannerData.url);
            }
        } catch (err) {
            console.error('Ошибка загрузки изображений профиля', err);
        }
    };

    const [visibleCount, setVisibleCount] = useState(2);
    const [showAll, setShowAll] = useState(false);

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
    // Загружаем профиль, картинки и т.д.
    useEffect(() => {
        fetchProfile();
        fetchImages();
        // не надо тут менять document.title!
    }, [username]);

// Отдельно обновляем title, когда реально загрузился userName
    useEffect(() => {
        if (userName && userName !== 'Загрузка...') {
            document.title = `${userName} | AniCat`;
        }
    }, [userName]);


    return (
        <>
            <Head>
                <title>Ваш профиль | AniCat</title>
                <meta name="description" content="Ваш профиль, где показаны ваши достижения, награды, роли и личная информация. Управляйте своими коллекциями и настройками аккаунта." />
                <meta name="keywords" content="AniCat, Профиль, Аниме, Коллекции, Награды, Роли" />
                <meta property="og:title" content="Ваш профиль | AniCat" />
                <meta property="og:description" content="Ваш профиль, где показаны ваши достижения, награды, роли и личная информация. Управляйте своими коллекциями и настройками аккаунта." />
                <meta property="og:image" content="https://anicat.ru/logo-cover.jpg" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://anicat.ru/profile" />
            </Head>

            <div className="profile-header">
                {bannerUrl ? (
                    <Image src={bannerUrl} alt="Баннер" fill className="profile-banner" style={{ objectFit: 'cover' }} />
                ) : <div className="banner-placeholder">Баннер</div>}
                <div className="profile-header-content">
                    <div className="profile-avatar-block">
                        <Image src={avatarUrl || '/default-avatar.png'} alt="Аватар" width={96} height={96} className="profile-avatar" />
                    </div>
                    <div className="profile-info-block">
                        <div className="nickname-line">
                            <div className="nickname-block">
                                <div className="nickname-icons">
                                    <img src="/bage1.png" alt="icon"/>
                                    <img src="/bage1.png" alt="icon"/>
                                </div>
                                <span className="nickname">{userName}</span>
                            </div>

                            {userRoles.includes('MODERATOR') && (
                                <span className="role-badge moderator">Модератор</span>
                            )}
                            {userRoles.includes('ANIME_CHECKER') && (
                                <span className="role-badge uploader">Заливщик</span>
                            )}
                            {userRoles.includes('ADMIN') && (
                                <span className="role-badge admin">Администратор</span>
                            )}

                            <span className="leaderboard-text">#12 в Лидерборде</span>
                        </div>
                        <div className="bio-line">
                            <span>
                                         {userDescription !== null && userDescription !== ""
                                             ? userDescription
                                            : <span style={{opacity: 0.6}}>Без описания</span>
        }
                                             </span>
                        </div>
                        <div className="status-text">Был(а) в сети: часов назад</div>
                    </div>
                </div>
            </div>

            <div className="profile-container">
                <div className="profile-layout">
                    <div className="profile-sidebar">
                        {/* Блок друзей */}
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

                        {/* Блок статистики */}
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
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
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
                    </div>
                </div>

                {/* Витрина достижений
                        <div className="profile-block achievements">
                            <h2>Витрина достижений</h2>
                            <div className="achievements-grid">
                                <div className="achievement">
                                    <Image src="/mock/ach1.png" alt="ach1" width={50} height={50} />
                                    <span className="achievement-title">Рецензент</span>
                                    <div className="stars yellow">★★</div>
                                </div>
                                <div className="achievement">
                                    <Image src="/mock/ach2.png" alt="ach2" width={50} height={50} />
                                    <span className="achievement-title">Weeb 24/7</span>
                                    <div className="stars blue">★★★</div>
                                </div>
                                <div className="achievement">
                                    <Image src="/mock/ach3.png" alt="ach3" width={50} height={50} />
                                    <span className="achievement-title">Экстраверт</span>
                                    <div className="stars green">★</div>
                                </div>
                                <div className="achievement add-more">+</div>
                            </div>
                            <div className="add-more-label">Добавить ещё</div>
                        </div>
                    </div>
                </div>*/}

                <div className="profile-main-content-container">
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
                </div>
            </div>
        </>
    );
};

export default ProfileMainInfo;