'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { WatchingItem } from '../profile-page-old/types';
import './SourceSelectionModal.scss';

interface SourceSelectionModalProps {
    item: WatchingItem;
    animeData?: { kodik?: string; alias?: string };
    coverUrl: string;
    onClose: () => void;
}

const SourceSelectionModal: React.FC<SourceSelectionModalProps> = ({
    item,
    animeData,
    coverUrl,
    onClose
}) => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    // Получаем последний просмотренный эпизод для каждого источника
    const getLastWatched = (source: string) => {
        return item.progressDetails?.find(p => p.source === source);
    };

    // Внешние источники (Kodik + Libria)
    const handleExternalSource = () => {
        const params = new URLSearchParams({
            kodik: animeData?.kodik || item.title,
            alias: animeData?.alias || '',
            title: item.title
        });
        router.push(`/watch-another-source/${item.id}?${params.toString()}`);
        onClose();
    };

    // Наш источник (Yumeko) - переход на страницу плеера
    const handleYumekoSource = () => {
        const yumekoProgress = getLastWatched('yumeko');
        const params = new URLSearchParams({
            source: 'yumeko',
            title: item.title,
            cover: coverUrl
        });

        if (yumekoProgress?.voice) {
            params.set('voiceName', yumekoProgress.voice);
        }

        router.push(`/watch/anime/${item.id}?${params.toString()}`);
        onClose();
    };

    const formatTime = (seconds?: number) => {
        if (!seconds) return null;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const libriaProgress = getLastWatched('libria');
    const kodikProgress = getLastWatched('kodik');
    const yumekoProgress = getLastWatched('yumeko');

    if (!mounted) return null;

    return createPortal(
        <div className="source-modal-overlay" onClick={onClose}>
            <div className="source-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="source-modal-close" onClick={onClose}>×</button>

                <div className="source-modal-header">
                    <div className="source-modal-cover">
                        <Image
                            src={coverUrl}
                            alt={item.title}
                            fill
                            sizes="80px"
                        />
                    </div>
                    <div className="source-modal-info">
                        <h2>{item.title}</h2>
                        <p>Выберите источник</p>
                    </div>
                </div>

                <div className="source-modal-sources">
                    {/* Внешние источники (Kodik/Libria) */}
                    <div className="source-card" onClick={handleExternalSource}>
                        <div className="source-card-top">
                            <span className="source-card-name">Внешние источники</span>
                            {(libriaProgress?.episodeId || kodikProgress?.episodeId) && (
                                <span className="source-card-episode">
                                    Эпизод {libriaProgress?.episodeId || kodikProgress?.episodeId}
                                </span>
                            )}
                        </div>
                        <div className="source-card-meta">
                            <span>Kodik / AniLibria</span>
                            {(libriaProgress?.voice || kodikProgress?.voice) && (
                                <span>{libriaProgress?.voice || kodikProgress?.voice}</span>
                            )}
                        </div>
                    </div>

                    {/* Наш источник (Yumeko) */}
                    <div
                        className={`source-card ${!yumekoProgress ? 'disabled' : ''}`}
                        onClick={yumekoProgress ? handleYumekoSource : undefined}
                    >
                        <div className="source-card-top">
                            <span className="source-card-name">Yumeko</span>
                            {yumekoProgress?.episodeId ? (
                                <span className="source-card-episode">Эпизод {yumekoProgress.episodeId}</span>
                            ) : (
                                <span className="source-card-unavailable">Нет прогресса</span>
                            )}
                        </div>
                        {yumekoProgress && (
                            <div className="source-card-meta">
                                {yumekoProgress.voice && <span>{yumekoProgress.voice}</span>}
                                {yumekoProgress.time && yumekoProgress.duration && (
                                    <span>{formatTime(yumekoProgress.time)} / {formatTime(yumekoProgress.duration)}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SourceSelectionModal;
