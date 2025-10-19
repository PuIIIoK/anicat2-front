import { removeAuthToken } from './auth';

/**
 * Проверяет нужно ли перенаправлять на страницу логина после выхода из аккаунта
 * @returns true если нужно перенаправлять на логин, false если можно остаться на текущей странице
 */
export const shouldRedirectToLogin = (): boolean => {
    if (typeof window === 'undefined') return true;
    
    const currentPath = window.location.pathname;
    
    // Страницы где НЕ нужно перенаправлять на логин после выхода
    const allowedPaths = [
        '/', // Главная страница с категориями
        '/anime-category', // Страницы категорий
        '/anime-page', // Страницы аниме
    ];
    
    // Проверяем точные совпадения и совпадения с началом пути
    const shouldStay = allowedPaths.some(path => {
        if (path === '/' && currentPath === '/') return true;
        if (path !== '/' && currentPath.startsWith(path)) return true;
        return false;
    });
    
    return !shouldStay;
};

/**
 * Универсальная функция выхода из аккаунта с учетом текущей страницы
 * @param setIsAuthenticated - функция для обновления состояния авторизации (опционально)
 * @param setUserAvatarUrl - функция для сброса аватара (опционально)
 * @param resetToDefaultTheme - функция для сброса темы (опционально)
 */
export const performLogout = (
    setIsAuthenticated?: (auth: boolean) => void, 
    setUserAvatarUrl?: (url: string) => void,
    resetToDefaultTheme?: () => void
): void => {
    // Очищаем данные пользователя
    localStorage.removeItem('currentUser');
    
    // Удаляем токен авторизации
    removeAuthToken();
    
    // Сбрасываем тему к дефолтной
    if (resetToDefaultTheme && typeof resetToDefaultTheme === 'function') {
        resetToDefaultTheme();
    }
    
    // Обновляем состояние если функции переданы
    if (setIsAuthenticated) {
        setIsAuthenticated(false);
    }
    if (setUserAvatarUrl) {
        setUserAvatarUrl('/profile.png');
    }
    
    // Проверяем нужно ли перенаправлять на логин
    if (shouldRedirectToLogin()) {
        window.location.href = '/login';
    } else {
        // Остаемся на текущей странице, но обновляем её для корректного отображения
        window.location.reload();
    }
};
