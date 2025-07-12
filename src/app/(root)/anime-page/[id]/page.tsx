'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AnimePageTest from '../../../component/anime-page-new/anime-page-provider-new'; // новый компонент

const AnimePageWrapper: React.FC = () => {
    const params = useParams();
    const animeId = params?.id;

    if (!animeId) {
        return <div>Загрузка страницы...</div>;
    }

    return <AnimePageTest />;
};

export default AnimePageWrapper;
