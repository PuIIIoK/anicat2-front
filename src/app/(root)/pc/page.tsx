'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import '@/styles/index.scss';
import { API_SERVER } from '@/hosts/constants';

interface PCBuildResponse {
    platform: string;
    version: string;
    build: number;
    notes: string;
    apkUrl: string; // Для PC это будет ZIP файл
}

const PCPage: React.FC = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handlePCDownload = async () => {
        if (isDownloading) return;

        try {
            setIsDownloading(true);
            setDownloadError(null);

            // Получаем информацию о последнем PC билде из реального API
            const response = await fetch(`${API_SERVER}/api/app/latest?platform=pc`);
            
            if (response.status === 204) {
                throw new Error('PC билд не найден. Приложение ещё в разработке.');
            }
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }

            const result: PCBuildResponse = await response.json();

            if (!result.apkUrl || !result.version) {
                throw new Error('Получены неполные данные о билде');
            }

            // Создаем ссылку для скачивания
            const link = document.createElement('a');
            link.href = result.apkUrl;
            link.download = `AniCat-PC-v${result.version}-${result.build}.zip`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`Скачивание PC v${result.version} (build ${result.build}) начато`);
            console.log('Примечания к релизу:', result.notes || 'Нет примечаний');

        } catch (error) {
            console.error('Ошибка при скачивании PC:', error);
            setDownloadError(error instanceof Error ? error.message : 'Произошла ошибка при скачивании');
        } finally {
            setIsDownloading(false);
        }
    };

    const PCIcon = () => (
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="4" width="20" height="12" rx="2" stroke="#FF8C00" strokeWidth="2" fill="none"/>
            <rect x="4" y="6" width="16" height="8" rx="1" fill="rgba(255, 140, 0, 0.1)" stroke="#FF8C00" strokeWidth="1"/>
            <path d="M8 18h8" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 16v2" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round"/>
            <path d="M10 20h4" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    );

    const CustomizeIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="13.5" cy="6.5" r=".5" fill="#FF8C00"/>
            <circle cx="17.5" cy="10.5" r=".5" fill="#FF8C00"/>
            <circle cx="8.5" cy="7.5" r=".5" fill="#FF8C00"/>
            <circle cx="6.5" cy="12.5" r=".5" fill="#FF8C00"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

    const TVIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2" stroke="#FF8C00" strokeWidth="2" fill="rgba(255, 140, 0, 0.1)"/>
            <path d="M17 2l-5 5-5-5" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const DownloadIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const LoadingSpinner = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/>
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
        </svg>
    );

    return (
        <div className="pc-page">
            <div className="pc-container">
                <div className="hero-section">
                    <div className="hero-content">
                        <div className="app-icon-large">
                            <PCIcon />
                        </div>
                        <h1 className="app-title">AniCat</h1>
                        <p className="app-subtitle">для PC</p>
                        <div className="status-badge coming-soon">
                            Скоро в продакшене
                        </div>
                        <p className="app-description">
                            Приложение разрабатывается и скоро будет доступно для скачивания. 
                            Получите максимальное удобство просмотра аниме на большом экране!
                        </p>
                    </div>
                </div>

                <div className="features-section">
                    <h2 className="section-title">Что ожидать в PC версии?</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <CustomizeIcon />
                            </div>
                            <h3>Смена дизайна и цветовой гаммы</h3>
                            <p>Настраивайте интерфейс под себя - выбирайте темы, цвета и компоновку элементов</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <SyncIcon />
                            </div>
                            <h3>Полная синхронизация с сайтом</h3>
                            <p>Ваш прогресс, избранное и настройки автоматически синхронизируются между всеми устройствами</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <TVIcon />
                            </div>
                            <h3>Поддержка трансляции на телевизор</h3>
                            <p>Транслируйте аниме на большой экран через Chromecast, AirPlay или DLNA</p>
                        </div>
                    </div>
                </div>

                <div className="warning-section">
                    <div className="warning-card">
                        <div className="warning-header">
                            <span className="warning-icon">⚠️</span>
                            <h2>ВАЖНОЕ УВЕДОМЛЕНИЕ</h2>
                        </div>
                        <div className="warning-content">
                            <p className="warning-main">
                                <strong>МЫ НЕ ПРИНУЖДАЕМ ВАС КАЧАТЬ ПРИЛОЖЕНИЕ НА ПК</strong>, чисто из-за того, 
                                что сайт &ldquo;могут заблокировать на территории РФ&rdquo;. Сайт и так и так тронет 
                                РКН или кто-то из властей, поэтому скачивание приложения на ПК чисто ваше 
                                добровольное и для вашего удобства. <strong>МЫ НЕ ПРИНУЖДАЕМ!</strong>
                            </p>
                            <p className="warning-note">
                                Приложение создается исключительно для улучшения пользовательского опыта 
                                и предоставления дополнительных возможностей.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="download-section">
                    <h2 className="section-title">Скачать приложение</h2>
                    <div className="download-buttons">
                        <button 
                            onClick={handlePCDownload}
                            className={`download-btn pc-download ${isDownloading ? 'downloading' : ''}`}
                            disabled={isDownloading}
                        >
                            {isDownloading ? <LoadingSpinner /> : <DownloadIcon />}
                            <div className="btn-content">
                                <span className="btn-subtitle">Универсальная версия</span>
                                <span className="btn-title">
                                    {isDownloading ? 'Подготовка...' : 'Скачать для PC'}
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
                            <strong>Поддерживает:</strong> Windows, macOS, Linux
                        </div>
                    </div>
                </div>

                <div className="closing-section">
                    <p className="closing-message">Приятного пользования сайтом! 😊</p>
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

export default PCPage;
