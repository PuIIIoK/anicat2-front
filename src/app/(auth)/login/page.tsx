'use client';

import React, { useState } from 'react';

const AuthPage: React.FC = () => {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: nickname,
                    password: password,
                }),
            });

            if (!response.ok) {
                throw new Error('Неверный логин или пароль!');
            }

            const data = await response.json();

            // Сохраняем токен в cookie
            document.cookie = `token=${data.token}; path=/; max-age=86400`;

            // Переход в профиль
            window.location.href = '/profile';
        } catch {
            alert('Неверный логин или пароль!');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <h1>Авторизация</h1>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="nickname">Логин (Ник)</label>
                        <input
                            type="text"
                            id="nickname"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Введите логин"
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
                            placeholder="Введите пароль"
                            required
                        />
                    </div>
                    <button type="submit" className="submit-button">
                        Войти
                    </button>
                </form>
                <div className="auth-links">
                    <a href="/register">Регистрация</a>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
