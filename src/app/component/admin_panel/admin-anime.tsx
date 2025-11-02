'use client';

import React, { useEffect, useState} from 'react';
import { API_SERVER } from '@/hosts/constants';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DeleteAnimeModal from './DeleteAnimeModal';
import AdminAnimeUpdates from './AdminAnimeUpdates';
import { List, RefreshCw } from 'lucide-react';

interface Anime {
    id: number;
    title: string;
    type: string;
    year: string;
    status?: string;
    episode_all?: string;      // Общее количество эпизодов (строка)
    current_episode?: string;  // Текущее количество эпизодов (строка)
    alttitle?: string;
    rating?: string;
    season?: string;
    mouth_season?: string;
    studio?: string;
    genres?: string;
    alias?: string;
    realesed_for?: string;
    opened?: boolean;
    anons?: string;
}

interface Props {
    setNotification: (notification: {
        type: 'success' | 'error' | 'info' | 'warning' | 'anime-created' | 'anime-deleted';
        message: string;
    } | null) => void;
    userRoles: string[];
}

const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const AdminAnime: React.FC<Props> = ({ setNotification, userRoles }) => {
    const [animeList, setAnimeList] = useState<Anime[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false); // Отдельное состояние для загрузки таблицы
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [animeToDelete, setAnimeToDelete] = useState<number | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [filterType, setFilterType] = useState(''); // выбранный фильтр (только для серверной фильтрации)
    const [sortType, setSortType] = useState(''); // выбранная сортировка (для клиентской сортировки)
    const [activeSubTab, setActiveSubTab] = useState<'manage' | 'updates'>('manage');

    // Проверяем URL параметры для автоматического переключения на подтаб обновлений
    useEffect(() => {
        const adminPanel = searchParams.get('admin_panel');
        const hasAccess = userRoles.includes('ADMIN') || userRoles.includes('MODERATOR');
        if (adminPanel === 'edit-anime-updates' && hasAccess) {
            setActiveSubTab('updates');
        }
    }, [searchParams, userRoles]);

    // Дебаунс для поиска
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500); // 500ms задержка

        return () => clearTimeout(timer);
    }, [searchTerm]);


    // Функция для клиентской сортировки
    const sortAnimeList = (animes: Anime[], sortType: string): Anime[] => {
        if (!sortType) return animes;
        
        const sorted = [...animes];
        
        switch (sortType) {
            case 'date_new':
                return sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
            case 'date_old':
                return sorted.sort((a, b) => (a.id || 0) - (b.id || 0));
            case 'year_new':
                return sorted.sort((a, b) => {
                    const yearA = parseInt(a.year?.trim() || '0') || 0;
                    const yearB = parseInt(b.year?.trim() || '0') || 0;
                    return yearB - yearA;
                });
            case 'year_old':
                return sorted.sort((a, b) => {
                    const yearA = parseInt(a.year?.trim() || '0') || 0;
                    const yearB = parseInt(b.year?.trim() || '0') || 0;
                    return yearA - yearB;
                });
            case 'alpha_asc':
                return sorted.sort((a, b) => 
                    (a.title || '').localeCompare(b.title || '', 'ru', { sensitivity: 'base' })
                );
            case 'alpha_desc':
                return sorted.sort((a, b) => 
                    (b.title || '').localeCompare(a.title || '', 'ru', { sensitivity: 'base' })
                );
            default:
                return animes;
        }
    };

    // Параметры для пагинации
    const PAGE_SIZE = 15;
    const MAX_VISIBLE_PAGES = 10;
// Новое состояние для "окна" страниц
    const [pageWindowStart, setPageWindowStart] = useState(1);

