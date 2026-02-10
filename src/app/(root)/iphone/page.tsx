'use client';
import React from 'react';
import Link from 'next/link';
import { DollarSign, Code, Heart, Smartphone, ArrowLeft } from 'lucide-react';
import '@/styles/index.scss';
import '@/styles/pages/yumeko-iphone-page.scss';

const IPhonePage: React.FC = () => {
    return (
        <div className="yumeko-iphone-page">
            <div className="iphone-container">
                {/* Hero Section */}
                <div className="hero-section">
                    <div className="hero-content">
                        <div className="app-badge unavailable">НЕДОСТУПНО</div>
                        <h1 className="hero-title">
                            Yumeko <span className="gradient-text">iOS</span>
                        </h1>
                        <p className="hero-description">
                            Приложение для iPhone будет не скоро, так как для его создания<br />
                            требуется много времени и финансовых вложений.
                        </p>

                        <div className="hero-buttons">
                            <Link href="/" className="btn-secondary">
                                <ArrowLeft size={20} />
                                На главную
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Explanation Section */}
                <div className="explanation-section">
                    <div className="explanation-card">
                        <h2>Честно о ситуации</h2>
                        <p className="main-message">
                            Так как сайт держится на энтузиазме, приложение для iPhone пока что не планируется.
                            Мы понимаем ваше разочарование и приносим извинения.
                        </p>
                        <p className="apology">
                            Просьба принять и простить разработчиков, но такие дела... 😅
                        </p>
                    </div>
                </div>

                {/* Reasons Section */}
                <div className="reasons-section">
                    <h2 className="section-title">Почему так сложно?</h2>

                    <div className="reasons-grid">
                        <div className="reason-card">
                            <div className="reason-icon">
                                <DollarSign size={28} />
                            </div>
                            <h3>Стоимость разработки</h3>
                            <p>Apple Developer Program стоит $99/год, плюс затраты на разработку под iOS экосистему</p>
                        </div>

                        <div className="reason-card">
                            <div className="reason-icon">
                                <Code size={28} />
                            </div>
                            <h3>Сложность разработки</h3>
                            <p>iOS требует изучения Swift/Objective-C и соблюдения строгих гайдлайнов Apple</p>
                        </div>

                        <div className="reason-card">
                            <div className="reason-icon">
                                <Heart size={28} />
                            </div>
                            <h3>Энтузиазм команды</h3>
                            <p>Мы работаем в свободное время без коммерческой поддержки, просто из любви к аниме</p>
                        </div>
                    </div>
                </div>

                {/* Alternative Section */}
                <div className="alternative-section">
                    <div className="alternative-card">
                        <div className="alt-icon">
                            <Smartphone size={40} />
                        </div>
                        <div className="alt-content">
                            <h3>Что можно использовать сейчас?</h3>
                            <h4>Мобильная версия сайта</h4>
                            <p>
                                Наш сайт отлично адаптирован для мобильных устройств!
                                Просто откройте yumeko.ru в браузере Safari и добавьте на главный экран.
                            </p>
                            <div className="instruction">
                                <strong>Как добавить на главный экран:</strong>
                                <ol>
                                    <li>Откройте yumeko.ru в Safari</li>
                                    <li>Нажмите кнопку "Поделиться" ↗️</li>
                                    <li>Выберите "На экран «Домой»"</li>
                                    <li>Готово! Теперь у вас есть иконка Yumeko</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Future Section */}
                <div className="future-section">
                    <h2 className="section-title">Планы на будущее</h2>
                    <p>
                        Мы не исключаем возможность создания iOS приложения в будущем,
                        если найдутся ресурсы и время. Следите за новостями на нашем сайте!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default IPhonePage;
