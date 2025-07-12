'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_SERVER } from '../../../tools/constants';

export default function Page() {
    const router = useRouter();

    useEffect(() => {
        // Получаем токен из куки
        const token = document.cookie.match(/token=([^;]+)/)?.[1];
        if (!token) {
            router.replace('/login');
            return;
        }

        // Запрашиваем профиль
        fetch(`${API_SERVER}/api/auth/get-profile`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                // Если нет username — редирект на /auth
                if (!data?.username) {
                    router.replace('/login');
                    return;
                }
                // Если есть бета-страница профиля
                if (data.profilePageBeta) {
                    router.replace('/test-profile-page');
                    return;
                }
                // Редиректим на /profile/{username}
                router.replace(`/profile/${data.username}`);
            })
            .catch(() => {
                // Ошибка запроса — тоже на /auth
                router.replace('/login');
            });
    }, [router]);

    return <div>Загрузка...</div>;
}
