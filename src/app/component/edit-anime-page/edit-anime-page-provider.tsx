'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import AnimeMainInfo from './edit-anime-info';
import AnimeFileAndEpisode from "./anime-edit-upload";
import { API_SERVER } from '@/hosts/constants';
import UploadProgressModal from "../admin_panel/UploadProgressModalAnime";
import EditFloatingActionButtons from "./EditFloatingActionButtons";
import FranchiseChainManager from "../franchise-chains/FranchiseChainManager";
import { CheckCircle, FileEdit, ImageUp, Edit3, XCircle, ImagePlus, RotateCcw, AlertTriangle, CheckCircle2, BarChart3, GitCompare } from "lucide-react";
import { AnimeInfo } from "../anime-structure/anime-data-info";

type ScreenshotData = {
    id: number;
    url: string;
};

interface MediaInfo {
    coverId: number | null;
    coverUrl: string | null;
    bannerId: number | null;
    bannerUrl: string | null;
    screenshots: ScreenshotData[];
}

interface AnimeEditData extends AnimeInfo {
    mediaInfo?: MediaInfo;
    blockedWhere?: string;
    blockedNote?: string;
}

const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};

// Интерфейс для данных аниме
interface AnimeData {
    title?: string;
    description?: string;
    genres?: string;
    type?: string;
    status?: string;
    [key: string]: string | undefined;
}

// Компонент статистики изменений
const EditStatsPanel = ({ originalData, currentData }: { originalData: AnimeData | null; currentData: AnimeData }) => {
    const countChanges = () => {
        if (!originalData) return { modified: 0, total: 5 };
        let modified = 0;
        const fields = ['title', 'description', 'genres', 'type', 'status'];
        fields.forEach(field => {
            if (originalData[field] !== currentData[field]) modified++;
        });
        return { modified, total: fields.length };
    };
    
    const stats = countChanges();
    
    return (
        <div className="yumeko-admin-edit-anime-stats">
            <div className="yumeko-admin-edit-anime-stats-header">
                <BarChart3 size={18} />
                <span>Статистика</span>
            </div>
            <div className="yumeko-admin-edit-anime-stats-grid">
                <div className="stat-item modified">
                    <Edit3 size={20} />
                    <span className="value">{stats.modified}</span>
                    <span className="label">Изменено</span>
                </div>
                <div className="stat-item unchanged">
                    <CheckCircle2 size={20} />
                    <span className="value">{stats.total - stats.modified}</span>
                    <span className="label">Без изменений</span>
                </div>
            </div>
        </div>
    );
};

// Тип для изменений
type ChangeItem = {
    field: string;
    oldValue: string;
    newValue: string;
    type: 'added' | 'removed' | 'modified';
};

// Интерфейс для данных сравнения
interface ComparisonData {
    title?: string;
    alttitle?: string;
    description?: string;
    genres?: string;
    type?: string;
    status?: string;
    rating?: string;
    episodeAll?: string;
    currentEpisode?: string;
    [key: string]: string | undefined;
}

