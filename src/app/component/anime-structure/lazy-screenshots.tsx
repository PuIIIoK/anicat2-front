'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useLazyScreenshots } from './use-lazy-screenshots';

interface LazyScreenshotsProps {
    animeId: number;
    className?: string;
    autoLoad?: boolean; // Автоматически загружать при появлении в viewport
}

const LazyScreenshots: React.FC<LazyScreenshotsProps> = ({
    animeId,
    className = '',
    autoLoad = false
}) => {
    const { screenshots, isLoading, error, loadScreenshots } = useLazyScreenshots(animeId);
    const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    // Intersection Observer для автоматической загрузки
    useEffect(() => {
        if (!autoLoad || hasLoadedOnce) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasLoadedOnce) {
                        loadScreenshots();
                        setHasLoadedOnce(true);
                    }
                });
            },
            {
                threshold: 0.1, // Загружаем когда 10% элемента видно
                rootMargin: '50px' // Начинаем загрузку за 50px до появления
            }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [autoLoad, hasLoadedOnce, loadScreenshots]);

    const handleLoadClick = () => {
        if (!hasLoadedOnce) {
            loadScreenshots();
            setHasLoadedOnce(true);
        }
    };

    const openScreenshotModal = (index: number) => {
        setSelectedScreenshot(index);
    };

    const closeScreenshotModal = () => {
        setSelectedScreenshot(null);
    };

    const navigateScreenshot = (direction: 'prev' | 'next') => {
        if (selectedScreenshot === null) return;
        
        const newIndex = direction === 'prev' 
            ? (selectedScreenshot - 1 + screenshots.length) % screenshots.length
            : (selectedScreenshot + 1) % screenshots.length;
        
        setSelectedScreenshot(newIndex);
    };

    if (error) {
        return (
            <div className={`lazy-screenshots error ${className}`}>
                <div className="error-message">
                    <p>Не удалось загрузить скриншоты: {error}</p>
                    <button onClick={handleLoadClick} className="retry-btn">
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={sectionRef} className={`lazy-screenshots ${className}`}>
            {!hasLoadedOnce ? (
                <div className="screenshots-placeholder">
                    <div className="placeholder-content">
                        <div className="placeholder-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                            </svg>
                        </div>
                        <h3>Скриншоты аниме</h3>
                        <p>Нажмите, чтобы загрузить скриншоты</p>
                        <button onClick={handleLoadClick} className="load-screenshots-btn" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <div className="btn-spinner"></div>
                                    Загрузка...
                                </>
                            ) : (
                                'Загрузить скриншоты'
                            )}
                        </button>
                    </div>
                </div>
            ) : screenshots.length === 0 ? (
                <div className="no-screenshots">
                    <div className="no-screenshots-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                        </svg>
                    </div>
                    <p>Скриншоты для данного аниме отсутствуют</p>
                </div>
            ) : (
                <div className="screenshots-grid">
                    {screenshots.map((screenshot, index) => (
                        <div
                            key={screenshot.id}
                            className="screenshot-item"
                            onClick={() => openScreenshotModal(index)}
                        >
                            <Image
                                src={screenshot.url}
                                alt={screenshot.name || `Скриншот ${index + 1}`}
                                width={300}
                                height={170}
                                className="screenshot-image"
                                loading="lazy"
                            />
                            <div className="screenshot-overlay">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.89-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.11-.9-2-2-2zm0 16H5V9h14v11z"/>
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Модальное окно для просмотра скриншотов */}
            {selectedScreenshot !== null && (
                <div className="screenshot-modal" onClick={closeScreenshotModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeScreenshotModal}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                        
                        <button className="modal-nav prev" onClick={() => navigateScreenshot('prev')}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                            </svg>
                        </button>
                        
                        <div className="modal-image-container">
                            <Image
                                src={screenshots[selectedScreenshot].url}
                                alt={screenshots[selectedScreenshot].name || `Скриншот ${selectedScreenshot + 1}`}
                                width={1200}
                                height={675}
                                className="modal-image"
                                loading="eager"
                            />
                        </div>
                        
                        <button className="modal-nav next" onClick={() => navigateScreenshot('next')}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                            </svg>
                        </button>
                        
                        <div className="modal-counter">
                            {selectedScreenshot + 1} из {screenshots.length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LazyScreenshots;
