'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_SERVER } from '../../tools/constants';

type Props = {
    children: ReactNode;
};

export default function BanChecker({ children }: Props) {
    const router = useRouter();

    useEffect(() => {
        const checkBanStatus = async () => {
            try {
                const tokenMatch = document.cookie.match(/(^|;\s*)token=([^;]*)/);
                const token = tokenMatch?.[2];
                
                if (!token) {
                    return; // Если нет токена, AuthGuard уже обработает это
                }

                const response = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    // Пользователь авторизован и не имеет перманентного бана
                    // (иначе бы он не смог войти в аккаунт на бэкенде)
                    sessionStorage.removeItem('banInfo');
                }
            } catch (error) {
                console.error('Ошибка при проверке статуса бана:', error);
            }
        };

        // Проверяем сразу при загрузке
        checkBanStatus();
        
        // Проверяем каждые 30 секунд
        const interval = setInterval(checkBanStatus, 5000);
        
        return () => clearInterval(interval);
    }, [router]);

    return <>{children}</>;
}
