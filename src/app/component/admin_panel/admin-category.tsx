'use client';

// Импортируй необходимые пакеты
import React, { useEffect, useRef, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import { Pencil, Save, X, Trash2, Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import {toast, Toaster} from 'react-hot-toast';
import ClipLoader from 'react-spinners/ClipLoader';

interface Anime {
    id: number;
    title: string;
    year?: string;
    type?: string;
    status?: string;
    episodes?: number;
    coverUrl?: string; // <= Добавлено
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




    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`);
                const data = await res.json();
                const rawCategories: RawCategory[] = data.categories;

                const processed: Category[] = await Promise.all(
                    rawCategories.map(async rawCat => {
                        const animes: Anime[] = await Promise.all(
                            rawCat.animeIds.map(async id => {
                                const res = await fetch(`${API_SERVER}/api/anime/get-anime/${id}`);
                                if (!res.ok) return { id, title: '❌ Не найдено' };
                                const data = await res.json();
                                return {
                                    id: data.id,
                                    title: data.title,
                                    year: data.year,
                                    type: data.type,
                                    status: data.status,
                                    episodes: data.episodes,
                                    coverUrl: `${API_SERVER}/api/stream/${data.id}/cover`,
                                };
                            })
                        );
                        return { id: rawCat.id, name: rawCat.name, animes };
                    })
                );

                setCategories(processed);
                setOriginalCategories(processed);
                setSelectedCategoryId(processed[0]?.id ?? null);
                setLoading(false);
            } catch {
                toast.error('Ошибка при загрузке категорий');
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([]);
            setSearchPerformed(false);
            return;
        }

        setSearchPerformed(false); // Сброс перед новым поиском
        setSearchLoading(true);

        const timeout = setTimeout(async () => {
            const res = await fetch(`${API_SERVER}/api/anime/search?query=${searchQuery}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.animes || [];

            setSearchResults(
                results.map((a: Anime) => ({
                    ...a,
                    coverUrl: `${API_SERVER}/api/stream/${a.id}/cover`
                }))
            );
            setSearchLoading(false);
            setSearchPerformed(true); // Поиск завершён
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const scrollLeft = () => scrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' });
    const scrollRight = () => scrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' });

    const handleAddAnime = (anime: Anime) => {
        const category = categories.find(cat => cat.id === editingCategoryId);
        if (!category) return;

        const isAlreadyInCategory = category.animes.some(a => a.id === anime.id);
        if (isAlreadyInCategory) {
            toast.error(`Данное аниме уже есть в категории "${category.name}"`);
            return;
        }

        toast.success('Аниме добавлено');
        setCategories(prev =>
            prev.map(cat => {
                if (cat.id !== editingCategoryId) return cat;
                return {
                    ...cat,
                    animes: [...cat.animes, anime]
                };
            })
        );
        setSearchResults(results => results.filter(a => a.id !== anime.id));
    };


    const handleRemoveAnime = (animeId: number) => {
        setCategories(prev =>
            prev.map(cat =>
                cat.id === editingCategoryId
                    ? { ...cat, animes: cat.animes.filter(a => a.id !== animeId) }
                    : cat
            )
        );
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
        setCategories(JSON.parse(JSON.stringify(originalCategories)));
        setEditingCategoryId(null);
        toast('Изменения отменены');

        // Сброс фильтров, если не сохранены
        if (!preserveFilter) {
            setFilterType('all');
            setSortDescending(true);
        }
    };


    const currentCategory = categories.find(cat => cat.id === selectedCategoryId);
    const filteredAnimes = (currentCategory?.animes || []).filter(anime => {
        const matchesFilter = (() => {
            if (filterType === "tv") return anime.type?.toLowerCase() === "tv";
            if (filterType === "movie") return anime.type?.toLowerCase() === "фильм";
            if (filterType === "status") return anime.status?.toLowerCase() === "онгоинг";
            if (filterType === "episodes") return true;
            if (filterType === "recent") return true;
            return true;
        })();

        const search = categorySearchQuery.trim().toLowerCase();
        const matchesSearch =
            search === '' ||
            anime.title.toLowerCase().includes(search) ||
            anime.id.toString().includes(search);

        return matchesFilter && matchesSearch;
    });



    const sortedAnimes = filteredAnimes.sort((a, b) => {
        const yearA = extractStartYear(a.year);
        const yearB = extractStartYear(b.year);

        if (filterType === "recent") return b.id - a.id;
        if (filterType === "episodes") {
            return (b.episodes ?? 0) - (a.episodes ?? 0);
        }

        return sortDescending ? yearB - yearA : yearA - yearB;
    });


    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: '2rem', marginTop: '2rem' }}>
                <ClipLoader size={40} color="crimson" />
            </div>
        );
    }


    return (
        <div className="admin-category-container">

            {/* Десктоп версия */}
            <div className="admin-desktop-category">
                <div className="admin-category-container">
                    <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
                    <div className="category-selector-wrapper">
                        <button onClick={scrollLeft} className="scroll-btn"><ArrowLeft /></button>
                        <div className="category-selector" ref={scrollRef}>
                            {categories.map(cat => (
                                <div key={cat.id} className={`category-chip ${cat.id === selectedCategoryId ? 'active' : ''}`} onClick={() => {
                                    if (editingCategoryId !== null && editingCategoryId !== cat.id) {
                                        const confirmSwitch = window.confirm("Вы редактируете категорию. Сохранить изменения?");
                                        if (confirmSwitch) {
                                            handleSaveCategory();
                                        } else {
                                            handleCancelEdit();
                                        }
                                    }
                                    setSelectedCategoryId(cat.id);
                                }}
                                >
                                    {cat.name}
                                </div>
                            ))}
                        </div>
                        <button onClick={scrollRight} className="scroll-btn"><ArrowRight /></button>
                    </div>

                    {currentCategory && (
                        <div className="admin-category-block">
                            <div className="category-header">
                                <h2>{currentCategory.name}</h2>
                                <div className="icons">
                                    {editingCategoryId !== currentCategory.id ? (
                                        <button onClick={() => setEditingCategoryId(currentCategory.id)}><Pencil/></button>
                                    ) : (
                                        <>
                                            <button onClick={handleSaveCategory}><Save/></button>
                                            <button onClick={handleCancelEdit}><X/></button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {editingCategoryId === currentCategory.id && (
                                <>
                                    <div className="filters-row">
                                        <label className="filter-checkbox">
                                            <input type="checkbox" checked={sortDescending}
                                                   onChange={() => setSortDescending(prev => !prev)}/>
                                            Сначала новые
                                        </label>

                                        <select className="filter-select" value={filterType}
                                                onChange={e => setFilterType(e.target.value)}>
                                            <option value="all">Все</option>
                                            <option value="tv">По ТВ</option>
                                            <option value="movie">По фильмам</option>
                                            <option value="status">По статусу (Ongoing)</option>
                                            <option value="episodes">По количеству серий</option>
                                            <option value="recent">Недавно добавленные</option>
                                        </select>

                                        <label className="filter-checkbox">
                                            <input type="checkbox" checked={preserveFilter}
                                                   onChange={() => setPreserveFilter(prev => !prev)}/>
                                            Сохранить фильтр
                                        </label>
                                    </div>
                                    <div className="mini-search">
                                        <div className="search-input-wrapper">
                                            <input
                                                type="text"
                                                placeholder="Поиск по названию или ID"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            {searchLoading &&
                                                <ClipLoader size={18} color="crimson" className="search-spinner"/>}
                                        </div>

                                        <div className="search-results">
                                            {!searchLoading && searchPerformed && searchResults.length === 0 ? (
                                                <div className="no-results">
                                                    Ничего не найдено, проверьте айди или название аниме/тайтла
                                                </div>
                                            ) : (
                                                searchResults.map(anime => (
                                                    <div className="search-item" key={anime.id}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={anime.coverUrl} alt={anime.title} className="search-thumb"/>
                                                        <span>{anime.title}</span>
                                                        <button onClick={() => handleAddAnime(anime)}><Plus/></button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="category-local-search">
                                <input
                                    type="text"
                                    placeholder="Поиск в категории..."
                                    value={categorySearchQuery}
                                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="anime-card-list">
                                {sortedAnimes.map(anime => (
                                    <div key={anime.id} className="anime-card">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={anime.coverUrl} alt={anime.title} className="anime-cover"/>
                                        <div className="anime-title">{anime.title}</div>
                                        {editingCategoryId === currentCategory.id && (
                                            <button className="delete-button" onClick={() => handleRemoveAnime(anime.id)}>
                                                <Trash2 size={26}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Мобильная версия */}
            <div className="admin-mobile-category">
                <Toaster position="bottom-right" toastOptions={{duration: 3000}}/>

                <div className="category-selector">
                    {categories.map(cat => (
                        <div
                            key={cat.id}
                            className={`category-chip ${cat.id === selectedCategoryId ? 'active' : ''}`}
                            onClick={() => {
                                if (editingCategoryId !== null && editingCategoryId !== cat.id) {
                                    const confirmSwitch = window.confirm("Вы редактируете категорию. Сохранить изменения?");
                                    if (confirmSwitch) handleSaveCategory();
                                    else handleCancelEdit();
                                }
                                setSelectedCategoryId(cat.id);
                            }}
                        >
                            {cat.name}
                        </div>
                    ))}
                </div>

                {currentCategory && (
                    <div className="admin-category-block">
                        <div className="category-header">
                            <h3>{currentCategory.name}</h3>
                            <div className="icons">
                                {editingCategoryId !== currentCategory.id ? (
                                    <button onClick={() => setEditingCategoryId(currentCategory.id)}><Pencil/></button>
                                ) : (
                                    <>
                                        <button onClick={handleSaveCategory}><Save/></button>
                                        <button onClick={handleCancelEdit}><X/></button>
                                    </>
                                )}
                            </div>
                        </div>

                        {editingCategoryId === currentCategory.id && (
                            <>
                                <div className="filters-column">
                                    <label className="filter-checkbox">
                                        <input type="checkbox" checked={sortDescending}
                                               onChange={() => setSortDescending(p => !p)}/>
                                        Сначала новые
                                    </label>

                                    <select className="filter-select" value={filterType}
                                            onChange={e => setFilterType(e.target.value)}>
                                        <option value="all">Все</option>
                                        <option value="tv">По ТВ</option>
                                        <option value="movie">По фильмам</option>
                                        <option value="status">По статусу (Ongoing)</option>
                                        <option value="episodes">По количеству серий</option>
                                        <option value="recent">Недавно добавленные</option>
                                    </select>

                                    <label className="filter-checkbox">
                                        <input type="checkbox" checked={preserveFilter}
                                               onChange={() => setPreserveFilter(p => !p)}/>
                                        Сохранить фильтр
                                    </label>
                                </div>

                                <div className="mini-search">
                                    <input
                                        type="text"
                                        placeholder="Поиск по названию или ID"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchLoading && <ClipLoader size={18} color="crimson"/>}
                                    <div className="search-results">
                                        {!searchLoading && searchPerformed && searchResults.length === 0 ? (
                                            <div className="no-results">Ничего не найдено</div>
                                        ) : (
                                            searchResults.map(anime => (
                                                <div className="search-item" key={anime.id}>
                                                    <img src={anime.coverUrl} alt={anime.title}
                                                         className="search-thumb"/>
                                                    <span>{anime.title}</span>
                                                    <button onClick={() => handleAddAnime(anime)}><Plus/></button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="category-local-search">
                            <input
                                type="text"
                                placeholder="Поиск в категории..."
                                value={categorySearchQuery}
                                onChange={(e) => setCategorySearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="anime-card-list">
                            {sortedAnimes.map(anime => (
                                <div key={anime.id} className="anime-card">
                                    <img src={anime.coverUrl} alt={anime.title} className="anime-cover"/>
                                    <div className="anime-title">{anime.title}</div>
                                    {editingCategoryId === currentCategory.id && (
                                        <button className="delete-button" onClick={() => handleRemoveAnime(anime.id)}>
                                            <Trash2 size={20}/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

    );
}