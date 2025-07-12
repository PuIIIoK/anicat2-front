'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_SERVER } from '../../../../tools/constants';

import NEWProfileMainInfoID from "../../../component/profile-page-old/new-id-profile-page-provider";
import NEWProfileMainInfoIDMobile from "../../../component/profile-page-old/new-id-profile-page-mobile-provider";

export default function Page() {
    const router = useRouter();
    const { username } = useParams() as { username: string };
    const [isMobile, setIsMobile] = useState<boolean>(false);

    const getToken = () => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : '';
    };

    useEffect(() => {
        // --- Определяем, мобилка или нет (ширина окна или юзер-агент) ---
        const checkMobile = () => {
            if (typeof window === 'undefined') return;
            // Можно кастомно подправить порог ширины
            setIsMobile(window.innerWidth <= 700 || /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent));
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    return (
        <div>
            {isMobile
                ? <NEWProfileMainInfoIDMobile username={username} />
                : <NEWProfileMainInfoID username={username} />
            }
        </div>
    );
}
