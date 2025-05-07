'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileMainInfo from '../../component/profile-page-old/profile-page-provider';
import { API_SERVER } from '../../../tools/constants';

export default function Page() {
    const router = useRouter();

    const getToken = () => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : '';
    };

    useEffect(() => {
        const checkProfileBeta = async () => {
            const token = getToken();
            if (!token) return;

            try {
                const res = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) return;

                const data = await res.json();

                // Теперь наоборот: если включено тестирование профиля, редиректим на новую страницу
                if (data.profilePageBeta) {
                    router.replace('/test-profile-page'); // перекидываем на новую страницу профиля
                }
                // иначе (если profilePageBeta false) — остаемся на текущей
            } catch (error) {
                console.error('Ошибка проверки профиля:', error);
            }
        };

        checkProfileBeta();
    }, [router]);

    return (
        <div>
            <ProfileMainInfo />
        </div>
    );
}
