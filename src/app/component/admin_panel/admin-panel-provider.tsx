'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_SERVER } from '../../../tools/constants';
import AdminUsers from '../../component/admin_panel/admin-users';
import AdminCategory from '../../component/admin_panel/admin-category';
import AdminTesting from '../../component/admin_panel/admin-testing';
import AdminLogs from '../../component/admin_panel/admin-logs';
import AdminAnime from '../../component/admin_panel/admin-anime';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Home,
    Users,
    Film,
    FolderKanban,
    FlaskConical,
    FileText } from 'lucide-react';
import AdminMobileNavbar from "../../component/admin_panel/AdminMobileNavbar";


const AdminPanelPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const getTabFromQuery = (): 'users' | 'anime' | 'categories' | 'testing' | 'logs' => {
        const tab = searchParams.get('admin_panel');
        switch (tab) {
            case 'edit-users': return 'users';
            case 'edit-categories': return 'categories';
            case 'edit-testing': return 'testing';
            case 'edit-logs': return 'logs';
            default: return 'anime';
        }
    };

    const [activeTab, setActiveTab] = useState(getTabFromQuery());
    const [notification, setNotification] = useState<React.ReactNode>(null);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const getCookieToken = (): string | null => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : null;
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
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    router.push('/');
                    return;
                }

                const data = await res.json();
                const userRoles = data.roles ?? [];
                const allowedRoles = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];

                if (userRoles.some((role: string) => allowedRoles.includes(role))) {
                    setIsAuthorized(true);
                    setRoles(userRoles);
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

    const changeTab = (tab: typeof activeTab) => {
        setActiveTab(tab);
        const param = {
            users: 'edit-users',
            anime: 'edit-anime',
            categories: 'edit-categories',
            testing: 'edit-testing',
            logs: 'edit-logs',
        }[tab];
        router.push(`?admin_panel=${param}`);
    };

    if (isAuthorized === null) {
        return <div className="admin-loading">Проверка доступа...</div>;
    }

    return (
        <div className="admin-panel">
            {/* Десктопная версия */}
            <div className="desktop-only-admin">
                <aside className={`admin-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title={sidebarOpen ? 'Свернуть' : 'Развернуть'}
                    >
                        {sidebarOpen ? <ChevronLeft size={20}/> : <ChevronRight size={20}/>}
                    </button>

                    {sidebarOpen && <h1 className="admin-sidebar-title">Админ Панель</h1>}
                    <nav className="admin-sidebar-nav">
                        <button className={`admin-nav-button ${activeTab === 'anime' ? 'active' : ''}`}
                                onClick={() => changeTab('anime')} title="Аниме">
                            <Film size={18}/>
                            {sidebarOpen && <span>&nbsp;|&nbsp;Аниме</span>}
                        </button>

                        {roles.includes('ADMIN') && (
                            <button className={`admin-nav-button ${activeTab === 'users' ? 'active' : ''}`}
                                    onClick={() => changeTab('users')} title="Пользователи">
                                <Users size={18}/>
                                {sidebarOpen && <span>&nbsp;|&nbsp;Пользователи</span>}
                            </button>
                        )}

                        {roles.includes('ADMIN') && (
                            <button className={`admin-nav-button ${activeTab === 'categories' ? 'active' : ''}`}
                                    onClick={() => changeTab('categories')} title="Категории">
                                <FolderKanban size={18}/>
                                {sidebarOpen && <span>&nbsp;|&nbsp;Категории</span>}
                            </button>
                        )}

                        <button className={`admin-nav-button ${activeTab === 'testing' ? 'active' : ''}`}
                                onClick={() => changeTab('testing')} title="Тестирование">
                            <FlaskConical size={18}/>
                            {sidebarOpen && <span>&nbsp;|&nbsp;Тестирование</span>}
                        </button>

                        {roles.includes('ADMIN') && (
                            <button className={`admin-nav-button ${activeTab === 'logs' ? 'active' : ''}`}
                                    onClick={() => changeTab('logs')} title="Логи сайта">
                                <FileText size={18}/>
                                {sidebarOpen && <span>&nbsp;|&nbsp;Логи сайта</span>}
                            </button>
                        )}

                        <Link href="/" className="admin-nav-button" title="На главную">
                            <Home size={18}/>
                            {sidebarOpen && <span>&nbsp;|&nbsp;На главную</span>}
                        </Link>
                    </nav>
                </aside>
            </div>

            {/* Контент (общий для обеих версий) */}
            <main className={`admin-content ${!sidebarOpen ? 'expanded' : ''}`}>
                {notification && <div className="notification">{notification}</div>}
                {activeTab === 'anime' && <AdminAnime setNotification={setNotification}/>}
                {activeTab === 'categories' && roles.includes('ADMIN') && <AdminCategory/>}
                {activeTab === 'testing' && <AdminTesting/>}
                {activeTab === 'users' && roles.includes('ADMIN') && <AdminUsers/>}
                {activeTab === 'logs' && <AdminLogs/>}
            </main>

            {/* Мобильная версия */}
            <div className="mobile-only-admin">
                <AdminMobileNavbar
                    activeTab={activeTab}
                    changeTab={changeTab}
                    roles={roles}
                />
            </div>
        </div>
    );

};

export default AdminPanelPage;
