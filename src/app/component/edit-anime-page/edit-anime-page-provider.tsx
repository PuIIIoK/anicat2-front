'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import AnimeMainInfo from '../add-anime-page/anime-upload-info';
import AnimeFileAndEpisode from "./anime-edit-upload";
import { API_SERVER } from "../../../tools/constants";
import UploadProgressModal from "../admin_panel/UploadProgressModalAnime";
import EditSectionNavigation from "./EditSectionNavigation";
import EditFloatingActionButtons from "./EditFloatingActionButtons";
import FranchiseChainManager from "../franchise-chains/FranchiseChainManager";
import { CheckCircle, FileEdit, ImageUp, Edit3, XCircle, RefreshCw, ImagePlus, RotateCcw, AlertTriangle, CheckCircle2, BarChart3, GitCompare, Clock } from "lucide-react";
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

// Компонент статистики изменений
const EditStatsPanel = ({ originalData, currentData }: any) => {
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
        <div className="edit-stats-panel">
            <div className="panel-header">
                <BarChart3 />
                <h3>Статистика</h3>
            </div>
            <div className="stats-grid">
                <div className="stat-card">
                    <Edit3 className="stat-icon" />
                    <div className="stat-value">{stats.modified}</div>
                    <div className="stat-label">Изменено</div>
                </div>
                <div className="stat-card">
                    <CheckCircle2 className="stat-icon" />
                    <div className="stat-value">{stats.total - stats.modified}</div>
                    <div className="stat-label">Без изменений</div>
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

// Компонент сравнения изменений
const ChangesComparisonPanel = ({ originalData, currentData }: any) => {
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
        <div className="changes-comparison-panel">
            <div className="panel-header">
                <GitCompare />
                <h3>Изменения</h3>
            </div>
            <div className="changes-list">
                {changes.length > 0 ? (
                    changes.map((change, index) => (
                        <div key={index} className={`change-item ${change.type}`}>
                            <div className="change-field">{change.field}</div>
                            <div className="change-values">
                                <div className="old-value">{String(change.oldValue).substring(0, 30)}{String(change.oldValue).length > 30 ? '...' : ''}</div>
                                <div className="new-value">{String(change.newValue).substring(0, 30)}{String(change.newValue).length > 30 ? '...' : ''}</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-changes">Изменений пока нет</div>
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
        screenshots.forEach((file) => formData.append('files', file));
        keepScreenshotIds.forEach(id => formData.append('keepIds', id.toString()));
        
        await fetch(`${API_SERVER}/api/admin/edit-screenshots/${animeId}`, {
            method: 'PUT',
            body: formData,
            headers: { 'Authorization': `Bearer ${token}` },
        });
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
            <div className="edit-anime-page loading">
                <div className="loading-spinner">
                    <div className="spinner-icon">
                        <RefreshCw size={48} />
                    </div>
                    <p>Загрузка данных аниме...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="edit-anime-page">
            {/* Navigation */}
            <EditSectionNavigation />
            
            {/* Toast сообщения */}
            {toastMessage && (
                <div className={`toast-message ${toastType}`}>
                    <div className="toast-content">
                        {toastIcon && <div className="toast-icon">{toastIcon}</div>}
                        <div className="toast-text">{toastMessage}</div>
                    </div>
                </div>
            )}

            {/* Интегрированный заголовок */}
            <div className="integrated-header">
                <h1 className="page-title">Редактирование аниме <span className="anime-id">#{animeId}</span></h1>
            </div>

            {/* Основной контент - трёхколоночная структура */}
            <div className="main-content-layout">
                
                {/* Левая колонка - Медиа файлы */}
                <div className="left-column">
                    <div className="content-section file-upload-section">
                        <div className="section-title">
                            <ImagePlus className="icon" />
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

                {/* Средняя колонка - Информация */}
                <div className="middle-column">
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
                        opened={opened}
                        countries={countries}
                        zametka_blocked={zametka_blocked}
                        zametka={zametka}
                        anons={anons}
                        onValidateBlocking={setValidateBlockingFn}
                        setAnons={setAnons}
                        setZametka={setZametka}

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
                        setCountries={setCountries}
                        setZametka_blocked={setZametka_blocked}
                    />
                </div>

                {/* Правая колонка - Дополнительные фичи */}
                <div className="right-column">
                    {/* Панель статистики изменений */}
                    <EditStatsPanel 
                        originalData={originalData}
                        currentData={{title, description, genres, type, status}}
                    />
                    
                    {/* Панель сравнения изменений */}
                    <ChangesComparisonPanel 
                        originalData={originalData}
                        currentData={{
                            title, alttitle, description, genres, type, 
                            status, rating, episodeAll, currentEpisode
                        }}
                    />
                </div>

            </div>

            {/* Секция цепочек франшизы */}
            {animeId && (
                <div id="franchise-chains-section">
                    <FranchiseChainManager animeId={parseInt(animeId)} />
                </div>
            )}

            {/* Плавающие кнопки управления */}
            <EditFloatingActionButtons
                onSave={handleSave}
                onCancel={handleCancel}
                saving={saving}
            />

            {/* Модальное окно прогресса */}
            <UploadProgressModal
                isVisible={saving}
                progress={uploadProgress}
                currentStep={uploadStep}
            />

        </div>
    );
};

export default EditAnimePage;