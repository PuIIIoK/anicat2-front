'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface Props {
    status?: string; // если передали явно
}

export default function DiscordStatusTracker({ status }: Props) {
    const pathname = usePathname();

    useEffect(() => {
        const { ipcRenderer } = window.require?.('electron') ?? {};

        if (!ipcRenderer) return;

        const getStatusForPath = (path: string): string => {
            if (status) return status;

            if (path.startsWith('/profile')) return 'Смотрит профиль';
            if (path.startsWith('/anime-page/')) return 'На странице аниме';
            if (path.startsWith('/watch/')) return 'Смотрит аниме';
            if (path.startsWith('/admin_page')) return 'Работает в админке';
            if (path === '/') return 'Главная страница';
            return 'Сидит на сайте AniCat';
        };

        const s = getStatusForPath(pathname);
        ipcRenderer.send('update-discord-status', s);
    }, [pathname, status]);

    return null;
}
