'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import AnimePagePC from '../../../component/anime-page-new/AnimePagePC';
import AnimePageMobile from '../../../component/anime-page-new/AnimePageMobile';
import AnimePageSkeleton from '../../../component/anime-page-new/AnimePageSkeleton';

function useIsMobile(breakpoint = 900) {
    // Initialize with null to indicate "not yet determined"
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

    // Show skeleton while determining device type
    if (isMobile === null) {
        return <AnimePageSkeleton />;
    }

    return isMobile
        ? <AnimePageMobile animeId={animeId}/>
        : <AnimePagePC animeId={animeId}/>;
};

const AnimePageWrapper: React.FC = () => {
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

export default AnimePageWrapper;
