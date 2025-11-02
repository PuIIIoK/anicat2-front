'use client';

import React, { useEffect, useState } from 'react';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';
import KinescopePlayer from '@kinescope/react-kinescope-player';
import { KINESCOPE_API_BASE, KINESCOPE_API_TOKEN } from '@/hosts/constants'; // 👈 импорт токена и API URL

interface AnimePlayerProps {
    title: string;
    videoUrl: string | null;
    playerType?: 'plyr' | 'kinescope';
    kinescopeVideoId?: string;
}
const AnimePlayer: React.FC<AnimePlayerProps> = ({
                                                     title,
                                                     videoUrl,
                                                     playerType = 'plyr',
                                                 }) => {
    const [kinescopeVideoId, setKinescopeVideoId] = useState<string | null>(null);
    const [loadingKinescope, setLoadingKinescope] = useState(false);

    useEffect(() => {
        const fetchKinescopeVideo = async () => {
            if (playerType !== 'kinescope') return;

            setLoadingKinescope(true);

            try {
                const response = await fetch(
                    `${KINESCOPE_API_BASE}/videos?search=${encodeURIComponent(title)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${KINESCOPE_API_TOKEN}`,
                        },
                    }
                );

                const data = await response.json();
                const videoId = data?.data?.[0]?.id;

                if (videoId) {
                    setKinescopeVideoId(videoId);
                } else {
                    console.warn('🎥 Видео не найдено в Kinescope по названию:', title);
                }
            } catch (error) {
                console.error('Ошибка при получении видео Kinescope:', error);
            } finally {
                setLoadingKinescope(false);
            }
        };

        fetchKinescopeVideo();
    }, [playerType, title]);

    // 🔁 Плеер Kinescope
    if (playerType === 'kinescope') {
        if (loadingKinescope) return <p>🔎 Ищем видео в Kinescope...</p>;
        if (!kinescopeVideoId) return <p>🚫 Видео Kinescope не найдено.</p>;

        return (
            <div className="anime-player">
                <KinescopePlayer
                    videoId={kinescopeVideoId}
                    autoPlay={false}
                    controls={true}
                    className="kinescope-player"
                />
            </div>
        );
    }

    // 🔁 Плеер Plyr
    if (!videoUrl) return <p>⏳ Загрузка видео...</p>;

    return (
        <div className="anime-player">
            <Plyr
                source={{
                    type: 'video',
                    title: title,
                    sources: [
                        {
                            src: videoUrl,
                            type: 'video/mp4',
                        },
                    ],
                }}
            />
        </div>
    );
};

export default AnimePlayer;
