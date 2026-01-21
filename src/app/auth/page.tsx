'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { API_SERVER } from '@/hosts/constants';
import { setAuthToken, getAuthToken } from '../utils/auth';
import '../styles/auth-page.scss';

const HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001'; // Замените на ваш реальный ключ
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 3 * 60 * 60 * 1000; // 3 часа в миллисекундах

interface BlockInfo {
    attempts: number;
    blockedUntil: number | null;
}

const getBlockInfo = (): BlockInfo => {
    if (typeof window === 'undefined') return { attempts: 0, blockedUntil: null };

    try {
        const stored = localStorage.getItem('auth_block_info');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parsing errors
    }
    return { attempts: 0, blockedUntil: null };
};

const setBlockInfo = (info: BlockInfo) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_block_info', JSON.stringify(info));
};

const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) {
        return `${hours} ч. ${minutes} мин.`;
    } else if (minutes > 0) {
        return `${minutes} мин. ${seconds} сек.`;
    }
    return `${seconds} сек.`;
};

export default function AuthPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // hCaptcha state
    const captchaRef = useRef<HCaptcha>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [captchaVerified, setCaptchaVerified] = useState(false);

    // Rate limiting state
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockTimeRemaining, setBlockTimeRemaining] = useState<string>('');
    const [attempts, setAttempts] = useState(0);

    // Check if blocked on mount and update timer
    useEffect(() => {
        const checkBlock = () => {
            const info = getBlockInfo();
            setAttempts(info.attempts);

            if (info.blockedUntil && info.blockedUntil > Date.now()) {
                setIsBlocked(true);
                setBlockTimeRemaining(formatTimeRemaining(info.blockedUntil - Date.now()));
            } else if (info.blockedUntil && info.blockedUntil <= Date.now()) {
                // Разблокировка - сброс данных
                setBlockInfo({ attempts: 0, blockedUntil: null });
                setIsBlocked(false);
                setAttempts(0);
            }
        };

        checkBlock();

        // Update timer every second
        const interval = setInterval(checkBlock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Redirect if already authenticated
    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            router.push('/');
        }
    }, [router]);

    const incrementAttempts = () => {
        const info = getBlockInfo();
        const newAttempts = info.attempts + 1;

        if (newAttempts >= MAX_ATTEMPTS) {
            const blockedUntil = Date.now() + BLOCK_DURATION_MS;
            setBlockInfo({ attempts: newAttempts, blockedUntil });
            setIsBlocked(true);
            setBlockTimeRemaining(formatTimeRemaining(BLOCK_DURATION_MS));
        } else {
            setBlockInfo({ ...info, attempts: newAttempts });
            setAttempts(newAttempts);
        }
    };

    const resetAttempts = () => {
        setBlockInfo({ attempts: 0, blockedUntil: null });
        setAttempts(0);
    };

    const handleCaptchaVerify = (token: string) => {
        setCaptchaToken(token);
        setCaptchaVerified(true);
    };

    const handleCaptchaExpire = () => {
        setCaptchaToken(null);
        setCaptchaVerified(false);
    };

    const handleCaptchaError = () => {
        setCaptchaToken(null);
        setCaptchaVerified(false);
        setError('Ошибка проверки капчи. Попробуйте снова.');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Check if blocked
        if (isBlocked) {
            setError(`Доступ заблокирован. Попробуйте через ${blockTimeRemaining}`);
            return;
        }

        // Check captcha
        if (!captchaToken || !captchaVerified) {
            setError('Пожалуйста, пройдите проверку капчи');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_SERVER}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    captchaToken: captchaToken, // Отправляем токен капчи на сервер
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.message || 'Неверный логин или пароль');
                setIsLoading(false);

                // Increment attempts on failed login
                incrementAttempts();

                // Reset captcha
                captchaRef.current?.resetCaptcha();
                setCaptchaToken(null);
                setCaptchaVerified(false);
                return;
            }

            const data = await response.json();
            setAuthToken(data.token);

            // Reset attempts on successful login
            resetAttempts();

            router.push('/');
        } catch (err) {
            console.error('Login error:', err);
            setError('Произошла ошибка при входе. Попробуйте позже.');
            setIsLoading(false);

            // Reset captcha on error
            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
            setCaptchaVerified(false);
        }
    };

    const handleOAuth = (provider: string) => {
        // Check if blocked
        if (isBlocked) {
            setError(`Доступ заблокирован. Попробуйте через ${blockTimeRemaining}`);
            return;
        }

        const currentUrl = window.location.origin;
        let authUrl = '';

        switch (provider) {
            case 'google':
                authUrl = `${API_SERVER}/oauth2/authorization/google?redirect_uri=${encodeURIComponent(currentUrl + '/auth/callback')}`;
                break;
            case 'discord':
                authUrl = `${API_SERVER}/oauth2/authorization/discord?redirect_uri=${encodeURIComponent(currentUrl + '/auth/callback')}`;
                break;
            case 'vk':
                authUrl = `${API_SERVER}/oauth2/authorization/vk?redirect_uri=${encodeURIComponent(currentUrl + '/auth/callback')}`;
                break;
            case 'telegram':
                authUrl = `${API_SERVER}/oauth2/authorization/telegram?redirect_uri=${encodeURIComponent(currentUrl + '/auth/callback')}`;
                break;
            default:
                return;
        }

        window.location.href = authUrl;
    };

    // Blocked screen
    if (isBlocked) {
        return (
            <div className="auth-page">
                {/* Background */}
                <div className="auth-background">
                    <img src="/auth.png" alt="" className="auth-bg-image" />
                    <div className="auth-bg-overlay" />
                </div>

                {/* Logo link */}
                <Link href="/" className="auth-logo-link">
                    <img src="/yumeko_logo.png" alt="Yumeko" className="auth-logo" />
                    <span className="auth-logo-text">Yumeko <span className="auth-logo-accent">ANIMELIB</span></span>
                </Link>

                {/* Blocked Card */}
                <div className="auth-card auth-blocked-card">
                    <div className="auth-blocked-icon">
                        <svg viewBox="0 0 24 24" width="64" height="64">
                            <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                        </svg>
                    </div>
                    <h1 className="auth-blocked-title">Доступ заблокирован</h1>
                    <p className="auth-blocked-text">
                        Слишком много попыток авторизации.<br />
                        Доступ к сайту заблокирован на:
                    </p>
                    <div className="auth-blocked-timer">
                        {blockTimeRemaining}
                    </div>
                    <p className="auth-blocked-hint">
                        Попробуйте позже или обратитесь в поддержку
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            {/* Background */}
            <div className="auth-background">
                <img src="/auth.png" alt="" className="auth-bg-image" />
                <div className="auth-bg-overlay" />
            </div>

            {/* Logo link */}
            <Link href="/" className="auth-logo-link">
                <img src="/yumeko_logo.png" alt="Yumeko" className="auth-logo" />
                <span className="auth-logo-text">Yumeko <span className="auth-logo-accent">ANIMELIB</span></span>
            </Link>

            {/* Auth Card */}
            <div className="auth-card">
                <div className="auth-card-header">
                    <h1 className="auth-title">Добро пожаловать на Yumeko!</h1>
                    <p className="auth-subtitle">Чем хотите авторизироваться на сайте?</p>
                </div>

                {/* OAuth Buttons */}
                <div className="auth-oauth-section">
                    <div className="auth-oauth-grid">
                        <button
                            className="auth-oauth-btn google"
                            onClick={() => handleOAuth('google')}
                            type="button"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Google</span>
                        </button>

                        <button
                            className="auth-oauth-btn discord"
                            onClick={() => handleOAuth('discord')}
                            type="button"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                            <span>Discord</span>
                        </button>

                        <button
                            className="auth-oauth-btn vk"
                            onClick={() => handleOAuth('vk')}
                            type="button"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.658 4 8.2c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.847 2.455 2.268 4.606 2.853 4.606.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.169-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.15-3.574 2.15-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.492-.085.745-.576.745z" />
                            </svg>
                            <span>VK</span>
                        </button>

                        <button
                            className="auth-oauth-btn telegram"
                            onClick={() => handleOAuth('telegram')}
                            type="button"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg>
                            <span>Telegram</span>
                        </button>
                    </div>
                </div>

                <div className="auth-divider">
                    <span>Или авторизироваться через Yumeko профиль</span>
                </div>

                {/* Login Form */}
                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="auth-input-group">
                        <label htmlFor="username">Логин или Email</label>
                        <div className="auth-input-wrapper">
                            <svg viewBox="0 0 24 24" width="20" height="20" className="auth-input-icon">
                                <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Введите логин или email"
                                required
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div className="auth-input-group">
                        <label htmlFor="password">Пароль</label>
                        <div className="auth-input-wrapper">
                            <svg viewBox="0 0 24 24" width="20" height="20" className="auth-input-icon">
                                <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                            </svg>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Введите пароль"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="auth-password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* hCaptcha */}
                    <div className="auth-captcha-section">
                        <div className="auth-captcha-wrapper">
                            <HCaptcha
                                ref={captchaRef}
                                sitekey={HCAPTCHA_SITE_KEY}
                                onVerify={handleCaptchaVerify}
                                onExpire={handleCaptchaExpire}
                                onError={handleCaptchaError}
                                theme="dark"
                            />
                        </div>
                        {captchaVerified && (
                            <div className="auth-captcha-verified">
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                                <span>Проверка пройдена</span>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="auth-error">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Attempts warning */}
                    {attempts > 0 && attempts < MAX_ATTEMPTS && (
                        <div className="auth-attempts-warning">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                            </svg>
                            <span>Осталось попыток: {MAX_ATTEMPTS - attempts}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="auth-submit-btn"
                        disabled={isLoading || !captchaVerified}
                    >
                        {isLoading ? (
                            <div className="auth-spinner" />
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
                                </svg>
                                <span>Войти</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-register-link">
                    <span>Нету аккаунта?</span>
                    <Link href="/auth/register">Зарегистрироваться</Link>
                </div>
            </div>
        </div>
    );
}
