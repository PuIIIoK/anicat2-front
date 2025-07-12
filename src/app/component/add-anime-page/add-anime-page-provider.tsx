'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import AnimeMainInfo from './anime-upload-info';
import AnimeFileAndEpisode from "./add-upload-upload";
import { API_SERVER } from "../../../tools/constants";
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
    const [message, ] = useState<string | null>(null);
    const [alias, setAlias] = useState('');
    const [kodik, setKodik] = useState('');
    const [banner, setBanner] = useState<File | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | null>(null);


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
    const showToast = (msg: string, type: 'success' | 'error') => {
        setToastMessage(msg);
        setToastType(type);

        setTimeout(() => {
            setToastMessage(null);
            setToastType(null);
        }, 3000);
    };

    const handleInfoUpload = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');
        if (!animeId) return;
        await fetch(`${API_SERVER}/api/admin/upload-info/${animeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' , 'Authorization': `Bearer ${token}`,},
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
                season,
                mouth_season: mouthSeason,
                studio,
                realesed_for: realesedFor,
                alias,
                kodik,
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
        setSaving(true);
        try {
            await handleBannerUpload();
            await handleCoverUpload();
            await handleScreenshotUpload();
            await handleInfoUpload();
            await addAnimeToAllCategory();

            showToast('✅ Аниме успешно сохранено', 'success');

            setTimeout(() => {
                router.push('/admin_panel');
            }, 1500);
        } catch (err) {
            console.error('❌ Ошибка при сохранении аниме:', err);
            showToast('❌ Ошибка при сохранении аниме', 'error');
        } finally {
            setSaving(false);
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
        await fetch(`${API_SERVER}/api/admin/delete-anime/${animeId}`,
            { method: 'DELETE' ,headers: {
                    'Authorization': `Bearer ${token}`,
                },});
        router.push('/admin_panel');
    };

    return (
        <div className="add-anime-page">
            <h1 className="title">Добавление аниме: #{animeId}</h1>

            {message && <div className="message-box">{message}</div>}
            {toastMessage && (
                <div className={`toast-message ${toastType}`}>
                    {toastMessage}
                </div>
            )}
            <AnimeFileAndEpisode
                banner={banner}
                setBanner={setBanner}
                cover={cover}
                screenshots={screenshots}
                setCover={setCover}
                setScreenshots={setScreenshots}
            />

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
                setKodik={setKodik}
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
            />


            <div className="buttons">
                <button className="save-add-anime" onClick={handleSave} disabled={saving}>💾 Сохранить</button>
                <button className="cancel-add-anime" onClick={handleCancel}>❌ Отменить</button>
            </div>
        </div>
    );
};

export default AddAnimePage;
