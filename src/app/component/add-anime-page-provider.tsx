'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import AnimeMainInfo from '../component/anime-upload-info';
import AnimeFileAndEpisode from "../component/add-upload-upload";
import { API_SERVER } from "../../tools/constants";

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
    const [message, setMessage] = useState<string | null>(null);
    const [alias, setAlias] = useState('');
    const [kodik, setKodik] = useState('');


    const handleCoverUpload = async () => {
        if (!cover || !animeId) return;
        const formData = new FormData();
        formData.append('file', cover);
        await fetch(`${API_SERVER}/api/admin/upload-cover/${animeId}`, {
            method: 'POST',
            body: formData,
        });
    };

    const handleScreenshotUpload = async () => {
        if (!screenshots.length || !animeId) return;
        const formData = new FormData();
        screenshots.forEach((file) => formData.append('files', file));
        await fetch(`${API_SERVER}/api/admin/upload-screenshots/${animeId}`, {
            method: 'POST',
            body: formData,
        });
    };

    const handleInfoUpload = async () => {
        if (!animeId) return;
        await fetch(`${API_SERVER}/api/admin/upload-info/${animeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

    const handleSave = async () => {
        setSaving(true);
        try {
            await handleCoverUpload();
            await handleScreenshotUpload();
            await handleInfoUpload();
            setMessage('✅ Данные успешно сохранены.');

            // ⏳ Пауза и редирект
            setTimeout(() => {
                router.push('/admin_panel');
            }, 1500);
        } catch (err) {
            console.error('❌ Ошибка при сохранении аниме:', err);
            setMessage('❌ Ошибка при сохранении аниме.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!animeId) return;
        await fetch(`${API_SERVER}/api/admin/delete-anime/${animeId}`, { method: 'DELETE' });
        router.push('/admin_panel');
    };

    return (
        <div className="add-anime-page">
            <h1 className="title">Добавление Аниме #{animeId}</h1>

            {message && <div className="message-box">{message}</div>}

            <AnimeFileAndEpisode
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