// Функции для пролистывания окна страниц
    const handlePrevPageWindow = () => {
        if (pageWindowStart > 1) {
            setPageWindowStart(prev => Math.max(prev - MAX_VISIBLE_PAGES, 1));
        }
    };
    // Применяем клиентскую сортировку к списку аниме
    const sortedAnimeList = sortAnimeList(animeList, sortType);
    const totalPages = Math.ceil(sortedAnimeList.length / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const currentItems = sortedAnimeList.slice(startIndex, startIndex + PAGE_SIZE);
    const handleNextPageWindow = () => {
        if (pageWindowStart + MAX_VISIBLE_PAGES <= totalPages) {
            setPageWindowStart(prev => prev + MAX_VISIBLE_PAGES);
        }
    };

// Генерация видимых страниц
    const visiblePages = Array.from(
        { length: Math.min(MAX_VISIBLE_PAGES, totalPages - pageWindowStart + 1) },
        (_, i) => pageWindowStart + i
    );

    // Функция для получения красивого отображения статуса с эпизодами
    const getStatusDisplay = (status?: string, type?: string, current_episode?: string, episode_all?: string) => {
        const normalizedStatus = (status || '').toLowerCase();
        const normalizedType = (type || '').toLowerCase();
        
        // Определяем единицу измерения
        const unit = normalizedType === 'фильм' ? 'часть' : 'эп.';
        
        // Парсим строки в числа для работы
        const currentEps = current_episode ? parseInt(current_episode.trim()) || 0 : 0;
        const totalEps = episode_all ? parseInt(episode_all.trim()) || 0 : 0;
        
        let episodeText = '';
        
        if (normalizedStatus === 'онгоинг' || normalizedStatus === 'ongoing') {
            // Для онгоингов: текущее/общее количество
            if (currentEps > 0 && totalEps > 0) {
                episodeText = ` • ${currentEps}/${totalEps} ${unit}`;
            } else if (currentEps > 0) {
                episodeText = ` • ${currentEps} ${unit}`;
            } else if (totalEps > 0) {
                episodeText = ` • ?/${totalEps} ${unit}`;
            }
            return { text: 'Онгоинг', episodeText, className: 'status-ongoing' };
        } else if (normalizedStatus === 'вышел' || normalizedStatus === 'завершён' || normalizedStatus === 'completed') {
            // Для завершенных: только общее количество или текущее
            const displayEps = totalEps > 0 ? totalEps : currentEps;
            if (displayEps > 0) {
                episodeText = ` • ${displayEps} ${unit}`;
            }
            return { text: 'Вышел', episodeText, className: 'status-completed' };
        } else if (normalizedStatus === 'скоро' || normalizedStatus === 'анонс' || normalizedStatus === 'coming soon') {
            // Для анонсов: планируемое общее количество
            if (totalEps > 0) {
                episodeText = ` • ${totalEps} ${unit}`;
            } else if (currentEps > 0) {
                episodeText = ` • ${currentEps} ${unit}`;
            }
            return { text: 'Скоро', episodeText, className: 'status-coming-soon' };
        } else {
            // Для неизвестного статуса: показываем что есть
            const displayEps = totalEps > 0 ? totalEps : currentEps;
            if (displayEps > 0) {
                episodeText = ` • ${displayEps} ${unit}`;
            }
            return { text: status || 'N/A', episodeText, className: 'status-unknown' };
        }
    };



    // Первичная загрузка
    useEffect(() => {
        fetchAnimeList(true); // Первичная загрузка
    }, []);

    // Загрузка при изменении фильтров/поиска (не первичная)
    useEffect(() => {
        // Не вызываем на первой загрузке, если и поиск и фильтр пусты
        if (animeList.length > 0) {
            fetchAnimeList(false);
        }
    }, [debouncedSearch, filterType]);

    useEffect(() => {
        if (animeList.length > 0) {
            setCurrentPage(1); // Сброс страницы при новых данных
        }
    }, [animeList]);

    // Сброс страницы при изменении сортировки
    useEffect(() => {
        setCurrentPage(1);
    }, [sortType]);

    const fetchAnimeList = async (isInitialLoad = false) => {
        try {
            if (isInitialLoad) {
                setLoading(true);
            } else {
                setTableLoading(true);
            }
            
            // Подготавливаем параметры для серверной фильтрации
            const params = new URLSearchParams();
            
            if (debouncedSearch.trim()) {
                params.append('search', debouncedSearch.trim());
            }
            
            // Конвертируем только настоящие фильтры в формат сервера (сортировки убираем)
            if (filterType) {
                let serverFilter = '';
                switch (filterType) {
                    case 'tv': serverFilter = 'tv'; break;
                    case 'movie': serverFilter = 'movie'; break;
                    case 'ongoing': serverFilter = 'ongoing'; break;
                    case 'completed': serverFilter = 'completed'; break;
                    case 'coming_soon': serverFilter = 'coming_soon'; break;
                    // Сортировки убраны - они будут обрабатываться на клиенте
                }
                if (serverFilter) {
                    params.append('filter', serverFilter);
                }
            }
            
            // Используем оптимизированный API с серверной фильтрацией
            const url = `${API_SERVER}/api/anime/optimized/get-all-anime/admin${params.toString() ? '?' + params.toString() : ''}`;
            console.log('Fetching from:', url);
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Ошибка при получении аниме');
            const data = await response.json();
            
            setAnimeList(data);
        } catch (error) {
            console.error('Ошибка при получении списка аниме:', error);
            // Fallback на старый API если новый не работает
            try {
                const response = await fetch(`${API_SERVER}/api/anime/get-anime`);
                if (!response.ok) throw new Error('Ошибка при получении аниме');
                const data = await response.json();
                setAnimeList(data);
            } catch (fallbackError) {
                console.error('Ошибка при fallback загрузке:', fallbackError);
            }
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            } else {
                setTableLoading(false);
            }
        }
    };

    const handleCreateAnime = async () => {
        try {
            // Запускаем анимацию перехода
            setIsTransitioning(true);
            
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

            setNotification({
                type: 'anime-created',
                message: 'Аниме создано успешно'
            });

            setTimeout(() => {
                setNotification(null);
                router.push(`/admin_panel/add-anime?id=${animeId}`);
            }, 1500);

        } catch (e) {
            console.error('Ошибка создания аниме:', e);
            setIsTransitioning(false);
            setNotification({
                type: 'error',
                message: 'Ошибка при создании аниме'
            });
            setTimeout(() => setNotification(null), 1500);
        }
    };


    const removeAnimeFromAllCategory = async (id: number) => {
        const token = getTokenFromCookie();
        if (!token) return;

        try {
            const response = await fetch(`${API_SERVER}/api/admin/remove-from-all-category/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const text = await response.text();
                console.error("⚠️ Ошибка удаления из категории 'все аниме':", text);
            }
        } catch (error) {
            console.error("⚠️ Ошибка при удалении из категории 'все аниме':", error);
        }
    };

    const handleDeleteAnime = (id: number) => {
        setAnimeToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDeleteAnime = async () => {
        if (!animeToDelete) return;

        try {
            const token = getTokenFromCookie();
            if (!token) throw new Error('Токен не найден');
            
            // Сначала удаляем из категории "все аниме"
            await removeAnimeFromAllCategory(animeToDelete);
            
            // Затем удаляем само аниме
            const res = await fetch(`${API_SERVER}/api/admin/delete-anime/${animeToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) throw new Error('Ошибка при удалении');

            // Обновляем список аниме
            await fetchAnimeList();
            
            setNotification({
                type: 'anime-deleted',
                message: `Аниме #${animeToDelete} удалено из сайта`
            });
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            console.error('Ошибка при удалении аниме:', error);
            setNotification({
                type: 'error',
                message: 'Ошибка при удалении аниме'
            });
            setTimeout(() => setNotification(null), 3000);
            throw error; // Передаем ошибку в модальное окно
        }
    };

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setAnimeToDelete(null);
    };



    return (
        <section className="admin-section">
            {/* Анимационный оверлей при переходе */}
            {isTransitioning && (
                <div className="page-transition-overlay">
                    <div className="transition-content">
                        <div className="transition-spinner"></div>
                        <div className="transition-text">Создание нового аниме...</div>
                    </div>
                </div>
            )}

            {/* Подтабы */}
            <div className="admin-anime-subtabs">
                <button
                    className={`admin-subtab ${activeSubTab === 'manage' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('manage')}
                >
                    <List size={18} />
                    <span>Управление аниме</span>
                </button>
                
                {(userRoles.includes('ADMIN') || userRoles.includes('MODERATOR')) && (
                    <button
                        className={`admin-subtab ${activeSubTab === 'updates' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('updates')}
                    >
                        <RefreshCw size={18} />
                        <span>Обновления аниме</span>
                    </button>
                )}
            </div>

            {/* Контент подтабов */}
            {activeSubTab === 'updates' && (userRoles.includes('ADMIN') || userRoles.includes('MODERATOR')) ? (
                <AdminAnimeUpdates />
            ) : (
                <>
                            
                            {/* Десктопная версия */}
                            <div className="desktop-only-admin-anime desktop-only admin-anime-container">
                        <div className="admin-actions" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '15px'
                        }}>

                            {/* Левая колонка */}
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px'}}>
                                <span style={{color: '#ccc', fontSize: '14px'}}>
                                    {debouncedSearch || filterType || sortType ? `Показано: ${sortedAnimeList.length} аниме` : `На сайте: ${sortedAnimeList.length} аниме`}
                                </span>

                                <select
                                    value={filterType || sortType}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Разделяем фильтры и сортировки
                                        const sortOptions = ['date_new', 'date_old', 'year_new', 'year_old', 'alpha_asc', 'alpha_desc'];
                                        if (sortOptions.includes(value)) {
                                            setSortType(value);
                                            setFilterType('');
                                        } else {
                                            setFilterType(value);
                                            setSortType('');
                                        }
                                        // Сброс страницы при изменении фильтра/сортировки
                                        setCurrentPage(1);
                                    }}
                                    className="filter-select"
                                >
                                    <option value="">Без фильтра</option>
                                    <option value="date_new">По дате (новые сверху)</option>
                                    <option value="date_old">По дате (старые сверху)</option>
                                    <option value="tv">Только TV</option>
                                    <option value="movie">Только фильмы</option>
                                    <option value="ongoing">Только онгоинги</option>
                                    <option value="completed">Только вышедшие</option>
                                    <option value="coming_soon">Только анонсированные</option>
                                    <option value="year_new">По годам (новые сверху)</option>
                                    <option value="year_old">По годам (старые сверху)</option>
                                    <option value="alpha_asc">По алфавиту (А-Я)</option>
                                    <option value="alpha_desc">По алфавиту (Я-А)</option>
                                </select>

                                <div style={{position: 'relative'}}>
                                    <input
                                        type="text"
                                        placeholder="Поиск по ID/Названию..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="search-input"
                                    />
                                    {loading && debouncedSearch !== searchTerm && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: '#3b82f6',
                                            fontSize: '12px'
                                        }}>
                                            🔍 Поиск...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Центр */}
                            <div style={{display: 'flex', justifyContent: 'center', flex: 1}}>
                                {totalPages > 1 && (
                                    <div className="pagination-anime">
                                        {totalPages > MAX_VISIBLE_PAGES && (
                                            <button
                                                className="page-button-anime"
                                                onClick={handlePrevPageWindow}
                                                disabled={pageWindowStart === 1}
                                            >
                                                ‹
                                            </button>
                                        )}

                                        {visiblePages.map((page) => (
                                            <button
                                                key={page}
                                                className={`page-button-anime ${currentPage === page ? 'active' : ''}`}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </button>
                                        ))}

                                        {totalPages > MAX_VISIBLE_PAGES && (
                                            <button
                                                className="page-button-anime"
                                                onClick={handleNextPageWindow}
                                                disabled={pageWindowStart + MAX_VISIBLE_PAGES > totalPages}
                                            >
                                                ›
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Правая колонка */}
                            <div>
                                <button className="add-button" onClick={handleCreateAnime}>
                                    + Добавить аниме
                                </button>
                            </div>
                        </div>

                        <div className="modern-admin-table">
                            <div className="table-container">
                                <div className="table-header">
                                    <div className="header-cell header-id">ID</div>
                                    <div className="header-cell header-title">Название</div>
                                    <div className="header-cell header-type">Тип</div>
                                    <div className="header-cell header-year">Год</div>
                                    <div className="header-cell header-status">Статус</div>
                                    <div className="header-cell header-actions">Действия</div>
                                </div>

                                {/* Спиннер для области таблицы */}
                                {(loading || tableLoading) ? (
                                    <div className="table-loading" style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        minHeight: '400px',
                                        color: '#ccc'
                                    }}>
                                        <div className="spinner-anime" />
                                    </div>
                                ) : (
                                    <div className="table-body">
                                    {currentItems.map((anime) => {
                                        const statusInfo = getStatusDisplay(anime.status, anime.type, anime.current_episode, anime.episode_all);
                                        return (
                                            <div className="table-row" key={anime.id}>
                                                <div className="cell cell-id">
                                                    <span className="id-badge">{anime.id}</span>
                                                </div>
                                                
                                                <div className="cell cell-title">
                                                    <div className="title-wrapper">
                                                        <h4 className="anime-title">{anime.title}</h4>
                                                    </div>
                                                </div>
                                                
                                                <div className="cell cell-type">
                                                    <span className="type-tag">{anime.type}</span>
                                                </div>
                                                
                                                <div className="cell cell-year">
                                                    <span className="year-text">{anime.year}</span>
                                                </div>
                                                
                                                <div className="cell cell-status">
                                                    <div className={`status-badge-modern ${statusInfo.className}`}>
                                                        <div className="status-content">
                                                            <span className="status-label">{statusInfo.text}</span>
                                                            {statusInfo.episodeText && (
                                                                <span className="episode-count">{statusInfo.episodeText}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="cell cell-actions">
                                                    <div className="actions-group">
                                                        <button
                                                            className="action-btn edit-btn"
                                                            onClick={() => router.push(`/admin_panel/edit-anime?id=${anime.id}`)}
                                                            title="Редактировать аниме"
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                            </svg>
                                                            <span>Редактировать</span>
                                                        </button>
                                                        
                                                        <Link 
                                                            href={`/anime-page/${anime.id}`}
                                                            className="action-btn view-btn"
                                                            title="Посмотреть аниме"
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                                <circle cx="12" cy="12" r="3"/>
                                                            </svg>
                                                            <span>Посмотреть</span>
                                                        </Link>
                                                        
                                                        <button
                                                            className="action-btn delete-btn"
                                                            onClick={() => handleDeleteAnime(anime.id)}
                                                            title="Удалить аниме"
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                <polyline points="3,6 5,6 21,6"/>
                                                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                                                <line x1="10" y1="11" x2="10" y2="17"/>
                                                                <line x1="14" y1="11" x2="14" y2="17"/>
                                                            </svg>
                                                            <span>Удалить</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Мобильная версия */}
                    <div className="mobile-only-admin-anime mobile-only admin-anime-container">
                        {/* Заголовок с количеством */}
                        <div className="mobile-anime-header">
                            <div className="anime-count">
                                {debouncedSearch || filterType || sortType ? (
                                    <>Показано: <strong>{sortedAnimeList.length} аниме</strong></>
                                ) : (
                                    <>На сайте: <strong>{sortedAnimeList.length} аниме</strong></>
                                )}
                            </div>
                        </div>

                        {/* Поиск и фильтры */}
                        <div className="mobile-search-section">
                            <div className="mobile-search-wrapper">
                                <svg className="search-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Поиск по ID или названию..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="mobile-search-input"
                                />
                            </div>
                            <div className="mobile-filter-wrapper">
                                <select
                                    value={filterType || sortType}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Разделяем фильтры и сортировки
                                        const sortOptions = ['date_new', 'date_old', 'year_new', 'year_old', 'alpha_asc', 'alpha_desc'];
                                        if (sortOptions.includes(value)) {
                                            setSortType(value);
                                            setFilterType('');
                                        } else {
                                            setFilterType(value);
                                            setSortType('');
                                        }
                                        // Сброс страницы при изменении фильтра/сортировки
                                        setCurrentPage(1);
                                    }}
                                    className="mobile-filter-select"
                                >
                                    <option value="">Без фильтра</option>
                                    <option value="date_new">По дате (новые сверху)</option>
                                    <option value="date_old">По дате (старые сверху)</option>
                                    <option value="tv">Только TV</option>
                                    <option value="movie">Только фильмы</option>
                                    <option value="ongoing">Только онгоинги</option>
                                    <option value="completed">Только вышедшие</option>
                                    <option value="coming_soon">Только анонсированные</option>
                                    <option value="year_new">По годам (новые сверху)</option>
                                    <option value="year_old">По годам (старые сверху)</option>
                                    <option value="alpha_asc">По алфавиту (А-Я)</option>
                                    <option value="alpha_desc">По алфавиту (Я-А)</option>
                                </select>
                            </div>
                        </div>

                        {/* Пагинация сверху */}
                        {totalPages > 1 && (
                            <div className="mobile-pagination-top">
                                <div className="mobile-pagination-card">
                                    <div className="mobile-pagination-controls">
                                        <button
                                            className="mobile-page-btn"
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            ‹
                                        </button>
                                        
                                        {Array.from({length: Math.min(7, totalPages)}, (_, index) => {
                                            const startPage = Math.max(1, Math.min(currentPage - 3, totalPages - 6));
                                            const page = startPage + index;
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`mobile-page-btn ${currentPage === page ? 'active' : ''}`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}
                                        
                                        <button
                                            className="mobile-page-btn"
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            ›
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Список аниме */}
                        <div style={{ padding: '0' }}>
                            {(loading || tableLoading) ? (
                                <div className="mobile-loading" style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minHeight: '400px',
                                    color: '#ccc'
                                }}>
                                    <div className="spinner-anime" />
                                </div>
                            ) : currentItems.length > 0 ? (
                                currentItems.map((anime) => (
                                    <div key={anime.id} style={{
                                        padding: '16px',
                                        marginBottom: '8px',
                                        width: '100%'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                                                    {anime.title || 'Без названия'}
                                                </h3>
                                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                        Тип: <span style={{ color: '#d1d5db' }}>{anime.type || 'N/A'}</span>
                                                    </span>
                                                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                        Год: <span style={{ color: '#d1d5db' }}>{anime.year || 'N/A'}</span>
                                                    </span>
                                                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                        {(() => {
                                                            const statusInfo = getStatusDisplay(anime.status, anime.type, anime.current_episode, anime.episode_all);
                                                            return (
                                                                <>
                                                                    Статус: <span className={`status-badge-mobile ${statusInfo.className}`}>
                                                                        {statusInfo.text}
                                                                        {statusInfo.episodeText}
                                                                    </span>
                                                                </>
                                                            );
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ 
                                                color: '#3b82f6', 
                                                fontSize: '14px', 
                                                fontWeight: 'bold' 
                                            }}>
                                                #{anime.id}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <Link 
                                                href={`/anime-page/${anime.id}`} 
                                                style={{
                                                    color: '#10b981',
                                                    padding: '12px',
                                                    textAlign: 'center',
                                                    textDecoration: 'none',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Посмотреть
                                            </Link>
                                            <button
                                                style={{
                                                    color: '#3b82f6',
                                                    padding: '12px',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    textAlign: 'center'
                                                }}
                                                onClick={() => router.push(`/admin_panel/edit-anime?id=${anime.id}`)}
                                            >
                                                Редактировать
                                            </button>
                                            <button 
                                                style={{
                                                    color: '#ef4444',
                                                    padding: '12px',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    textAlign: 'center'
                                                }}
                                                onClick={() => handleDeleteAnime(anime.id)}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                    <p>Аниме не найдено</p>
                                </div>
                            )}
                        </div>

                        {/* Floating кнопка добавления - справа снизу */}
                        <button 
                            style={{
                                position: 'fixed',
                                bottom: '90px',
                                right: '20px',
                                width: '60px',
                                height: '60px',
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                border: 'none',
                                borderRadius: '20px',
                                color: 'white',
                                fontSize: '24px',
                                cursor: 'pointer',
                                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)',
                                zIndex: 999
                            }}
                            onClick={handleCreateAnime}
                        >
                            +
                        </button>
                    </div>
                </>
            )}

            {/* Модальное окно удаления аниме */}
            <DeleteAnimeModal
                animeId={animeToDelete || 0}
                isOpen={deleteModalOpen}
                onClose={closeDeleteModal}
                onConfirmDelete={confirmDeleteAnime}
                userRoles={userRoles}
            />
        </section>
    );
};

export default AdminAnime;
