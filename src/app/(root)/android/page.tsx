'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Download, Smartphone, Zap, Share2, Bell, Users, ArrowLeft, Loader2 } from 'lucide-react';
import '@/styles/index.scss';
import '@/styles/pages/yumeko-android-page.scss';
import { API_SERVER } from '@/hosts/constants';

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

            const link = document.createElement('a');
            link.href = result.apkUrl;
            link.download = `Yumeko-Android-v${result.version}-${result.build}.apk`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`Скачивание APK v${result.version} (build ${result.build}) начато`);

        } catch (error) {
            console.error('Ошибка при скачивании APK:', error);
            setDownloadError(error instanceof Error ? error.message : 'Произошла ошибка при скачивании');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="yumeko-android-page">
            <div className="android-container">
                {/* Hero Section */}
                <div className="hero-section">
                    <div className="hero-content">
                        <div className="app-badge">BETA</div>
                        <h1 className="hero-title">
                            Yumeko <span className="gradient-text">APP</span>
                        </h1>
                        <p className="hero-description">
                            Смотрите любимые аниме на своём Android устройстве.<br />
                            Удобно, быстро и с высоким качеством.
                        </p>

                        <div className="hero-buttons">
                            <button
                                onClick={handleApkDownload}
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
                                        Скачать APK
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

                {/* Features Section */}
                <div className="features-section">
                    <h2 className="section-title">Возможности приложения</h2>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <Smartphone size={28} />
                            </div>
                            <h3>Синхронизация прогресса</h3>
                            <p>Ваш прогресс автоматически синхронизируется между всеми устройствами</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Zap size={28} />
                            </div>
                            <h3>Кастомный плеер</h3>
                            <p>Удобный плеер с поддержкой всех необходимых функций</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Share2 size={28} />
                            </div>
                            <h3>Коллекции и списки</h3>
                            <p>Управляйте своими списками аниме прямо из приложения</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Bell size={28} />
                            </div>
                            <h3>Уведомления</h3>
                            <p>Получайте уведомления о новых сериях ваших любимых аниме</p>
                            <span className="badge-dev">В разработке</span>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Download size={28} />
                            </div>
                            <h3>Офлайн просмотр</h3>
                            <p>Скачивайте серии для просмотра без интернета</p>
                            <span className="badge-dev">В разработке</span>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Users size={28} />
                            </div>
                            <h3>Комментарии и отзывы</h3>
                            <p>Обсуждайте аниме с другими пользователями</p>
                        </div>
                    </div>
                </div>

                {/* Requirements Section */}
                <div className="requirements-section">
                    <div className="requirements-card">
                        <h3>Системные требования</h3>
                        <ul>
                            <li><strong>Минимальная версия:</strong> Android 7.0 (Nougat)</li>
                            <li><strong>Рекомендуемая:</strong> Android 10.0+</li>
                            <li><strong>Размер:</strong> ~30 МБ</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AndroidPage;
