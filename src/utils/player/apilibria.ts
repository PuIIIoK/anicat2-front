import {API_SERVER} from '@/hosts/constants';


export async function fetchLibriaEpisodes(animeId: string): Promise<LibriaEpisode[]> {
    const response = await fetch(`${API_SERVER}/api/libria/episodes/${animeId}`);
    if (!response.ok) {
        throw new Error("Ошибка загрузки эпизодов");
    }
    return response.json();
}

export interface LibriaEpisode {
    id: string;
    name: string | null;
    ordinal: number;
    duration: number;
    opening?: {
        start: number | null;
        stop: number | null;
    };
    ending?: {
        start: number | null;
        stop: number | null;
    };
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
