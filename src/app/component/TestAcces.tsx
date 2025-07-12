'use client';

import React, { useState } from 'react';
import {API_SERVER} from "../../tools/constants";
import {isElectron} from "../../utils/isElectron";

interface TestAccessProps {
    children: React.ReactNode;
}

const TestAccess: React.FC<TestAccessProps> = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe] = useState(false);

    const spinnerStyle: React.CSSProperties = {
        display: 'inline-block',
        width: '40px',
        height: '40px',
        border: '4px solid rgba(0,0,0,0.1)',
        borderRadius: '50%',
        borderTopColor: '#ff7070',
        animation: 'spin 1s linear infinite',
        margin: '40px auto',
    };

    const spinnerKeyframes = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

    const handleLogin = async () => {
        setError(null);
        setLoading(true);
        try {
            const response = await fetch(`${API_SERVER}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: login, password }),
            });

            if (!response.ok) {
                setError('Неверный логин или пароль');
                setLoading(false);
                return;
            }

            const data = await response.json();
            const token = data.token;
            document.cookie = `token=${token}; path=/;`;

            if (isElectron() && rememberMe) {
                localStorage.setItem('lastLogin', login);
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-password', {
                    service: 'anicat-app',
                    account: login,
                    password: password,
                });
            }

            // Используем login как username для запроса профиля
            const profileRes = await fetch(`${API_SERVER}/api/auth/get-profile/id?username=${login}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!profileRes.ok) {
                setError('Ошибка проверки доступа');
                setLoading(false);
                return;
            }

            const profileData = await profileRes.json();
            if (profileData.test === true) {
                setHasAccess(true);
            } else {
                setHasAccess(false);
            }
        } catch {
            setError('Ошибка сети');
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return (
            <>
                <style>{spinnerKeyframes}</style>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={spinnerStyle} />
                </div>
            </>
        );
    }

    if (hasAccess === false) {
        return (
            <div style={{ color: '#ff7070', padding: 20, textAlign: 'center' }}>
                <h2>Ошибка проверки доступа!</h2>
                <p>У вас недостаточно прав для просмотра этой страницы, обратитесь администратору.</p>
            </div>
        );
    }

    if (hasAccess === true) {
        return <>{children}</>;
    }

    // Форма логина по умолчанию
    return (
        <div style={{ maxWidth: 320, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
            <h2>Для просмотра данной страницы, нужно авторизироваться!</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <label>
                Логин:<br />
                <input
                    type="text"
                    value={login}
                    onChange={e => setLogin(e.target.value)}
                    style={{ width: '100%', padding: 8, marginBottom: 10 }}
                />
            </label>
            <label>
                Пароль:<br />
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', padding: 8, marginBottom: 10 }}
                />
            </label>
            <button onClick={handleLogin} style={{ width: '100%', padding: 10, backgroundColor: '#ff7070', color: '#fff', border: 'none', borderRadius: 4 }}>
                Войти
            </button>
        </div>
    );
};

export default TestAccess;
