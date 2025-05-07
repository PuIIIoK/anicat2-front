'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AnimeMainInfo from '../add-anime-page/anime-upload-info';
import AnimeFileAndEpisode from '../edit-anime-page/anime-edit-upload';
import { API_SERVER } from '../../../tools/constants';
import { AnimeInfo } from "../anime-structure/anime-data-info";

type ScreenshotData = {
    id: number;
    url: string;
};
const getTokenFromCookie = () => {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
};
const EditAnimePage = () => {
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
    const [alias, setAlias] = useState('');
    const [kodik, setKodik] = useState('');

    const [cover, setCover] = useState<File | null>(null);
    const [banner, setBanner] = useState<File | null>(null);
    const [screenshots, setScreenshots] = useState<File[]>([]);
    const [originalData, setOriginalData] = useState<AnimeInfo | null>(null);

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | null>(null);
    const [coverPreview, setCoverPreview] = useState('');
    const [bannerPreview, setBannerPreview] = useState('');
    const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
    const [keepScreenshotIds, setKeepScreenshotIds] = useState<number[]>([]);
    const [deletedCover, setDeletedCover] = useState(false);
    const [deletedBanner, setDeletedBanner] = useState(false);

    useEffect(() => {
        if (!animeId) return;

        fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`)
            .then(res => res.json())
            .then((data: AnimeInfo) => {
                setTitle(data.title || '');
                setAlttitle(data.alttitle || '');
                setDescription(data.description || '');
                setGenres(data.genres || '');
                setStatus(data.status || '');
                setType(data.type || '');
                setEpisodeAll(data.episode_all || '');
                setCurrentEpisode(data.current_episode || '');
                setRating(data.rating || '');
                setYear(data.year || '');
                setSeason(data.season || '');
                setMouthSeason(data.mouth_season || '');
                setStudio(data.studio || '');
                setRealesedFor(data.realesed_for || '');
                setAlias(data.alias || '');
                setKodik(data.kodik || '');
                setOriginalData(data);
            })
            .catch(err => console.error('Ошибка загрузки аниме:', err));
    }, [animeId]);

    useEffect(() => {
        if (!animeId) return;

        fetch(`${API_SERVER}/api/stream/anime/${animeId}/screenshots`)
            .then(res => res.json())
            .then((data: ScreenshotData[]) => {
                const urls = data.map((s) => s.url);
                const ids = data.map((s) => s.id);
                setScreenshotPreviews(urls);
                setKeepScreenshotIds(ids);
            })
            .catch(() => setScreenshotPreviews([]));

        fetch(`${API_SERVER}/api/stream/${animeId}/cover`)
            .then(res => res.blob())
            .then(blob => setCoverPreview(URL.createObjectURL(blob)))
            .catch(() => setCoverPreview(''));

        fetch(`${API_SERVER}/api/stream/${animeId}/banner-direct`)
            .then(res => res.blob())
            .then(blob => setBannerPreview(URL.createObjectURL(blob)))
            .catch(() => setBannerPreview(''));
    }, [animeId]);

    const handleReset = () => {
        if (!originalData) return;

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
        setSeason(originalData.season || '');
        setMouthSeason(originalData.mouth_season || '');
        setStudio(originalData.studio || '');
        setRealesedFor(originalData.realesed_for || '');
        setAlias(originalData.alias || '');
        setKodik(originalData.kodik || '');

        setCover(null);
        setBanner(null);
        setScreenshots([]);
        showToast('🔄 Изменения отменены', 'success');

        setTimeout(() => router.push('/admin_panel'), 1000);
    };

    const handleSave = async () => {
        const token = getTokenFromCookie();
        if (!token) throw new Error('Токен не найден');

        try {
            // INFO
            await fetch(`${API_SERVER}/api/admin/edit-info/${animeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title, alttitle, description, genres, status, type,
                    episode_all: episodeAll, current_episode: currentEpisode,
                    rating, year, season, mouth_season: mouthSeason,
                    studio, realesed_for: realesedFor, alias, kodik,
                }),
            });

            // COVER
            if (deletedCover) {
                await fetch(`${API_SERVER}/api/admin/delete-cover/${animeId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            } else if (cover !== null) {
                const formData = new FormData();
                formData.append('file', cover);
                await fetch(`${API_SERVER}/api/admin/edit-cover/${animeId}`, {
                    method: 'PUT',
                    body: formData,
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            }

            // BANNER
            if (deletedBanner) {
                await fetch(`${API_SERVER}/api/admin/delete-banner/${animeId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            } else if (banner !== null) {
                const formData = new FormData();
                formData.append('file', banner);
                await fetch(`${API_SERVER}/api/admin/edit-banner/${animeId}`, {
                    method: 'PUT',
                    body: formData,
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            }

            // SCREENSHOTS
            const formData = new FormData();
            screenshots.forEach((file) => formData.append('files', file));
            keepScreenshotIds.forEach(id => formData.append('keepIds', id.toString()));
            await fetch(`${API_SERVER}/api/admin/edit-screenshots/${animeId}`, {
                method: 'PUT',
                body: formData,
                headers: { 'Authorization': `Bearer ${token}` },
            });

            showToast('✅ Аниме обновлено', 'success');
            setTimeout(() => router.push('/admin_panel'), 1000);
        } catch (err) {
            console.error(err);
            showToast('❌ Ошибка при обновлении', 'error');
        }
    };


    const showToast = (msg: string, type: 'success' | 'error') => {
        setToastMessage(msg);
        setToastType(type);
        setTimeout(() => {
            setToastMessage(null);
            setToastType(null);
        }, 3000);
    };

    return (
        <div className="edit-anime-page">
            <h1 className="title">Редактирование аниме: #{animeId}</h1>
            {toastMessage && <div className={`toast-message ${toastType}`}>{toastMessage}</div>}

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
                keepScreenshotIds={keepScreenshotIds}
                setKeepScreenshotIds={setKeepScreenshotIds}
                deletedCover={deletedCover}
                deletedBanner={deletedBanner}
                setDeletedCover={setDeletedCover}
                setDeletedBanner={setDeletedBanner}
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
                <button className="save-edit-anime" onClick={handleSave}>💾 Сохранить</button>
                <button className="cancel-changes" onClick={handleReset}>❌ Отмена</button>
            </div>
        </div>
    );
};

export default EditAnimePage;
