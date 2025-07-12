'use client';

import React, { useState } from 'react';
import { API_SERVER } from '../../../tools/constants';
import Image from 'next/image';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import {Film, FolderKanban, MessageCircle, Sparkles, Trophy} from "lucide-react";


const forbiddenUsernames = [
    'pidor', 'huy', '4len', 'chlen', 'huesos', 'pidaras', 'eblan', 'shalava', 'matjebal'
];

const adminLikePatterns = [
    /admin/i,
    /moder/i,
    /helper/i,
    /visualor/i
];

const weakPasswords = [
    '122424', 'qwe', '123456', 'password', '123'
];

const hasCyrillic = (str: string) => /[а-яА-ЯёЁ]/.test(str);

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

    const isForbiddenUsername = forbiddenUsernames.includes(username.toLowerCase());
    const isAdminLikeUsername = adminLikePatterns.some((regex) => regex.test(username));
    const isWeakPassword =
        weakPasswords.includes(password.toLowerCase()) ||
        password.length < 6 ||
        hasCyrillic(password);

    const isFormValid =
        username.trim() !== '' &&
        password.trim() !== '' &&
        confirmPassword.trim() !== '' &&
        password === confirmPassword &&
        agreePrivacy &&
        agreeRegister &&
        agreeBeta &&
        !isForbiddenUsername &&
        !isAdminLikeUsername &&
        !isWeakPassword &&
        !hasCyrillic(username);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFormValid) return;

        setShowCaptcha(true);
    };

    const handleCaptchaSuccess = async () => {
        try {
            const response = await fetch(`${API_SERVER}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                document.cookie = `token=${data.token}; path=/; max-age=86400`;
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
            } else {
                const errText = await response.text();
                setMessage(`Ошибка: ${errText}`);
            }
        } catch {
            setMessage('Ошибка подключения к серверу');
        }
    };


    return (

        <div className="register-wrapper">
            <div className="register-page">
                <div className="register-logo">
                    <Image src="/logo_auth.png" alt="AniCat Logo" width={250} height={100} />
                </div>
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
                            {touchedUsername && hasCyrillic(username) &&
                                <p className="message">Логин не должен содержать русские символы</p>}
                            {touchedUsername && isForbiddenUsername &&
                                <p className="message">Данные логины запрещены политикой сайта</p>}
                            {touchedUsername && isAdminLikeUsername &&
                                <p className="message">Запрещено создавать логины, схожие с администрацией сайта</p>}
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
                            {touchedPassword && isWeakPassword &&
                                <p className="message">Данный пароль не подходит для регистрации</p>}
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
                            {touchedConfirm && confirmPassword && confirmPassword !== password && (
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

                    {showCaptcha && (
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