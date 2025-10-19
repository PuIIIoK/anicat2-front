'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_SERVER } from '../../tools/constants';

type Props = {
    children: ReactNode;
};

export default function AdminRoleChecker({ children }: Props) {
    const router = useRouter();

    useEffect(() => {
        const checkAdminRole = async () => {
            try {
                const tokenMatch = document.cookie.match(/(^|;\s*)token=([^;]*)/);
                const token = tokenMatch?.[2];
                
                if (!token) {
                    console.log('AdminRoleChecker: No token found, redirecting to login');
                    router.replace('/login');
                    return;
                }

                const response = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const userData = await response.json();
                    
                    // Проверяем, есть ли роли ADMIN или MODERATOR
                    const userRoles = userData.roles || [];
                    const hasAdminAccess = userRoles.includes('ADMIN') || userRoles.includes('MODERATOR');
                    
                    if (!hasAdminAccess) {
                        console.log('AdminRoleChecker: User does not have admin/moderator role, redirecting');
                        
                        // Сохраняем информацию о недостатке прав
                        sessionStorage.setItem('adminAccessDenied', JSON.stringify({
                            message: 'У вас нет прав доступа к админ панели',
                            timestamp: Date.now()
                        }));
                        
                        // Перенаправляем на главную страницу
                        router.replace('/');
                        return;
                    }
                    
                    // Если роли есть, очищаем старую информацию о блокировке
                    sessionStorage.removeItem('adminAccessDenied');
                } else {
                    console.log('AdminRoleChecker: Failed to fetch user profile, redirecting to login');
                    router.replace('/login');
                }
            } catch (error) {
                console.error('AdminRoleChecker: Error checking admin role:', error);
                router.replace('/login');
            }
        };

        // Проверяем сразу при загрузке
        checkAdminRole();
        
        // Проверяем каждые 30 секунд (менее агрессивно)
        const interval = setInterval(checkAdminRole, 10000);
        
        return () => clearInterval(interval);
    }, [router]);

    return <>{children}</>;
}
