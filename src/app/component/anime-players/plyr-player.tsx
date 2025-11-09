'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import 'plyr/dist/plyr.css';

interface PlyrPlayerProps {
    videoUrl: string;
    onNext?: () => void;
    onPrev?: () => void;
}

// Тип для Plyr player - используем unknown, так как Plyr импортируется динамически
interface PlyrInstance {
    destroy: () => void;
    fullscreen: {
        enter: () => void;
        exit: () => void;
        toggle: () => void;
        active: boolean;
    };
    [key: string]: unknown;
}

const PlyrPlayer: React.FC<PlyrPlayerProps> = ({ videoUrl, onNext, onPrev }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<PlyrInstance | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [isClient, setIsClient] = useState(false);
    const spaceKeyPressTimeRef = useRef<number | null>(null);
    const spaceKeyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Проверяем, что мы на клиенте
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;
        
        const video = videoRef.current;
        if (!video) return;

        // Динамически импортируем Plyr только на клиенте
        const initPlyr = async () => {
            const Plyr = (await import('plyr')).default;
            
            // Инициализируем Plyr один раз
            if (!playerRef.current) {
                // Приводим к unknown, затем к PlyrInstance для обхода проверки типов
                playerRef.current = new Plyr(video, {
                    controls: [
                        'play-large', 'rewind', 'play', 'fast-forward',
                        'progress', 'current-time',
                        'mute', 'volume', 'settings', 'fullscreen'
                    ],
                    settings: ['quality', 'speed'],
                }) as unknown as PlyrInstance;

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
        };

        initPlyr();

        return () => {
            // НЕ уничтожаем Plyr — только поток
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [videoUrl, onNext, onPrev, isClient]);

    // Добавляем хоткеи
    useEffect(() => {
        if (!isClient || !videoRef.current) return;

        const video = videoRef.current;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Игнорируем если фокус в input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const key = e.key.toLowerCase();

            // Пробел или K(Д) - пауза/воспроизведение
            if (key === ' ' || key === 'k' || key === 'Л') {
                e.preventDefault();
                
                // Зажатие пробела для перемотки 2х
                if (key === ' ') {
                    if (!spaceKeyPressTimeRef.current) {
                        spaceKeyPressTimeRef.current = Date.now();
                        
                        // Устанавливаем таймаут для проверки долгого нажатия
                        spaceKeyTimeoutRef.current = setTimeout(() => {
                            if (video.playbackRate === 1) {
                                video.playbackRate = 2;
                                console.log('Перемотка 2x активирована');
                            }
                        }, 1500);
                    }
                } else {
                    // K(Д) сразу переключает паузу
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                }
                return;
            }

            // F(А) - полноэкранный режим
            if (key === 'f' || key === 'а') {
                e.preventDefault();
                // Используем Plyr API для fullscreen, чтобы интерфейс был виден
                if (playerRef.current?.fullscreen) {
                    playerRef.current.fullscreen.toggle();
                }
                return;
            }

            // Стрелки влево/вправо - перемотка на 10 секунд
            if (key === 'arrowleft') {
                e.preventDefault();
                video.currentTime = Math.max(0, video.currentTime - 10);
                return;
            }

            if (key === 'arrowright') {
                e.preventDefault();
                video.currentTime = Math.min(video.duration, video.currentTime + 10);
                return;
            }

            // Стрелки вверх/вниз - громкость
            if (key === 'arrowup') {
                e.preventDefault();
                video.volume = Math.min(1, video.volume + 0.1);
                return;
            }

            if (key === 'arrowdown') {
                e.preventDefault();
                video.volume = Math.max(0, video.volume - 0.1);
                return;
            }

            // , (б) - предыдущая серия
            if (key === ',' || key === 'б') {
                e.preventDefault();
                if (onPrev) {
                    console.log('Переход на предыдущую серию');
                    onPrev();
                }
                return;
            }

            // . (ю) - следующая серия
            if (key === '.' || key === 'ю') {
                e.preventDefault();
                if (onNext) {
                    console.log('Переход на следующую серию');
                    onNext();
                }
                return;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();

            // Отпускание пробела
            if (key === ' ') {
                e.preventDefault();
                
                if (spaceKeyTimeoutRef.current) {
                    clearTimeout(spaceKeyTimeoutRef.current);
                    spaceKeyTimeoutRef.current = null;
                }

                const pressDuration = spaceKeyPressTimeRef.current ? Date.now() - spaceKeyPressTimeRef.current : 0;
                
                // Если нажатие было коротким (меньше 1.5 сек) - просто play/pause
                if (pressDuration < 1500) {
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                } else {
                    // Если было долгое нажатие - возвращаем нормальную скорость
                    video.playbackRate = 1;
                    console.log('Перемотка 2x деактивирована');
                }

                spaceKeyPressTimeRef.current = null;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // Двойной клик для fullscreen
        const handleDoubleClick = () => {
            if (playerRef.current?.fullscreen) {
                playerRef.current.fullscreen.toggle();
            }
        };

        video.addEventListener('dblclick', handleDoubleClick);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            video.removeEventListener('dblclick', handleDoubleClick);
            if (spaceKeyTimeoutRef.current) {
                clearTimeout(spaceKeyTimeoutRef.current);
            }
        };
    }, [isClient, onNext, onPrev]);

    if (!isClient) {
        return <div className="plyr-player-wrapper" style={{ background: '#000' }} />;
    }

    return (
        <div className="plyr-player-wrapper">
            <video ref={videoRef} className="plyr" controls playsInline />
        </div>
    );
};

export default PlyrPlayer;
