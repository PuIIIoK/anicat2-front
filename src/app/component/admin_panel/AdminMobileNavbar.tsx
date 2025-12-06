'use client';

import React, { useState } from 'react';
import {Film, Users, FolderKanban, FlaskConical, FileText, Home} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    activeTab: string;
    changeTab: (tab: 'anime' | 'users' | 'categories' | 'testing' | 'logs' | 'apps') => void;
    roles: string[];
}

const AdminMobileNavbar: React.FC<Props> = ({ activeTab, changeTab, roles }) => {
    const router = useRouter();
    const [showAppsModal, setShowAppsModal] = useState(false);

    const handleAppDownload = (platform: 'windows' | 'android' | 'ios') => {
        // Здесь будет логика скачивания приложений
        const downloadLinks = {
            windows: '#', // Здесь будет ссылка на Windows приложение
            android: '#', // Здесь будет ссылка на Android APK
            ios: '#'      // Здесь будет ссылка на App Store
        };
        
        // Открываем ссылку или показываем уведомление
        if (downloadLinks[platform] !== '#') {
            window.open(downloadLinks[platform], '_blank');
        } else {
            alert(`Приложение для ${platform} пока недоступно`);
        }
        
        setShowAppsModal(false);
    };

    return (
        <div className="yumeko-admin-mobile-navbar">
            <button
                onClick={() => router.push('/')}
                title="Главная"
            >
                <Home size={22}/>
            </button>
            <button
                className={activeTab === 'anime' ? 'active' : ''}
                onClick={() => changeTab('anime')}
                title="Аниме"
            >
                <Film size={22}/>
            </button>

            {roles.includes('ADMIN') && (
                <button
                    className={activeTab === 'users' ? 'active' : ''}
                    onClick={() => changeTab('users')}
                    title="Пользователи"
                >
                    <Users size={22}/>
                </button>
            )}

            {roles.includes('ADMIN') && (
                <button
                    className={activeTab === 'categories' ? 'active' : ''}
                    onClick={() => changeTab('categories')}
                    title="Категории"
                >
                    <FolderKanban size={22}/>
                </button>
            )}

            <button
                className={activeTab === 'testing' ? 'active' : ''}
                onClick={() => changeTab('testing')}
                title="Тест"
            >
                <FlaskConical size={22}/>
            </button>

            {roles.includes('ADMIN') && (
                <button
                    className={activeTab === 'logs' ? 'active' : ''}
                    onClick={() => changeTab('logs')}
                    title="Логи"
                >
                    <FileText size={22}/>
                </button>
            )}

            {showAppsModal && (
                <div className="admin-apps-modal-overlay" onClick={() => setShowAppsModal(false)}>
                    <div className="admin-apps-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="apps-modal-header">
                            <h3>Скачать приложения</h3>
                            <button 
                                className="apps-modal-close"
                                onClick={() => setShowAppsModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="apps-modal-content">
                            <button 
                                className="app-download-btn windows"
                                onClick={() => handleAppDownload('windows')}
                            >
                                🖥️ ПК (Windows)
                            </button>
                            <button 
                                className="app-download-btn android"
                                onClick={() => handleAppDownload('android')}
                            >
                                🤖 Андроид
                            </button>
                            <button 
                                className="app-download-btn ios"
                                onClick={() => handleAppDownload('ios')}
                            >
                                🍎 iPhone
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminMobileNavbar;
