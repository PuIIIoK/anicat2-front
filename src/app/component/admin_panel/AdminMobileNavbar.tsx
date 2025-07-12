'use client';

import React from 'react';
import {Film, Users, FolderKanban, FlaskConical, FileText, Home} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
    activeTab: string;
    changeTab: (tab: 'anime' | 'users' | 'categories' | 'testing' | 'logs') => void;
    roles: string[];
}

const AdminMobileNavbar: React.FC<Props> = ({ activeTab, changeTab, roles }) => {
    const router = useRouter();
    return (
        <div className="admin-mobile-navbar">
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

        </div>
    );
};

export default AdminMobileNavbar;
