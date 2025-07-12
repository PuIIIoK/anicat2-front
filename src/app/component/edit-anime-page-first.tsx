'use client';

import React from 'react'

interface AnimeMainInfoProps {
    title: string
    alttitle: string
    description: string
    genres: string
    status: string
    type: string
    episodeAll: string
    currentEpisode: string
    rating: string
    year: string
    season: string
    mouthSeason: string
    studio: string
    realesedFor: string
    setTitle: (v: string) => void
    setAlttitle: (v: string) => void
    setDescription: (v: string) => void
    setGenres: (v: string) => void
    setStatus: (v: string) => void
    setType: (v: string) => void
    setEpisodeAll: (v: string) => void
    setCurrentEpisode: (v: string) => void
    setRating: (v: string) => void
    setYear: (v: string) => void
    setSeason: (v: string) => void
    setMouthSeason: (v: string) => void
    setStudio: (v: string) => void
    setRealesedFor: (v: string) => void
}

const AnimeMainInfo: React.FC<AnimeMainInfoProps> = ({
                                                         title,
                                                         alttitle,
                                                         description,
                                                         genres,
                                                         status,
                                                         type,
                                                         episodeAll,
                                                         currentEpisode,
                                                         rating,
                                                         year,
                                                         season,
                                                         mouthSeason,
                                                         studio,
                                                         realesedFor,
                                                         setTitle,
                                                         setAlttitle,
                                                         setDescription,
                                                         setGenres,
                                                         setStatus,
                                                         setType,
                                                         setEpisodeAll,
                                                         setCurrentEpisode,
                                                         setRating,
                                                         setYear,
                                                         setSeason,
                                                         setMouthSeason,
                                                         setStudio,
                                                         setRealesedFor
                                                     }) => {
    return (
        <div className="form-grid">
            <label>Название:
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>Альтернативное название:
                <input value={alttitle} onChange={(e) => setAlttitle(e.target.value)} />
            </label>
            <label>Описание:
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>Жанры:
                <input value={genres} onChange={(e) => setGenres(e.target.value)} />
            </label>
            <label>Статус:
                <input value={status} onChange={(e) => setStatus(e.target.value)} />
            </label>
            <label>Тип:
                <input value={type} onChange={(e) => setType(e.target.value)} />
            </label>
            <label>Всего эпизодов:
                <input value={episodeAll} onChange={(e) => setEpisodeAll(e.target.value)} />
            </label>
            <label>Текущий эпизод:
                <input value={currentEpisode} onChange={(e) => setCurrentEpisode(e.target.value)} />
            </label>
            <label>Рейтинг:
                <input value={rating} onChange={(e) => setRating(e.target.value)} />
            </label>
            <label>Год:
                <input value={year} onChange={(e) => setYear(e.target.value)} />
            </label>
            <label>Сезон:
                <input value={season} onChange={(e) => setSeason(e.target.value)} />
            </label>
            <label>Месяц сезона:
                <input value={mouthSeason} onChange={(e) => setMouthSeason(e.target.value)} />
            </label>
            <label>Студия:
                <input value={studio} onChange={(e) => setStudio(e.target.value)} />
            </label>
            <label>По мотивам:
                <input value={realesedFor} onChange={(e) => setRealesedFor(e.target.value)} />
            </label>
        </div>
    )
}

export default AnimeMainInfo