// types.ts

export interface Episode {
    id: string;
    kodik: string;
    hls_480: string;
    hls_720: string;
    hls_1080: string;
    ordinal: string;
}

export interface AnimePlayerProps {
    animeId: string;
}

export interface LibriaEpisode {
    id: string;
    name: string | null;
    ordinal: number;
    duration: number;
    hls_480?: string;
    hls_720?: string;
    hls_1080?: string;
    preview: {
        src: string;
        thumbnail: string;
        optimized: {
            src: string;
            thumbnail: string;
        };
    };
}
