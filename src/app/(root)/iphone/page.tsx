'use client';
import React from 'react';
import Link from 'next/link';
import '@/styles/index.scss';

const IPhonePage: React.FC = () => {
    const IPhoneIcon = () => (
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="2" width="14" height="20" rx="3" ry="3" stroke="#FF8C00" strokeWidth="2" fill="none"/>
            <line x1="9" y1="19" x2="15" y2="19" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1" fill="#FF8C00"/>
            <rect x="6" y="4" width="12" height="10" rx="1" fill="rgba(255, 140, 0, 0.1)" stroke="#FF8C00" strokeWidth="1"/>
        </svg>
    );

    const HeartIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" stroke="#FF8C00" strokeWidth="2" fill="rgba(255, 140, 0, 0.1)"/>
        </svg>
    );

    const MoneyIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#FF8C00" strokeWidth="2"/>
            <path d="M12 6v6l4 2" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 8a4 4 0 00-8 0c0 4 4 4 4 4s4 0 4-4z" fill="rgba(255, 140, 0, 0.1)"/>
            <path d="M9.5 14.5c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round"/>
        </svg>
    );

    const CodeIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 18l6-6-6-6" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 6l-6 6 6 6" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const WebIcon = () => (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#FF8C00" strokeWidth="2"/>
            <line x1="2" y1="12" x2="22" y2="12" stroke="#FF8C00" strokeWidth="2"/>
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="#FF8C00" strokeWidth="2"/>
        </svg>
    );

    return (
        <div className="iphone-page">
            <div className="iphone-container">
                <div className="hero-section">
                    <div className="hero-content">
                        <div className="app-icon-large">
                            <IPhoneIcon />
                        </div>
                        <h1 className="app-title">AniCat</h1>
                        <p className="app-subtitle">для iPhone</p>
                        <div className="status-badge">
                            Временно недоступно
                        </div>
                    </div>
                </div>

                <div className="explanation-section">
                    <h2 className="section-title">Честно о ситуации</h2>
                    <div className="explanation-content">
                        <p className="main-message">
                            Приложение для iPhone будет не скоро, так как чтобы его сделать 
                            нужно очень много времени и денег на это. А так как сайт держится 
                            на энтузиазме, то прилы на iPhone пока что не будет.
                        </p>
                        <p className="apology">
                            Просьба принять и простить разрабов, но такие дела... 😅
                        </p>
                    </div>
                </div>

                <div className="reasons-section">
                    <h2 className="section-title">Почему так сложно?</h2>
                    <div className="reasons-grid">
                        <div className="reason-card">
                            <div className="reason-icon">
                                <MoneyIcon />
                            </div>
                            <h3>Стоимость разработки</h3>
                            <p>Apple Developer Program стоит $99/год, плюс затраты на разработку под iOS экосистему</p>
                        </div>
                        <div className="reason-card">
                            <div className="reason-icon">
                                <CodeIcon />
                            </div>
                            <h3>Сложность разработки</h3>
                            <p>iOS требует изучения Swift/Objective-C, соблюдения строгих гайдлайнов Apple</p>
                        </div>
                        <div className="reason-card">
                            <div className="reason-icon">
                                <HeartIcon />
                            </div>
                            <h3>Энтузиазм команды</h3>
                            <p>Мы работаем в свободное время без коммерческой поддержки, просто из любви к аниме</p>
                        </div>
                    </div>
                </div>

                <div className="alternative-section">
                    <h2 className="section-title">Что можно использовать сейчас?</h2>
                    <div className="alternative-card">
                        <div className="alt-icon">
                            <WebIcon />
                        </div>
                        <div className="alt-content">
                            <h3>Мобильная версия сайта</h3>
                            <p>
                                Наш сайт отлично адаптирован для мобильных устройств! 
                                Просто откройте anicat.fun в браузере Safari и добавьте на главный экран.
                            </p>
                            <div className="instruction">
                                <strong>Как добавить на главный экран:</strong>
                                <ol>
                                    <li>Откройте anicat.fun в Safari</li>
                                    <li>Нажмите кнопку &ldquo;Поделиться&rdquo; ↗️</li>
                                    <li>Выберите &ldquo;На экран «Домой»&rdquo;</li>
                                    <li>Готово! Теперь у вас есть иконка AniCat</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="future-section">
                    <h2 className="section-title">Планы на будущее</h2>
                    <p>
                        Мы не исключаем возможность создания iOS приложения в будущем, 
                        если найдутся ресурсы и время. Следите за новостями на нашем сайте!
                    </p>
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

export default IPhonePage;
