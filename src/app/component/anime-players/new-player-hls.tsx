'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { fetchLibriaEpisodes, LibriaEpisode } from '../../utils/player/apilibria';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

        return () => {
            hlsRef.current?.destroy();
        };
    }, [currentEpisode, quality]);

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

                <div className="episode-selector">
                    <span style={{ marginRight: '8px' }}>Серии:</span>

                    <button
                        onClick={() => {
                            const index = episodes.findIndex(e => e.id === currentEpisode?.id);
                            if (index > 0) setCurrentEpisode(episodes[index - 1]);
                        }}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {episodes.map((ep) => (
                        <button
                            key={ep.id}
                            onClick={() => setCurrentEpisode(ep)}
                            className={ep.id === currentEpisode?.id ? 'active' : ''}
                        >
                            {ep.ordinal}
                        </button>
                    ))}

                    <button
                        onClick={() => {
                            const index = episodes.findIndex(e => e.id === currentEpisode?.id);
                            if (index < episodes.length - 1) setCurrentEpisode(episodes[index + 1]);
                        }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
