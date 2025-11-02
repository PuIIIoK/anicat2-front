'use client';

import React, { useState } from 'react';
import { EpisodeEntry } from "../../../utils/anime";
import { API_SERVER } from '@/hosts/constants';

interface Props {
    animeId: string | null;
    episodes: EpisodeEntry[];
    setEpisodes: (episodes: EpisodeEntry[]) => void;
    addAudioToEpisode: (epIndex: number) => void;
    addEpisode: () => void;
}

const AnimeEpisodeEditor: React.FC<Props> = ({
                                                 animeId,
                                                 episodes,
                                                 setEpisodes,
                                             }) => {
    const [uploadComplete, setUploadComplete] = useState<Record<string, boolean>>({});
    const [uploading, setUploading] = useState<Record<string, boolean>>({});

    const handleAddEpisode = async () => {
        if (!animeId) return;

        const res = await fetch(`${API_SERVER}/api/admin/upload-episode/create-episode/${animeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Новый эпизод' })
        });

        if (res.ok) {
            const data = await res.json();
            const newEpisode: EpisodeEntry = {
                id: data.id,
                title: data.title,
                audios: [],
                saved: true
            };
            setEpisodes([...episodes, newEpisode]);
        }
    };

    const handleAddAudio = (epIndex: number) => {
        const updated = [...episodes];
        updated[epIndex].audios.push({
            id: null,
            name: 'Новая озвучка',
            file: null
        });
        setEpisodes(updated);
    };

    const handleAudioFileChange = (epIndex: number, aIndex: number, file: File | null) => {
        const updated = [...episodes];
        updated[epIndex].audios[aIndex].file = file;
        setEpisodes(updated);
    };

    const handleSave = async () => {
        if (!animeId) return;

        for (let epIndex = 0; epIndex < episodes.length; epIndex++) {
            const episode = episodes[epIndex];
            if (!episode.id) continue;

            await fetch(`${API_SERVER}/api/admin/upload-episode/update-episode/${episode.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: episode.title })
            });

            for (let aIndex = 0; aIndex < episode.audios.length; aIndex++) {
                const audio = episode.audios[aIndex];

                if (!audio.id) {
                    const res = await fetch(`${API_SERVER}/api/admin/upload-episode/create-audio/${animeId}/${episode.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: audio.name.trim() || "Озвучка" })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        audio.id = data.id;
                        const updated = [...episodes];
                        updated[epIndex].audios[aIndex] = audio;
                        setEpisodes(updated);
                    } else continue;
                }

                if (audio.file && audio.name.trim()) {
                    const uploadKey = `${episode.id}-${audio.name}`;
                    setUploading(prev => ({ ...prev, [uploadKey]: true }));

                    const uploadUrl = `${API_SERVER}/api/admin/upload-episode/${animeId}/${audio.name}/1080/${episode.id}`;

                    const formData = new FormData();
                    formData.append('file', audio.file);

                    try {
                        const res = await fetch(uploadUrl, {
                            method: 'POST',
                            body: formData
                        });

                        if (res.ok) {
                            setUploadComplete(prev => ({ ...prev, [uploadKey]: true }));
                        }
                    } catch (err) {
                        console.error("❌ Ошибка при загрузке:", err);
                    } finally {
                        setUploading(prev => ({ ...prev, [uploadKey]: false }));
                    }
                }
            }
        }

        console.log("✅ Сохранение завершено");
    };

    const handleDeleteEpisode = async (epIndex: number) => {
        const episode = episodes[epIndex];

        const confirmed = confirm("Удалить эпизод и все его озвучки?");
        if (!confirmed) return;

        // если нет id — значит эпизод не сохранён, просто удалим локально
        if (!episode.id) {
            const updated = [...episodes];
            updated.splice(epIndex, 1);
            setEpisodes(updated);
            return;
        }

        // если есть id — удалим с бэка
        const res = await fetch(`${API_SERVER}/api/admin/delete-episode/${episode.id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            const updated = [...episodes];
            updated.splice(epIndex, 1);
            setEpisodes(updated);
        } else {
            console.error("❌ Не удалось удалить эпизод");
        }
    };


    const handleDeleteAudio = async (epIndex: number, aIndex: number) => {
        const audio = episodes[epIndex].audios[aIndex];
        if (!audio.id) {
            // просто удалить локально
            const updated = [...episodes];
            updated[epIndex].audios.splice(aIndex, 1);
            setEpisodes(updated);
            return;
        }

        const confirmed = confirm("Удалить озвучку и видеофайл?");
        if (!confirmed) return;

        const res = await fetch(`${API_SERVER}/api/admin/delete-audio/${audio.id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            const updated = [...episodes];
            updated[epIndex].audios.splice(aIndex, 1);
            setEpisodes(updated);
        } else {
            console.error("❌ Не удалось удалить озвучку");
        }
    };


    return (
        <div className="episode-section">
            <h3>Эпизоды</h3>
            {episodes.map((ep, epIndex) => (
                <div key={epIndex} className="episode-block">
                    <input
                        className="episode-upload-first"
                        value={ep.title}
                        onChange={(e) => {
                            const updated = [...episodes];
                            updated[epIndex].title = e.target.value;
                            setEpisodes(updated);
                        }}
                        placeholder="Название эпизода"
                    />
                    <button onClick={() => handleDeleteEpisode(epIndex)} className="danger">
                        ❌ Удалить эпизод
                    </button>

                    {ep.audios.map((audio, aIndex) => {
                        const key = `${ep.id}-${audio.name}`;
                        return (
                            <div key={aIndex} className="audio-block">
                                <input
                                    className="episode-upload-first"
                                    placeholder="Название озвучки"
                                    value={audio.name}
                                    onChange={(e) => {
                                        const updated = [...episodes];
                                        updated[epIndex].audios[aIndex].name = e.target.value;
                                        setEpisodes(updated);
                                    }}
                                />
                                <input
                                    type="file"
                                    accept="video/mp4"
                                    onChange={(e) => handleAudioFileChange(epIndex, aIndex, e.target.files?.[0] || null)}
                                />
                                {audio.file && (
                                    <p>
                                        Файл: <strong>{audio.file.name}</strong> ({Math.round(audio.file.size / 1024)} KB)
                                    </p>
                                )}
                                {uploading[key] && (
                                    <div style={{ marginTop: 5 }}>Загрузка файла [Может занять до ~15минут]<span className="spinner" /></div>
                                )}
                                {uploadComplete[key] && (
                                    <div style={{ color: 'green', marginTop: 5 }}>Файл загружен ✅</div>
                                )}
                                <button onClick={() => handleDeleteAudio(epIndex, aIndex)} className="danger small">
                                    ❌ Удалить озвучку
                                </button>
                            </div>
                        );
                    })}

                    <button onClick={() => handleAddAudio(epIndex)}>+ Озвучка</button>
                </div>
            ))}
            <button onClick={handleAddEpisode}>+ Эпизод</button>
            <button onClick={handleSave} style={{ marginLeft: 10 }}>
                💾 Сохранить
            </button>
        </div>
    );
};

export default AnimeEpisodeEditor;