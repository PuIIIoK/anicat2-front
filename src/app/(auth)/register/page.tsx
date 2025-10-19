'use client';

import React, { useState, useEffect } from 'react';
import { API_SERVER } from '../../../tools/constants';
import Image from 'next/image';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import {Film, FolderKanban, MessageCircle, Sparkles, Trophy, ShieldAlert} from "lucide-react";
import { getDeviceFingerprint, getDeviceInfo } from '../../../tools/fingerprint';


const forbiddenUsernames = [
    'pidor', 'huy', '4len', 'chlen', 'huesos', 'pidaras', 'eblan', 'shalava', 'matjebal'
];

// Слова-«роли» и их вариации, запрещённые в логинах и паролях (проверяем как подстроки — регистронезависимо и без разделителей)
const roleBanTokensRaw = [
    'admin',
    'administrator',
    'moder',
    'moderator',
    'helper',
    // варианты опечаток/вариаций observer/observerder
    'observer',
    'observerder',
    'obesrverder',
    'oberverder',
    'premium',
];

// Жёстко запрещённые конкретные логины
const explicitBannedUsernames = [
    'user',
    'testuser',
    'testuser123456',
    'testuser1',
    'testuser123456789',
    'testuser1234567890',
    'testuser12345678901',
    'testuser123456789012',
    'testuser1234567890123',
    'testuser12345678901234',
    'testuser123456789012345',
    'testuser1234567890123456',
    'testuser12345678901234567',
    'testuser123456789012345678',
    'testuser1234567890123456789',
    'testuser12345678901234567890',
    'testuser123456789012345678901',
    'testuser1234567890123456789012',
    'testuser12345678901234567890123',
    'puiiiok',
    'sozdatel',
    'sozdatel123456',
    'sozdatel123456789',
    'sozdatel1234567890',
    'sozdatel12345678901',
    'sozdatel123456789012',
    'sozdatel1234567890123',
    'admintraitor',
    'test',
    'usertest',
    '123456',
    '123456789',
];

// Банлист для паролей
const bannedPasswordsRaw = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', // простые числа 0-10
    '0123456789', '123456', '123456789',
    'qwerty', 'qwerty123456', '1q2w3e4r5t',, 'puiiiok686',, 'puiiiok', 'dvacew',
    'test123456', 'test', 'prostoparol', 'huy228', 'opal228',
    'user', 'moder', 'admin', 'premium', 'administrator', 'moderator', 'oberverder', 'observerder', 'helper', 'testuser', 'testuser123456', 'testuser123456789', 'testuser1234567890', 'testuser12345678901', 'testuser123456789012', 'testuser1234567890123', 'testuser12345678901234', 'testuser123456789012345', 'testuser1234567890123456', 'testuser12345678901234567', 'testuser123456789012345678', 'testuser1234567890123456789', 'testuser12345678901234567890', 'testuser123456789012345678901', 'testuser1234567890123456789012', 'testuser12345678901234567890123', 'puiiiok', 'sozdatel', 'sozdatel123456', 'sozdatel123456789', 'sozdatel1234567890', 'sozdatel12345678901', 'sozdatel123456789012', 'sozdatel1234567890123'
];

const hasCyrillic = (str: string) => /[а-яА-ЯёЁ]/.test(str);

const hasEmailSymbols = (str: string) => /@/.test(str) || str.includes('.');

const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '');

const containsBannedRoleToken = (value: string): boolean => {
    const normalizedValue = normalize(value);
    return roleBanTokensRaw.some((token) => normalizedValue.includes(normalize(token)));
};

const isExplicitUsernameBanned = (username: string): boolean => {
    const normalized = username.trim().toLowerCase();
    return explicitBannedUsernames.some((u) => u.toLowerCase() === normalized);
};

const isNumericOnly = (value: string): boolean => /^\d+$/.test(value);

