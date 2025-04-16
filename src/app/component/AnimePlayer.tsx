'use client';

import React from 'react';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';

interface AnimePlayerProps {
    title: string;
    videoUrl: string | null;
}

const AnimePlayer: React.FC<AnimePlayerProps> = ({ title, videoUrl }) => {
    if (!videoUrl) return <p>Загрузка видео...</p>;

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