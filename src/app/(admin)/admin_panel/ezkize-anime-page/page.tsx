'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Play, Heart, Share2, Check, X, ExternalLink, Plus, Pause, Calendar } from 'lucide-react';

interface Episode {
    id: number;
    title: string;
    subtitle: string;
    duration: string;
    watched: boolean;
}

const statusOptions = [
    { label: 'Запланировано', icon: <Calendar size={18} />, value: 'planned' },
    { label: 'Смотрю', icon: <Play size={18} />, value: 'watching' },
    { label: 'Просмотрено', icon: <Check size={18} />, value: 'completed' },
    { label: 'Отложено', icon: <Pause size={18} />, value: 'paused' },
    { label: 'Брошено', icon: <X size={18} />, value: 'dropped' },
];

const AnimePage: React.FC = () => {
    const [episodes, setEpisodes] = useState<Episode[]>([
        { id: 1, title: 'Встреча судьбы', subtitle: 'Без паники', duration: '24 мин', watched: false },
        { id: 2, title: 'Первый урок магии', subtitle: 'Учимся колдовству', duration: '23 мин', watched: false },
        { id: 3, title: 'Неожиданный гость', subtitle: 'Вторжение в дом', duration: '25 мин', watched: false },
    ]);

    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [favorites, setFavorites] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('planned');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    useEffect(() => {
        const savedFavorite = localStorage.getItem('favorite_witchwatch');
        if (savedFavorite === 'true') setFavorites(true);

        const savedStatus = localStorage.getItem('anime_collection_status');
        if (savedStatus) setSelectedStatus(savedStatus);
    }, []);

    const toggleFavorite = () => {
        const newFavorite = !favorites;
        setFavorites(newFavorite);
        localStorage.setItem('favorite_witchwatch', newFavorite.toString());
    };

    const markAsWatched = (id: number) => {
        setEpisodes(prev => prev.map(ep => (ep.id === id ? { ...ep, watched: true } : ep)));
    };

    const unmarkAsWatched = (id: number) => {
        setEpisodes(prev => prev.map(ep => (ep.id === id ? { ...ep, watched: false } : ep)));
    };

    const handleStatusSelect = (value: string) => {
        setSelectedStatus(value);
        localStorage.setItem('anime_collection_status', value);
        setShowStatusDropdown(false);
    };

    const currentStatus = statusOptions.find(opt => opt.value === selectedStatus);

    const handleMenuToggle = (id: number) => {
        setOpenMenuId(prev => (prev === id ? null : id));
    };

    return (
        <div className="test-anime-page">
            {/* Верхняя часть */}
            <div className="test-top-section">
                <div className="test-background">
                    <Image src="/default_backgr.jpg" alt="Фон" fill className="test-background-image" />
                    <div className="test-background-overlay"></div>
                </div>

                <div className="test-top-content">
                    <div className="test-poster">
                        <Image src="/anime-cover-default.jpg" alt="Постер" width={220} height={320} className="test-poster-image" />
                    </div>

                    <div className="test-info-section">
                        <div className="test-header-block">
                            <div className="test-header-title-row">
                                <h1 className="test-title">WITCH WATCH</h1>
                                <span className="test-episode-progress">4 из 12</span>
                            </div>
                            <div className="test-alt-title">
                                The Witchs Watch
                            </div>
                        </div>

                        <div className="test-meta">
                            <span>12+</span> • <span>Субтитры, Озвучка</span> .
                            <a href="#">Комедия</a>, <a href="#">Фэнтези</a>, <a href="#">Романтика</a>, <a
                            href="#">Мистика</a>
                        </div>

                        <div className="test-rating">
                            ★★★★☆ 4.7 (6.1K)
                        </div>

                        <div className="test-buttons">
                            <div className="test-watch-button-wrapper">
                                <button className="test-watch-button">
                                    <Play size={20} style={{ marginRight: '8px' }} />
                                    Смотреть
                                </button>
                                <div className="test-episode-status">Добавлена серия 3</div>
                            </div>

                            {/* Кнопка коллекций */}
                            <div className="collection-status-wrapper">
                                <button
                                    className="collection-status-button"
                                    onClick={() => setShowStatusDropdown(prev => !prev)}
                                >
                                    {currentStatus?.icon}
                                    <span>{currentStatus?.label}</span>
                                    <svg className="arrow" width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M7 10l5 5 5-5z" />
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

                            {/* Кнопка избранное */}
                            <button
                                className={`test-favorite-button ${favorites ? 'active' : ''}`}
                                onClick={toggleFavorite}
                            >
                                <Heart size={20} fill={favorites ? '#e50914' : 'none'} stroke="#fff" />
                            </button>

                            {/* Кнопка поделиться */}
                            <button className="test-share-button">
                                <Share2 size={20} />
                            </button>
                        </div>

                        <div className="test-restriction-warning">
                            Данный контент недоступен на территории вашей страны
                        </div>

                        <p className="test-description">
                            Morihito Otogi is a high schooler with the strength of an ogre...
                        </p>

                        <div className="test-extra-info">
                            <div><strong>Озвучка:</strong> Japanese, English, Deutsch, Français</div>
                            <div><strong>Субтитры:</strong> Русский, English, Español, Français</div>
                            <div><strong>Студия:</strong> J.C. Staff</div>
                            <div><strong>Год:</strong> 2024</div>
                            <div><strong>Тип:</strong> ТВ-Сериал</div>
                            <div><strong>Возрастной рейтинг:</strong> 12+</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Контент ниже */}
            <div className="test-main-content">
                {/* Скриншоты */}
                <div className="test-screenshots-section">
                    <h2>Скриншоты</h2>
                    <div className="test-screenshots">
                        <Image src="/screenshot1.jpg" alt="Скриншот 1" width={220} height={130} />
                        <Image src="/screenshot2.jpg" alt="Скриншот 2" width={220} height={130} />
                        <Image src="/screenshot3.jpg" alt="Скриншот 3" width={220} height={130} />
                    </div>
                </div>

                {/* Эпизоды */}
                <div className="test-episodes-section">
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
                                    <button className="test-episode-menu-button" onClick={() => handleMenuToggle(episode.id)}>
                                        ⋮
                                    </button>
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
                </div>
            </div>
        </div>
    );
};

export default AnimePage;
