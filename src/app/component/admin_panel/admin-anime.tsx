'use client';

import React, {ReactNode, useEffect, useState} from 'react';
import { API_SERVER } from '../../../tools/constants';
import { useRouter } from 'next/navigation';
import {CheckCircle, XCircle} from "lucide-react";

interface Anime {
    id: number;
    title: string;
    type: string;
    year: string;
}

interface Props {
    setNotification: (msg: ReactNode | null) => void;
}

const PAGE_SIZE = 15;
const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const AdminAnime: React.FC<Props> = ({ setNotification }) => {
    const [animeList, setAnimeList] = useState<Anime[]>([]);
    const [filteredList, setFilteredList] = useState<Anime[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchAnimeList();
    }, []);

    useEffect(() => {
        filterAnimeList();
        setCurrentPage(1);
    }, [searchTerm, animeList]);

    const fetchAnimeList = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_SERVER}/api/anime/get-anime`);
            if (!response.ok) throw new Error('Ошибка при получении аниме');
            const data = await response.json();
            setAnimeList(data);
        } catch (error) {
            console.error('Ошибка при получении списка аниме:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterAnimeList = () => {
        const filtered = animeList
            .filter((anime) =>
                anime.title.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.id - b.id);

        setFilteredList(filtered);
    };

    const handleCreateAnime = async () => {
        try {
            const token = getTokenFromCookie();
            if (!token) throw new Error('Токен не найден');

            const res = await fetch(`${API_SERVER}/api/admin/create-anime`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) throw new Error('Ошибка при создании аниме');

            const animeId = await res.json();

            setNotification(
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#22c55e" />
                    <span style={{ color: '#e0e0e0' }}>Аниме создано успешно</span>
                </div>
            );

            setTimeout(() => {
                setNotification(null);
                router.push(`/admin_panel/add-anime?id=${animeId}`);
            }, 1500);

        } catch (e) {
            console.error('Ошибка создания аниме:', e);
            setNotification(
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle size={18} color="crimson" />
                    <span style={{ color: '#e0e0e0' }}>Ошибка при создании аниме</span>
                </div>
            );
            setTimeout(() => setNotification(null), 1500);
        }
    };


    const handleDeleteAnime = async (id: number) => {
        if (!confirm(`Вы уверены, что хотите удалить аниме #${id}?`)) return;

        try {
            const token = getTokenFromCookie();
            if (!token) throw new Error('Токен не найден');
            const res = await fetch(`${API_SERVER}/api/admin/delete-anime/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) throw new Error('Ошибка при удалении');

            setAnimeList((prev) => prev.filter((anime) => anime.id !== id));
            setNotification(`✅ Аниме #${id} удалено`);
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            console.error('Ошибка при удалении аниме:', error);
            setNotification('❌ Ошибка при удалении аниме');
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const currentItems = filteredList.slice(startIndex, startIndex + PAGE_SIZE);

    return (
        <section className="admin-section">
            {loading ? (
                <div className="spinner-container">
                    <div className="spinner-anime" />
                </div>
            ) : (
                <>
                    {/* Десктопная версия */}
                    <div className="desktop-only-admin-anime">
                        <div className="admin-actions">
                            <input
                                type="text"
                                placeholder="Поиск по названию..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            {totalPages > 1 && (
                                <div className="pagination-anime">
                                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                        <button
                                            key={page}
                                            className={`page-button-anime ${currentPage === page ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button className="add-button" onClick={handleCreateAnime}>
                                + Добавить аниме
                            </button>
                        </div>

                        <div className="admin-table">
                            <div className="admin-table-header">
                                <span>ID</span>
                                <span>Название</span>
                                <span>Тип</span>
                                <span>Год</span>
                                <span>Действия</span>
                            </div>

                            {currentItems.map((anime) => (
                                <div className="admin-table-row" key={anime.id}>
                                    <span>{anime.id}</span>
                                    <span>{anime.title}</span>
                                    <span>{anime.type}</span>
                                    <span>{anime.year}</span>
                                    <span className="admin-table-actions">
                                    <button onClick={() => router.push(`/admin_panel/edit-anime?id=${anime.id}`)}>Редактировать</button>
                                    <button onClick={() => router.push(`/anime-page/${anime.id}`)}>Посмотреть</button>
                                    <button className="danger" onClick={() => handleDeleteAnime(anime.id)}>Удалить</button>
                                </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Мобильная версия */}
                    <div className="mobile-only-admin-anime">
                        <div className="admin-actions-mobile">
                            <input
                                type="text"
                                placeholder="Поиск по названию..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            {totalPages > 1 && (
                                <div className="pagination-anime">
                                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                        <button
                                            key={page}
                                            className={`page-button-anime ${currentPage === page ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button className="add-button" onClick={handleCreateAnime}>
                                + Добавить аниме
                            </button>
                        </div>

                        {currentItems.map((anime) => (
                            <div className="admin-card" key={anime.id}>
                                <div className="admin-card-info">
                                    <div><strong>ID:</strong> {anime.id}</div>
                                    <div><strong>Название:</strong> {anime.title}</div>
                                    <div><strong>Тип:</strong> {anime.type}</div>
                                    <div><strong>Год:</strong> {anime.year}</div>
                                </div>
                                <div className="admin-card-actions">
                                    <button onClick={() => router.push(`/admin_panel/edit-anime?id=${anime.id}`)}>Редактировать</button>
                                    <button onClick={() => router.push(`/anime-page/${anime.id}`)}>Посмотреть</button>
                                    <button className="danger" onClick={() => handleDeleteAnime(anime.id)}>Удалить</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
};

export default AdminAnime;
