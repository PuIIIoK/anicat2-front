'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import PlayerMobile from '../../../test-new-player/PlayerMobile';
import PlayerPC from '../../../test-new-player/PlayerPC';
import type { AnimeMeta } from '../../../test-new-player/playerApi';

export default function WatchAnimePage() {
    const params = useParams();
    const searchParams = useSearchParams();

    const animeId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    // Параметры для внешних источников (Kodik)
    const passedKodik = searchParams.get('kodik') || undefined;
    const passedAlias = searchParams.get('alias') || undefined;
    const passedTitle = searchParams.get('title') || undefined;
    const passedCover = searchParams.get('cover') || undefined;

    // Параметры для источника Yumeko
    const passedSource = searchParams.get('source') as 'kodik' | 'yumeko' | undefined;
    const passedVoiceId = searchParams.get('voiceId') || undefined;
    const passedVoiceName = searchParams.get('voiceName') || undefined;
    const passedEpisodeId = searchParams.get('episodeId') || undefined;
    const passedEpisodeNumber = searchParams.get('episodeNumber') || undefined;

    const animeMeta = useMemo<AnimeMeta>(() => ({
        // Внешние источники
        kodik: passedKodik,
        alias: passedAlias,
        
        // Yumeko источник
        source: passedSource,
        voiceId: passedVoiceId ? parseInt(passedVoiceId) : undefined,
        voiceName: passedVoiceName,
        episodeId: passedEpisodeId ? parseInt(passedEpisodeId) : undefined,
        episodeNumber: passedEpisodeNumber ? parseInt(passedEpisodeNumber) : undefined,
        
        // Общие параметры
        title: passedTitle,
        coverUrl: passedCover
    }), [passedKodik, passedAlias, passedSource, passedVoiceId, passedVoiceName, 
         passedEpisodeId, passedEpisodeNumber, passedTitle, passedCover]);

    const [isMobile, setIsMobile] = useState<boolean>(true);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 900px), (pointer: coarse)');
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);

    return (
        <div style={{ width: '100%', height: '100dvh' }}>
            {isMobile ? (
                <PlayerMobile animeId={animeId} animeMeta={animeMeta as AnimeMeta} />
            ) : (
                <PlayerPC animeId={animeId} animeMeta={animeMeta as AnimeMeta} />
            )}
        </div>
    );
}
