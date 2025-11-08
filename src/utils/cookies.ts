import Cookies from 'js-cookie';

const TOKEN_KEY = 'yumeko_auth_token';
const USER_KEY = 'yumeko_user';
const TOKEN_EXPIRES = 365; // Дней до истечения токена (1 год)

export const cookieStorage = {
  // Сохранение токена в cookies на 1 год
  setAuthToken: (token: string) => {
    Cookies.set(TOKEN_KEY, token, { 
      expires: TOKEN_EXPIRES,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  },

  // Получение токена из cookies
  getAuthToken: (): string | undefined => {
    return Cookies.get(TOKEN_KEY);
  },

  // Удаление токена
  removeAuthToken: () => {
    Cookies.remove(TOKEN_KEY, { path: '/' });
  },

  // Сохранение данных пользователя
  setUser: (user: object) => {
    Cookies.set(USER_KEY, JSON.stringify(user), {
      expires: TOKEN_EXPIRES,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  },

  // Получение данных пользователя
  getUser: (): any | null => {
    const user = Cookies.get(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Удаление данных пользователя
  removeUser: () => {
    Cookies.remove(USER_KEY, { path: '/' });
  },

  // Полная очистка авторизации
  clearAuth: () => {
    cookieStorage.removeAuthToken();
    cookieStorage.removeUser();
  },

  // Проверка наличия валидного токена
  isAuthenticated: (): boolean => {
    const token = cookieStorage.getAuthToken();
    return !!token;
  }
};

