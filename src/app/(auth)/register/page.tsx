'use client';

import React, { useState } from 'react';

const RegisterPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                document.cookie = `token=${data.token}; path=/; max-age=86400`; // Сохраняем токен на 24ч
                setMessage('Успешная регистрация! ✨');
                setUsername('');
                setPassword('');

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
        <div className="register-container">
            <form onSubmit={handleRegister} className="register-form">
                <h2>Регистрация</h2>
                <input
                    type="text"
                    placeholder="Логин"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Зарегистрироваться</button>
                {message && <p className="message">{message}</p>}
            </form>
        </div>
    );
};

export default RegisterPage;
