import { API_SERVER } from '@/hosts/constants';


export async function fetchLibriaEpisodes(animeId: string): Promise<LibriaEpisode[]> {
    // Шаг 1: Получаем alias от бэкенда
    const backendResponse = await fetch(`${API_SERVER}/api/libria/episodes/${animeId}`);
    if (!backendResponse.ok) {
        throw new Error("Ошибка получения alias");
    }
    const { apiUrl } = await backendResponse.json();

    // Шаг 2: Используем apiUrl для прямого запроса к AniLibria
    const libraResponse = await fetch(apiUrl);
    if (!libraResponse.ok) {
        throw new Error("Ошибка загрузки эпизодов из AniLibria");
    }

    const data = await libraResponse.json();
    return data.episodes || [];
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
