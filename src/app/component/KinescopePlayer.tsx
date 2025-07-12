'use client';

import React from 'react';

interface KinescopePlayerProps {
    videoId: string | null;
}

const KinescopePlayer: React.FC<KinescopePlayerProps> = ({ videoId }) => {
    if (!videoId) {
        return (
            <p style={{ textAlign: 'center', fontSize: '1.2rem', padding: '1rem 0' }}>
                😢 Извините, над данной функцией мы ещё работаем. Просим прощения!
            </p>
        );
    }

    // Плеер временно отключён
    /*
    return (
        <iframe
            key={videoId}
            src={`https://kinescope.io/embed/${videoId}`}
            allowFullScreen
            frameBorder="0"
            width="100%"
            height="550"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock"
        />
    );
    */

    // Возвращаем только сообщение, даже если videoId есть
    return (
        <div
            style={{
                width: '100%',
                height: '550px',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                fontSize: '1.2rem',
                padding: '1rem',
                textAlign: 'center',
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
            }}
        >
            😢 Извините, над данной функцией мы ещё работаем. Просим прощения!
        </div>
    );
};

export default KinescopePlayer;
