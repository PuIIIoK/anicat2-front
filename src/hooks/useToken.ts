// hooks/useToken.ts
import { useEffect, useState } from 'react';

export function useToken(): string | null {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Приоритет localStorage над cookies для постоянного хранения
        const localToken = localStorage.getItem('token');
        if (localToken) {
            setToken(localToken);
        } else {
            // Fallback на cookies для совместимости
            const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
            if (match) {
                const cookieToken = decodeURIComponent(match[1]);
                setToken(cookieToken);
                // Сохраняем в localStorage для постоянного хранения
                localStorage.setItem('token', cookieToken);
            }
        }
    }, []);

    return token;
}
