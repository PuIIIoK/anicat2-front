'use client';

import React from 'react';

interface Props {
    title: string;
    alttitle: string;
    rating: string;
    episodeAll: string;
    currentEpisode: string;
    type: string;
    status: string;
    genres: string;
    realesedFor: string;
    mouthSeason: string;
    season: string;
    year: string;
    studio: string;
    description: string;
    alias: string;
    kodik: string;

    setTitle: (val: string) => void;
    setAlttitle: (val: string) => void;
    setRating: (val: string) => void;
    setEpisodeAll: (val: string) => void;
    setCurrentEpisode: (val: string) => void;
    setType: (val: string) => void;
    setStatus: (val: string) => void;
    setGenres: (val: string) => void;
    setRealesedFor: (val: string) => void;
    setMouthSeason: (val: string) => void;
    setSeason: (val: string) => void;
    setYear: (val: string) => void;
    setStudio: (val: string) => void;
    setDescription: (val: string) => void;
    setAlias: (val: string) => void;
    setKodik: (val: string) => void;

}

const AnimeMainInfo: React.FC<Props> = ({
                                            title, alttitle, rating, alias, kodik, episodeAll, currentEpisode,
                                            type, status, genres, realesedFor, mouthSeason,
                                            season, year, studio, description,
                                            setTitle, setAlttitle, setRating, setEpisodeAll, setCurrentEpisode,
                                            setType, setStatus, setGenres, setRealesedFor, setMouthSeason,
                                            setSeason, setYear, setStudio, setDescription, setAlias, setKodik,
                                        }) => {

    return (
        <div className="form-admin-block">
            <div className="form-row">
                <label>Название аниме:
                    <input value={title} onChange={(e) => setTitle(e.target.value)}/>
                </label>
                <label>Альтернативное название:
                    <input value={alttitle} onChange={(e) => setAlttitle(e.target.value)}/>
                </label>
                <label>Возрастной рейтинг:
                    <input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="например, 16+"/>
                </label>
                <label>Alias (Для плеера Анилибрии) [ОБЯЗАТЕЛЬНО!]
                    <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Например: sousou-no-frieren"
                           required/>
                </label>
                <label>Kodik name (Для плеера Kodik) [ОБЯЗАТЕЛЬНО!]
                    <input value={kodik} onChange={(e) => setKodik(e.target.value)} placeholder="Например: Фрирен [ТВ-1]"
                           required/>
                </label>
            </div>

            <div className="form-row">
                <label>Текущий эпизод:
                    <input value={currentEpisode} onChange={(e) => setCurrentEpisode(e.target.value)}/>
                </label>
                <label>Всего эпизодов:
                    <input value={episodeAll} onChange={(e) => setEpisodeAll(e.target.value)}/>
                </label>
                <label>Тип:
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                        <option value="" disabled>Выберите тип</option>
                        <option value="TV">TV</option>
                        <option value="Спин-офф">Спин-офф</option>
                        <option value="Фильм">Фильм</option>
                        <option value="OVA">OVA</option>
                    </select>
                </label>
                <label>Статус:
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="" disabled>Выберите статус</option>
                        <option value="Завершён">Завершён</option>
                        <option value="Онгоинг">Онгоинг</option>
                        <option value="Скоро">Скоро</option>
                    </select>
                </label>
            </div>

            <h3>Подробности</h3>
            <div className="form-column">
                <label>Жанры:
                    <input value={genres} onChange={(e) => setGenres(e.target.value)}
                           placeholder="жанры через запятую"/>
                </label>
                <label>Снято по:
                    <input value={realesedFor} onChange={(e) => setRealesedFor(e.target.value)}/>
                </label>
                <label>Месяц сезона:
                    <select value={mouthSeason} onChange={(e) => setMouthSeason(e.target.value)}>
                        <option value="" disabled>Выберите месяц</option>
                        <option value="Зима">Зима</option>
                        <option value="Лето">Лето</option>
                        <option value="Весна">Весна</option>
                        <option value="Осень">Осень</option>
                    </select>
                </label>
                <label>Сезон (указывать номер + сезон):
                    <input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="например, 1 сезон"/>
                </label>
                <label>Год:
                    <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="например, 2024"/>
                </label>
                <label>Студия:
                    <input value={studio} onChange={(e) => setStudio(e.target.value)}/>
                </label>
                <label>Описание:
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)}/>
                </label>
            </div>
        </div>
    );
};

export default AnimeMainInfo;
