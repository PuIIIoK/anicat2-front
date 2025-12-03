'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_SERVER } from '@/hosts/constants';
import ProfileLoadingTransition from '../../component/profile-page-old/ProfileLoadingTransition';

export default function Page() {
    const router = useRouter();

    useEffect(() => {
        // Получаем токен из куки или localStorage
        const token = document.cookie.match(/token=([^;]+)/)?.[1] || localStorage.getItem('token');
        if (!token) {
            router.replace('/');
            return;
        }

        // Запрашиваем профиль
        fetch(`${API_SERVER}/api/auth/get-profile`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                // Если нет username — редирект на главную
                if (!data?.username) {
                    router.replace('/');
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
                // Ошибка запроса — на главную
                router.replace('/');
            });
    }, [router]);

    return <ProfileLoadingTransition />;
}
