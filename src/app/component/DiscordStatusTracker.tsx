'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface Props {
    status?: string;
}

export default function DiscordStatusTracker({ status }: Props) {
    const pathname = usePathname();

    useEffect(() => {
        const { ipcRenderer } = window.require?.('electron') ?? {};
        if (!ipcRenderer) return;

        const getStatusForPath = (): string => {
            if (status) return status;

            if (pathname.startsWith('/admin_panel')) {
                return 'Работает в админке | AdminPanel';
            }

            if (pathname.startsWith('/profile')) return 'Смотрит профиль';
            if (pathname.startsWith('/anime-page/')) return 'На странице аниме';
            if (pathname.startsWith('/watch/')) return 'Смотрит аниме';
            if (pathname === '/') return 'Главная страница';

            return 'Сидит на сайте AniCat';
        };

        const s = getStatusForPath();
        console.log('[DiscordStatus] Отправка статуса:', s);
        ipcRenderer.send('update-discord-status', s);
    }, [pathname, status]);

    return null;
}
