"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { AnimeMeta, fetchAnimeMetaWithStatus } from './playerApi';
import { useSearchParams } from 'next/navigation';
import PlayerMobile from './PlayerMobile';
import PlayerPC from './PlayerPC';

function useIsMobile(breakpoint: number = 768) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
        const handleChange = () => setIsMobile(mediaQuery.matches);

        handleChange();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, [breakpoint]);

    return isMobile;
}

function AnimePlayerInner() {
    // Читаем id аниме из параметров URL (например ?id=53). Если нет — используем запасной '53'
    const searchParams = useSearchParams();
    const paramId = searchParams?.get('id') ?? searchParams?.get('animeId') ?? '53';
    const currentAnimeId = paramId;
    const [animeMeta, setAnimeMeta] = useState<AnimeMeta | null>(null);
    const [initError, setInitError] = useState<{ code: number; message: string } | null>(null);

    useEffect(() => {
        let mounted = true;
        const loadMeta = async () => {
            if (!currentAnimeId) return;
            try {
                // use fetch with status so we can detect 403/404
                const res = await fetchAnimeMetaWithStatus(currentAnimeId);
                if (!mounted) return;
                if (res.status === 200) {
                    // Получаем параметры из URL и добавляем их к animeMeta
                    const urlParams: Partial<AnimeMeta> = {};
                    
                    // Читаем kodik из URL параметров
                    const kodikParam = searchParams?.get('kodik');
                    if (kodikParam) {
                        urlParams.kodik = decodeURIComponent(kodikParam);
                        console.log('[Page] Found kodik in URL:', urlParams.kodik);
                    }
                    
                    // Читаем другие параметры из URL
                    const aliasParam = searchParams?.get('alias');
                    if (aliasParam) {
                        urlParams.alias = decodeURIComponent(aliasParam);
                    }
                    
                    const titleParam = searchParams?.get('title');
                    if (titleParam) {
                        urlParams.title = decodeURIComponent(titleParam);
                    }
                    
                    // Объединяем данные из API с параметрами из URL
                    const mergedMeta = { ...res.data, ...urlParams };
                    console.log('[Page] Merged animeMeta:', mergedMeta);
                    
                    setAnimeMeta(mergedMeta);
                    setInitError(null);
                } else if (res.status === 403 || res.status === 404) {
                    setAnimeMeta(null);
                    // mark initialization error in state via special object
                    setInitError({ code: res.status, message: 'Ошибка инициализации плеера' });
                } else {
                    // still pending / other statuses: keep null and loading
                }
            } catch (err) {
                console.error('Error loading anime meta', err);
                setAnimeMeta(null);
                setInitError({ code: 0, message: 'Ошибка инициализации плеера' });
            }
        };
        loadMeta();
        return () => { mounted = false; };
    }, [currentAnimeId, searchParams]);
    const isMobile = useIsMobile();

    // Формируем title для плеера
    // Если в season уже есть слово "сезон", не дублируем его
    const seasonText = animeMeta?.season 
        ? (animeMeta.season.toLowerCase().includes('сезон') ? ` ${animeMeta.season}` : ` ${animeMeta.season}`)
        : '';
    const playerTitle = animeMeta 
        ? `Смотрит ${animeMeta.title}${seasonText} | Yumeko`
        : 'Плеер | Yumeko';

    // Устанавливаем title через useEffect
    useEffect(() => {
        document.title = playerTitle;
        
        if (animeMeta) {
            const description = `Смотреть ${animeMeta.title}${seasonText} онлайн на Yumeko`;
            
            // Meta description
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            metaDescription.setAttribute('content', description);
            
            // Open Graph
            const setMetaTag = (property: string, content: string) => {
                let meta = document.querySelector(`meta[property="${property}"]`);
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.setAttribute('property', property);
                    document.head.appendChild(meta);
                }
                meta.setAttribute('content', content);
            };
            
            setMetaTag('og:title', `${animeMeta.title}${seasonText}`);
            setMetaTag('og:description', description);
            setMetaTag('og:type', 'video.episode');
        }
    }, [playerTitle, animeMeta, seasonText]);

    return (
        <>
            <div className="app-container">
                {isMobile ? (
                    <PlayerMobile animeId={currentAnimeId} animeMeta={animeMeta} initError={initError} />
                ) : (
                    <PlayerPC animeId={currentAnimeId} animeMeta={animeMeta} initError={initError} />
                )}
            </div>
        </>
    );
}

export default function AnimePlayerPage() {
    return (
        <Suspense fallback={<div className="app-container" />}> 
            <AnimePlayerInner />
        </Suspense>
    );
}