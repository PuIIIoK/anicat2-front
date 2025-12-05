'use client';

import React, { ReactNode, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, hasAdminAccess } from '@/utils/profileCache';

type Props = {
    children: ReactNode;
};

export default function AdminRoleChecker({ children }: Props) {
    const router = useRouter();
    const checkedRef = useRef(false);

    useEffect(() => {
        // Проверяем только один раз при загрузке
        if (checkedRef.current) return;
        checkedRef.current = true;

        const checkAdminRole = async () => {
            try {
                const profile = await getProfile();
                
                if (!profile) {
                    router.replace('/login');
                    return;
                }

                const hasAccess = await hasAdminAccess();
                
                if (!hasAccess) {
                    sessionStorage.setItem('adminAccessDenied', JSON.stringify({
                        message: 'У вас нет прав доступа к админ панели',
                        timestamp: Date.now()
                    }));
                    router.replace('/');
                    return;
                }
                
                sessionStorage.removeItem('adminAccessDenied');
            } catch (error) {
                console.error('AdminRoleChecker: Error checking admin role:', error);
                router.replace('/login');
            }
        };

        checkAdminRole();
    }, [router]);

    return <>{children}</>;
}
