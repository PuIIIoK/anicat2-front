'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import AnimePageCrunch from '../../../component/anime-page-crunch/AnimePageCrunch';
import AnimePageMobile from '../../../component/anime-page-new/AnimePageMobile';
import AnimePageSkeleton from '../../../component/anime-page-new/AnimePageSkeleton';

function useIsMobile(breakpoint = 900) {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth <= breakpoint);
        handler();
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [breakpoint]);

    return isMobile;
}

const AnimePageContent: React.FC<{ animeId: string }> = ({ animeId }) => {
    const isMobile = useIsMobile();

    // Сохраняем выбор нового вида при посещении этой страницы
    useEffect(() => {
        localStorage.setItem('animePageView', 'new');
    }, []);

    if (isMobile === null) {
        return <AnimePageSkeleton />;
    }

    // Мобильная версия одинаковая, PC версия - Crunch стиль
    return isMobile
        ? <AnimePageMobile animeId={animeId}/>
        : <AnimePageCrunch animeId={animeId}/>;
};

const AnimePageCrunchWrapper: React.FC = () => {
    const params = useParams();
    let animeId = params?.id;
    if (Array.isArray(animeId)) animeId = animeId[0];

    if (!animeId) {
        return <AnimePageSkeleton />;
    }

    return (
        <Suspense fallback={<AnimePageSkeleton />}>
            <AnimePageContent animeId={animeId} />
        </Suspense>
    );
};

export default AnimePageCrunchWrapper;
