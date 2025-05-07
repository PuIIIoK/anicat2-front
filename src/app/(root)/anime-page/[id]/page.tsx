'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_SERVER } from '../../../../tools/constants'; // поправьте путь, если другой
import AnimePage from '../../../component/anime-page-old/anime-page-provider';
import AnimePageTest from '../../../component/anime-page-new/anime-page-provider-new'; // новый компонент

const AnimePageWrapper: React.FC = () => {
    const params = useParams();
    const animeId = params?.id;
    const [checked, setChecked] = useState(false);
    const [useBetaPage, setUseBetaPage] = useState(false);

    const getToken = () => document.cookie.match(/token=([^;]+)/)?.[1] || '';

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = getToken();
                if (!token) {
                    setChecked(true);
                    return;
                }

                const res = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    console.error('Ошибка загрузки профиля');
                    setChecked(true);
                    return;
                }

                const data = await res.json();

                if (data.animePageBeta) {
                    setUseBetaPage(true);
                }

                setChecked(true);
            } catch (error) {
                console.error('Ошибка при проверке профиля:', error);
                setChecked(true);
            }
        };

        fetchProfile();
    }, []);

    if (!checked || !animeId) {
        return <div>Загрузка страницы...</div>;
    }

    return useBetaPage ? <AnimePageTest /> : <AnimePage />;
};

export default AnimePageWrapper;
