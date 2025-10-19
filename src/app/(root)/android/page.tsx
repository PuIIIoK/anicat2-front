'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import '@/styles/index.scss';
import {API_SERVER} from '@/tools/constants';


interface AndroidBuildResponse {
    platform: string;
    version: string;
    build: number;
    notes: string;
    apkUrl: string;
}

const AndroidPage: React.FC = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleApkDownload = async () => {
        if (isDownloading) return;

        try {
            setIsDownloading(true);
            setDownloadError(null);

            // Получаем информацию о последнем Android билде из реального API
            const response = await fetch(`${API_SERVER}/api/app/latest?platform=android`);
            
            if (response.status === 204) {
                throw new Error('Android билд не найден. Обратитесь к администратору.');
            }
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }

            const result: AndroidBuildResponse = await response.json();

            if (!result.apkUrl || !result.version) {
                throw new Error('Получены неполные данные о билде');
            }

            // Создаем ссылку для скачивания (presigned URL уже готов к использованию)
            const link = document.createElement('a');
            link.href = result.apkUrl;
            link.download = `AniCat-Android-v${result.version}-${result.build}.apk`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // Добавляем в DOM и кликаем
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Показываем успешное уведомление
            console.log(`Скачивание APK v${result.version} (build ${result.build}) начато`);
            console.log('Примечания к релизу:', result.notes || 'Нет примечаний');

        } catch (error) {
            console.error('Ошибка при скачивании APK:', error);
            setDownloadError(error instanceof Error ? error.message : 'Произошла ошибка при скачивании');
        } finally {
            setIsDownloading(false);
        }
    };

    const AndroidIcon = () => (
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.316 4.07L15.75 1.33a.75.75 0 111.299.75L15.612 4.4a8.726 8.726 0 00-7.224 0L6.951 2.08a.75.75 0 111.299-.75L9.684 4.07a7.25 7.25 0 00-6.434 7.18v1.25h17.5v-1.25A7.25 7.25 0 0014.316 4.07zM9.75 8.5a.75.75 0 100-1.5.75.75 0 000 1.5zm4.5 0a.75.75 0 100-1.5.75.75 0 000 1.5z" fill="#FF8C00"/>
            <rect x="6" y="13" width="3" height="7" rx="1.5" fill="#FF8C00"/>
            <rect x="15" y="13" width="3" height="7" rx="1.5" fill="#FF8C00"/>
            <rect x="9.5" y="13" width="5" height="5" rx="1" fill="#FF8C00"/>
        </svg>
    );

    const SyncIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 3v5h-5" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 12a9 9 0 009 9c2.52 0 4.93-1 6.74-2.74L21 16" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 21v-5h-5" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const PaletteIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="13.5" cy="6.5" r=".5" fill="#FF8C00"/>
            <circle cx="17.5" cy="10.5" r=".5" fill="#FF8C00"/>
            <circle cx="8.5" cy="7.5" r=".5" fill="#FF8C00"/>
            <circle cx="6.5" cy="12.5" r=".5" fill="#FF8C00"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const DownloadIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 10l5 5 5-5" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15V3" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const PlayIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#FF8C00" strokeWidth="2"/>
            <path d="M10 8l6 4-6 4V8z" fill="#FF8C00"/>
        </svg>
    );

    const MessageIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const GooglePlayIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="currentColor"/>
            <path d="M20.672 10.356L16.596 8.05 6.45 2.677a1.324 1.324 0 00-.84.057l10.183 10.183 4.88-2.56z" fill="currentColor"/>
            <path d="M20.672 13.644l-4.076-2.306L6.413 21.521a1.324 1.324 0 00.84.057l10.179-5.373 3.24-2.561z" fill="currentColor"/>
            <path d="M20.672 10.356a1.558 1.558 0 010 3.288l-4.076-2.306 4.076-2.306z" fill="currentColor"/>
        </svg>
    );

    const ApkDownloadIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 18l-3-3h2v-4h2v4h2l-3 3z" fill="currentColor"/>
        </svg>
    );

    const LoadingSpinner = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/>
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
        </svg>
    );

    return (
        <div className="android-page">
            <div className="android-container">
                <div className="hero-section">
                    <div className="hero-content">
                        <div className="app-icon-large">
                            <AndroidIcon />
                        </div>
                        <h1 className="app-title">AniCat</h1>
                        <p className="app-subtitle">для Android</p>
                        <p className="app-description">
                            Смотрите любимые аниме на своём Android устройстве. 
                            Удобно, быстро и с высоким качеством.
                        </p>
                    </div>
                </div>

                <div className="features-section">
                    <h2 className="section-title">Что внутри?</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <SyncIcon />
                            </div>
                            <h3>Синхронизация между устройствами</h3>
                            <p>Ваш прогресс автоматически синхронизируется между всеми устройствами</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <PaletteIcon />
                            </div>
                            <h3>Кастомизация приложения</h3>
                            <p>Возможность выбрать свою цветовую гамму и тему <span className="dev-status">(В разработке...)</span></p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <DownloadIcon />
                            </div>
                            <h3>Скачивание серий</h3>
                            <p>Загружайте серии для просмотра без интернета <span className="dev-status">(В разработке...)</span></p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <PlayIcon />
                            </div>
                            <h3>Кастомный удобный плеер</h3>
                            <p>Свой плеер, синхронизирующий прогресс с сайтом</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <MessageIcon />
                            </div>
                            <h3>Отзывы, Комментарии, Коллекции</h3>
                            <p>И многое другое для полного погружения в мир аниме</p>
                        </div>
                    </div>
                </div>

                <div className="download-section">
                    <h2 className="section-title">Скачать приложение</h2>
                    <div className="download-buttons">
                        <a 
                            href="https://play.google.com/store/apps" 
                            className="download-btn google-play"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <GooglePlayIcon />
                            <div className="btn-content">
                                <span className="btn-subtitle">Доступно в</span>
                                <span className="btn-title">Google Play</span>
                            </div>
                        </a>
                        
                        <button 
                            onClick={handleApkDownload}
                            className={`download-btn apk-direct ${isDownloading ? 'downloading' : ''}`}
                            disabled={isDownloading}
                        >
                            {isDownloading ? <LoadingSpinner /> : <ApkDownloadIcon />}
                            <div className="btn-content">
                                <span className="btn-subtitle">Прямая ссылка</span>
                                <span className="btn-title">
                                    {isDownloading ? 'Подготовка...' : 'Скачать APK'}
                                </span>
                            </div>
                        </button>
                    </div>
                    
                    {downloadError && (
                        <div className="download-error">
                            <p>{downloadError}</p>
                            <button 
                                onClick={() => setDownloadError(null)} 
                                className="error-dismiss"
                            >
                                ×
                            </button>
                        </div>
                    )}
                    
                    <div className="download-info">
                        <div className="info-item">
                            <strong>Требования:</strong> Android 7.0+
                        </div>
                    </div>
                </div>

                <div className="back-section">
                    <Link href="/" className="back-link">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Вернуться на главную
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AndroidPage;


