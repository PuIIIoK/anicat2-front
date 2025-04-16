'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Header: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const getCookieToken = () => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : '';
    };

    const checkAuth = async () => {
        const token = getCookieToken();
        if (!token) return;

        try {
            const response = await fetch('http://localhost:8080/api/auth/check-auth', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setIsAuthenticated(response.ok);
        } catch {
            setIsAuthenticated(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const handleLogout = () => {
        document.cookie = 'token=; Max-Age=0; path=/;';
        setIsAuthenticated(false);
        window.location.href = '/login';
    };

    return (
        <header className="header">
            <div className="logo">
                <Link href="/">
                    <Image
                        className="logo-img"
                        src="/logo.png"
                        alt="Logo"
                        width={65}
                        height={65}
                    />
                </Link>
                <div className="logo-dropdown">
                    <ul>
                        <li><Link href="/">Главная</Link></li>
                        <li><Link href="/leaderboard">Лидеборд</Link></li>
                    </ul>
                </div>
            </div>

            <div className="profile">
                <Link href="/profile">
                    <Image
                        src="/profile.png"
                        alt="Профиль"
                        width={50}
                        height={50}
                        className="profile-icon"
                    />
                </Link>
                <div className="profile-dropdown">
                    <ul>
                        {isAuthenticated ? (
                            <>
                                <li><Link href="/profile">Мой профиль</Link></li>
                                <li><Link href="/profile/collection">Коллекции</Link></li>
                                <li><Link href="/profile/settings">Настройки</Link></li>
                                <li><button onClick={handleLogout}>Выйти</button></li>
                                <li><Link href="/admin">Админ панель</Link></li>
                            </>
                        ) : (
                            <>
                                <li><Link href="/login">Войти</Link></li>
                                <li><Link href="/register">Регистрация</Link></li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </header>
    );
};

export default Header;
