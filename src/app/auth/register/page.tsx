'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { API_SERVER } from '@/hosts/constants';
import { setAuthToken, getAuthToken } from '../../utils/auth';
import '../../styles/auth-page.scss';

const HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001'; // Замените на ваш реальный ключ
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 3 * 60 * 60 * 1000; // 3 часа

interface BlockInfo {
    attempts: number;
    blockedUntil: number | null;
}

const getBlockInfo = (): BlockInfo => {
    if (typeof window === 'undefined') return { attempts: 0, blockedUntil: null };

    try {
        const stored = localStorage.getItem('register_block_info');
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
    localStorage.setItem('register_block_info', JSON.stringify(info));
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

// Генерация fingerprint устройства
const getDeviceFingerprint = (): string => {
    if (typeof window === 'undefined') return '';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
    }

    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
};

// Информация об устройстве
const getDeviceInfo = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};

    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform || 'unknown',
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
};

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // hCaptcha state
    const captchaRef = useRef<HCaptcha>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [captchaVerified, setCaptchaVerified] = useState(false);

    // Rate limiting state
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockTimeRemaining, setBlockTimeRemaining] = useState<string>('');
    const [attempts, setAttempts] = useState(0);

    // Check if blocked on mount
    useEffect(() => {
        const checkBlock = () => {
            const info = getBlockInfo();
            setAttempts(info.attempts);

            if (info.blockedUntil && info.blockedUntil > Date.now()) {
                setIsBlocked(true);
                setBlockTimeRemaining(formatTimeRemaining(info.blockedUntil - Date.now()));
            } else if (info.blockedUntil && info.blockedUntil <= Date.now()) {
                setBlockInfo({ attempts: 0, blockedUntil: null });
                setIsBlocked(false);
                setAttempts(0);
            }
        };

        checkBlock();
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

    const validateForm = (): boolean => {
        if (username.length < 3) {
            setError('Имя пользователя должно быть не менее 3 символов');
            return false;
        }

        if (username.length > 20) {
            setError('Имя пользователя должно быть не более 20 символов');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('Имя пользователя может содержать только буквы, цифры и _');
            return false;
        }

        if (password.length < 6) {
            setError('Пароль должен быть не менее 6 символов');
            return false;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            return false;
        }

        return true;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isBlocked) {
            setError(`Доступ заблокирован. Попробуйте через ${blockTimeRemaining}`);
            return;
        }

        if (!captchaToken || !captchaVerified) {
            setError('Пожалуйста, пройдите проверку капчи');
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_SERVER}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    deviceFingerprint: getDeviceFingerprint(),
                    deviceInfo: getDeviceInfo(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.message || 'Ошибка регистрации. Возможно, такой пользователь уже существует.');
                setIsLoading(false);
                incrementAttempts();

                captchaRef.current?.resetCaptcha();
                setCaptchaToken(null);
                setCaptchaVerified(false);
                return;
            }

            const data = await response.json();

            if (data.token) {
                setAuthToken(data.token);
                resetAttempts();
                router.push('/');
            } else {
                resetAttempts();
                router.push('/auth?registered=true');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError('Произошла ошибка при регистрации. Попробуйте позже.');
            setIsLoading(false);

            captchaRef.current?.resetCaptcha();
            setCaptchaToken(null);
            setCaptchaVerified(false);
        }
    };

    // Blocked screen
    if (isBlocked) {
        return (
            <div className="auth-page">
                <div className="auth-background">
                    <img src="/auth.png" alt="" className="auth-bg-image" />
                    <div className="auth-bg-overlay" />
                </div>

                <Link href="/" className="auth-logo-link">
                    <img src="/yumeko_logo.png" alt="Yumeko" className="auth-logo" />
                    <span className="auth-logo-text">Yumeko <span className="auth-logo-accent">ANIMELIB</span></span>
                </Link>

                <div className="auth-card auth-blocked-card">
                    <div className="auth-blocked-icon">
                        <svg viewBox="0 0 24 24" width="64" height="64">
                            <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                        </svg>
                    </div>
                    <h1 className="auth-blocked-title">Доступ заблокирован</h1>
                    <p className="auth-blocked-text">
                        Слишком много попыток регистрации.<br />
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
            <div className="auth-background">
                <img src="/auth.png" alt="" className="auth-bg-image" />
                <div className="auth-bg-overlay" />
            </div>

            <Link href="/" className="auth-logo-link">
                <img src="/yumeko_logo.png" alt="Yumeko" className="auth-logo" />
                <span className="auth-logo-text">Yumeko <span className="auth-logo-accent">ANIMELIB</span></span>
            </Link>

            <div className="auth-card">
                <div className="auth-card-header">
                    <h1 className="auth-title">Создать аккаунт</h1>
                    <p className="auth-subtitle">Заполните поля для регистрации</p>
                </div>

                <form className="auth-form" onSubmit={handleRegister}>
                    <div className="auth-input-group">
                        <label htmlFor="username">Имя пользователя</label>
                        <div className="auth-input-wrapper">
                            <svg viewBox="0 0 24 24" width="20" height="20" className="auth-input-icon">
                                <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Введите имя пользователя"
                                required
                                autoComplete="username"
                            />
                        </div>
                        <span className="auth-input-hint">От 3 до 20 символов, только буквы, цифры и _</span>
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
                                autoComplete="new-password"
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
                        <span className="auth-input-hint">Минимум 6 символов</span>
                    </div>

                    <div className="auth-input-group">
                        <label htmlFor="confirmPassword">Подтвердите пароль</label>
                        <div className="auth-input-wrapper">
                            <svg viewBox="0 0 24 24" width="20" height="20" className="auth-input-icon">
                                <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                            </svg>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Повторите пароль"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="auth-password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? (
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
                                    <path fill="currentColor" d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                                <span>Зарегистрироваться</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-register-link">
                    <span>Уже есть аккаунт?</span>
                    <Link href="/auth">Войти</Link>
                </div>
            </div>
        </div>
    );
}
