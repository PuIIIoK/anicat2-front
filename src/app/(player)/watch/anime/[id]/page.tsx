'use client';

import React from 'react';
import VideoPlayer from '../../component/anicat-player'; // путь оставляем как у тебя
import AniCatPlayerWrapper from '../../component/AniCatPlayerWrapper';

export default function PlayerPage() {
    const episodes = [
        {
            title: 'Серия 1',
            src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        },
        {
            title: 'Серия 2',
            src: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        },
    ];

    return (
        <main style={{ padding: '0px', background: '#111', minHeight: '1vh' }}>

            <VideoPlayer episodes={episodes} poster={''} />

        </main>
    );
}
