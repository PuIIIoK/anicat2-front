'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AnimePlayer from "../../../../component/anime-player-new/anicat-player";
import {API_SERVER} from "../../../../../tools/constants";
import DiscordStatusTracker from "../../../../component/DiscordStatusTracker";
import Head from "next/head";


const KodikPlayer = dynamic(() => import('../../../../component/anime-players/anicat-player'), { ssr: false });

type Episode = {
    id: number;
    title: string;
};

export default function PlayerWrapper() {
    const params = useParams();
    const animeId = Array.isArray(params?.id) ? params.id[0] : params?.id as string;
    const router = useRouter();

    const [activePlayer, setActivePlayer] = useState<'libria' | 'kodik'>('libria');
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [, setRefreshKey] = useState(0);
    const [animeTitle, setAnimeTitle] = useState<string | null>(null);




    // Сохраняем куки один раз
    const initialCookiesRef = useRef<Record<string, string>>({});

    useEffect(() => {
        const cookies = document.cookie.split(';').reduce((acc: Record<string, string>, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = decodeURIComponent(value);
            return acc;
        }, {});
        initialCookiesRef.current = cookies;
    }, []);
    useEffect(() => {
        const fetchAnimeTitle = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`);
                const data = await res.json();
                setAnimeTitle(data.title);
            } catch (err) {
                console.error('Ошибка при получении названия аниме:', err);
            }
        };

        if (animeId) fetchAnimeTitle();
    }, [animeId]);

    useEffect(() => {
        const fetchEpisodes = async () => {
            try {
                const response = await fetch(`${API_SERVER}/api/get-anime/${animeId}/episodes`);
                const data = await response.json();
                setEpisodes(data);
            } catch (error) {
                console.error('Ошибка при загрузке эпизодов:', error);
            }
        };

        if (animeId) {
            fetchEpisodes();
        }
    }, [animeId]);

    const handlePlayerSwitch = (player: 'libria' | 'kodik') => {
        setActivePlayer(player);
        if (player === 'libria') {
            setRefreshKey(prev => prev + 1); // Обновить ключ, чтобы перерисовать плеер
        }
    };

    return (
        <>
            <Head>
                <DiscordStatusTracker
                    status={
                        animeTitle
                            ? `Смотрит аниме ${animeTitle}`
                            : 'Смотрит аниме...'
                    }
                />
            </Head>
        <div className="player-page">
            <div className="back-button-fixed">
                <button onClick={() => router.push(`/anime-page/${animeId}`)}>
                    ⬅ На аниме страницу
                </button>
            </div>

            <div className="player-buttons-mobile">
                <button
                    className={activePlayer === 'libria' ? 'active' : ''}
                    onClick={() => handlePlayerSwitch('libria')}
                >
                    AniCat Плеер
                </button>
                <button
                    className={activePlayer === 'kodik' ? 'active' : ''}
                    onClick={() => handlePlayerSwitch('kodik')}
                >
                    Kodik Плеер
                </button>
            </div>

            <div className="player-layout">
                <div className="player-left">
                    <div className="player-wrapper">
                        {activePlayer === 'libria' && (
                            <AnimePlayer
                                animeId={animeId}
                                initialCookies={initialCookiesRef.current}
                            />
                        )}
                        {activePlayer === 'kodik' && <KodikPlayer animeId={animeId} />}
                    </div>

                    {activePlayer === 'libria' && (
                        <div className="episode-tile-vertical">
                            {episodes.map((ep, i) => (
                                <button key={ep.id}>{`Эпизод ${i + 1}`}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="player-controls-right">
                    <div className="player-buttons">
                        <button
                            className={activePlayer === 'libria' ? 'active' : ''}
                            onClick={() => handlePlayerSwitch('libria')}
                        >
                            AniCat Плеер
                        </button>
                        <button
                            className={activePlayer === 'kodik' ? 'active' : ''}
                            onClick={() => handlePlayerSwitch('kodik')}
                        >
                            Kodik Плеер
                        </button>
                    </div>
                </div>
            </div>
        </div>
            </>
    );
}
