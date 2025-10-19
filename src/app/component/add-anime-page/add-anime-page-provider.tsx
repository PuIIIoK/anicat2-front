'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import AnimeMainInfo from './anime-upload-info';
import AnimeFileAndEpisode from "./add-upload-upload";
import { API_SERVER } from "../../../tools/constants";
import UploadProgressModal from "../admin_panel/UploadProgressModalAnime";
import SectionNavigation from "./SectionNavigation";
import FloatingActionButtons from "./FloatingActionButtons";
import AddAnimeNotification from "./AddAnimeNotification";
import FranchiseChainManager from "../franchise-chains/FranchiseChainManager";
import {CheckCircle, FileEdit, FolderPlus, ImagePlus, ImageUp, UploadCloud, XCircle} from "lucide-react";
const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};
const AddAnimePage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const animeId = searchParams.get('id');

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

    const [cover, setCover] = useState<File | null>(null);
    const [screenshots, setScreenshots] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    // const [message, ] = useState<string | null>(null);
    const [alias, setAlias] = useState('');
    const [kodik, setKodik] = useState('');
    const [banner, setBanner] = useState<File | null>(null);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error' | 'info' | 'warning' | 'anime-saved' | 'anime-cancelled';
        message: string;
    } | null>(null);
    const [countries, setCountries] = useState('');
    const [zametka_blocked, setZametka_blocked] = useState('');
    const [opened, setOpened] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStep, setUploadStep] = useState<React.ReactNode>(''); // вместо <string>
    const [zametka, setZametka] = useState('');
    const [anons, setAnons] = useState('');
    
    // Ref для функции валидации блокировки
    const [validateBlockingFn, setValidateBlockingFn] = useState<(() => void) | null>(null);

    

    const handleCoverUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        if (!cover || !animeId) return;
        const formData = new FormData();
        formData.append('file', cover);
        await fetch(`${API_SERVER}/api/admin/upload-cover/${animeId}`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    };

    const handleScreenshotUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        if (!screenshots.length || !animeId) return;
        const formData = new FormData();
        screenshots.forEach((file) => formData.append('files', file));
        await fetch(`${API_SERVER}/api/admin/upload-screenshots/${animeId}`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    };

    const handleInfoUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        if (!animeId) return;
        
        // Определяем значение для поля season в зависимости от типа аниме
        let seasonValue = null;
        if (season && season.trim() !== '') {
            // Если поле season заполнено
            if (type === 'Фильм') {
                // Для фильмов отправляем как "X часть"
                seasonValue = `${season} часть`;
            } else {
                // Для остальных типов (TV, OVA, Спин-офф) отправляем как "X сезон"
                seasonValue = `${season} сезон`;
            }
        }
        // Если поле season пустое - остается null (ничего не отправляем)
        
        await fetch(`${API_SERVER}/api/admin/upload-info/${animeId}`, {
            method: 'POST',
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
                season: seasonValue,
                mouth_season: mouthSeason,
                studio,
                realesed_for: realesedFor,
                alias,
                kodik,
                opened: opened,
                zametka,
                anons
            }),
        });
    };
    const addAnimeToAllCategory = async () => {
        const token = getTokenFromCookie();
        if (!token || !animeId) return;

        const response = await fetch(`${API_SERVER}/api/admin/add-to-all-category/${animeId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("⚠️ Ошибка добавления в категорию 'все аниме':", text);
        }
    };

    const handleSave = async () => {
        // Валидируем блокировку перед сохранением
        if (validateBlockingFn) {
            validateBlockingFn();
        }
        
        setSaving(true);
        setUploadProgress(5);
        setUploadStep(<><UploadCloud className="inline w-4 h-4 mr-2" /> Загрузка баннера...</>);

        try {
            await handleBannerUpload();
            setUploadProgress(20);
            setUploadStep(<><ImageUp className="inline w-4 h-4 mr-2" /> Загрузка обложки...</>);

            await handleCoverUpload();
            setUploadProgress(40);
            setUploadStep(<><ImagePlus className="inline w-4 h-4 mr-2" /> Загрузка скриншотов...</>);

            await handleScreenshotUpload();
            setUploadProgress(60);
            setUploadStep(<><FileEdit className="inline w-4 h-4 mr-2" /> Сохранение основной информации...</>);

            await handleInfoUpload();
            await handleAvailabilityUpload();
            setUploadProgress(80);
            setUploadStep(<><FolderPlus className="inline w-4 h-4 mr-2" /> Добавление в категории...</>);

            await addAnimeToAllCategory();

            setUploadProgress(100);
            setUploadStep(<><CheckCircle className="inline w-4 h-4 mr-2 text-green-600" /> Аниме успешно сохранено</>);

            setNotification({
                type: 'anime-saved',
                message: 'Аниме успешно сохранено'
            });

            setTimeout(() => {
                router.push('/admin_panel?admin_panel=edit-anime');
            }, 1500);
        } catch (err) {
            console.error('❌ Ошибка при сохранении аниме:', err);
            setUploadStep(<><XCircle className="inline w-4 h-4 mr-2 text-red-600" /> Ошибка при сохранении аниме</>);
            setNotification({
                type: 'error',
                message: 'Ошибка при сохранении аниме'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAvailabilityUpload = async () => {
        const token = getTokenFromCookie();
        if (!token || !animeId) return;

        const payload = {
            blockedCountries: countries
                .split(',')
                .map(c => c.trim().toUpperCase())
                .filter(c => c !== ''), // превращает "RU, US" -> ["RU", "US"]
            zametka: zametka_blocked || ""
        };

        const response = await fetch(`${API_SERVER}/api/admin/avaibility/set-avaibility/${animeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка обновления доступности: ${errorText}`);
        }
    };


    const handleBannerUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        if (!banner || !animeId) return;
        const formData = new FormData();
        formData.append('file', banner);
        const res = await fetch(`${API_SERVER}/api/admin/upload-banner/${animeId}`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Ошибка загрузки баннера');
        }
    };

    const handleCancel = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        if (!animeId) return;
        
        try {
            await fetch(`${API_SERVER}/api/admin/delete-anime/${animeId}`,
                { method: 'DELETE' ,headers: {
                        'Authorization': `Bearer ${token}`,
                    },});
            
            setNotification({
                type: 'anime-cancelled',
                message: 'Добавление аниме отменено'
            });
            
            setTimeout(() => {
                router.push('/admin_panel');
            }, 1500);
            
        } catch (error) {
            console.error('Ошибка при отмене добавления аниме:', error);
            setNotification({
                type: 'error',
                message: 'Ошибка при отмене добавления'
            });
        }
    };

    return (
        <div className="add-anime-page">
            {/* Navigation */}
            <SectionNavigation />
            
            {/* Уведомления */}
            {notification && (
                <AddAnimeNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                    autoClose={true}
                    duration={5000}
                />
            )}

            {/* Интегрированный заголовок */}
            <div className="integrated-header">
                <h1 className="page-title">Добавление аниме <span className="anime-id">#{animeId}</span></h1>
            </div>

            {/* Основной контент - двухколоночная структура */}
            <div className="main-content-layout">
                
                {/* Левая колонка - Медиа файлы */}
                <div className="left-column">
                    <div className="content-section file-upload-section">
                        <div className="section-title">
                            <ImagePlus className="icon" />
                            Медиа файлы
                        </div>
                        <AnimeFileAndEpisode
                            banner={banner}
                            setBanner={setBanner}
                            cover={cover}
                            screenshots={screenshots}
                            setCover={setCover}
                            setScreenshots={setScreenshots}
                        />
                    </div>
                </div>

                {/* Правая колонка - Информация */}
                <div className="right-column">
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

            </div>

            {/* Секция цепочек франшизы */}
            {animeId && (
                <div id="franchise-chains-section">
                    <FranchiseChainManager animeId={parseInt(animeId)} />
                </div>
            )}

            {/* Плавающие кнопки управления */}
            <FloatingActionButtons
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

export default AddAnimePage;
