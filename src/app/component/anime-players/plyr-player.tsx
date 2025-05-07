'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface PlyrPlayerProps {
    videoUrl: string;
    onNext?: () => void;
    onPrev?: () => void;
}

const PlyrPlayer: React.FC<PlyrPlayerProps> = ({ videoUrl, onNext, onPrev }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<Plyr | null>(null);
    const hlsRef = useRef<Hls | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Инициализируем Plyr один раз
        if (!playerRef.current) {
            playerRef.current = new Plyr(video, {
                controls: [
                    'play-large', 'rewind', 'play', 'fast-forward',
                    'progress', 'current-time',
                    'mute', 'volume', 'settings', 'fullscreen'
                ],
                settings: ['quality', 'speed'],
            });

            // Кастомные действия на кнопки вперед/назад
            setTimeout(() => {
                const rewindBtn = document.querySelector('.plyr__control[data-plyr="rewind"]') as HTMLElement;
                const forwardBtn = document.querySelector('.plyr__control[data-plyr="fast-forward"]') as HTMLElement;

                if (rewindBtn && onPrev) {
                    rewindBtn.onclick = (e) => {
                        e.preventDefault();
                        onPrev();
                    };
                    rewindBtn.title = 'Предыдущий эпизод';
                }

                if (forwardBtn && onNext) {
                    forwardBtn.onclick = (e) => {
                        e.preventDefault();
                        onNext();
                    };
                    forwardBtn.title = 'Следующий эпизод';
                }
            }, 500);
        }

        // Подключаем новый видео поток без переинициализации
        if (Hls.isSupported()) {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }

            const hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(video);
            hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = videoUrl;
        }

        return () => {
            // НЕ уничтожаем Plyr — только поток
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [videoUrl, onNext, onPrev]);

    return (
        <div className="plyr-player-wrapper">
            <video ref={videoRef} className="plyr" controls playsInline />
        </div>
    );
};

export default PlyrPlayer;
