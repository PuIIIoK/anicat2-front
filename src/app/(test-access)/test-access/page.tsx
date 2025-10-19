'use client';
import React, { useState } from 'react';
import { API_SERVER } from "../../../tools/constants";
import { isElectron } from "../../../utils/isElectron";
import { setAccessTest } from "../../../hooks/accessLocal";
import { useRouter } from 'next/navigation';
// import { useNotifications } from "../../component/notifications/NotificationManager";

const TestAccess: React.FC = () => {
    const router = useRouter();
    // const { addNotification } = useNotifications();

    const [loading, setLoading] = useState(false);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [rememberMe] = useState(false);


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
                // Сохраняем токен в localStorage и cookies с длительным сроком (1 год)
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', token);
                    const maxAge = 365 * 24 * 60 * 60; // 1 год в секундах
                    document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
                }
                setAccessTest(true);
                setHasAccess(true);

                if (isElectron() && rememberMe) {
                    localStorage.setItem('lastLogin', login);
                    const { ipcRenderer } = window.require('electron');
                    await ipcRenderer.invoke('save-password', {
                        service: 'anicat-app',
                        account: login,
                        password: password,
                    });
                }

                router.push('/');
            } else {
                setError('Нет доступа к тестовой ветке');
            }
        } catch {
            setError('Ошибка сети');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    display: 'inline-block', width: '40px', height: '40px',
                    border: '4px solid rgba(0,0,0,0.1)', borderRadius: '50%',
                    borderTopColor: '#ff7070', animation: 'spin 1s linear infinite', margin: '40px auto'
                }} />
                <style>{`@keyframes spin {to { transform: rotate(360deg); }}`}</style>
            </div>
        );
    }

    if (hasAccess === true) {
        return null;
    }

    return (
        <div className="auth-container-test-access">
            <h2 className="auth-title-test-access">Для просмотра данной страницы, нужно авторизироваться!</h2>
            {error && <p className="auth-error-test-access">{error}</p>}
            <label>
                <span>Логин</span>
                <input
                    type="text"
                    value={login}
                    onChange={e => setLogin(e.target.value)}
                    className="auth-input-test-access"
                />
            </label>
            <label>
                <span>Пароль</span>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="auth-input-test-access"
                />
            </label>
            <button onClick={handleLogin} className="auth-button-test-access">
                Войти
            </button>
        </div>
    );
};

export default TestAccess;
