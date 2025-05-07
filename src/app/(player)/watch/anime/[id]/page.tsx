'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const LibriaPlayer = dynamic(() => import('../../../../component/anime-players/new-player-hls'), { ssr: false });
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

    useEffect(() => {
        const fetchEpisodes = async () => {
            try {
                const response = await fetch(`http://localhost:8080/api/get-anime/${animeId}/episodes`);
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

    return (
        <div className="player-page">
            <div className="back-button-fixed">
                <button onClick={() => router.push(`/anime-page/${animeId}`)}>
                    ⬅ На аниме страницу
                </button>
            </div>

            {/* кнопки сверху для мобилок */}
            <div className="player-buttons-mobile">
                <button
                    className={activePlayer === 'libria' ? 'active' : ''}
                    onClick={() => setActivePlayer('libria')}
                >
                    AniCat Плеер
                </button>
                <button
                    className={activePlayer === 'kodik' ? 'active' : ''}
                    onClick={() => setActivePlayer('kodik')}
                >
                    Kodik Плеер
                </button>
            </div>

            <div className="player-layout">
                <div className="player-left">
                    <div className="player-wrapper">
                        {activePlayer === 'libria' && <LibriaPlayer animeId={animeId}/>}
                        {activePlayer === 'kodik' && <KodikPlayer animeId={animeId}/>}
                    </div>

                    {activePlayer === 'libria' && (
                        <div className="episode-tile-vertical">
                            {episodes.map((ep, i) => (
                                <button key={ep.id}>{`Эпизод ${i + 1}`}</button>
                            ))}
                        </div>
                    )}
                </div>

                {/* кнопки сбоку для десктопов */}
                <div className="player-controls-right">
                    <div className="player-buttons">
                        <button
                            className={activePlayer === 'libria' ? 'active' : ''}
                            onClick={() => setActivePlayer('libria')}
                        >
                            AniCat Плеер
                        </button>
                        <button
                            className={activePlayer === 'kodik' ? 'active' : ''}
                            onClick={() => setActivePlayer('kodik')}
                        >
                            Kodik Плеер
                        </button>
                    </div>
                </div>
            </div>
        </div>


    );
}
