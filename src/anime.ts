// src/types/anime.ts

export interface AudioEntry {
    id: number | null;
    name: string;
    file: File | null;
    progress?: number; // 👈 добавь это поле
}

export interface EpisodeEntry {
    id: number | null;
    title: string;
    audios: AudioEntry[];
    saved?: boolean;
}
