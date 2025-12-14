export const API_SERVER = 'https://server.yumeko.ru';
//export const API_SERVER = 'http://localhost:8080';
export const FRONTEND_URL = 'http://localhost:3000';
export const CDN_URL = 'https://storage.yandexcloud.net/anicat2';
export const S3_ENDPOINT = 'https://storage.yandexcloud.net/anicat2';
export const DEBUG = true;

// Видео серверы
// PROD:
export const SERVER_URL2 = 'https://server.yumeko.ru'; // Сервер для загрузки видео
export const SERVER_URL3 = 'https://server3.yumeko.ru'; // Сервер для зарубежных пользователей
// DEV:
//export const SERVER_URL2 = 'http://localhost:8080'; // Сервер для загрузки видео
//export const SERVER_URL3 = 'http://localhost:8080'; // Сервер для зарубежных пользователей

// Домен авторизации
//export const AUTH_SITE_URL = 'http://localhost:3000';
export const AUTH_SITE_URL = 'https://auth.yumeko.ru';

export const KODIK_API_TOKEN = 'e2013488792846196906e93e7e5eb623';
export const KODIK_API_BASE = 'https://kodikapi.com';

export const KINESCOPE_API_BASE = 'https://api.kinescope.io/v1';
export const KINESCOPE_API_TOKEN = 'e7223827-c69f-452e-a77d-273437cb708d';

export const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

export const REPOS = {
    front: {
        owner: 'PuIIIoK',
        name: 'anicat2-front',
    },
    frontDev: {
        owner: 'PuIIIoK',
        name: 'anicat2-front-dev',
    }
}
