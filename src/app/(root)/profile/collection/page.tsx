'use client';

import React, { useEffect, useState } from 'react';
import CollectionsPc from '@/app/component/profile-collections/CollectionsPc';
import CollectionsMobile from '@/app/component/profile-collections/CollectionsMobile';
import { MiniCardProvider } from '@/app/component/anime-structure/mini-card-context';

const CollectionPage = () => {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);

    useEffect(() => {
        const detect = () => {
            if (typeof window === 'undefined') return;
            setIsMobile(window.innerWidth <= 700 || /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent));
        };
        detect();
        window.addEventListener('resize', detect);
        return () => window.removeEventListener('resize', detect);
    }, []);

    // Показываем пустой экран пока определяем устройство
    if (isMobile === null) {
        return <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />;
    }

    return (
        <MiniCardProvider>
            {isMobile ? <CollectionsMobile /> : <CollectionsPc />}
        </MiniCardProvider>
    );
};

export default CollectionPage;
