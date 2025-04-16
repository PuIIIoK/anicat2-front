'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PulseLoader } from 'react-spinners';

const LoadingPage: React.FC = () => {
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(false);
    const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsLoading(true);

        // Минимальное время показа (например, 600мс)
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 600);

        setTimerId(timeout);

        return () => {
            if (timerId) clearTimeout(timerId); // Очищаем прошлый таймер
        };
    }, [pathname]);

    if (!isLoading) return null;

    return (
        <div className="loading-overlay">
            <div className="loading-box">
                <PulseLoader color="#36d7b7" size={12} />
                <p>Загрузка...</p>
            </div>
        </div>
    );
};

export default LoadingPage;
