'use client';

import { API_SERVER, SERVER_URL3 } from '@/hosts/constants';

// Российские IP диапазоны (основные блоки)
const RUSSIAN_IP_RANGES = [
    // Основные российские блоки
    { start: '5.8.0.0', end: '5.15.255.255' },
    { start: '37.9.0.0', end: '37.9.255.255' },
    { start: '46.17.0.0', end: '46.47.255.255' },
    { start: '62.76.0.0', end: '62.76.255.255' },
    { start: '77.88.0.0', end: '77.88.255.255' }, // Yandex
    { start: '78.85.0.0', end: '78.85.255.255' },
    { start: '79.104.0.0', end: '79.107.255.255' },
    { start: '81.177.0.0', end: '81.177.255.255' },
    { start: '85.143.0.0', end: '85.143.255.255' },
    { start: '87.226.0.0', end: '87.255.255.255' },
    { start: '89.108.0.0', end: '89.111.255.255' },
    { start: '91.220.0.0', end: '91.227.255.255' },
    { start: '93.158.0.0', end: '93.191.255.255' },
    { start: '94.100.0.0', end: '94.103.255.255' },
    { start: '95.24.0.0', end: '95.31.255.255' },
    { start: '109.188.0.0', end: '109.191.255.255' },
    { start: '176.8.0.0', end: '176.15.255.255' },
    { start: '178.176.0.0', end: '178.207.255.255' },
    { start: '185.4.0.0', end: '185.7.255.255' },
    { start: '188.113.0.0', end: '188.127.255.255' },
    { start: '212.48.0.0', end: '212.63.255.255' },
    { start: '217.106.0.0', end: '217.107.255.255' }
];

// Конвертация IP в число для сравнения
function ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

// Проверка, является ли IP российским
function isRussianIP(ip: string): boolean {
    if (!ip || ip === '127.0.0.1' || ip === 'localhost') {
        return true; // localhost считаем русским
    }
    
    const ipNum = ipToNumber(ip);
    
    return RUSSIAN_IP_RANGES.some(range => {
        const startNum = ipToNumber(range.start);
        const endNum = ipToNumber(range.end);
        return ipNum >= startNum && ipNum <= endNum;
    });
}

// Кешированное определение региона
let cachedRegion: 'russia' | 'foreign' | null = null;
let regionPromise: Promise<'russia' | 'foreign'> | null = null;

/**
 * Определяет регион пользователя (Россия или зарубежье)
 * @returns Promise<'russia' | 'foreign'>
 */
export async function detectUserRegion(): Promise<'russia' | 'foreign'> {
    // Возвращаем кешированное значение если есть
    if (cachedRegion) {
        return cachedRegion;
    }
    
    // Если уже выполняется запрос, ждем его
    if (regionPromise) {
        return regionPromise;
    }
    
    regionPromise = (async (): Promise<'russia' | 'foreign'> => {
        try {
            // 1. Попробуем определить по языку браузера
            const browserLang = navigator.language.toLowerCase();
            if (browserLang.startsWith('ru') || browserLang === 'ru-ru' || browserLang === 'ru') {
                console.log('🌍 Регион определен по языку браузера: Россия');
                cachedRegion = 'russia';
                return 'russia';
            }
            
            // 2. Попробуем определить по часовому поясу
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (timezone.includes('Europe/Moscow') || timezone.includes('Asia/Yekaterinburg') || 
                timezone.includes('Asia/Novosibirsk') || timezone.includes('Asia/Vladivostok')) {
                console.log('🌍 Регион определен по часовому поясу: Россия');
                cachedRegion = 'russia';
                return 'russia';
            }
            
            // 3. Запросим публичный IP через API
            const response = await fetch('https://api.ipify.org?format=json', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                // Таймаут 3 секунды
                signal: AbortSignal.timeout(3000)
            });
            
            if (!response.ok) {
                throw new Error('Не удалось получить IP');
            }
            
            const data: { ip: string } = await response.json();
            const userIP = data.ip;
            
            console.log('🌍 Получен IP пользователя:', userIP);
            
            // 4. Проверим IP на принадлежность к России
            const isRussian = isRussianIP(userIP);
            
            if (isRussian) {
                console.log('🇷🇺 Регион определен как: Россия');
                cachedRegion = 'russia';
                return 'russia';
            } else {
                console.log('🌍 Регион определен как: Зарубежье');
                cachedRegion = 'foreign';
                return 'foreign';
            }
            
        } catch (error) {
            console.warn('⚠️ Ошибка определения региона, используем дефолт (Россия):', error);
            cachedRegion = 'russia';
            return 'russia';
        }
    })();
    
    return regionPromise;
}

/**
 * Получает правильный сервер URL в зависимости от региона пользователя
 * @returns Promise<string> - URL сервера для API запросов
 */
export async function getRegionalServerURL(): Promise<string> {
    const region = await detectUserRegion();
    
    if (region === 'russia') {
        console.log('🇷🇺 Используем российский сервер:', API_SERVER);
        return API_SERVER;
    } else {
        console.log('🌍 Используем зарубежный сервер:', SERVER_URL3);
        return SERVER_URL3;
    }
}

/**
 * Сбрасывает кеш региона (для тестирования или принудительной переопределения)
 */
export function resetRegionCache(): void {
    cachedRegion = null;
    regionPromise = null;
    console.log('🔄 Кеш региона сброшен');
}

/**
 * Получает кешированный регион без запроса к API
 * @returns 'russia' | 'foreign' | null
 */
export function getCachedRegion(): 'russia' | 'foreign' | null {
    return cachedRegion;
}
