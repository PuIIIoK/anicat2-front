'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_SERVER } from '@/hosts/constants';
import YumekoProfileProvider from "../../../component/yumeko-anime-profile/yumeko-profile-provider";

export default function Page() {
    const router = useRouter();
    const { username } = useParams() as { username: string };

    const getToken = () => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : '';
    };

    useEffect(() => {
        const checkProfileBeta = async () => {
            if (!username) return;
            const token = getToken();
            if (!token) return;
            try {
                const res = await fetch(`${API_SERVER}/api/profiles/get-profile?username=${username}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data.profilePageBeta) {
                    router.replace(`/test-profile-page/${username}`);
                }
            } catch (error) {
                console.error('Ошибка проверки профиля:', error);
            }
        };
        checkProfileBeta();
    }, [username, router]);

    return <YumekoProfileProvider username={username} />;
}
