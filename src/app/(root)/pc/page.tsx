'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Download, Monitor, Palette, Wifi, Cast, Users, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import '@/styles/index.scss';
import '@/styles/pages/yumeko-pc-page.scss';
import { API_SERVER } from '@/hosts/constants';

interface PCBuildResponse {
    platform: string;
    version: string;
    build: number;
    notes: string;
    apkUrl: string;
}

const PCPage: React.FC = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handlePCDownload = async () => {
        if (isDownloading) return;

        try {
            setIsDownloading(true);
            setDownloadError(null);

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

            const link = document.createElement('a');
            link.href = result.apkUrl;
            link.download = `Yumeko-PC-v${result.version}-${result.build}.zip`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`Скачивание PC v${result.version} (build ${result.build}) начато`);

        } catch (error) {
            console.error('Ошибка при скачивании PC:', error);
            setDownloadError(error instanceof Error ? error.message : 'Произошла ошибка при скачивании');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="yumeko-pc-page">
            <div className="pc-container">
                {/* Hero Section */}
                <div className="hero-section">
                    <div className="hero-content">
                        <div className="app-badge coming-soon">В РАЗРАБОТКЕ</div>
                        <h1 className="hero-title">
                            Yumeko <span className="gradient-text">PC</span>
                        </h1>
                        <p className="hero-description">
                            Максимальное удобство просмотра аниме на большом экране.<br />
                            Приложение скоро будет доступно для Windows, macOS и Linux.
                        </p>

                        <div className="hero-buttons">
                            <button
                                onClick={handlePCDownload}
                                className={`btn-primary ${isDownloading ? 'loading' : ''}`}
                                disabled={isDownloading}
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 size={20} className="spinning" />
                                        Подготовка...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Скачать для PC
                                    </>
                                )}
                            </button>

                            <Link href="/" className="btn-secondary">
                                <ArrowLeft size={20} />
                                На главную
                            </Link>
                        </div>

                        {downloadError && (
                            <div className="error-message">
                                <p>{downloadError}</p>
                                <button onClick={() => setDownloadError(null)}>×</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Warning Section */}
                <div className="warning-section">
                    <div className="warning-card">
                        <div className="warning-icon-wrapper">
                            <AlertTriangle size={32} />
                        </div>
                        <h3>Важное уведомление</h3>
                        <p className="warning-text">
                            <strong>Мы НЕ принуждаем вас скачивать приложение на ПК</strong> из-за возможной блокировки сайта.
                            Сайт и так может быть затронут РКН или властями, поэтому скачивание приложения — это <strong>ваше
                                добровольное решение</strong> для вашего удобства. Мы НЕ принуждаем!
                        </p>
                        <p className="warning-note">
                            Приложение создается исключительно для улучшения пользовательского опыта
                            и предоставления дополнительных возможностей.
                        </p>
                    </div>
                </div>

                {/* Features Section */}
                <div className="features-section">
                    <h2 className="section-title">Что ожидать в PC версии?</h2>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <Palette size={28} />
                            </div>
                            <h3>Кастомизация интерфейса</h3>
                            <p>Настраивайте темы, цвета и компоновку элементов под свои предпочтения</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Wifi size={28} />
                            </div>
                            <h3>Полная синхронизация</h3>
                            <p>Прогресс, избранное и настройки автоматически синхронизируются между всеми устройствами</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Cast size={28} />
                            </div>
                            <h3>Трансляция на ТВ</h3>
                            <p>Транслируйте аниме на большой экран через Chromecast, AirPlay или DLNA</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Monitor size={28} />
                            </div>
                            <h3>Нативное приложение</h3>
                            <p>Полноценное десктопное приложение с оптимизацией для больших экранов</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Download size={28} />
                            </div>
                            <h3>Офлайн режим</h3>
                            <p>Скачивайте серии для просмотра без интернет-соединения</p>
                            <span className="badge-dev">В разработке</span>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Users size={28} />
                            </div>
                            <h3>Социальные функции</h3>
                            <p>Комментарии, отзывы, рекомендации и многое другое</p>
                        </div>
                    </div>
                </div>

                {/* Requirements Section */}
                <div className="requirements-section">
                    <div className="requirements-card">
                        <h3>Системные требования</h3>
                        <ul>
                            <li><strong>Платформы:</strong> Windows 10+, macOS 11+, Linux (Ubuntu 20.04+)</li>
                            <li><strong>Процессор:</strong> Intel Core i3 / AMD Ryzen 3 или выше</li>
                            <li><strong>ОЗУ:</strong> 4 ГБ (рекомендуется 8 ГБ)</li>
                            <li><strong>Размер:</strong> ~100 МБ</li>
                        </ul>
                    </div>
                </div>

                {/* Closing Message */}
                <div className="closing-section">
                    <p className="closing-message">Приятного пользования сайтом! 😊</p>
                </div>
            </div>
        </div>
    );
};

export default PCPage;
