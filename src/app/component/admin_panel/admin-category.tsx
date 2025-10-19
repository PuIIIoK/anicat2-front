'use client';

// Импортируй необходимые пакеты
import React, { useEffect, useRef, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import { Pencil, Save, X, Trash2, Plus, ArrowLeft, ArrowRight, Film, Image, Check, Loader2, Database } from 'lucide-react';
import {toast, Toaster} from 'react-hot-toast';
// import { useNotifications } from '../notifications/NotificationManager';
// import ClipLoader from 'react-spinners/ClipLoader'; // Заменили на иконки Lucide

interface Anime {
    id: number;
    title: string;
    year?: string;
    type?: string;
    status?: string;
    episodes?: number;
    coverUrl?: string;
    coverLoading?: boolean; // Индикатор загрузки обложки
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
    
    // Состояния для поэтапной загрузки
    const [loadingStage, setLoadingStage] = useState<'categories' | 'anime' | 'covers' | 'complete'>('categories');
    const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
    const [loadingStats, setLoadingStats] = useState<{
        categoriesTime: number;
        animeTime: number;
        coversTime: number;
        totalAnime: number;
        coversLoaded: number;
    } | null>(null);




    useEffect(() => {
        const performStageLoading = async () => {
            const stats = { categoriesTime: 0, animeTime: 0, coversTime: 0, totalAnime: 0, coversLoaded: 0 };
            
            try {
                // ЭТАП 1: Загружаем категории
                console.log('🏁 Этап 1: Загружаем категории...');
                const categoriesStart = performance.now();
                setLoadingStage('categories');
                
                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`);
                const data = await res.json();
                const rawCategories: RawCategory[] = data.categories;
                
                // Создаем категории с пустыми массивами аниме
                const initialCategories: Category[] = rawCategories.map(rawCat => ({
                    id: rawCat.id,
                    name: rawCat.name,
                    animes: []
                }));
                
                setCategories(initialCategories);
                setSelectedCategoryId(initialCategories[0]?.id ?? null);
                stats.categoriesTime = Math.round(performance.now() - categoriesStart);
                
                console.log(`✅ Этап 1 завершен за ${stats.categoriesTime}ms`);
                toast.success(`📁 Категории загружены за ${stats.categoriesTime}ms`);
                
                // ЭТАП 2: Загружаем базовую информацию об аниме
                console.log('🏁 Этап 2: Загружаем информацию об аниме...');
                const animeStart = performance.now();
                setLoadingStage('anime');
                
                // Собираем все уникальные ID аниме
                const allAnimeIds = [...new Set(rawCategories.flatMap(cat => cat.animeIds))];
                stats.totalAnime = allAnimeIds.length;
                setLoadingProgress({ current: 0, total: allAnimeIds.length });
                
                console.log(`🔢 Типы ID аниме:`, allAnimeIds.slice(0, 5).map(id => ({ id, type: typeof id })));
                
                // Делаем bulk запрос для получения основной информации
                const animesMap = new Map<number | string, Anime>();
                console.log(`🔍 Пытаемся загрузить ${allAnimeIds.length} аниме через bulk API...`);
                
                try {
                    const bulkRes = await fetch(`${API_SERVER}/api/anime/optimized/get-anime-list/basic`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(allAnimeIds)
                    });
                    
                    console.log(`📡 Bulk API ответ: статус ${bulkRes.status}`);
                    
                    if (bulkRes.ok) {
                        const animesList: Anime[] = await bulkRes.json();
                        console.log(`✅ Получено аниме от bulk API:`, animesList.length);
                        console.log(`📋 Пример данных:`, animesList[0]);
                        
                        animesList.forEach(animeData => {
                            // Сохраняем и по числовому, и по строковому ключу для совместимости
                            const numericId = Number(animeData.id);
                            
                            const animeObject = {
                                id: numericId,
                                title: animeData.title,
                                year: animeData.year,
                                type: animeData.type,
                                status: animeData.status,
                                episodes: animeData.episodes,
                                coverUrl: undefined, // Обложки загрузим позже
                                coverLoading: false
                            };
                            
                            // Сохраняем под обеими версиями ID для надежности
                            animesMap.set(numericId, animeObject);
                            if (numericId !== animeData.id) {
                                animesMap.set(animeData.id, animeObject);
                            }
                        });
                    } else {
                        console.error(`❌ Bulk API ошибка: ${bulkRes.status} ${bulkRes.statusText}`);
                        const errorText = await bulkRes.text();
                        console.error('Ответ сервера:', errorText);
                        throw new Error(`Bulk API вернул ${bulkRes.status}`);
                    }
                } catch (bulkError) {
                    console.warn(`⚠️ Bulk API не работает: ${bulkError}. Переходим на классическую загрузку...`);
                    toast.error('Bulk API недоступен. Используем классическую загрузку...');
                    
                    // Fallback: загружаем аниме по одному (как раньше)
                    const BATCH_SIZE = 20; // Загружаем порциями по 20
                    let animeProcessedCount = 0;
                    for (let i = 0; i < allAnimeIds.length; i += BATCH_SIZE) {
                        const batch = allAnimeIds.slice(i, i + BATCH_SIZE);
                        
                        const batchPromises = batch.map(async (animeId) => {
                            try {
                                const res = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
                                if (!res.ok) return null;
                                const data = await res.json();
                                return {
                                    id: data.id,
                                    title: data.title,
                                    year: data.year,
                                    type: data.type,
                                    status: data.status,
                                    episodes: data.episodes,
                                    coverUrl: undefined,
                                    coverLoading: false
                                };
                            } catch (error) {
                                console.error(`Ошибка загрузки аниме ${animeId}:`, error);
                                return null;
                            }
                        });
                        
                        const batchResults = await Promise.all(batchPromises);
                        batchResults.forEach((animeData) => {
                            if (animeData) {
                                // Также сохраняем под обеими версиями ID
                                const numericId = Number(animeData.id);
                                animesMap.set(numericId, animeData);
                                if (numericId !== animeData.id) {
                                    animesMap.set(animeData.id, animeData);
                                }
                            }
                        });
                        
                        // Обновляем прогресс fallback загрузки
                        animeProcessedCount += batch.length;
                        const currentAnimeProgress = Math.min(animeProcessedCount, allAnimeIds.length);
                        setLoadingProgress({ current: currentAnimeProgress, total: allAnimeIds.length });
                        
                        console.log(`📦 Загружено аниме: ${animesMap.size}/${allAnimeIds.length} (прогресс: ${currentAnimeProgress})`);
                        
                        // Небольшая пауза между батчами
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                
                // Обновляем категории с полученными аниме
                console.log(`📋 animesMap содержит ${animesMap.size} аниме`);
                console.log(`📋 Примеры ключей в animesMap:`, Array.from(animesMap.keys()).slice(0, 5));
                
                const categoriesWithAnime: Category[] = rawCategories.map(rawCat => {
                    console.log(`📁 Обрабатываем категорию "${rawCat.name}" с ${rawCat.animeIds.length} аниме`);
                    console.log(`📁 ID аниме в категории:`, rawCat.animeIds.slice(0, 5));
                    
                    const animes: Anime[] = rawCat.animeIds.map(id => {
                        const foundAnime = animesMap.get(id);
                        if (!foundAnime) {
                            console.warn(`❌ Аниме с ID ${id} не найдено в animesMap`);
                            // Проверяем, может быть проблема с типами данных
                            const numberId = Number(id);
                            const foundByString = animesMap.get(numberId);
                            if (foundByString) {
                                console.log(`✅ Найдено по числовому ID: ${numberId}`);
                                return foundByString;
                            }
                        }
                        return foundAnime || { id, title: '❌ Не найдено', coverLoading: false };
                    });
                    
                    const foundCount = animes.filter(a => a.title !== '❌ Не найдено').length;
                    console.log(`📁 В категории "${rawCat.name}": найдено ${foundCount}/${rawCat.animeIds.length} аниме`);
                    
                    return { id: rawCat.id, name: rawCat.name, animes };
                });
                
                setCategories(categoriesWithAnime);
                setOriginalCategories(categoriesWithAnime);
                stats.animeTime = Math.round(performance.now() - animeStart);
                setLoadingProgress({ current: allAnimeIds.length, total: allAnimeIds.length });
                
                console.log(`✅ Этап 2 завершен за ${stats.animeTime}ms`);
                toast.success(`📺 ${allAnimeIds.length} аниме загружено за ${stats.animeTime}ms`);
                
                // ЭТАП 3: Загружаем обложки постепенно
                console.log('🏁 Этап 3: Загружаем обложки...');
                const coversStart = performance.now();
                setLoadingStage('covers');
                
                // Загружаем обложки батчами для лучшей производительности
                const BATCH_SIZE = 10;
                const animesWithIds = Array.from(animesMap.values()).filter(a => a.id);
                let processedCount = 0;
                
                for (let i = 0; i < animesWithIds.length; i += BATCH_SIZE) {
                    const batch = animesWithIds.slice(i, i + BATCH_SIZE);
                    
                    // Отмечаем аниме как загружающиеся
                    setCategories(prev => prev.map(cat => ({
                        ...cat,
                        animes: cat.animes.map(anime => 
                            batch.some(b => b.id === anime.id) 
                                ? { ...anime, coverLoading: true }
                                : anime
                        )
                    })));
                    
                    // Загружаем обложки батчом
                    await Promise.all(batch.map(async (anime) => {
                        try {
                            // Используем оптимизированный API для получения URL обложки каждого аниме
                            const coverEndpoint = `${API_SERVER}/api/anime/optimized/get-anime/${anime.id}/cover-url`;
                            console.log(`🖼️ Загружаем обложку для аниме ${anime.id} через: ${coverEndpoint}`);
                            
                            const coverRes = await fetch(coverEndpoint);
                            if (coverRes.ok) {
                                const coverData = await coverRes.json();
                                console.log(`📋 ПОЛНЫЙ ответ API для аниме ${anime.id}:`, JSON.stringify(coverData, null, 2));
                                
                                // Извлекаем правильный URL из ответа
                                let finalCoverUrl = null;
                                
                                if (coverData.coverUrl && coverData.coverUrl !== '/anime-cover-default.jpg') {
                                    finalCoverUrl = coverData.coverUrl;
                                    console.log(`✅ Найден coverUrl: ${finalCoverUrl}`);
                                } else {
                                    // Fallback на stream API если нет валидного URL
                                    finalCoverUrl = `${API_SERVER}/api/stream/${anime.id}/cover`;
                                    console.log(`🔄 coverUrl пустой или дефолтный, используем stream: ${finalCoverUrl}`);
                                }
                                
                                setCategories(prev => prev.map(cat => ({
                                    ...cat,
                                    animes: cat.animes.map(a => 
                                        a.id === anime.id 
                                            ? { ...a, coverUrl: finalCoverUrl, coverLoading: false }
                                            : a
                                    )
                                })));
                                
                                stats.coversLoaded++;
                                console.log(`✅ Обложка для аниме ${anime.id} УСТАНОВЛЕНА: ${finalCoverUrl}`);
                            } else {
                                console.warn(`⚠️ Обложка для аниме ${anime.id} недоступна через оптимизированный API (${coverRes.status}), пробуем stream API`);
                                
                                // Fallback: используем прямой stream endpoint
                                const streamCoverUrl = `${API_SERVER}/api/stream/${anime.id}/cover`;
                                console.log(`🔄 Fallback: используем stream API для аниме ${anime.id}: ${streamCoverUrl}`);
                                
                                setCategories(prev => prev.map(cat => ({
                                    ...cat,
                                    animes: cat.animes.map(a => 
                                        a.id === anime.id 
                                            ? { ...a, coverUrl: streamCoverUrl, coverLoading: false }
                                            : a
                                    )
                                })));
                                
                                stats.coversLoaded++;
                            }
                        } catch (error) {
                            console.error(`Ошибка загрузки обложки для аниме ${anime.id} через оптимизированный API:`, error);
                            
                            // Fallback при ошибке: используем прямой stream endpoint
                            try {
                                const streamCoverUrl = `${API_SERVER}/api/stream/${anime.id}/cover`;
                                console.log(`🔄 Error fallback: используем stream API для аниме ${anime.id}: ${streamCoverUrl}`);
                                
                                setCategories(prev => prev.map(cat => ({
                                    ...cat,
                                    animes: cat.animes.map(a => 
                                        a.id === anime.id 
                                            ? { ...a, coverUrl: streamCoverUrl, coverLoading: false }
                                            : a
                                    )
                                })));
                                
                                stats.coversLoaded++;
                            } catch (fallbackError) {
                                console.error(`❌ Полная ошибка загрузки обложки для аниме ${anime.id}:`, fallbackError);
                                setCategories(prev => prev.map(cat => ({
                                    ...cat,
                                    animes: cat.animes.map(a => 
                                        a.id === anime.id 
                                            ? { ...a, coverLoading: false }
                                            : a
                                    )
                                })));
                            }
                        }
                    }));
                    
                    // Обновляем прогресс только после завершения всего батча
                    processedCount += batch.length;
                    const currentProgress = Math.min(processedCount, animesWithIds.length);
                    setLoadingProgress({ current: currentProgress, total: animesWithIds.length });
                    
                    console.log(`📊 Прогресс обложек: ${currentProgress}/${animesWithIds.length} (батч ${Math.floor(i/BATCH_SIZE) + 1})`);
                    
                    // Небольшая пауза между батчами
                    await new Promise(resolve => setTimeout(resolve, 150));
                }
                
                stats.coversTime = Math.round(performance.now() - coversStart);
                setLoadingStage('complete');
                setLoading(false);
                
                setLoadingStats(stats);
                
                const totalTime = stats.categoriesTime + stats.animeTime + stats.coversTime;
                console.log(`✅ Поэтапная загрузка завершена за ${totalTime}ms`);
                console.log(`📊 Статистика: Категории: ${stats.categoriesTime}ms, Аниме: ${stats.animeTime}ms, Обложки: ${stats.coversTime}ms`);
                toast.success(`🎉 Загрузка завершена! ${stats.coversLoaded}/${stats.totalAnime} обложек за ${totalTime}ms`, { duration: 5000 });
                
            } catch (error) {
                console.error('Ошибка поэтапной загрузки:', error);
                toast.error('Ошибка при загрузке данных');
                setLoading(false);
            }
        };
        
        performStageLoading();
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
        // Восстанавливаем структуру категорий, но сохраняем загруженные обложки
        const currentCategoriesMap = new Map();
        categories.forEach(cat => {
            const animesMap = new Map();
            cat.animes.forEach(anime => {
                animesMap.set(anime.id, {
                    coverUrl: anime.coverUrl,
                    coverLoading: anime.coverLoading
                });
            });
            currentCategoriesMap.set(cat.id, animesMap);
        });

        // Восстанавливаем оригинальные категории с сохранением обложек
        const restoredCategories = originalCategories.map(originalCat => {
            const currentAnimesMap = currentCategoriesMap.get(originalCat.id);
            return {
                ...originalCat,
                animes: originalCat.animes.map(originalAnime => {
                    const currentCoverData = currentAnimesMap?.get(originalAnime.id);
                    return {
                        ...originalAnime,
                        coverUrl: currentCoverData?.coverUrl || originalAnime.coverUrl,
                        coverLoading: currentCoverData?.coverLoading || originalAnime.coverLoading || false
                    };
                })
            };
        });

        setCategories(restoredCategories);
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
            const type = (anime.type || '').toLowerCase();
            const status = (anime.status || '').toLowerCase();
            
            if (filterType === "tv") return type === "tv";
            if (filterType === "movie") return type === "фильм";
            if (filterType === "status") return status === "онгоинг";
            if (filterType === "episodes") return true;
            if (filterType === "recent") return true;
            return true;
        })();

        const search = categorySearchQuery.trim().toLowerCase();
        const title = (anime.title || '').toLowerCase();
        const id = (anime.id || '').toString();
        
        const matchesSearch =
            search === '' ||
            title.includes(search) ||
            id.includes(search);

        return matchesFilter && matchesSearch;
    });



    const sortedAnimes = filteredAnimes.sort((a, b) => {
        const yearA = extractStartYear(a.year || '');
        const yearB = extractStartYear(b.year || '');

        if (filterType === "recent") return (b.id || 0) - (a.id || 0);
        if (filterType === "episodes") {
            return (b.episodes ?? 0) - (a.episodes ?? 0);
        }

        return sortDescending ? yearB - yearA : yearA - yearB;
    });


    if (loading) {
        return (
            <div className="admin-category-loading">
                <div className="loading-content">
                    <div className="loading-header">
                        <div className="loading-icon">
                            {loadingStage === 'categories' && <Database size={32} className="animate-pulse" />}
                            {loadingStage === 'anime' && <Film size={32} className="animate-spin" />}
                            {loadingStage === 'covers' && <Image size={32} className="animate-bounce" />}
                        </div>
                        <h2 className="loading-title">Загрузка данных</h2>
                    </div>

                    <div className="loading-stages">
                        <div className={`stage-item ${loadingStage === 'categories' ? 'active' : (loadingStage === 'anime' || loadingStage === 'covers' || loadingStage === 'complete') && loadingStats ? 'completed' : ''}`}>
                            <div className="stage-icon">
                                {loadingStage === 'categories' ? 
                                    <Loader2 size={20} className="animate-spin" /> : 
                                    loadingStats ? <Check size={20} /> : <Database size={20} />
                                }
                            </div>
                            <div className="stage-info">
                                <div className="stage-label">Категории</div>
                                <div className="stage-status">
                                    {loadingStage === 'categories' ? 'Загружаем...' : 
                                     loadingStats ? `${loadingStats.categoriesTime}ms` : 'Ожидание'}
                                </div>
                            </div>
                        </div>

                        <div className={`stage-item ${loadingStage === 'anime' ? 'active' : loadingStage === 'covers' || loadingStage === 'complete' ? 'completed' : ''}`}>
                            <div className="stage-icon">
                                {loadingStage === 'anime' ? 
                                    <Loader2 size={20} className="animate-spin" /> : 
                                    (loadingStage === 'covers' || loadingStage === 'complete') ? <Check size={20} /> : <Film size={20} />
                                }
                            </div>
                            <div className="stage-info">
                                <div className="stage-label">Аниме</div>
                                <div className="stage-status">
                                    {loadingStage === 'anime' ? `${loadingProgress.current}/${loadingProgress.total}` : 
                                     (loadingStage === 'covers' || loadingStage === 'complete') ? `${loadingStats?.animeTime}ms` : 'Ожидание'}
                                </div>
                            </div>
                        </div>

                        <div className={`stage-item ${loadingStage === 'covers' ? 'active' : loadingStage === 'complete' ? 'completed' : ''}`}>
                            <div className="stage-icon">
                                {loadingStage === 'covers' ? 
                                    <Loader2 size={20} className="animate-spin" /> : 
                                    loadingStage === 'complete' ? <Check size={20} /> : <Image size={20} />
                                }
                            </div>
                            <div className="stage-info">
                                <div className="stage-label">Обложки</div>
                                <div className="stage-status">
                                    {loadingStage === 'covers' ? `${loadingProgress.current}/${loadingProgress.total}` : 
                                     loadingStage === 'complete' ? `${loadingStats?.coversTime}ms` : 'Ожидание'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {loadingProgress.total > 0 && (
                        <div className="loading-progress">
                            <div className="progress-info">
                                <span className="progress-text">
                                    {loadingStage === 'anime' ? 'Загружаем информацию об аниме' : 
                                     loadingStage === 'covers' ? 'Загружаем обложки' : 'Подготовка данных'}
                                </span>
                                <span className="progress-percentage">
                                    {Math.round((loadingProgress.current / loadingProgress.total) * 100)}%
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }


    return (
        <div className="admin-category-container admin-categories-container">

            {/* Десктоп версия */}
            <div className="admin-desktop-category desktop-only">
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
                                                <Loader2 size={18} className="animate-spin search-spinner" style={{color: 'crimson'}} />}
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
                                        <div className="anime-cover-container">
                                            {anime.coverLoading ? (
                                                <div className="cover-loading-placeholder">
                                                    <Loader2 size={20} className="animate-spin" style={{color: '#667eea'}} />
                                                </div>
                                            ) : anime.coverUrl ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={anime.coverUrl} alt={anime.title} className="anime-cover"/>
                                            ) : (
                                                <div className="cover-placeholder">
                                                    <span className="placeholder-icon">🖼️</span>
                                                </div>
                                            )}
                                            <div className="anime-title-overlay">{anime.title}</div>
                                        </div>
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
                                    {searchLoading && <Loader2 size={18} className="animate-spin" style={{color: 'crimson'}} />}
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
                                    <div className="anime-cover-container">
                                        {anime.coverLoading ? (
                                            <div className="cover-loading-placeholder">
                                                <Loader2 size={16} className="animate-spin" style={{color: '#667eea'}} />
                                                <span className="loading-text">Загрузка...</span>
                                            </div>
                                        ) : anime.coverUrl ? (
                                            <img src={anime.coverUrl} alt={anime.title} className="anime-cover"/>
                                        ) : (
                                            <div className="cover-placeholder">
                                                <Image size={24} />
                                                <span className="placeholder-text">Нет обложки</span>
                                            </div>
                                        )}
                                        
                                        {editingCategoryId === currentCategory.id && (
                                            <button className="delete-button" onClick={() => handleRemoveAnime(anime.id)}>
                                                <Trash2 size={18}/>
                                            </button>
                                        )}
                                        
                                        <div className="anime-title-overlay" title={anime.title}>
                                            {anime.title}
                                        </div>
                                    </div>
                                    
                                    <div className="anime-info">
                                        
                                        <div className="anime-meta">
                                            {anime.year && (
                                                <span className="anime-year">{anime.year}</span>
                                            )}
                                            {anime.type && (
                                                <span className="anime-type">{anime.type}</span>
                                            )}
                                            {anime.status && (
                                                <span className={`anime-status status-${anime.status?.toLowerCase()}`}>
                                                    {anime.status}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {anime.episodes && (
                                            <div className="anime-episodes">
                                                <Film size={12} />
                                                <span>{anime.episodes} эп.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Мобильная версия */}
            <div className="mobile-only">
                <div className="mobile-categories-list">
                    {categories.map(cat => (
                        <div key={cat.id} className="mobile-category-card">
                            <div className="mobile-category-header">
                                <div className="mobile-category-name">{cat.name}</div>
                                <div className="mobile-category-count">{cat.animes.length} аниме</div>
                            </div>
                            <div className="mobile-category-actions">
                                <button 
                                    className="mobile-action-btn edit"
                                    onClick={() => setEditingCategoryId(cat.id)}
                                >
                                    Редактировать
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

    );
}