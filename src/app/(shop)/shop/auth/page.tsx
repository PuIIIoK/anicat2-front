'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_SERVER } from '../../../../tools/constants';

export default function LoginForm() {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    // Убираем useSearchParams и устанавливаем redirect вручную
    const redirectTo = '/'; // Можно заменить на динамический путь, если нужно

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch(`${API_SERVER}/api/auth/login`, {
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
                setError('Неверный логин или пароль');
                return;
            }

            const data = await response.json();
            document.cookie = `token=${data.token}; path=/; max-age=86400`;
            router.push(redirectTo); // Переход на заданную страницу после логина
        } catch (e) {
            console.error('Ошибка входа:', e);
            setError('Произошла ошибка входа');
        }
    };

    return (
        <div className="auth-container">
            <h1>Авторизация</h1>
            <form onSubmit={handleLogin}>
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
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" className="submit-button">
                    Войти
                </button>
            </form>
            <div className="auth-links">
                <a href="/register">Регистрация</a>
            </div>
        </div>
    );
}