const isPasswordBannedByList = (password: string): boolean => {
    const lower = password.toLowerCase();
    return bannedPasswordsRaw.some((p) => (p ?? '').toLowerCase() === lower);
};

const RegisterPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [agreeRegister, setAgreeRegister] = useState(false);
    const [agreeBeta, setAgreeBeta] = useState(false);
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [message, setMessage] = useState('');
    const [touchedPassword, setTouchedPassword] = useState(false);
    const [touchedConfirm, setTouchedConfirm] = useState(false);
    const [touchedUsername, setTouchedUsername] = useState(false);
    const [hideErrorsAfterCaptcha, setHideErrorsAfterCaptcha] = useState(false);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitEndTime, setRateLimitEndTime] = useState<string>('');

    // Получаем fingerprint устройства при монтировании компонента
    useEffect(() => {
        const initFingerprint = async () => {
            const fp = await getDeviceFingerprint();
            setDeviceFingerprint(fp);
        };
        initFingerprint();
    }, []);

    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    // проверки логина
    const isForbiddenUsername = forbiddenUsernames.includes(normalizedUsername.toLowerCase());
    const isExplicitBannedUsername = isExplicitUsernameBanned(normalizedUsername);
    const isUsernameContainsRole = containsBannedRoleToken(normalizedUsername);
    const isUsernameNumericOnly = isNumericOnly(normalizedUsername);
    const isUsernameHasEmail = hasEmailSymbols(normalizedUsername);

    // проверки пароля
    const isPasswordTooShort = normalizedPassword.length < 6;
    const isPasswordBannedExact = isPasswordBannedByList(normalizedPassword);
    const isPasswordContainsRole = containsBannedRoleToken(normalizedPassword);
    const isWeakPassword =
        isPasswordTooShort ||
        isPasswordBannedExact ||
        hasCyrillic(normalizedPassword);

    // Общие жёсткие запреты: если логин/пароль содержат роль-токены — нельзя вообще
    const hasRoleBanAnywhere = isUsernameContainsRole || isPasswordContainsRole;

    // Логин не должен содержать кириллицу, быть только цифрами, и содержать email-символы
    const isUsernameInvalidByChars = hasCyrillic(normalizedUsername) || isUsernameNumericOnly || isUsernameHasEmail;

    const isFormValid =
        normalizedUsername !== '' &&
        normalizedPassword !== '' &&
        confirmPassword.trim() !== '' &&
        normalizedPassword === confirmPassword &&
        agreePrivacy &&
        agreeRegister &&
        agreeBeta &&
        !isForbiddenUsername &&
        !isExplicitBannedUsername &&
        !isUsernameInvalidByChars &&
        !hasRoleBanAnywhere &&
        !isWeakPassword &&
        !hasCyrillic(normalizedUsername) &&
        !isUsernameHasEmail;

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Отмечаем все поля как touched для показа ошибок
        setTouchedUsername(true);
        setTouchedPassword(true);
        setTouchedConfirm(true);

        // Если форма невалидна — показываем ошибки и выходим
        if (!isFormValid) {
            setMessage('Исправьте ошибки в форме перед регистрацией');
            return;
        }

        // Если форма валидна — показываем капчу
        setMessage('');
        setShowCaptcha(true);
    };

    const proceedRegistration = async () => {
        // повторная защита: если внезапно стало невалидно — выходим
        if (!isFormValid) return;
        try {
            const deviceInfo = getDeviceInfo();
            
            const response = await fetch(`${API_SERVER}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username: normalizedUsername, 
                    password: normalizedPassword,
                    deviceFingerprint: deviceFingerprint,
                    deviceInfo: deviceInfo
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // Используем setAuthToken для постоянного хранения (1 год)
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', data.token);
                    const maxAge = 365 * 24 * 60 * 60; // 1 год в секундах
                    document.cookie = `token=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax`;
                }
                
                // Отключаем показ ошибок после успешной капчи
                setHideErrorsAfterCaptcha(true);
                setMessage('Успешная регистрация! ✨');
                setUsername('');
                setPassword('');
                setConfirmPassword('');
                setAgreePrivacy(false);
                setAgreeRegister(false);
                setAgreeBeta(false);
                setShowCaptcha(false);

                setTimeout(() => {
                    window.location.href = '/profile';
                }, 1000);
            } else if (response.status === 429) {
                // Rate limit error
                try {
                    const errorData = await response.json();
                    setIsRateLimited(true);
                    setRateLimitEndTime(errorData.retryAfter || '');
                    setShowCaptcha(false);
                } catch {
                    setIsRateLimited(true);
                    setShowCaptcha(false);
                }
            } else {
                const errText = await response.text();
                setMessage(`Ошибка: ${errText}`);
                setShowCaptcha(false);
            }
        } catch {
            setMessage('Ошибка подключения к серверу');
            setShowCaptcha(false);
        }
    };

    const handleCaptchaSuccess = async () => {
        // Отключаем показ ошибок после прохождения капчи
        setHideErrorsAfterCaptcha(true);
        
        // Доп. проверка после капчи — если появился банлист/недопустимые условия, не продолжаем
        if (!isFormValid) {
            setShowCaptcha(false);
            setHideErrorsAfterCaptcha(false);
            return;
        }
        await proceedRegistration();
    };


    return (

        <div className="register-wrapper">
            <div className="register-page">
            <div className="register-split">
                <div className="register-left">
                    <h2>Доступ к более 1000+ аниме!</h2>
                    <ul>
                        <li><Film size={18} style={{marginRight: '8px'}}/> 2K и 4K аниме с быстрой загрузкой</li>
                        <li><FolderKanban size={18} style={{marginRight: '8px'}}/> Создание личных коллекций</li>
                        <li><MessageCircle size={18} style={{marginRight: '8px'}}/> Комментарии под постами</li>
                        <li><Trophy size={18} style={{marginRight: '8px'}}/> Участие в лидербордах</li>
                        <li><Sparkles size={18} style={{marginRight: '8px'}}/> Умные рекомендации и избранное</li>
                    </ul>
                </div>
                <div className="register-right">
                    <h2>Чем вам удобнее авторизироваться?</h2>
                    <div className="social-options">
                        {[
                            //  {name: 'Discord', icon: '/icons/discord.svg'},
                            {name: 'Telegram', icon: '/icons/telegram.svg', path: '/oauth/telegram'},
                            //  {name: 'Google', icon: '/icons/google.svg'},
                            //  {name: 'VK', icon: '/icons/vk.svg'},
                            //  {name: 'Yandex', icon: '/icons/yandex.svg'},
                        ].map((option) => (
                            <div key={option.name} className="social-block">
                                <Image src={option.icon} alt={option.name} width={32} height={32}/>
                                <span>{option.name}</span>
                            </div>
                        ))}
                    </div>

                    <div className="divider">или создать аккаунт AniCat</div>

                    <form onSubmit={handleRegister} className="register-form">
                        <div className="input-group">
                            <label htmlFor="username">Логин</label>
                            <input
                                id="username"
                                type="text"
                                placeholder="Введите логин"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onBlur={() => setTouchedUsername(true)}
                                required
                            />
                            {!hideErrorsAfterCaptcha && touchedUsername && hasCyrillic(normalizedUsername) && (
                                <p className="message">Логин не должен содержать русские символы</p>
                            )}
                            {!hideErrorsAfterCaptcha && touchedUsername && isUsernameNumericOnly && (
                                <p className="message">Логин не может состоять только из цифр</p>
                            )}
                            {!hideErrorsAfterCaptcha && touchedUsername && isUsernameHasEmail && (
                                <p className="message">Логин не может содержать символы @ и точку</p>
                            )}
                            {!hideErrorsAfterCaptcha && touchedUsername && (isForbiddenUsername || isExplicitBannedUsername) && (
                                <p className="message">Данный логин запрещён политикой сайта</p>
                            )}
                            {!hideErrorsAfterCaptcha && touchedUsername && isUsernameContainsRole && (
                                <p className="message">Запрещено использовать слова, похожие на роли администрации</p>
                            )}
                        </div>

                        <div className="input-group">
                            <label htmlFor="password">Пароль</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Введите пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onBlur={() => setTouchedPassword(true)}
                                required
                            />
                            {!hideErrorsAfterCaptcha && touchedPassword && hasCyrillic(normalizedPassword) && (
                                <p className="message">Пароль не должен содержать русские символы</p>
                            )}
                            {!hideErrorsAfterCaptcha && touchedPassword && isPasswordTooShort && (
                                <p className="message">Минимальная длина пароля — 6 символов</p>
                            )}
                            {!hideErrorsAfterCaptcha && touchedPassword && isPasswordBannedExact && (
                                <p className="message">Данный пароль запрещён политикой безопасности</p>
                            )}
                            {!hideErrorsAfterCaptcha && touchedPassword && isPasswordContainsRole && (
                                <p className="message">Нельзя использовать слова ролей в пароле</p>
                            )}
                        </div>

                        <div className="input-group">
                            <label htmlFor="confirm">Подтвердить пароль</label>
                            <input
                                id="confirm"
                                type="password"
                                placeholder="Повторите пароль"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onBlur={() => setTouchedConfirm(true)}
                                required
                            />
                            {!hideErrorsAfterCaptcha && touchedConfirm && confirmPassword && confirmPassword !== password && (
                                <p className="message">Пароли не совпадают</p>
                            )}
                        </div>

                        <div className="checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={agreePrivacy}
                                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                                    required
                                />
                                Я принимаю политику конфиденциальности сайта
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={agreeRegister}
                                    onChange={(e) => setAgreeRegister(e.target.checked)}
                                    required
                                />
                                Я соглашаюсь на регистрацию аккаунта
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={agreeBeta}
                                    onChange={(e) => setAgreeBeta(e.target.checked)}
                                />
                                Я хочу участвовать в разработке бета-версии сайта
                            </label>
                        </div>

                        <button type="submit" disabled={!isFormValid}>Создать аккаунт</button>
                        {message && <p className="message">{message}</p>}
                    </form>
                    <div className="auth-link-bottom">
                        Уже зарегистрированы? <a href="/login">Авторизоваться</a>
                    </div>

                    {/* Rate Limit Modal */}
                    {isRateLimited && (
                        <div className="captcha-modal rate-limit-modal">
                            <div className="captcha-box rate-limit-box">
                                <div className="rate-limit-icon">
                                    <ShieldAlert size={64} color="#ef4444" />
                                </div>
                                <h3 className="rate-limit-title">Превышен лимит регистраций</h3>
                                <p className="rate-limit-message">
                                    Вы слишком много и слишком часто регистрировали аккаунты! 
                                    Подождите сутки чтобы зарегистрировать себе новый аккаунт!
                                </p>
                                {rateLimitEndTime && (
                                    <p className="rate-limit-time">
                                        Доступ будет восстановлен: <strong>{new Date(rateLimitEndTime).toLocaleString('ru-RU')}</strong>
                                    </p>
                                )}
                                <button 
                                    className="rate-limit-close-btn"
                                    onClick={() => {
                                        setIsRateLimited(false);
                                        window.location.href = '/';
                                    }}
                                >
                                    Вернуться на главную
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Captcha Modal */}
                    {showCaptcha && !isRateLimited && (
                        <div className="captcha-modal">
                            <div className="captcha-box">
                                <p>Пожалуйста, пройдите проверку:</p>
                                <HCaptcha
                                    sitekey="5df4f0a0-b066-4732-980a-694cd7661c2e" // ⚠️ вставь сюда свой публичный ключ!
                                    onVerify={() => handleCaptchaSuccess()}
                                    theme="dark"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div>
    );
};

export default RegisterPage;