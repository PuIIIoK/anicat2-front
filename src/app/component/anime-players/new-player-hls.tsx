'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { fetchLibriaEpisodes, LibriaEpisode } from '../../../utils/player/apilibria';
interface Props {
    animeId: string;
}
export default function LibriaPlayer({ animeId }: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const playerRef = useRef<Plyr | null>(null);

    const [episodes, setEpisodes] = useState<LibriaEpisode[]>([]);
    const [currentEpisode, setCurrentEpisode] = useState<LibriaEpisode | null>(null);
    const [quality, setQuality] = useState<1080 | 720 | 480>(
        parseInt(localStorage.getItem('selected-quality') || '1080') as 1080 | 720 | 480
    );
    const [showSkipOpening, setShowSkipOpening] = useState(false);
    const [showSkipEnding, setShowSkipEnding] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !currentEpisode) return;

        const openingStart = currentEpisode.opening?.start;
        const openingStop = currentEpisode.opening?.stop;
        const endingStart = currentEpisode.ending?.start;

        let openingSkipped = false;
        let endingSkipped = false;

        const timeUpdate = () => {
            const currentTime = video.currentTime;

            // Опенинг
            if (
                typeof openingStart === 'number' &&
                typeof openingStop === 'number' &&
                currentTime >= openingStart &&
                currentTime < openingStop &&
                !openingSkipped
            ) {
                setShowSkipOpening(true);
                openingSkipped = true;

                setTimeout(() => {
                    setShowSkipOpening(false);
                    if (video.currentTime < openingStop) {
                        video.currentTime = openingStop;
                    }
                }, 5000);
            }

            // Эндинг
            if (
                typeof endingStart === 'number' &&
                typeof currentEpisode.duration === 'number' &&
                currentTime >= endingStart &&
                currentTime < currentEpisode.duration - 5 &&
                !endingSkipped
            ) {
                setShowSkipEnding(true);
                endingSkipped = true;

                setTimeout(() => {
                    setShowSkipEnding(false);
                    if (video.currentTime < currentEpisode.duration - 1) {
                        video.currentTime = currentEpisode.duration - 1;
                    }
                }, 5000);
            }
        };

        video.addEventListener('timeupdate', timeUpdate);

        return () => {
            video.removeEventListener('timeupdate', timeUpdate);
        };
    }, [currentEpisode]);


    // Загружаем список эпизодов
    useEffect(() => {
        fetchLibriaEpisodes(animeId).then((data) => {
            setEpisodes(data);
            const savedId = localStorage.getItem('selected-episode');
            const found = data.find((e) => e.id.toString() === savedId);
            setCurrentEpisode(found || data[0]);
        });
    }, [animeId]);

    // Инициализируем Plyr один раз
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !currentEpisode) return;

        if (!playerRef.current) {
            const player = new Plyr(video, {
                controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
                settings: ['quality', 'speed', 'loop'],
                quality: {
                    default: quality,
                    options: [1080, 720, 480],
                    forced: true,
                    onChange: (newQuality: number) => {
                        setQuality(newQuality as 1080 | 720 | 480);
                    },
                },
                speed: {
                    selected: 1,
                    options: [0.5, 1, 1.25, 1.5, 2],
                },
            });
            playerRef.current = player;
        }

        const source =
            quality === 1080
                ? currentEpisode.hls_1080
                : quality === 720
                    ? currentEpisode.hls_720
                    : currentEpisode.hls_480;

        if (!source) return;

        hlsRef.current?.destroy();

        if (Hls.isSupported()) {
            const hls = new Hls();
            hlsRef.current = hls;
            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(source);
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = source;
        }
        if (video && video.parentElement) {
            video.parentElement.style.position = 'relative';
        }

        return () => {
            hlsRef.current?.destroy();
        };

    }, [currentEpisode, quality]);
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            const index = episodes.findIndex(e => e.id === currentEpisode?.id);
            if (index !== -1 && index < episodes.length - 1) {
                const nextEpisode = episodes[index + 1];
                setCurrentEpisode(nextEpisode);

                // Ждём пока обновится эпизод и перезапускаем
                setTimeout(() => {
                    video.play()
                        .catch(err => {
                            console.warn('⛔ Не удалось воспроизвести:', err);
                        });
                }, 1000); // даём HLS подгрузиться
            }
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [currentEpisode, episodes]);
    useEffect(() => {
        const video = videoRef.current;
        if (video?.parentElement) {
            video.parentElement.style.position = 'relative';
        }
    }, []);

    useEffect(() => {
        if (currentEpisode) localStorage.setItem('selected-episode', currentEpisode.id.toString());
    }, [currentEpisode]);

    useEffect(() => {
        localStorage.setItem('selected-quality', quality.toString());
    }, [quality]);

    return (
        <div className="full-page-player">
            <div className="plyr-container">
                <video
                    ref={videoRef}
                    controls
                    className="plyr__video-embed"
                    playsInline
                />
                {/* Центрированные overlay-кнопки */}
                <div className="skip-controls-overlay">
                    {showSkipOpening && currentEpisode?.opening?.stop && (
                        <button
                            className="skip-button"
                            onClick={() => {
                                if (videoRef.current && currentEpisode.opening?.stop)
                                    videoRef.current.currentTime = currentEpisode.opening.stop;
                            }}
                        >
                            Пропустить опенинг
                        </button>
                    )}

                    {showSkipEnding && typeof currentEpisode?.duration === 'number' && (
                        <button
                            className="skip-button"
                            onClick={() => {
                                if (videoRef.current && typeof currentEpisode.duration === 'number') {
                                    videoRef.current.currentTime = currentEpisode.duration - 1;
                                }
                            }}
                        >
                            Пропустить эндинг
                        </button>
                    )}
                </div>

                <div className="episode-tile-vertical">
                    <span className="label">Серии:</span>

                    <div className="episode-buttons">
                        {episodes.map((ep) => (
                            <button
                                key={ep.id}
                                onClick={() => setCurrentEpisode(ep)}
                                className={ep.id === currentEpisode?.id ? 'active' : ''}
                            >
                                Эпизод {ep.ordinal}
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
