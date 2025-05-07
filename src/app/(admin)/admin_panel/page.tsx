'use client'

import { API_SERVER } from "../../../tools/constants";
import AdminUsers from '../../component/admin_panel/admin-users';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminCategory from '../../component/admin_panel/admin-category';
import AdminTesting from '../../component/admin_panel/admin-testing';
import AdminLogs from "../../component/admin_panel/admin-logs";
import AdminAnime from "../../component/admin_panel/admin-anime"; // 👈 импортируем тестовый компонент

const AdminPanelPage = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'anime' | 'categories' | 'testing' | 'logs'>('anime'); // 👈 добавили 'testing'
    const [notification, setNotification] = useState<string | null>(null);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const router = useRouter();

    const getCookieToken = (): string | null => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : null;
    };

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };


    useEffect(() => {
        const checkAdminAccess = async () => {
            const token = getCookieToken();
            if (!token) {
                router.push('/');
                return;
            }

            try {
                const res = await fetch(`${API_SERVER}/api/auth/user-info`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    router.push('/');
                    return;
                }

                const data = await res.json();
                const roles = data.roles ?? [];
                const allowedRoles = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN']; // допустимые роли

                if (Array.isArray(roles) && roles.some(role => allowedRoles.includes(role))) {
                    setIsAuthorized(true);
                } else {
                    router.push('/');
                }
            } catch (err) {
                console.error('Ошибка при проверке роли:', err);
                router.push('/');
            }
        };

        checkAdminAccess();
    }, [router]);


    if (isAuthorized === null) {
        return <div className="admin-loading">Проверка доступа...</div>;
    }

    return (
        <div className="admin-panel">
            <div className="admin-burger" onClick={toggleSidebar}>
                <div className="line"></div>
                <div className="line"></div>
                <div className="line"></div>
            </div>

            {notification && <div className="notification">{notification}</div>}

            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <h1 className="admin-sidebar-title">Админ Панель</h1>
                <nav className="admin-sidebar-nav">
                    <button
                        className={`admin-nav-button ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Пользователи
                    </button>
                    <button
                        className={`admin-nav-button ${activeTab === 'anime' ? 'active' : ''}`}
                        onClick={() => setActiveTab('anime')}
                    >
                        Аниме
                    </button>
                    <button
                        className={`admin-nav-button ${activeTab === 'categories' ? 'active' : ''}`}
                        onClick={() => setActiveTab('categories')}
                    >
                        Категории
                    </button>
                    <button
                        className={`admin-nav-button ${activeTab === 'testing' ? 'active' : ''}`}
                        onClick={() => setActiveTab('testing')}
                    >
                        Тестирование
                    </button>
                    <button
                        className={`admin-nav-button ${activeTab === 'logs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('logs')}
                    >
                        Логи сайта
                    </button>
                </nav>
            </aside>

            <main className="admin-content">
                {activeTab === 'anime' && (
                    <AdminAnime setNotification={setNotification} />
                )}

                {activeTab === 'categories' && (
                    <section className="admin-section">
                    <h2>Категории</h2>
                        <AdminCategory/>
                    </section>
                )}

                {activeTab === 'testing' && (
                    <section className="admin-section">
                        <AdminTesting/>
                    </section>
                )}
                {activeTab === 'users' && (
                    <AdminUsers />
                )}
                {activeTab === 'logs' && (
                    <AdminLogs />
                )}
            </main>
        </div>
    );
};

export default AdminPanelPage;
