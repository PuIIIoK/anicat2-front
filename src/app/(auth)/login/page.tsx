'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import Image from 'next/image';
import { Loader2, Send } from 'lucide-react';
import { setAuthToken } from '../../utils/auth';

const isElectron = () =>
    typeof window !== 'undefined' && window.process?.versions?.electron;

const AuthPage: React.FC = () => {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [banMessage, setBanMessage] = useState<string | null>(null);

    useEffect(() => {
        // Проверяем информацию о бане
        const banInfo = sessionStorage.getItem('banInfo');
        if (banInfo) {
            try {
                const banData = JSON.parse(banInfo);
                if (banData.isPermanent) {
                    setBanMessage(`Ваш аккаунт перманентно/навсегда был заблокирован.\nПо причине: ${banData.reason}`);
                }
                // Очищаем информацию после показа
                sessionStorage.removeItem('banInfo');
            } catch (error) {
                console.error('Ошибка при парсинге информации о бане:', error);
            }
        }

        if (isElectron()) {
            const lastLogin = localStorage.getItem('lastLogin');
            if (lastLogin) {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer
                    .invoke('get-password', {
                        service: 'anicat-app',
                        account: lastLogin,
                    })
                    .then((savedPassword: string) => {
                        if (savedPassword) {
                            setNickname(lastLogin);
                            setPassword(savedPassword);
                        }
                    });
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        try {
            const response = await fetch(`${API_SERVER}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: nickname, password }),
            });

            if (!response.ok) {
                // Получаем детали ошибки от сервера
                const errorText = await response.text();
                console.error('Login error:', errorText);
                
                // Пытаемся распарсить как JSON, если не получается - используем как текст
                let errorMessage = 'Ошибка входа';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData.error || errorText;
                } catch {
                    errorMessage = errorText || 'Неизвестная ошибка сервера';
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            // Сохраняем токен в localStorage и cookies с длительным сроком действия
            setAuthToken(data.token);
            
            setSuccess(true);

            if (isElectron()) {
                localStorage.setItem('lastLogin', nickname);
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-password', {
                    service: 'anicat-app',
                    account: nickname,
                    password: password,
                });
            }

            setTimeout(() => {
                setSuccess(false);
                window.location.href = '/profile';
            }, 500);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка входа';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-container">
                <div className="auth-box">
                    <h2>Вход</h2>

                    {banMessage && (
                        <div className="ban-notification">
                            <div className="ban-content">
                                <div className="ban-icon">🚫</div>
                                <div className="ban-text">{banMessage}</div>
                            </div>
                        </div>
                    )}

                    <div className="social-options">
                        <a href={`${API_SERVER}/api/auth/telegram`} className="social-block">
                            <Image src="/icons/telegram.svg" alt="Telegram" width={24} height={24} />
                            <span>Telegram</span>
                        </a>
                    </div>

                    <div className="divider">или авторизоваться через AniCat</div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="input-group">
                            <label htmlFor="nickname">Логин</label>
                            <input
                                type="text"
                                id="nickname"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="Введите логин..."
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Пароль</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Введите пароль..."
                                required
                            />
                        </div>
                        {success && (
                            <div className="success-notification">
                                <div className="success-content">
                                    <div className="success-icon">✓</div>
                                    <div className="success-text">Успешная авторизация</div>
                                </div>
                            </div>
                        )}
                        <button type="submit" className="submit-button" disabled={loading}>
                            {loading ? (
                                <div className="button-loading">
                                    <Loader2 className="spinner" size={18} />
                                    <span>Вход...</span>
                                </div>
                            ) : "Войти"}
                        </button>
                    </form>

                    <div className="auth-links">
                        Нет аккаунта? <a href="/register">Создайте его!</a>
                    </div>

                    <div className="auth-help">
                        Возникают проблемы? Обратитесь к нам в{" "}
                        <a href="https://t.me/anicat_supp" target="_blank" rel="noopener noreferrer">
                            Телеграмм <Send size={16} strokeWidth={2} style={{ marginLeft: '5px' }} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
