'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AnimePagePC from '../../../component/anime-page-new/AnimePagePC'; // ПК-версия (новая структура)
import AnimePageMobile from '../../../component/anime-page-new/AnimePageMobile'; // Мобильная версия (новая структура)

function useIsMobile(breakpoint = 900) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth <= breakpoint);
        handler();
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [breakpoint]);

    return isMobile;
}

const AnimePageWrapper: React.FC = () => {
    const params = useParams();
    let animeId = params?.id;
    if (Array.isArray(animeId)) animeId = animeId[0];

    const isMobile = useIsMobile();

    if (!animeId) {
        return <div>Загрузка страницы...</div>;
    }

    return isMobile
        ? <AnimePageMobile animeId={animeId}/>
        : <AnimePagePC animeId={animeId}/>;
};

export default AnimePageWrapper;
