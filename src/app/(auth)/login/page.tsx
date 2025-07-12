'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import Image from 'next/image';
import { Loader2, Send } from 'lucide-react';

const isElectron = () =>
    typeof window !== 'undefined' && window.process?.versions?.electron;

const AuthPage: React.FC = () => {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
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
                            setRememberMe(true);
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

            if (!response.ok) throw new Error('Ошибка входа');

            const data = await response.json();
            document.cookie = `token=${data.token}; path=/;`;
            setSuccess(true);

            if (isElectron() && rememberMe) {
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
        } catch {
            alert('Ошибка входа');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-container">
                <div className="auth-logo">
                    <Image src="/logo_auth.png" alt="AniCat" width={260} height={80} />
                </div>

                <div className="auth-box">
                    <h2>Вход</h2>

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
                            <div className="auth-success">
                                ✅ Успешная авторизация
                            </div>
                        )}
                        <div className="remember-me">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={e => setRememberMe(e.target.checked)}
                                />
                                Запомнить меня
                            </label>
                        </div>
                        <button type="submit" className="submit-button" disabled={loading}>
                            {loading ? <Loader2 className="spinner" size={18} /> : "Войти"}
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
