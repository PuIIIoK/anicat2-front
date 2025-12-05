'use client';

import React, { ReactNode, useEffect, useRef } from 'react';
import { getProfile } from '@/utils/profileCache';

type Props = {
    children: ReactNode;
};

export default function BanChecker({ children }: Props) {
    const checkedRef = useRef(false);

    useEffect(() => {
        // Проверяем только один раз при загрузке
        if (checkedRef.current) return;
        checkedRef.current = true;

        const checkBanStatus = async () => {
            try {
                const profile = await getProfile();
                if (profile) {
                    // Пользователь авторизован и не имеет перманентного бана
                    sessionStorage.removeItem('banInfo');
                }
            } catch (error) {
                console.error('Ошибка при проверке статуса бана:', error);
            }
        };

        checkBanStatus();
    }, []);

    return <>{children}</>;
}
