'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { API_SERVER } from '@/hosts/constants';
import { ArrowLeft, ArrowRight, Pencil, Save, X, Plus, Trash2, Loader2 } from 'lucide-react';

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

interface Anime {
    id: number;
    title: string;
    year?: string;
    type?: string;
    status?: string;
    episodes?: number;
    coverUrl?: string;
    coverLoading?: boolean;
}

interface RawCategory {
    id: number;
    name: string;
    animeIds: number[];
}

interface Category {
    id: number;
    name: string;
    animes: Anime[];
}

function extractStartYear(yearStr?: string): number {
    if (!yearStr) return 0;
    const match = yearStr.match(/\d{4}/);
    return match ? parseInt(match[0]) : 0;
}

export default function AdminCategory() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [originalCategories, setOriginalCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Anime[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortDescending, setSortDescending] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [preserveFilter, setPreserveFilter] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [categorySearchQuery, setCategorySearchQuery] = useState('');

    // Загрузка данных
    useEffect(() => {
        const loadData = async () => {
            try {
                // Загружаем категории
                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`);
                const data = await res.json();
                const rawCategories: RawCategory[] = data.categories;

                // Собираем все ID аниме
                const allAnimeIds = [...new Set(rawCategories.flatMap(cat => cat.animeIds))];

                // Загружаем аниме через bulk API
                const animesMap = new Map<number, Anime>();

                try {
                    const token = getAuthToken();
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const bulkRes = await fetch(`${API_SERVER}/api/anime/get-anime`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(allAnimeIds)
                    });

                    if (bulkRes.ok) {
                        const animesList: Anime[] = await bulkRes.json();
                        animesList.forEach(anime => {
                            animesMap.set(Number(anime.id), {
                                ...anime,
                                id: Number(anime.id),
                                coverUrl: undefined,
                                coverLoading: false
                            });
                        });
                    }
                } catch (e) {
                    console.error('Bulk API error:', e);
                }

                // Формируем категории
                const categoriesWithAnime: Category[] = rawCategories.map(rawCat => ({
                    id: rawCat.id,
                    name: rawCat.name,
                    animes: rawCat.animeIds.map(id =>
                        animesMap.get(Number(id)) || { id: Number(id), title: 'Не найдено', coverLoading: false }
                    )
                }));

                setCategories(categoriesWithAnime);
                setOriginalCategories(categoriesWithAnime);
                setSelectedCategoryId(categoriesWithAnime[0]?.id ?? null);
                setLoading(false);

                // Фоновая загрузка обложек
                const allAnimes = Array.from(animesMap.values());
                for (let i = 0; i < allAnimes.length; i += 10) {
                    const batch = allAnimes.slice(i, i + 10);
                    await Promise.all(batch.map(async (anime) => {
                        try {
                            const res = await fetch(`${API_SERVER}/api/anime/optimized/get-anime/${anime.id}/basic`);
                            if (res.ok) {
                                const data = await res.json();
                                let coverUrl = data.coverUrl;

                                // Обработка относительных путей
                                if (coverUrl && coverUrl.startsWith('/')) {
                                    coverUrl = `${API_SERVER}${coverUrl}`;
                                }

                                // Если API не вернул обложку, используем старый метод как фоллбэк
                                if (!coverUrl || coverUrl.includes('placeholder')) {
                                    coverUrl = `${API_SERVER}/api/stream/${anime.id}/cover`;
                                }

                                setCategories(prev => prev.map(cat => ({
                                    ...cat,
                                    animes: cat.animes.map(a =>
                                        a.id === anime.id ? { ...a, coverUrl, coverLoading: false } : a
                                    )
                                })));
                            }
                        } catch (e) {
                            console.error(`Failed to load optimized cover for ${anime.id}`, e);
                        }
                    }));
                    await new Promise(r => setTimeout(r, 50));
                }
            } catch (error) {
                console.error('Error loading data:', error);
                toast.error('Ошибка загрузки данных');
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Поиск аниме
    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            setSearchPerformed(false);
            return;
        }

        setSearchLoading(true);
        const timeout = setTimeout(async () => {
            const res = await fetch(`${API_SERVER}/api/anime/search?query=${searchQuery}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.animes || [];
            setSearchResults(results.map((a: Anime) => ({
                ...a,
                coverUrl: `${API_SERVER}/api/stream/${a.id}/cover`
            })));
            setSearchLoading(false);
            setSearchPerformed(true);
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const scrollLeft = () => scrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' });
    const scrollRight = () => scrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' });

    const handleAddAnime = (anime: Anime) => {
        const category = categories.find(cat => cat.id === editingCategoryId);
        if (!category) return;

        if (category.animes.some(a => a.id === anime.id)) {
            toast.error(`Аниме уже есть в категории`);
            return;
        }

        toast.success('Аниме добавлено');
        setCategories(prev => prev.map(cat =>
            cat.id !== editingCategoryId ? cat : { ...cat, animes: [...cat.animes, anime] }
        ));
        setSearchResults(results => results.filter(a => a.id !== anime.id));
    };

    const handleRemoveAnime = (animeId: number) => {
        setCategories(prev => prev.map(cat =>
            cat.id === editingCategoryId
                ? { ...cat, animes: cat.animes.filter(a => a.id !== animeId) }
                : cat
        ));
        toast.success('Аниме удалено');
    };

    const handleSaveCategory = async () => {
        if (editingCategoryId == null) return;
        const category = categories.find(c => c.id === editingCategoryId);
        const animeIds = category?.animes.map(a => a.id) || [];

        toast.loading('Сохранение...');
        await fetch(`${API_SERVER}/api/admin/update-category/${editingCategoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ animeIds })
        });
        toast.dismiss();

        setOriginalCategories(JSON.parse(JSON.stringify(categories)));
        setEditingCategoryId(null);
        toast.success('Категория сохранена');
    };

    const handleCancelEdit = () => {
        // Сохраняем текущие обложки
        const currentCovers = new Map<number, string | undefined>();
        categories.forEach(cat => {
            cat.animes.forEach(anime => {
                if (anime.coverUrl) {
                    currentCovers.set(anime.id, anime.coverUrl);
                }
            });
        });

        // Восстанавливаем структуру категорий, но сохраняем обложки
        const restoredCategories = originalCategories.map(cat => ({
            ...cat,
            animes: cat.animes.map(anime => ({
                ...anime,
                coverUrl: currentCovers.get(anime.id) || anime.coverUrl
            }))
        }));

        setCategories(restoredCategories);
        setEditingCategoryId(null);
        toast('Изменения отменены');
        if (!preserveFilter) {
            setFilterType('all');
            setSortDescending(true);
        }
    };

    const currentCategory = categories.find(cat => cat.id === selectedCategoryId);

    const filteredAnimes = (currentCategory?.animes || []).filter(anime => {
        const type = (anime.type || '').toLowerCase();
        const status = (anime.status || '').toLowerCase();

        const matchesFilter =
            filterType === 'all' ? true :
                filterType === 'tv' ? type === 'tv' :
                    filterType === 'movie' ? type === 'фильм' :
                        filterType === 'status' ? status === 'онгоинг' :
                            true;

        const search = categorySearchQuery.trim().toLowerCase();
        const matchesSearch = !search ||
            (anime.title || '').toLowerCase().includes(search) ||
            anime.id.toString().includes(search);

        return matchesFilter && matchesSearch;
    });

    const sortedAnimes = [...filteredAnimes].sort((a, b) => {
        if (filterType === 'recent') return (b.id || 0) - (a.id || 0);
        if (filterType === 'episodes') return (b.episodes ?? 0) - (a.episodes ?? 0);
        const yearA = extractStartYear(a.year);
        const yearB = extractStartYear(b.year);
        return sortDescending ? yearB - yearA : yearA - yearB;
    });

    // Скелетон-лоадер
    if (loading) {
        return (
            <section className="yumeko-admin-section yumeko-admin-category">
                <div className="yumeko-admin-category-skeleton">
                    <div className="yumeko-admin-category-skeleton-tabs">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton-tab" />
                        ))}
                    </div>
                    <div className="yumeko-admin-category-skeleton-header">
                        <div className="skeleton-title" />
                        <div className="skeleton-actions" />
                    </div>
                    <div className="yumeko-admin-category-skeleton-grid">
                        {[...Array(18)].map((_, i) => (
                            <div key={i} className="skeleton-card">
                                <div className="skeleton-cover" />
                                <div className="skeleton-text" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="yumeko-admin-section yumeko-admin-category">
            <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />

            {/* Табы категорий */}
            <div className="yumeko-admin-category-tabs-wrapper">
                <button onClick={scrollLeft} className="yumeko-admin-category-scroll-btn">
                    <ArrowLeft size={18} />
                </button>
                <div className="yumeko-admin-category-tabs" ref={scrollRef}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`yumeko-admin-category-tab ${cat.id === selectedCategoryId ? 'active' : ''}`}
                            onClick={() => {
                                if (editingCategoryId !== null && editingCategoryId !== cat.id) {
                                    if (window.confirm('Сохранить изменения?')) {
                                        handleSaveCategory();
                                    } else {
                                        handleCancelEdit();
                                    }
                                }
                                setSelectedCategoryId(cat.id);
                            }}
                        >
                            {cat.name}
                            <span className="yumeko-admin-category-tab-count">{cat.animes.length}</span>
                        </button>
                    ))}
                </div>
                <button onClick={scrollRight} className="yumeko-admin-category-scroll-btn">
                    <ArrowRight size={18} />
                </button>
            </div>

            {/* Контент категории */}
            {currentCategory && (
                <div className="yumeko-admin-category-content">
                    {/* Заголовок */}
                    <div className="yumeko-admin-category-header">
                        <h2 className="yumeko-admin-category-title">{currentCategory.name}</h2>
                        <div className="yumeko-admin-category-actions">
                            {editingCategoryId !== currentCategory.id ? (
                                <button
                                    className="yumeko-admin-category-btn edit"
                                    onClick={() => setEditingCategoryId(currentCategory.id)}
                                >
                                    <Pencil size={16} />
                                    Редактировать
                                </button>
                            ) : (
                                <>
                                    <button className="yumeko-admin-category-btn save" onClick={handleSaveCategory}>
                                        <Save size={16} />
                                        Сохранить
                                    </button>
                                    <button className="yumeko-admin-category-btn cancel" onClick={handleCancelEdit}>
                                        <X size={16} />
                                        Отмена
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Панель редактирования */}
                    {editingCategoryId === currentCategory.id && (
                        <div className="yumeko-admin-category-edit-panel">
                            <div className="yumeko-admin-category-filters">
                                <label className="yumeko-admin-category-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={sortDescending}
                                        onChange={() => setSortDescending(p => !p)}
                                    />
                                    <span>Сначала новые</span>
                                </label>
                                <select
                                    className="yumeko-admin-category-select"
                                    value={filterType}
                                    onChange={e => setFilterType(e.target.value)}
                                >
                                    <option value="all">Все</option>
                                    <option value="tv">ТВ</option>
                                    <option value="movie">Фильмы</option>
                                    <option value="status">Онгоинг</option>
                                    <option value="episodes">По сериям</option>
                                    <option value="recent">Недавние</option>
                                </select>
                                <label className="yumeko-admin-category-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={preserveFilter}
                                        onChange={() => setPreserveFilter(p => !p)}
                                    />
                                    <span>Сохранить фильтр</span>
                                </label>
                            </div>

                            <div className="yumeko-admin-category-search">
                                <input
                                    type="text"
                                    placeholder="Поиск аниме для добавления..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="yumeko-admin-category-search-input"
                                />
                                {searchLoading && <Loader2 size={18} className="animate-spin" />}

                                {searchResults.length > 0 && (
                                    <div className="yumeko-admin-category-search-results">
                                        {searchResults.map(anime => (
                                            <div key={anime.id} className="yumeko-admin-category-search-item">
                                                <img src={anime.coverUrl} alt={anime.title} />
                                                <span>{anime.title}</span>
                                                <button onClick={() => handleAddAnime(anime)}>
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchPerformed && searchResults.length === 0 && !searchLoading && (
                                    <div className="yumeko-admin-category-search-empty">
                                        Ничего не найдено
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Поиск в категории */}
                    <div className="yumeko-admin-category-local-search">
                        <input
                            type="text"
                            placeholder="Поиск в категории..."
                            value={categorySearchQuery}
                            onChange={e => setCategorySearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Сетка аниме */}
                    <div className="yumeko-admin-category-grid">
                        {sortedAnimes.map(anime => (
                            <div key={anime.id} className="yumeko-admin-category-card">
                                <div className="yumeko-admin-category-card-cover">
                                    {anime.coverLoading ? (
                                        <div className="yumeko-admin-category-card-loading">
                                            <Loader2 size={24} className="animate-spin" />
                                        </div>
                                    ) : anime.coverUrl ? (
                                        <img src={anime.coverUrl} alt={anime.title} />
                                    ) : (
                                        <div className="yumeko-admin-category-card-placeholder">
                                            <span>🖼️</span>
                                        </div>
                                    )}
                                    <div className="yumeko-admin-category-card-overlay">
                                        <span className="yumeko-admin-category-card-title">{anime.title}</span>
                                    </div>
                                    {editingCategoryId === currentCategory.id && (
                                        <button
                                            className="yumeko-admin-category-card-delete"
                                            onClick={() => handleRemoveAnime(anime.id)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {sortedAnimes.length === 0 && (
                        <div className="yumeko-admin-category-empty">
                            {categorySearchQuery ? 'Ничего не найдено' : 'Категория пуста'}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
