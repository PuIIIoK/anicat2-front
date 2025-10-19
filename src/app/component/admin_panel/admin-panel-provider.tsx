'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_SERVER } from '../../../tools/constants';
import AdminUsers from '@/component/admin_panel/admin-users';
import AdminCategory from '@/component/admin_panel/admin-category';
import AdminTesting from '@/component/admin_panel/admin-testing';
import AdminLogs from '@/component/admin_panel/admin-logs';
import AdminAnime from '@/component/admin_panel/admin-anime';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Home,
    Users,
    Film,
    FolderKanban,
    FlaskConical,
    FileText, 
    Smartphone, Monitor,
    Bell } from 'lucide-react';
import AdminNotification from './AdminNotification';
import AdminMobileNavbar from "@/component/admin_panel/AdminMobileNavbar";
import DiscordStatusTracker from "../DiscordStatusTracker";
import AdminPlatforms from '@/component/admin_panel/admin-platforms';
import AdminPlatformsAdd from '@/component/admin_panel/admin-platforms-add';
import AdminSiteUpdates from '@/component/admin_panel/admin-site-updates';


const AdminPanelPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const getTabFromQuery = (): 'users' | 'anime' | 'categories' | 'testing' | 'logs' | 'apps' | 'site-updates' => {
        const tab = searchParams.get('admin_panel');
        switch (tab) {
            case 'edit-users': return 'users';
            case 'edit-categories': return 'categories';
            case 'edit-testing': return 'testing';
            case 'edit-logs': return 'logs';
            case 'edit-anime-updates': return 'anime'; // Перенаправляем на таб аниме
            case 'edit-site-updates': return 'site-updates';
            case 'edit-apps':
            case 'edit-apps-add':
                return 'apps';
            default: return 'anime';
        }
    };

    const [activeTab, setActiveTab] = useState(getTabFromQuery());
    const [notification, setNotification] = useState<{
        type: 'success' | 'error' | 'info' | 'warning' | 'anime-created' | 'anime-deleted';
        message: string;
    } | null>(null);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [appsOpen, setAppsOpen] = useState(true);

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
            apps: 'edit-apps',
            'site-updates': 'edit-site-updates',
        }[tab];
        router.push(`?admin_panel=${param}`);
    };

    if (isAuthorized === null) {
        return <div className="admin-loading">Проверка доступа...</div>;
    }
    const getTabStatus = (tab: typeof activeTab): string => {
        switch (tab) {
            case 'users': return 'Редактирует пользователей | AdminPanel';
            case 'categories': return 'Редактирует категории | AdminPanel';
            case 'logs': return 'Смотрит логи | AdminPanel';
            case 'testing': return 'Тестирует фичи | AdminPanel';
            case 'apps': return 'Управляет приложениями | AdminPanel';
            case 'site-updates': return 'Управляет обновлениями сайта | AdminPanel';
            case 'anime':
            default: return 'Редактирует аниме | AdminPanel';
        }
    };


    return (
        <>
        <DiscordStatusTracker status={getTabStatus(activeTab)} />
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
                            <>
                              <button className={`admin-nav-button ${activeTab === 'apps' ? 'active' : ''}`}
                                      onClick={() => { setAppsOpen(!appsOpen); changeTab('apps'); }} title="Приложения">
                                  <Smartphone size={18}/>
                                  {sidebarOpen && <span>&nbsp;|&nbsp;Приложения</span>}
                              </button>
                              {appsOpen && (
                                <div className="admin-panel-platforms-subnav">
                                  <button className="admin-panel-platforms-subbutton"
                                          onClick={() => router.push(`?admin_panel=edit-apps&platform=android`)}>
                                    <Smartphone size={16}/> {sidebarOpen && <span>&nbsp;Телефон</span>}
                                  </button>
                                  <button className="admin-panel-platforms-subbutton"
                                          onClick={() => router.push(`?admin_panel=edit-apps&platform=pc`)}>
                                    <Monitor size={16}/> {sidebarOpen && <span>&nbsp;ПК</span>}
                                  </button>
                                </div>
                              )}
                            </>
                        )}

                        {roles.includes('ADMIN') && (
                            <button className={`admin-nav-button ${activeTab === 'site-updates' ? 'active' : ''}`}
                                    onClick={() => changeTab('site-updates')} title="Обновления сайта">
                                <Bell size={18}/>
                                {sidebarOpen && <span>&nbsp;|&nbsp;Обновления сайта</span>}
                            </button>
                        )}

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
                {notification && (
                    <AdminNotification
                        type={notification.type}
                        message={notification.message}
                        onClose={() => setNotification(null)}
                        autoClose={true}
                        duration={5000}
                    />
                )}
                {activeTab === 'anime' && <AdminAnime setNotification={setNotification} userRoles={roles} />}
                {activeTab === 'categories' && roles.includes('ADMIN') && <AdminCategory/>}
                {activeTab === 'testing' && <AdminTesting/>}
                {activeTab === 'users' && roles.includes('ADMIN') && <AdminUsers/>}
                {activeTab === 'site-updates' && roles.includes('ADMIN') && <AdminSiteUpdates setNotification={setNotification} />}
                {activeTab === 'logs' && <AdminLogs/>}
                {activeTab === 'apps' && roles.includes('ADMIN') && (
                  searchParams.get('admin_panel') === 'edit-apps-add'
                    ? <AdminPlatformsAdd/>
                    : <AdminPlatforms/>
                )}
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
        </>
    );

};

export default AdminPanelPage;
