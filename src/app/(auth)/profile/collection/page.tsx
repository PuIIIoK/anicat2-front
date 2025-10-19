'use client';

import React, { useEffect, useState } from 'react';
import CollectionsPc from '@/app/component/profile-collections/CollectionsPc';
import CollectionsMobile from '@/app/component/profile-collections/CollectionsMobile';
import { MiniCardProvider } from '@/app/component/anime-structure/mini-card-context';

const CollectionPage = () => {
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        const detect = () => {
            if (typeof window === 'undefined') return;
            setIsMobile(window.innerWidth <= 700 || /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent));
        };
        detect();
        window.addEventListener('resize', detect);
        return () => window.removeEventListener('resize', detect);
    }, []);

    return (
        <MiniCardProvider>
            {isMobile ? <CollectionsMobile /> : <CollectionsPc />}
        </MiniCardProvider>
    );
};

export default CollectionPage;