// Компонент сравнения изменений
const ChangesComparisonPanel = ({ originalData, currentData }: { originalData: ComparisonData | null; currentData: ComparisonData }) => {
    const getChanges = (): ChangeItem[] => {
        if (!originalData) return [];
        const changes: ChangeItem[] = [];
        const fields = {
            title: 'Название',
            alttitle: 'Альт. название',
            description: 'Описание',
            genres: 'Жанры',
            type: 'Тип',
            status: 'Статус',
            rating: 'Рейтинг',
            episodeAll: 'Всего эпизодов',
            currentEpisode: 'Текущий эпизод'
        };
        
        Object.entries(fields).forEach(([key, label]) => {
            const oldValue = originalData[key];
            const newValue = currentData[key];
            if (oldValue !== newValue && newValue !== undefined) {
                changes.push({
                    field: label,
                    oldValue: oldValue || '(пусто)',
                    newValue: newValue || '(пусто)',
                    type: !oldValue ? 'added' : !newValue ? 'removed' : 'modified'
                });
            }
        });
        
        return changes;
    };
    
    const changes = getChanges();
    
    return (
        <div className="yumeko-admin-edit-anime-changes">
            <div className="yumeko-admin-edit-anime-changes-header">
                <GitCompare size={18} />
                <span>Изменения</span>
            </div>
            <div className="yumeko-admin-edit-anime-changes-list">
                {changes.length > 0 ? (
                    changes.map((change, index) => (
                        <div key={index} className={`change-row ${change.type}`}>
                            <span className="field">{change.field}</span>
                            <div className="values">
                                <span className="old">{String(change.oldValue).substring(0, 25)}{String(change.oldValue).length > 25 ? '...' : ''}</span>
                                <span className="new">{String(change.newValue).substring(0, 25)}{String(change.newValue).length > 25 ? '...' : ''}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty">Изменений пока нет</div>
                )}
            </div>
        </div>
    );
};

const EditAnimePage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const animeId = searchParams.get('id');

    // Основные поля аниме
    const [title, setTitle] = useState('');
    const [alttitle, setAlttitle] = useState('');
    const [description, setDescription] = useState('');
    const [genres, setGenres] = useState('');
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [episodeAll, setEpisodeAll] = useState('');
    const [currentEpisode, setCurrentEpisode] = useState('');
    const [rating, setRating] = useState('');
    const [year, setYear] = useState('');
    const [season, setSeason] = useState('');
    const [mouthSeason, setMouthSeason] = useState('');
    const [studio, setStudio] = useState('');
    const [realesedFor, setRealesedFor] = useState('');
    const [alias, setAlias] = useState('');
    const [kodik, setKodik] = useState('');

    // Медиа файлы
    const [cover, setCover] = useState<File | null>(null);
    const [banner, setBanner] = useState<File | null>(null);
    const [screenshots, setScreenshots] = useState<File[]>([]);
    
    // Превью файлов
    const [coverPreview, setCoverPreview] = useState('');
    const [bannerPreview, setBannerPreview] = useState('');
    const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
    const [keepScreenshotIds, setKeepScreenshotIds] = useState<number[]>([]);
    
    // Флаги удаления
    const [deletedCover, setDeletedCover] = useState(false);
    const [deletedBanner, setDeletedBanner] = useState(false);

    // Состояние и доступность
    const [countries, setCountries] = useState('');
    const [zametka_blocked, setZametka_blocked] = useState('');
    const [opened, setOpened] = useState(true);
    const [zametka, setZametka] = useState('');
    const [anons, setAnons] = useState('');

    // UI состояния
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning' | null>(null);
    const [toastIcon, setToastIcon] = useState<React.ReactNode>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStep, setUploadStep] = useState<React.ReactNode>('');

    // Исходные данные для отмены изменений
    const [originalData, setOriginalData] = useState<AnimeInfo | null>(null);
    const [originalScreenshotPreviews, setOriginalScreenshotPreviews] = useState<string[]>([]);
    const [originalKeepScreenshotIds, setOriginalKeepScreenshotIds] = useState<number[]>([]);
    
    // Ref для функции валидации блокировки
    const [validateBlockingFn, setValidateBlockingFn] = useState<(() => void) | null>(null);

    // Вспомогательная функция для загрузки медиафайлов через старый способ
    const loadMediaFilesFallback = useCallback(async () => {
        console.log('Загружаем медиафайлы через старый способ');
        
        // Загружаем скриншоты
        try {
            const screenshotsResponse = await fetch(`${API_SERVER}/api/stream/anime/${animeId}/screenshots`);
            if (screenshotsResponse.ok) {
                const screenshotsData: ScreenshotData[] = await screenshotsResponse.json();
                const urls = screenshotsData.map(s => s.url);
                const ids = screenshotsData.map(s => s.id);
                setScreenshotPreviews(urls);
                setKeepScreenshotIds(ids);
                setOriginalScreenshotPreviews(urls);
                setOriginalKeepScreenshotIds(ids);
                console.log('Скриншоты загружены:', urls.length);
            }
        } catch (err) {
            console.log('Нет скриншотов или ошибка загрузки:', err);
            setScreenshotPreviews([]);
            setKeepScreenshotIds([]);
            setOriginalScreenshotPreviews([]);
            setOriginalKeepScreenshotIds([]);
        }

        // Загружаем обложку
        try {
            const coverResponse = await fetch(`${API_SERVER}/api/stream/${animeId}/cover`);
            if (coverResponse.ok) {
                const coverBlob = await coverResponse.blob();
                setCoverPreview(URL.createObjectURL(coverBlob));
                console.log('Обложка загружена');
            }
        } catch (err) {
            console.log('Нет обложки или ошибка загрузки:', err);
            setCoverPreview('');
        }

        // Загружаем баннер
        try {
            const bannerResponse = await fetch(`${API_SERVER}/api/stream/${animeId}/banner-direct`);
            if (bannerResponse.ok) {
                const bannerBlob = await bannerResponse.blob();
                setBannerPreview(URL.createObjectURL(bannerBlob));
                console.log('Баннер загружен');
            }
        } catch (err) {
            console.log('Нет баннера или ошибка загрузки:', err);
            setBannerPreview('');
        }
    }, [animeId]);

    // Устанавливаем заголовок страницы
    useEffect(() => {
        if (animeId) {
            document.title = `Редактирование аниме (${animeId}) | Yumeko`;
        } else {
            document.title = 'Редактирование аниме | Yumeko';
        }
    }, [animeId]);

    // Загрузка данных аниме при инициализации
    useEffect(() => {
        if (!animeId) return;

        const loadAnimeData = async () => {
            setLoading(true);
            try {
                const token = getTokenFromCookie();
                // Загружаем данные аниме через оптимизированный админский endpoint
                const animeResponse = await fetch(`${API_SERVER}/api/admin/anime/${animeId}/edit-data`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                if (!animeResponse.ok) {
                    throw new Error(`Ошибка загрузки данных: ${animeResponse.status}`);
                }
                
                const animeData: AnimeEditData = await animeResponse.json();
                
                // Устанавливаем все поля
                setTitle(animeData.title || '');
                setAlttitle(animeData.alttitle || '');
                setDescription(animeData.description || '');
                setGenres(animeData.genres || '');
                setStatus(animeData.status || '');
                setType(animeData.type || '');
                setEpisodeAll(animeData.episode_all || '');
                setCurrentEpisode(animeData.current_episode || '');
                setRating(animeData.rating || '');
                setYear(animeData.year || '');
                setSeason((animeData.season || '').replace(/\s*сезон$/i, ''));
                setMouthSeason(animeData.mouth_season || '');
                setStudio(animeData.studio || '');
                setRealesedFor(animeData.realesed_for || '');
                setAlias(animeData.alias || '');
                setKodik(animeData.kodik || '');
                setOpened(animeData.opened ?? true);
                setZametka(animeData.zametka || '');
                setAnons(animeData.anons || '');
                
                // Устанавливаем данные о блокировках (теперь они в основном ответе)
                setCountries(animeData.blockedWhere || '');
                setZametka_blocked(animeData.blockedNote || '');
                
                // Сохраняем исходные данные
                setOriginalData(animeData);

                // Обрабатываем медиафайлы из ответа
                let coverLoaded = false;
                let bannerLoaded = false;
                let screenshotsLoaded = false;
                
                if (animeData.mediaInfo) {
                    const mediaInfo = animeData.mediaInfo;
                    console.log('Получена медиаинформация:', mediaInfo);
                    
                    // Устанавливаем превью обложки
                    if (mediaInfo.coverUrl) {
                        console.log('Устанавливаем обложку:', mediaInfo.coverUrl);
                        setCoverPreview(mediaInfo.coverUrl);
                        coverLoaded = true;
                    } else {
                        console.log('Обложка не найдена в медиаинформации');
                        setCoverPreview('');
                    }
                    
                    // Устанавливаем превью баннера
                    if (mediaInfo.bannerUrl) {
                        console.log('Устанавливаем баннер:', mediaInfo.bannerUrl);
                        setBannerPreview(mediaInfo.bannerUrl);
                        bannerLoaded = true;
                    } else {
                        console.log('Баннер не найден в медиаинформации');
                        setBannerPreview('');
                    }
                    
                    // Устанавливаем скриншоты
                    if (mediaInfo.screenshots && Array.isArray(mediaInfo.screenshots) && mediaInfo.screenshots.length > 0) {
                        console.log('Устанавливаем скриншоты:', mediaInfo.screenshots.length);
                        const screenshotUrls = mediaInfo.screenshots.map((screenshot: ScreenshotData) => screenshot.url);
                        const screenshotIds = mediaInfo.screenshots.map((screenshot: ScreenshotData) => screenshot.id);
                        setScreenshotPreviews(screenshotUrls);
                        setKeepScreenshotIds(screenshotIds);
                        
                        // Сохраняем исходные данные для отмены изменений
                        setOriginalScreenshotPreviews(screenshotUrls);
                        setOriginalKeepScreenshotIds(screenshotIds);
                        screenshotsLoaded = true;
                    } else {
                        console.log('Скриншоты не найдены в медиаинформации');
                        setScreenshotPreviews([]);
                        setKeepScreenshotIds([]);
                        setOriginalScreenshotPreviews([]);
                        setOriginalKeepScreenshotIds([]);
                    }
                    
                    // mediaLoaded не используется больше, так как мы проверяем каждый тип отдельно
                }

                // Fallback на старый способ загрузки для недостающих медиафайлов
                if (!screenshotsLoaded) {
                    console.log('Скриншоты не загружены, используем fallback');
                    try {
                        const screenshotsResponse = await fetch(`${API_SERVER}/api/stream/anime/${animeId}/screenshots`);
                        if (screenshotsResponse.ok) {
                            const screenshotsData: ScreenshotData[] = await screenshotsResponse.json();
                            const urls = screenshotsData.map(s => s.url);
                            const ids = screenshotsData.map(s => s.id);
                            setScreenshotPreviews(urls);
                            setKeepScreenshotIds(ids);
                            setOriginalScreenshotPreviews(urls);
                            setOriginalKeepScreenshotIds(ids);
                            console.log('Скриншоты загружены через fallback:', urls.length);
                        }
                    } catch (err) {
                        console.log('Нет скриншотов или ошибка загрузки:', err);
                        setScreenshotPreviews([]);
                        setKeepScreenshotIds([]);
                        setOriginalScreenshotPreviews([]);
                        setOriginalKeepScreenshotIds([]);
                    }
                }

                if (!coverLoaded) {
                    console.log('Обложка не загружена, используем fallback');
                    try {
                        const coverResponse = await fetch(`${API_SERVER}/api/stream/${animeId}/cover`);
                        if (coverResponse.ok) {
                            const coverBlob = await coverResponse.blob();
                            setCoverPreview(URL.createObjectURL(coverBlob));
                            console.log('Обложка загружена через fallback');
                        }
                    } catch (err) {
                        console.log('Нет обложки или ошибка загрузки:', err);
                        setCoverPreview('');
                    }
                }

                if (!bannerLoaded) {
                    console.log('Баннер не загружен, используем fallback');
                    try {
                        const bannerResponse = await fetch(`${API_SERVER}/api/stream/${animeId}/banner-direct`);
                        if (bannerResponse.ok) {
                            const bannerBlob = await bannerResponse.blob();
                            setBannerPreview(URL.createObjectURL(bannerBlob));
                            console.log('Баннер загружен через fallback');
                        }
                    } catch (err) {
                        console.log('Нет баннера или ошибка загрузки:', err);
                        setBannerPreview('');
                    }
                }

            } catch (err) {
                console.error('Ошибка загрузки данных через оптимизированный endpoint:', err);
                
                // Попытаемся загрузить данные через старый endpoint
                try {
                    console.log('Пытаемся загрузить данные через старый endpoint');
                    const animeResponse = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
                    
                    if (!animeResponse.ok) {
                        throw new Error(`Ошибка загрузки данных через старый endpoint: ${animeResponse.status}`);
                    }
                    
                    const animeData = await animeResponse.json();
                    
                    // Устанавливаем все поля из старого endpoint
                    setTitle(animeData.title || '');
                    setAlttitle(animeData.alttitle || '');
                    setDescription(animeData.description || '');
                    setGenres(animeData.genres || '');
                    setStatus(animeData.status || '');
                    setType(animeData.type || '');
                    setEpisodeAll(animeData.episode_all || '');
                    setCurrentEpisode(animeData.current_episode || '');
                    setRating(animeData.rating || '');
                    setYear(animeData.year || '');
                    setSeason((animeData.season || '').replace(/\s*сезон$/i, ''));
                    setMouthSeason(animeData.mouth_season || '');
                    setStudio(animeData.studio || '');
                    setRealesedFor(animeData.realesed_for || '');
                    setAlias(animeData.alias || '');
                    setKodik(animeData.kodik || '');
                    setOpened(animeData.opened ?? true);
                    setZametka(animeData.zametka || '');
                    setAnons(animeData.anons || '');
                    
                    setOriginalData(animeData);
                    
                    // Загружаем данные о блокировках отдельно
                    try {
                        const availabilityResponse = await fetch(`${API_SERVER}/api/admin/avaibility/check-avaibility/${animeId}`);
                        if (availabilityResponse.ok) {
                            const availabilityData = await availabilityResponse.json();
                            setCountries(availabilityData.blocked_in_countries || '');
                            setZametka_blocked(availabilityData.zametka_blocked || '');
                        }
                    } catch (availErr) {
                        console.error('Ошибка загрузки данных о доступности:', availErr);
                        setCountries('');
                        setZametka_blocked('');
                    }
                    
                    // Загружаем медиафайлы через старый способ
                    await loadMediaFilesFallback();
                    
                } catch (fallbackErr) {
                    console.error('Ошибка загрузки данных через fallback:', fallbackErr);
                    showToast('Ошибка загрузки данных аниме', 'error', <XCircle size={20} />);
                }
            } finally {
                setLoading(false);
            }
        };

        loadAnimeData();
    }, [animeId, loadMediaFilesFallback]);

    // Функции обработки загрузки медиафайлов
    const handleCoverUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        
        if (deletedCover) {
            // Удаляем обложку
            await fetch(`${API_SERVER}/api/admin/delete-cover/${animeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } else if (cover) {
            // Загружаем новую обложку
            // Сначала удаляем старую, если есть
            if (coverPreview) {
                try {
                    await fetch(`${API_SERVER}/api/admin/delete-cover/${animeId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                } catch {
                    // Игнорируем ошибку, если обложки не было
                }
            }
            
            const formData = new FormData();
            formData.append('file', cover);
            await fetch(`${API_SERVER}/api/admin/edit-cover/${animeId}`, {
                method: 'PUT',
                body: formData,
                headers: { 'Authorization': `Bearer ${token}` },
            });
        }
    };

    const handleBannerUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        
        if (deletedBanner) {
            // Удаляем баннер
            await fetch(`${API_SERVER}/api/admin/delete-banner/${animeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } else if (banner) {
            // Загружаем новый баннер
            // Сначала удаляем старый, если есть
            if (bannerPreview) {
                try {
                    await fetch(`${API_SERVER}/api/admin/delete-banner/${animeId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                } catch {
                    // Игнорируем ошибку, если баннера не было
                }
            }
            
            const formData = new FormData();
            formData.append('file', banner);
            await fetch(`${API_SERVER}/api/admin/edit-banner/${animeId}`, {
                method: 'PUT',
                body: formData,
                headers: { 'Authorization': `Bearer ${token}` },
            });
        }
    };

    const handleScreenshotUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        
        console.log('📸 Обновление скриншотов:', {
            newScreenshots: screenshots.length,
            keepIds: keepScreenshotIds,
            animeId
        });
        
        const formData = new FormData();
        
        // Добавляем новые файлы (если есть)
        if (screenshots.length > 0) {
            screenshots.forEach((file) => formData.append('files', file));
        }
        
        // Добавляем ID для сохранения (если есть)
        if (keepScreenshotIds.length > 0) {
            keepScreenshotIds.forEach(id => formData.append('keepIds', id.toString()));
        }
        
        const response = await fetch(`${API_SERVER}/api/admin/edit-screenshots/${animeId}`, {
            method: 'PUT',
            body: formData,
            headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка загрузки скриншотов:', errorText);
            throw new Error('Ошибка загрузки скриншотов: ' + errorText);
        }
        
        console.log('✅ Скриншоты успешно обновлены');
    };

    const handleInfoUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        
        await fetch(`${API_SERVER}/api/admin/edit-info/${animeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                title,
                alttitle,
                description,
                genres,
                status,
                type,
                episode_all: episodeAll,
                current_episode: currentEpisode,
                rating,
                year,
                season: season ? (type === 'Фильм' ? `${season} часть` : `${season} сезон`) : null,
                mouth_season: mouthSeason,
                studio,
                realesed_for: realesedFor,
                alias,
                kodik,
                opened,
                zametka: zametka.trim() === '' ? null : zametka,
                anons: anons.trim() === '' ? null : anons,
            }),
        });
    };

    const handleAvailabilityUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');

        const blockedCountriesArray = countries
            .split(',')
            .map(c => c.trim())
            .filter(c => c.length > 0);

        await fetch(`${API_SERVER}/api/admin/avaibility/set-avaibility/${animeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                blockedCountries: blockedCountriesArray,
                zametka: zametka_blocked.trim() === '' ? null : zametka_blocked,
            }),
        });
    };

    // Основная функция сохранения
    const handleSave = async () => {
        // Валидируем блокировку перед сохранением
        if (validateBlockingFn) {
            validateBlockingFn();
        }
        
        setSaving(true);
        setUploadProgress(5);
        setUploadStep(<><Edit3 className="inline w-4 h-4 mr-2" /> Обновление баннера...</>);

        try {
            await handleBannerUpload();
            setUploadProgress(25);
            setUploadStep(<><ImageUp className="inline w-4 h-4 mr-2" /> Обновление обложки...</>);

            await handleCoverUpload();
            setUploadProgress(50);
            setUploadStep(<><ImagePlus className="inline w-4 h-4 mr-2" /> Обновление скриншотов...</>);

            await handleScreenshotUpload();
            setUploadProgress(75);
            setUploadStep(<><FileEdit className="inline w-4 h-4 mr-2" /> Сохранение информации...</>);

            await handleInfoUpload();
            await handleAvailabilityUpload();
            setUploadProgress(100);
            setUploadStep(<><CheckCircle className="inline w-4 h-4 mr-2 text-green-600" /> Аниме успешно обновлено</>);

            showToast('Аниме успешно обновлено', 'success', <CheckCircle2 size={20} />);

            // Обновляем title мгновенно
            document.title = 'Yumeko | Admin_Panel';

            setTimeout(() => {
                router.push('/admin_panel');
            }, 1500);
        } catch (err) {
            console.error('❌ Ошибка при обновлении аниме:', err);
            setUploadStep(<><XCircle className="inline w-4 h-4 mr-2 text-red-600" /> Ошибка при обновлении аниме</>);
            showToast('Ошибка при обновлении аниме', 'error', <AlertTriangle size={20} />);
        } finally {
            setSaving(false);
        }
    };

    // Функция отмены изменений
    const handleCancel = () => {
        if (!originalData) return;

        // Возвращаем все поля к исходным значениям
        setTitle(originalData.title || '');
        setAlttitle(originalData.alttitle || '');
        setDescription(originalData.description || '');
        setGenres(originalData.genres || '');
        setStatus(originalData.status || '');
        setType(originalData.type || '');
        setEpisodeAll(originalData.episode_all || '');
        setCurrentEpisode(originalData.current_episode || '');
        setRating(originalData.rating || '');
        setYear(originalData.year || '');
        setSeason((originalData.season || '').replace(/\s*(сезон|часть)$/i, ''));
        setMouthSeason(originalData.mouth_season || '');
        setStudio(originalData.studio || '');
        setRealesedFor(originalData.realesed_for || '');
        setAlias(originalData.alias || '');
        setKodik(originalData.kodik || '');
        setOpened(originalData.opened ?? true);
        setZametka(originalData.zametka || '');
        setAnons(originalData.anons || '');

        // Сбрасываем изменения медиафайлов
        setCover(null);
        setBanner(null);
        setScreenshots([]);
        setDeletedCover(false);
        setDeletedBanner(false);
        
        // Восстанавливаем исходные скриншоты
        setScreenshotPreviews(originalScreenshotPreviews);
        setKeepScreenshotIds(originalKeepScreenshotIds);

        showToast('Изменения отменены', 'info', <RotateCcw size={20} />);

        // Обновляем title мгновенно
        document.title = 'Yumeko | Admin_Panel';

        setTimeout(() => {
            router.push('/admin_panel');
        }, 1000);
    };

    // Функция показа toast сообщений
    const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning', icon?: React.ReactNode) => {
        setToastMessage(msg);
        setToastType(type);
        setToastIcon(icon);

        setTimeout(() => {
            setToastMessage(null);
            setToastType(null);
            setToastIcon(null);
        }, 3000);
    };

    if (loading) {
        return (
            <section className="yumeko-admin-edit-anime">
                <div className="yumeko-admin-edit-anime-skeleton">
                    <div className="skeleton-header" />
                    <div className="skeleton-layout">
                        <div className="skeleton-left">
                            <div className="skeleton-media" />
                            <div className="skeleton-media small" />
                        </div>
                        <div className="skeleton-middle">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="skeleton-field" />
                            ))}
                        </div>
                        <div className="skeleton-right">
                            <div className="skeleton-panel" />
                            <div className="skeleton-panel" />
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="yumeko-admin-edit-anime">
            {/* Toast */}
            {toastMessage && (
                <div className={`yumeko-admin-edit-anime-toast ${toastType}`}>
                    {toastIcon && <span className="toast-icon">{toastIcon}</span>}
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="yumeko-admin-edit-anime-header">
                <h1>Редактирование аниме <span>#{animeId}</span></h1>
            </div>

            {/* Layout */}
            <div className="yumeko-admin-edit-anime-layout">
                
                {/* Left - Media */}
                <div className="yumeko-admin-edit-anime-left">
                    <div className="yumeko-admin-edit-anime-section">
                        <div className="yumeko-admin-edit-anime-section-title">
                            <ImagePlus size={18} />
                            Медиа файлы
                        </div>
                        <AnimeFileAndEpisode
                            cover={cover}
                            banner={banner}
                            screenshots={screenshots}
                            setCover={setCover}
                            setBanner={setBanner}
                            setScreenshots={setScreenshots}
                            coverPreview={coverPreview}
                            bannerPreview={bannerPreview}
                            screenshotPreviews={screenshotPreviews}
                            setCoverPreview={setCoverPreview}
                            setBannerPreview={setBannerPreview}
                            setScreenshotPreviews={setScreenshotPreviews}
                            keepScreenshotIds={keepScreenshotIds}
                            setKeepScreenshotIds={setKeepScreenshotIds}
                            deletedCover={deletedCover}
                            deletedBanner={deletedBanner}
                            setDeletedCover={setDeletedCover}
                            setDeletedBanner={setDeletedBanner}
                        />
                    </div>
                </div>

                {/* Middle - Info */}
                <div className="yumeko-admin-edit-anime-middle">
                    <AnimeMainInfo
                        title={title}
                        alttitle={alttitle}
                        rating={rating}
                        episodeAll={episodeAll}
                        currentEpisode={currentEpisode}
                        type={type}
                        status={status}
                        genres={genres}
                        realesedFor={realesedFor}
                        mouthSeason={mouthSeason}
                        season={season}
                        year={year}
                        studio={studio}
                        description={description}
                        alias={alias}
                        kodik={kodik}
                        animeId={animeId}
                        opened={opened}
                        anons={anons}
                        countries={countries}
                        zametka_blocked={zametka_blocked}
                        zametka={zametka}
                        onValidateBlocking={setValidateBlockingFn}

                        setTitle={setTitle}
                        setAlttitle={setAlttitle}
                        setRating={setRating}
                        setEpisodeAll={setEpisodeAll}
                        setCurrentEpisode={setCurrentEpisode}
                        setType={setType}
                        setStatus={setStatus}
                        setGenres={setGenres}
                        setRealesedFor={setRealesedFor}
                        setMouthSeason={setMouthSeason}
                        setSeason={setSeason}
                        setYear={setYear}
                        setStudio={setStudio}
                        setDescription={setDescription}
                        setAlias={setAlias}
                        setKodik={setKodik}
                        setOpened={setOpened}
                        setAnons={setAnons}
                        setCountries={setCountries}
                        setZametka_blocked={setZametka_blocked}
                        setZametka={setZametka}
                    />
                </div>

                {/* Right - Stats */}
                <div className="yumeko-admin-edit-anime-right">
                    <EditStatsPanel 
                        originalData={originalData as AnimeData | null}
                        currentData={{title, description, genres, type, status} as AnimeData}
                    />
                    
                    {/* Панель сравнения изменений */}
                    <ChangesComparisonPanel 
                        originalData={originalData as ComparisonData | null}
                        currentData={{
                            title, alttitle, description, genres, type, 
                            status, rating, episodeAll, currentEpisode
                        } as ComparisonData}
                    />
                </div>

            </div>

            {/* Franchise */}
            {animeId && (
                <div className="yumeko-admin-edit-anime-franchise">
                    <FranchiseChainManager animeId={parseInt(animeId)} />
                </div>
            )}

            {/* Actions */}
            <EditFloatingActionButtons
                onSave={handleSave}
                onCancel={handleCancel}
                saving={saving}
            />

            {/* Progress Modal */}
            <UploadProgressModal
                isVisible={saving}
                progress={uploadProgress}
                currentStep={uploadStep}
            />
        </section>
    );
};

export default EditAnimePage;