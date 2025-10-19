import FingerprintJS from '@fingerprintjs/fingerprintjs';

type FingerprintAgent = Awaited<ReturnType<typeof FingerprintJS.load>>;
let fpPromise: Promise<FingerprintAgent> | null = null;

/**
 * Инициализирует и возвращает fingerprint браузера/устройства
 * Используется для антиспам-системы регистрации
 */
export const getDeviceFingerprint = async (): Promise<string> => {
    try {
        // Инициализируем только один раз
        if (!fpPromise) {
            fpPromise = FingerprintJS.load();
        }

        const fp = await fpPromise;
        const result = await fp.get();
        
        // Возвращаем уникальный идентификатор устройства
        return result.visitorId;
    } catch (error) {
        console.error('Error getting device fingerprint:', error);
        // В случае ошибки возвращаем случайный ID (лучше чем ничего)
        return `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
};

/**
 * Получает дополнительную информацию об устройстве для антиспам-проверки
 */
export const getDeviceInfo = () => {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString()
    };
};

