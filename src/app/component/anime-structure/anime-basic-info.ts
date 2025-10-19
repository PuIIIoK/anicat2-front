export interface AnimeBasicInfo {
    id: number;
    title: string;
    alttitle: string;
    status: string;
    type: string;
    episode_all: string;
    current_episode: string;
    rating: string;
    year: string;
    season: string;
    mouth_season: string;
    studio: string;
    genres: string;
    alias: string;
    realesed_for: string;
    opened: boolean;
    anons: string;
    
    // ID изображений для последующей загрузки
    coverId?: number | null;
    bannerId?: number | null;
    hasScreenshots: boolean;
    
    // Готовые URL для немедленного использования
    coverUrl: string; // URL обложки из S3/YD Cloud
}
