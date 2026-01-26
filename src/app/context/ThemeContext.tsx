'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { getAuthToken } from '../utils/auth';

// Типы тем - только светлая и тёмная
export type Theme = 'dark' | 'light';

// Цветовые схемы
export type ColorScheme = 'orange' | 'purple' | 'red' | 'blue';

// Режим отображения контента
export type LayoutMode = 'centered' | 'fullscreen';

// Интерфейс контекста
interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  layoutMode: LayoutMode;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  loadUserThemeSettings: () => Promise<void>;
  resetToDefaultTheme: () => void;
}

// Создание контекста
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Провайдер темы
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Инициализируем тему из localStorage сразу при создании компонента (SSR safe)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('theme') as Theme;
    return saved && ['dark', 'light'].includes(saved) ? saved : 'dark';
  });

  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    if (typeof window === 'undefined') return 'orange';
    const saved = localStorage.getItem('colorScheme') as ColorScheme;
    return saved && ['orange', 'purple', 'red', 'blue'].includes(saved) ? saved : 'orange';
  });

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') return 'centered';
    const saved = localStorage.getItem('layoutMode') as LayoutMode;
    return saved && ['centered', 'fullscreen'].includes(saved) ? saved : 'centered';
  });

  // Функция для загрузки настроек темы пользователя с сервера
  const loadUserThemeSettings = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        // Если пользователь не авторизован, просто используем локальные настройки
        console.log('Пользователь не авторизован, используем локальные настройки');
        return;
      }

      const response = await fetch(`${API_SERVER}/api/profile/theme-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Загружены настройки темы с сервера:', data);

        if (data.theme) {
          setTheme(data.theme as Theme);
          localStorage.setItem('theme', data.theme);
        }
        if (data.colorScheme) {
          setColorScheme(data.colorScheme as ColorScheme);
          localStorage.setItem('colorScheme', data.colorScheme);
        }
      } else {
        console.warn('Не удалось загрузить настройки темы с сервера (статус ' + response.status + '), используем локальные');
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек темы:', error);
    }
  };

  // Функция для сброса к дефолтной теме
  const resetToDefaultTheme = () => {
    console.log('Сброс к дефолтной теме: темная + оранжевая');
    setTheme('dark');
    setColorScheme('orange');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('colorScheme', 'orange');
  };

  // Функция для загрузки настроек из localStorage
  const loadLocalThemeSettings = () => {
    if (typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedColorScheme = localStorage.getItem('colorScheme') as ColorScheme;

    if (savedTheme && ['dark', 'light'].includes(savedTheme)) {
      setTheme(savedTheme);
    } else {
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
    }

    if (savedColorScheme && ['orange', 'purple', 'red', 'blue'].includes(savedColorScheme)) {
      setColorScheme(savedColorScheme);
    } else {
      setColorScheme('orange');
      localStorage.setItem('colorScheme', 'orange');
    }
  };

  // Загрузка настроек при инициализации
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Сначала загружаем из localStorage для быстрого отображения
    loadLocalThemeSettings();

    // Затем пытаемся загрузить с сервера
    loadUserThemeSettings();
  }, []);

  // Программно убираем outline у табов
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const removeOutline = () => {
      try {
        const tabs = document.querySelectorAll('.test-tabs-modern, .anime-tabs');
        tabs.forEach(tab => {
          if (tab instanceof HTMLElement && tab.style) {
            tab.style.outline = 'none';
            tab.style.outlineWidth = '0';
            tab.style.outlineStyle = 'none';
            tab.style.outlineColor = 'transparent';
            tab.style.outlineOffset = '0';
          }
        });

        const buttons = document.querySelectorAll('.test-tabs-modern button, .anime-tabs button, .anime-tabs .anime-tab');
        buttons.forEach(btn => {
          if (btn instanceof HTMLElement && btn.style) {
            btn.style.outline = 'none';
            btn.style.outlineWidth = '0';
            btn.style.outlineStyle = 'none';
            btn.style.outlineColor = 'transparent';
            btn.style.outlineOffset = '0';
          }
        });
      } catch (error) {
        console.log('Error in removeOutline:', error);
      }
    };

    // Выполняем при загрузке и при любых изменениях DOM
    removeOutline();
    const observer = new MutationObserver(removeOutline);
    observer.observe(document.body, { childList: true, subtree: true });

    // Убираем outline при фокусе
    const handleFocus = (e: FocusEvent) => {
      try {
        const target = e.target as HTMLElement;
        if (target && target.classList && target.style && (
          target.classList.contains('test-tabs-modern') ||
          target.classList.contains('anime-tabs') ||
          target.closest?.('.test-tabs-modern') ||
          target.closest?.('.anime-tabs')
        )) {
          target.style.outline = 'none';
          target.style.outlineWidth = '0';
          target.style.outlineStyle = 'none';
          target.style.outlineColor = 'transparent';
          target.style.outlineOffset = '0';
        }
      } catch (error) {
        console.log('Error in handleFocus:', error);
      }
    };

    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('click', removeOutline, true);

    // Специальный обработчик для hover
    const handleMouseOver = (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement;
        if (target && target.classList && target.style && (
          target.classList.contains('test-tabs-modern') ||
          target.classList.contains('anime-tabs') ||
          target.closest?.('.test-tabs-modern') ||
          target.closest?.('.anime-tabs')
        )) {
          target.style.outline = 'none';
          target.style.outlineWidth = '0';
          target.style.outlineStyle = 'none';
          target.style.outlineColor = 'transparent';
          target.style.outlineOffset = '0';

          // Убираем outline у всех дочерних элементов
          if (target.querySelectorAll) {
            const children = target.querySelectorAll('*');
            children.forEach(child => {
              if (child instanceof HTMLElement && child.style) {
                child.style.outline = 'none';
                child.style.outlineWidth = '0';
                child.style.outlineStyle = 'none';
                child.style.outlineColor = 'transparent';
                child.style.outlineOffset = '0';
              }
            });
          }
        }
      } catch (error) {
        console.log('Error in handleMouseOver:', error);
      }
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseenter', handleMouseOver, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('click', removeOutline, true);
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseenter', handleMouseOver, true);
    };
  }, []);

  // Применяем тему сразу при монтировании (синхронно)
  if (typeof window !== 'undefined' && !document.body.classList.contains(`theme-${theme}`)) {
    document.body.classList.remove(
      'theme-dark', 'theme-light',
      'color-orange', 'color-purple', 'color-red', 'color-blue',
      'layout-centered', 'layout-fullscreen'
    );
    document.body.classList.add(`theme-${theme}`, `color-${colorScheme}`, `layout-${layoutMode}`);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color', colorScheme);
  }

  // Применение темы и цветовой схемы к документу при изменениях
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('Applying theme:', theme, 'and color scheme:', colorScheme);

    // Удаляем старые классы с body
    document.body.classList.remove(
      'theme-dark', 'theme-light',
      'color-orange', 'color-purple', 'color-red', 'color-blue'
    );

    // Добавляем новые классы к body
    document.body.classList.add(
      `theme-${theme}`,
      `color-${colorScheme}`
    );

    // Также добавляем атрибуты для дополнительной специфичности
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color', colorScheme);

    // Определяем цвета в зависимости от темы и схемы
    const isDark = theme === 'dark';
    let primaryColor = '';
    let primaryHover = '';
    let primaryDark = '';
    let primaryLight = '';
    let primaryBg = '';
    let primaryBgHover = '';

    // Переменные для фонов header и body
    let headerBg = '';
    let bodyBg = '';

    // Переменные для global-anime-card-info
    let cardInfoBg = '';
    let cardInfoBorder = '';
    let cardInfoHoverBg = '';

    // Переменные для search-bar-anime
    let searchBarBg = '';
    let searchBarHoverBg = '';
    let searchBarBorder = '';
    let searchBarHoverBorder = '';
    let searchBarShadow = '';

    // Переменные для profile
    let profileIconBorder = '';
    let profileIconHoverBorder = '';
    let profileIconShadow = '';
    let profileIconHoverShadow = '';
    let profileDropdownHoverBg = '';

    // Переменные для apps-dropdown
    let appsDropdownHoverBg = '';

    // Переменные для profile блоков
    let friendsBlockBg = '';
    let friendsBlockBorder = '';
    let friendsHoverBorder = '';
    let recentActivityBg = '';
    let recentActivityBorder = '';
    let activityIconColor = '';

    // Переменные для кнопок
    let toggleReviewsBtnBg = '';
    let toggleReviewsBtnBorder = '';
    let toggleReviewsBtnHoverBg = '';
    let toggleReviewsBtnText = '';
    let toggleReviewsBtnHoverText = '';

    // Переменные для anime-page
    let animeWatchButtonBg = '';
    let animeWatchButtonHoverBg = '';
    let animeFavoriteButtonHoverBg = '';
    let animeTabActiveBackground = '';
    let animeTabHoverBg = '';
    let animeGenreTagBg = '';
    let animeGenreTagHoverBg = '';
    let animeScreenshotHoverShadow = '';

    // Переменные для collection-status
    let collectionStatusActiveBg = '';
    let collectionStatusActiveGradient = '';

    // Переменные для test-comments-button
    let commentsButtonBg = '';
    let commentsButtonHoverBg = '';
    let commentsButtonBorder = '';
    let commentsButtonHoverBorder = '';

    // Переменные для collection-status-button
    let collectionStatusButtonBg = '';
    let collectionStatusButtonHoverBg = '';
    let collectionStatusButtonBorder = '';
    let collectionStatusButtonHoverBorder = '';

    // Переменные для активного состояния favorite-button
    let favoriteButtonActiveBg = '';
    let favoriteButtonActiveColor = '';
    let favoriteButtonActiveBorder = '';
    let favoriteButtonActiveShadow = '';

    // Переменные для test-top-section-modern
    let topSectionModernBg = '';

    // Переменные для test-extra-info-modern
    let extraInfoModernBg = '';

    // Переменные для anime-description-section-modern
    let descriptionSectionModernBg = '';

    // Переменная для reviews-section-standalone фон
    let reviewsSectionClassicBg = '';

    // Переменная для user-rating-input фон
    let userRatingInputClassicBg = '';

    // Переменная для comment-item фон
    let commentItemClassicBg = '';

    // Переменные для show-all-btn
    let showAllBtnBg = '';
    let showAllBtnHoverBg = '';
    let showAllBtnBorder = '';
    let showAllBtnHoverBorder = '';
    let showAllBtnShadow = '';

    switch (colorScheme) {
      case 'orange':
        if (isDark) {
          primaryColor = '#ff9500';
          primaryHover = '#ffb143';
          primaryDark = '#e68600';
          primaryLight = '#ffc166';
          primaryBg = 'rgba(255, 149, 0, 0.1)';
          primaryBgHover = 'rgba(255, 149, 0, 0.15)';

          // Фоны для темной оранжевой темы
          headerBg = 'rgba(31, 26, 20, 0.65)'; // Header полупрозрачный с оранжевым оттенком
          bodyBg = '#130e06';   // Body с более насыщенным оранжевым оттенком

          // Цвета для global-anime-card-info
          cardInfoBg = 'rgba(255, 149, 0, 0.05)';
          cardInfoBorder = 'rgba(255, 149, 0, 0.2)';
          cardInfoHoverBg = 'rgba(255, 149, 0, 0.12)';

          // Цвета для search-bar-anime
          searchBarBg = 'rgba(20, 20, 20, 0.85)';
          searchBarHoverBg = 'rgba(25, 25, 25, 0.9)';
          searchBarBorder = 'rgba(255, 255, 255, 0.08)';
          searchBarHoverBorder = 'rgba(255, 149, 0, 0.4)';
          searchBarShadow = 'rgba(255, 149, 0, 0.12)';

          // Цвета для profile
          profileIconBorder = 'rgba(255, 255, 255, 0.1)';
          profileIconHoverBorder = 'rgba(255, 149, 0, 0.5)';
          profileIconShadow = 'rgba(0, 0, 0, 0.2)';
          profileIconHoverShadow = 'rgba(255, 149, 0, 0.15)';
          profileDropdownHoverBg = 'rgba(255, 149, 0, 0.1)';

          // Цвета для apps-dropdown
          appsDropdownHoverBg = 'radial-gradient(circle at center, rgba(255, 149, 0, 0.12), transparent 80%)';

          // Цвета для profile блоков
          friendsBlockBg = '#1f1a17';
          friendsBlockBorder = '#3a2f29';
          friendsHoverBorder = '#ff7a3d';
          recentActivityBg = '#1a1713';
          recentActivityBorder = '#2f2620';
          activityIconColor = '#ff7a3d';

          // Цвета для кнопок - темная оранжевая тема
          toggleReviewsBtnBg = 'transparent';
          toggleReviewsBtnBorder = '#ff7a3d';
          toggleReviewsBtnHoverBg = '#ff7a3d';
          toggleReviewsBtnText = '#ff7a3d';
          toggleReviewsBtnHoverText = '#ffffff';

          // Цвета для anime-page
          animeWatchButtonBg = 'linear-gradient(135deg, rgba(255, 149, 0, 0.9) 0%, rgba(255, 165, 0, 0.8) 100%)';
          animeWatchButtonHoverBg = 'linear-gradient(135deg, rgba(255, 149, 0, 1) 0%, rgba(255, 165, 0, 0.95) 100%)';
          animeFavoriteButtonHoverBg = 'rgba(255, 149, 0, 0.1)';
          animeTabActiveBackground = 'linear-gradient(135deg, rgba(255, 149, 0, 0.15) 0%, rgba(255, 149, 0, 0.1) 100%)';
          animeTabHoverBg = 'rgba(255, 149, 0, 0.05)';
          animeGenreTagBg = 'rgba(255, 149, 0, 0.08)';
          animeGenreTagHoverBg = 'rgba(255, 149, 0, 0.15)';
          animeScreenshotHoverShadow = 'rgba(255, 149, 0, 0.3)';

          // Цвета для collection-status
          collectionStatusActiveBg = 'rgba(255, 149, 0, 0.15)';
          collectionStatusActiveGradient = 'linear-gradient(135deg, rgba(255, 149, 0, 0.2) 0%, rgba(255, 149, 0, 0.1) 100%)';

          // Цвета для comments-button
          commentsButtonBg = 'linear-gradient(135deg, rgba(255, 149, 0, 0.1) 0%, rgba(255, 149, 0, 0.05) 100%)';
          commentsButtonHoverBg = 'linear-gradient(135deg, rgba(255, 149, 0, 0.2) 0%, rgba(255, 149, 0, 0.1) 100%)';
          commentsButtonBorder = 'rgba(255, 149, 0, 0.3)';
          commentsButtonHoverBorder = 'rgba(255, 149, 0, 0.5)';

          // Цвета для collection-status-button
          collectionStatusButtonBg = 'linear-gradient(135deg, rgba(255, 149, 0, 0.08) 0%, rgba(255, 149, 0, 0.03) 100%)';
          collectionStatusButtonHoverBg = 'linear-gradient(135deg, rgba(255, 149, 0, 0.15) 0%, rgba(255, 149, 0, 0.08) 100%)';
          collectionStatusButtonBorder = 'rgba(255, 149, 0, 0.2)';
          collectionStatusButtonHoverBorder = 'rgba(255, 149, 0, 0.4)';

          // Активное состояние favorite-button
          favoriteButtonActiveBg = 'linear-gradient(135deg, rgba(255, 149, 0, 0.2) 0%, rgba(255, 149, 0, 0.1) 100%)';
          favoriteButtonActiveColor = '#ff9500';
          favoriteButtonActiveBorder = '#ff9500';
          favoriteButtonActiveShadow = '0 4px 16px rgba(255, 149, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';

          // Цвета для test-top-section-modern
          topSectionModernBg = 'linear-gradient(145deg, rgba(255, 149, 0, 0.08) 0%, rgba(255, 149, 0, 0.03) 20%, var(--bg-primary) 100%)';

          // Цвета для test-extra-info-modern
          extraInfoModernBg = 'linear-gradient(135deg, rgba(255, 149, 0, 0.05) 0%, rgba(255, 149, 0, 0.02) 100%)';

          // Цвета для anime-description-section-modern
          descriptionSectionModernBg = 'linear-gradient(145deg, rgba(255, 149, 0, 0.04) 0%, rgba(255, 149, 0, 0.01) 50%, var(--bg-primary) 100%)';

          // Цвет фона для reviews-section-standalone (практически незаметный)
          reviewsSectionClassicBg = 'rgba(255, 149, 0, 0.025)';

          // Цвет фона для user-rating-input (практически незаметный)
          userRatingInputClassicBg = 'rgba(255, 149, 0, 0.02)';

          // Цвет фона для comment-item (практически незаметный)
          commentItemClassicBg = 'rgba(255, 149, 0, 0.018)';

          // Цвета для show-all-btn (современный красивый, классический простой)
          showAllBtnBg = 'linear-gradient(135deg, #ff9500 0%, #ffb143 100%)';
          showAllBtnHoverBg = 'linear-gradient(135deg, #ffb143 0%, #ff9500 100%)';
          showAllBtnBorder = '1px solid rgba(255, 149, 0, 0.3)';
          showAllBtnHoverBorder = '1px solid rgba(255, 149, 0, 0.5)';
          showAllBtnShadow = '0 2px 8px rgba(255, 149, 0, 0.25)';

        } else {
          primaryColor = '#e67700';
          primaryHover = '#ff8800';
          primaryDark = '#cc6600';
          primaryLight = '#ff9933';
          primaryBg = 'rgba(230, 119, 0, 0.04)';
          primaryBgHover = 'rgba(230, 119, 0, 0.08)';

          // Фоны для светлой оранжевой темы - более цветные
          headerBg = '#fef7f2'; // Header с легким оранжевым оттенком
          bodyBg = '#fdf3eb';   // Body с заметным оранжевым оттенком

          // Цвета для global-anime-card-info - более заметные в светлой теме
          cardInfoBg = 'rgba(230, 119, 0, 0.08)';
          cardInfoBorder = 'rgba(230, 119, 0, 0.15)';
          cardInfoHoverBg = 'rgba(230, 119, 0, 0.12)';

          // Цвета для search-bar-anime - убираем резкие тени
          searchBarBg = 'rgba(255, 255, 255, 0.95)';
          searchBarHoverBg = 'rgba(255, 255, 255, 1)';
          searchBarBorder = 'rgba(0, 0, 0, 0.06)';
          searchBarHoverBorder = 'rgba(230, 119, 0, 0.2)';
          searchBarShadow = 'rgba(230, 119, 0, 0.05)';

          // Цвета для profile - мягче
          profileIconBorder = 'rgba(0, 0, 0, 0.08)';
          profileIconHoverBorder = 'rgba(230, 119, 0, 0.3)';
          profileIconShadow = 'rgba(0, 0, 0, 0.05)';
          profileIconHoverShadow = 'rgba(230, 119, 0, 0.08)';
          profileDropdownHoverBg = 'rgba(230, 119, 0, 0.05)';

          // Цвета для apps-dropdown
          appsDropdownHoverBg = 'radial-gradient(circle at center, rgba(255, 119, 0, 0.1), transparent 80%)';

          // Цвета для profile блоков - светлая оранжевая тема
          friendsBlockBg = '#fefbf8';
          friendsBlockBorder = '#f0e6d6';
          friendsHoverBorder = '#ff7a3d';
          recentActivityBg = '#fff9f5';
          recentActivityBorder = '#f0e0d0';
          activityIconColor = '#ff7a3d';

          // Цвета для кнопок - светлая оранжевая тема
          toggleReviewsBtnBg = 'transparent';
          toggleReviewsBtnBorder = '#ff7a3d';
          toggleReviewsBtnHoverBg = '#ff7a3d';
          toggleReviewsBtnText = '#ff7a3d';
          toggleReviewsBtnHoverText = '#ffffff';

          // Цвета для anime-page
          animeWatchButtonBg = 'linear-gradient(135deg, rgba(255, 119, 0, 0.85) 0%, rgba(255, 140, 0, 0.75) 100%)';
          animeWatchButtonHoverBg = 'linear-gradient(135deg, rgba(255, 119, 0, 0.95) 0%, rgba(255, 140, 0, 0.85) 100%)';
          animeFavoriteButtonHoverBg = 'rgba(255, 119, 0, 0.08)';
          animeTabActiveBackground = 'linear-gradient(135deg, rgba(255, 119, 0, 0.12) 0%, rgba(255, 119, 0, 0.08) 100%)';
          animeTabHoverBg = 'rgba(255, 119, 0, 0.04)';
          animeGenreTagBg = 'rgba(255, 119, 0, 0.06)';
          animeGenreTagHoverBg = 'rgba(255, 119, 0, 0.12)';
          animeScreenshotHoverShadow = 'rgba(255, 119, 0, 0.25)';

          // Цвета для collection-status
          collectionStatusActiveBg = 'rgba(255, 119, 0, 0.12)';
          collectionStatusActiveGradient = 'linear-gradient(135deg, rgba(255, 119, 0, 0.15) 0%, rgba(255, 119, 0, 0.08) 100%)';

          // Цвета для comments-button
          commentsButtonBg = 'linear-gradient(135deg, rgba(255, 119, 0, 0.08) 0%, rgba(255, 119, 0, 0.04) 100%)';
          commentsButtonHoverBg = 'linear-gradient(135deg, rgba(255, 119, 0, 0.15) 0%, rgba(255, 119, 0, 0.08) 100%)';
          commentsButtonBorder = 'rgba(255, 119, 0, 0.25)';
          commentsButtonHoverBorder = 'rgba(255, 119, 0, 0.4)';

          // Цвета для collection-status-button
          collectionStatusButtonBg = 'linear-gradient(135deg, rgba(255, 119, 0, 0.06) 0%, rgba(255, 119, 0, 0.02) 100%)';
          collectionStatusButtonHoverBg = 'linear-gradient(135deg, rgba(255, 119, 0, 0.12) 0%, rgba(255, 119, 0, 0.06) 100%)';
          collectionStatusButtonBorder = 'rgba(255, 119, 0, 0.18)';
          collectionStatusButtonHoverBorder = 'rgba(255, 119, 0, 0.35)';

          // Активное состояние favorite-button
          favoriteButtonActiveBg = 'linear-gradient(135deg, rgba(255, 119, 0, 0.18) 0%, rgba(255, 119, 0, 0.08) 100%)';
          favoriteButtonActiveColor = '#ff7700';
          favoriteButtonActiveBorder = '#ff7700';
          favoriteButtonActiveShadow = '0 4px 16px rgba(255, 119, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)';

          // Цвета для test-top-section-modern
          topSectionModernBg = 'linear-gradient(145deg, rgba(255, 119, 0, 0.06) 0%, rgba(255, 119, 0, 0.02) 20%, var(--bg-primary) 100%)';

          // Цвета для test-extra-info-modern
          extraInfoModernBg = 'linear-gradient(135deg, rgba(255, 119, 0, 0.04) 0%, rgba(255, 119, 0, 0.015) 100%)';

          // Цвета для anime-description-section-modern
          descriptionSectionModernBg = 'linear-gradient(145deg, rgba(255, 119, 0, 0.03) 0%, rgba(255, 119, 0, 0.008) 50%, var(--bg-primary) 100%)';

          // Цвет фона для reviews-section-standalone (практически незаметный)
          reviewsSectionClassicBg = 'rgba(255, 119, 0, 0.02)';

          // Цвет фона для user-rating-input (практически незаметный)
          userRatingInputClassicBg = 'rgba(255, 119, 0, 0.015)';

          // Цвет фона для comment-item (практически незаметный)
          commentItemClassicBg = 'rgba(255, 119, 0, 0.012)';

          // Цвета для show-all-btn - мягче
          showAllBtnBg = 'linear-gradient(135deg, #e67700 0%, #ff8800 100%)';
          showAllBtnHoverBg = 'linear-gradient(135deg, #ff8800 0%, #e67700 100%)';
          showAllBtnBorder = '1px solid rgba(230, 119, 0, 0.2)';
          showAllBtnHoverBorder = '1px solid rgba(230, 119, 0, 0.3)';
          showAllBtnShadow = '0 2px 6px rgba(230, 119, 0, 0.12)';

        }
        break;

      case 'purple':
        if (isDark) {
          primaryColor = '#af52de';
          primaryHover = '#c77ff0';
          primaryDark = '#8b29b5';
          primaryLight = '#d4a4f0';
          primaryBg = 'rgba(175, 82, 222, 0.1)';
          primaryBgHover = 'rgba(175, 82, 222, 0.15)';

          // Фоны для темной фиолетовой темы
          headerBg = 'rgba(28, 26, 34, 0.65)'; // Header полупрозрачный с фиолетовым оттенком
          bodyBg = '#0d0b0f';   // Body с более заметным фиолетовым оттенком

          // Цвета для global-anime-card-info
          cardInfoBg = 'rgba(175, 82, 222, 0.05)';
          cardInfoBorder = 'rgba(175, 82, 222, 0.2)';
          cardInfoHoverBg = 'rgba(175, 82, 222, 0.12)';

          // Цвета для search-bar-anime
          searchBarBg = 'rgba(20, 20, 20, 0.85)';
          searchBarHoverBg = 'rgba(25, 25, 25, 0.9)';
          searchBarBorder = 'rgba(255, 255, 255, 0.08)';
          searchBarHoverBorder = 'rgba(175, 82, 222, 0.4)';
          searchBarShadow = 'rgba(175, 82, 222, 0.12)';

          // Цвета для profile
          profileIconBorder = 'rgba(255, 255, 255, 0.1)';
          profileIconHoverBorder = 'rgba(175, 82, 222, 0.5)';
          profileIconShadow = 'rgba(0, 0, 0, 0.2)';
          profileIconHoverShadow = 'rgba(175, 82, 222, 0.15)';
          profileDropdownHoverBg = 'rgba(175, 82, 222, 0.1)';

          // Цвета для apps-dropdown
          appsDropdownHoverBg = 'radial-gradient(circle at center, rgba(175, 82, 222, 0.12), transparent 80%)';

          // Цвета для profile блоков
          friendsBlockBg = '#1a1625';
          friendsBlockBorder = '#2e2439';
          friendsHoverBorder = '#9d4edd';
          recentActivityBg = '#181425';
          recentActivityBorder = '#2a1f35';
          activityIconColor = '#9d4edd';

          // Цвета для кнопок - темная фиолетовая тема
          toggleReviewsBtnBg = 'transparent';
          toggleReviewsBtnBorder = '#9d4edd';
          toggleReviewsBtnHoverBg = '#9d4edd';
          toggleReviewsBtnText = '#9d4edd';
          toggleReviewsBtnHoverText = '#ffffff';

          // Цвета для anime-page
          animeWatchButtonBg = 'linear-gradient(135deg, rgba(175, 82, 222, 0.9) 0%, rgba(190, 100, 240, 0.8) 100%)';
          animeWatchButtonHoverBg = 'linear-gradient(135deg, rgba(175, 82, 222, 1) 0%, rgba(190, 100, 240, 0.95) 100%)';
          animeFavoriteButtonHoverBg = 'rgba(175, 82, 222, 0.1)';
          animeTabActiveBackground = 'linear-gradient(135deg, rgba(175, 82, 222, 0.15) 0%, rgba(175, 82, 222, 0.1) 100%)';
          animeTabHoverBg = 'rgba(175, 82, 222, 0.05)';
          animeGenreTagBg = 'rgba(175, 82, 222, 0.08)';
          animeGenreTagHoverBg = 'rgba(175, 82, 222, 0.15)';
          animeScreenshotHoverShadow = 'rgba(175, 82, 222, 0.3)';

          // Цвета для collection-status
          collectionStatusActiveBg = 'rgba(175, 82, 222, 0.15)';
          collectionStatusActiveGradient = 'linear-gradient(135deg, rgba(175, 82, 222, 0.2) 0%, rgba(175, 82, 222, 0.1) 100%)';

          // Цвета для comments-button
          commentsButtonBg = 'linear-gradient(135deg, rgba(175, 82, 222, 0.1) 0%, rgba(175, 82, 222, 0.05) 100%)';
          commentsButtonHoverBg = 'linear-gradient(135deg, rgba(175, 82, 222, 0.2) 0%, rgba(175, 82, 222, 0.1) 100%)';
          commentsButtonBorder = 'rgba(175, 82, 222, 0.3)';
          commentsButtonHoverBorder = 'rgba(175, 82, 222, 0.5)';

          // Цвета для collection-status-button
          collectionStatusButtonBg = 'linear-gradient(135deg, rgba(175, 82, 222, 0.08) 0%, rgba(175, 82, 222, 0.03) 100%)';
          collectionStatusButtonHoverBg = 'linear-gradient(135deg, rgba(175, 82, 222, 0.15) 0%, rgba(175, 82, 222, 0.08) 100%)';
          collectionStatusButtonBorder = 'rgba(175, 82, 222, 0.2)';
          collectionStatusButtonHoverBorder = 'rgba(175, 82, 222, 0.4)';

          // Активное состояние favorite-button
          favoriteButtonActiveBg = 'linear-gradient(135deg, rgba(175, 82, 222, 0.2) 0%, rgba(175, 82, 222, 0.1) 100%)';
          favoriteButtonActiveColor = '#af52de';
          favoriteButtonActiveBorder = '#af52de';
          favoriteButtonActiveShadow = '0 4px 16px rgba(175, 82, 222, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';

          // Цвета для test-top-section-modern
          topSectionModernBg = 'linear-gradient(145deg, rgba(175, 82, 222, 0.08) 0%, rgba(175, 82, 222, 0.03) 20%, var(--bg-primary) 100%)';

          // Цвета для test-extra-info-modern
          extraInfoModernBg = 'linear-gradient(135deg, rgba(175, 82, 222, 0.05) 0%, rgba(175, 82, 222, 0.02) 100%)';

          // Цвета для anime-description-section-modern
          descriptionSectionModernBg = 'linear-gradient(145deg, rgba(175, 82, 222, 0.04) 0%, rgba(175, 82, 222, 0.01) 50%, var(--bg-primary) 100%)';

          // Цвет фона для reviews-section-standalone (практически незаметный)
          reviewsSectionClassicBg = 'rgba(175, 82, 222, 0.025)';

          // Цвет фона для user-rating-input (практически незаметный)
          userRatingInputClassicBg = 'rgba(175, 82, 222, 0.02)';

          // Цвет фона для comment-item (практически незаметный)
          commentItemClassicBg = 'rgba(175, 82, 222, 0.018)';

          // Цвета для show-all-btn (современный красивый, классический простой)
          showAllBtnBg = 'linear-gradient(135deg, #af52de 0%, #c084fc 100%)';
          showAllBtnHoverBg = 'linear-gradient(135deg, #c084fc 0%, #af52de 100%)';
          showAllBtnBorder = '1px solid rgba(175, 82, 222, 0.3)';
          showAllBtnHoverBorder = '1px solid rgba(175, 82, 222, 0.5)';
          showAllBtnShadow = '0 2px 8px rgba(175, 82, 222, 0.25)';

        } else {
          primaryColor = '#8030a0';
          primaryHover = '#9040b0';
          primaryDark = '#6020b0';
          primaryLight = '#a855d8';
          primaryBg = 'rgba(128, 48, 160, 0.04)';
          primaryBgHover = 'rgba(128, 48, 160, 0.08)';

          // Фоны для светлой фиолетовой темы - более цветные
          headerBg = '#f8f6fc'; // Header с легким фиолетовым оттенком
          bodyBg = '#f3f0f8';   // Body с заметным фиолетовым оттенком

          // Цвета для global-anime-card-info - более заметные в светлой теме
          cardInfoBg = 'rgba(128, 48, 160, 0.08)';
          cardInfoBorder = 'rgba(128, 48, 160, 0.15)';
          cardInfoHoverBg = 'rgba(128, 48, 160, 0.12)';

          // Цвета для search-bar-anime - убираем резкие тени
          searchBarBg = 'rgba(255, 255, 255, 0.95)';
          searchBarHoverBg = 'rgba(255, 255, 255, 1)';
          searchBarBorder = 'rgba(0, 0, 0, 0.06)';
          searchBarHoverBorder = 'rgba(128, 48, 160, 0.2)';
          searchBarShadow = 'rgba(128, 48, 160, 0.05)';

          // Цвета для profile - мягче
          profileIconBorder = 'rgba(0, 0, 0, 0.08)';
          profileIconHoverBorder = 'rgba(128, 48, 160, 0.3)';
          profileIconShadow = 'rgba(0, 0, 0, 0.05)';
          profileIconHoverShadow = 'rgba(128, 48, 160, 0.08)';
          profileDropdownHoverBg = 'rgba(128, 48, 160, 0.05)';

          // Цвета для apps-dropdown
          appsDropdownHoverBg = 'radial-gradient(circle at center, rgba(144, 48, 192, 0.1), transparent 80%)';

          // Цвета для profile блоков - светлая фиолетовая тема
          friendsBlockBg = '#fcfbff';
          friendsBlockBorder = '#e8e4f0';
          friendsHoverBorder = '#9d4edd';
          recentActivityBg = '#fdfbff';
          recentActivityBorder = '#e8e0f0';
          activityIconColor = '#9d4edd';

          // Цвета для кнопок - светлая фиолетовая тема
          toggleReviewsBtnBg = 'transparent';
          toggleReviewsBtnBorder = '#9d4edd';
          toggleReviewsBtnHoverBg = '#9d4edd';
          toggleReviewsBtnText = '#9d4edd';
          toggleReviewsBtnHoverText = '#ffffff';

          // Цвета для anime-page
          animeWatchButtonBg = 'linear-gradient(135deg, rgba(144, 48, 192, 0.85) 0%, rgba(160, 70, 210, 0.75) 100%)';
          animeWatchButtonHoverBg = 'linear-gradient(135deg, rgba(144, 48, 192, 0.95) 0%, rgba(160, 70, 210, 0.85) 100%)';
          animeFavoriteButtonHoverBg = 'rgba(144, 48, 192, 0.08)';
          animeTabActiveBackground = 'linear-gradient(135deg, rgba(144, 48, 192, 0.12) 0%, rgba(144, 48, 192, 0.08) 100%)';
          animeTabHoverBg = 'rgba(144, 48, 192, 0.04)';
          animeGenreTagBg = 'rgba(144, 48, 192, 0.06)';
          animeGenreTagHoverBg = 'rgba(144, 48, 192, 0.12)';
          animeScreenshotHoverShadow = 'rgba(144, 48, 192, 0.25)';

          // Цвета для collection-status
          collectionStatusActiveBg = 'rgba(144, 48, 192, 0.12)';
          collectionStatusActiveGradient = 'linear-gradient(135deg, rgba(144, 48, 192, 0.15) 0%, rgba(144, 48, 192, 0.08) 100%)';

          // Цвета для comments-button
          commentsButtonBg = 'linear-gradient(135deg, rgba(144, 48, 192, 0.08) 0%, rgba(144, 48, 192, 0.04) 100%)';
          commentsButtonHoverBg = 'linear-gradient(135deg, rgba(144, 48, 192, 0.15) 0%, rgba(144, 48, 192, 0.08) 100%)';
          commentsButtonBorder = 'rgba(144, 48, 192, 0.25)';
          commentsButtonHoverBorder = 'rgba(144, 48, 192, 0.4)';

          // Цвета для collection-status-button
          collectionStatusButtonBg = 'linear-gradient(135deg, rgba(144, 48, 192, 0.06) 0%, rgba(144, 48, 192, 0.02) 100%)';
          collectionStatusButtonHoverBg = 'linear-gradient(135deg, rgba(144, 48, 192, 0.12) 0%, rgba(144, 48, 192, 0.06) 100%)';
          collectionStatusButtonBorder = 'rgba(144, 48, 192, 0.18)';
          collectionStatusButtonHoverBorder = 'rgba(144, 48, 192, 0.35)';

          // Активное состояние favorite-button
          favoriteButtonActiveBg = 'linear-gradient(135deg, rgba(144, 48, 192, 0.18) 0%, rgba(144, 48, 192, 0.08) 100%)';
          favoriteButtonActiveColor = '#9030c0';
          favoriteButtonActiveBorder = '#9030c0';
          favoriteButtonActiveShadow = '0 4px 16px rgba(144, 48, 192, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)';

          // Цвета для test-top-section-modern
          topSectionModernBg = 'linear-gradient(145deg, rgba(144, 48, 192, 0.06) 0%, rgba(144, 48, 192, 0.02) 20%, var(--bg-primary) 100%)';

          // Цвета для test-extra-info-modern
          extraInfoModernBg = 'linear-gradient(135deg, rgba(144, 48, 192, 0.04) 0%, rgba(144, 48, 192, 0.015) 100%)';

          // Цвета для anime-description-section-modern
          descriptionSectionModernBg = 'linear-gradient(145deg, rgba(144, 48, 192, 0.03) 0%, rgba(144, 48, 192, 0.008) 50%, var(--bg-primary) 100%)';

          // Цвет фона для reviews-section-standalone (практически незаметный)
          reviewsSectionClassicBg = 'rgba(144, 48, 192, 0.02)';

          // Цвет фона для user-rating-input (практически незаметный)
          userRatingInputClassicBg = 'rgba(144, 48, 192, 0.015)';

          // Цвет фона для comment-item (практически незаметный)
          commentItemClassicBg = 'rgba(144, 48, 192, 0.012)';

          // Цвета для show-all-btn - мягче
          showAllBtnBg = 'linear-gradient(135deg, #8030a0 0%, #9040b0 100%)';
          showAllBtnHoverBg = 'linear-gradient(135deg, #9040b0 0%, #8030a0 100%)';
          showAllBtnBorder = '1px solid rgba(128, 48, 160, 0.2)';
          showAllBtnHoverBorder = '1px solid rgba(128, 48, 160, 0.3)';
          showAllBtnShadow = '0 2px 6px rgba(128, 48, 160, 0.12)';

        }
        break;

      case 'red':
        if (isDark) {
          primaryColor = '#ff3b30';
          primaryHover = '#ff6961';
          primaryDark = '#d70015';
          primaryLight = '#ff8a84';
          primaryBg = 'rgba(255, 59, 48, 0.1)';
          primaryBgHover = 'rgba(255, 59, 48, 0.15)';

          // Фоны для темной красной темы
          headerBg = 'rgba(34, 24, 24, 0.65)'; // Header полупрозрачный с красным оттенком
          bodyBg = '#140606';   // Body с более насыщенным красным оттенком

          // Цвета для global-anime-card-info
          cardInfoBg = 'rgba(255, 59, 48, 0.05)';
          cardInfoBorder = 'rgba(255, 59, 48, 0.2)';
          cardInfoHoverBg = 'rgba(255, 59, 48, 0.12)';

          // Цвета для search-bar-anime
          searchBarBg = 'rgba(20, 20, 20, 0.85)';
          searchBarHoverBg = 'rgba(25, 25, 25, 0.9)';
          searchBarBorder = 'rgba(255, 255, 255, 0.08)';
          searchBarHoverBorder = 'rgba(255, 59, 48, 0.4)';
          searchBarShadow = 'rgba(255, 59, 48, 0.12)';

          // Цвета для profile
          profileIconBorder = 'rgba(255, 255, 255, 0.1)';
          profileIconHoverBorder = 'rgba(255, 59, 48, 0.5)';
          profileIconShadow = 'rgba(0, 0, 0, 0.2)';
          profileIconHoverShadow = 'rgba(255, 59, 48, 0.15)';
          profileDropdownHoverBg = 'rgba(255, 59, 48, 0.1)';

          // Цвета для apps-dropdown
          appsDropdownHoverBg = 'radial-gradient(circle at center, rgba(255, 59, 48, 0.12), transparent 80%)';

          // Цвета для profile блоков
          friendsBlockBg = '#1f1515';
          friendsBlockBorder = '#3a2626';
          friendsHoverBorder = '#ff4c4c';
          recentActivityBg = '#1a1313';
          recentActivityBorder = '#2f2020';
          activityIconColor = '#ff5252';

          // Цвета для кнопок - темная красная тема
          toggleReviewsBtnBg = 'transparent';
          toggleReviewsBtnBorder = '#ff4c4c';
          toggleReviewsBtnHoverBg = '#ff4c4c';
          toggleReviewsBtnText = '#ff4c4c';
          toggleReviewsBtnHoverText = '#ffffff';

          // Цвета для anime-page
          animeWatchButtonBg = 'linear-gradient(135deg, rgba(255, 59, 48, 0.9) 0%, rgba(255, 75, 65, 0.8) 100%)';
          animeWatchButtonHoverBg = 'linear-gradient(135deg, rgba(255, 59, 48, 1) 0%, rgba(255, 75, 65, 0.95) 100%)';
          animeFavoriteButtonHoverBg = 'rgba(255, 59, 48, 0.1)';
          animeTabActiveBackground = 'linear-gradient(135deg, rgba(255, 59, 48, 0.15) 0%, rgba(255, 59, 48, 0.1) 100%)';
          animeTabHoverBg = 'rgba(255, 59, 48, 0.05)';
          animeGenreTagBg = 'rgba(255, 59, 48, 0.08)';
          animeGenreTagHoverBg = 'rgba(255, 59, 48, 0.15)';
          animeScreenshotHoverShadow = 'rgba(255, 59, 48, 0.3)';

          // Цвета для collection-status
          collectionStatusActiveBg = 'rgba(255, 59, 48, 0.15)';
          collectionStatusActiveGradient = 'linear-gradient(135deg, rgba(255, 59, 48, 0.2) 0%, rgba(255, 59, 48, 0.1) 100%)';

          // Цвета для comments-button
          commentsButtonBg = 'linear-gradient(135deg, rgba(255, 59, 48, 0.1) 0%, rgba(255, 59, 48, 0.05) 100%)';
          commentsButtonHoverBg = 'linear-gradient(135deg, rgba(255, 59, 48, 0.2) 0%, rgba(255, 59, 48, 0.1) 100%)';
          commentsButtonBorder = 'rgba(255, 59, 48, 0.3)';
          commentsButtonHoverBorder = 'rgba(255, 59, 48, 0.5)';

          // Цвета для collection-status-button
          collectionStatusButtonBg = 'linear-gradient(135deg, rgba(255, 59, 48, 0.08) 0%, rgba(255, 59, 48, 0.03) 100%)';
          collectionStatusButtonHoverBg = 'linear-gradient(135deg, rgba(255, 59, 48, 0.15) 0%, rgba(255, 59, 48, 0.08) 100%)';
          collectionStatusButtonBorder = 'rgba(255, 59, 48, 0.2)';
          collectionStatusButtonHoverBorder = 'rgba(255, 59, 48, 0.4)';

          // Активное состояние favorite-button
          favoriteButtonActiveBg = 'linear-gradient(135deg, rgba(255, 59, 48, 0.2) 0%, rgba(255, 59, 48, 0.1) 100%)';
          favoriteButtonActiveColor = '#ff3b30';
          favoriteButtonActiveBorder = '#ff3b30';
          favoriteButtonActiveShadow = '0 4px 16px rgba(255, 59, 48, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';

          // Цвета для test-top-section-modern
          topSectionModernBg = 'linear-gradient(145deg, rgba(255, 59, 48, 0.08) 0%, rgba(255, 59, 48, 0.03) 20%, var(--bg-primary) 100%)';

          // Цвета для test-extra-info-modern
          extraInfoModernBg = 'linear-gradient(135deg, rgba(255, 59, 48, 0.05) 0%, rgba(255, 59, 48, 0.02) 100%)';

          // Цвета для anime-description-section-modern
          descriptionSectionModernBg = 'linear-gradient(145deg, rgba(255, 59, 48, 0.04) 0%, rgba(255, 59, 48, 0.01) 50%, var(--bg-primary) 100%)';

          // Цвет фона для reviews-section-standalone (практически незаметный)
          reviewsSectionClassicBg = 'rgba(255, 59, 48, 0.025)';

          // Цвет фона для user-rating-input (практически незаметный)
          userRatingInputClassicBg = 'rgba(255, 59, 48, 0.02)';

          // Цвет фона для comment-item (практически незаметный)
          commentItemClassicBg = 'rgba(255, 59, 48, 0.018)';

          // Цвета для show-all-btn (современный красивый, классический простой)
          showAllBtnBg = 'linear-gradient(135deg, #ff3b30 0%, #ff5544 100%)';
          showAllBtnHoverBg = 'linear-gradient(135deg, #ff5544 0%, #ff3b30 100%)';
          showAllBtnBorder = '1px solid rgba(255, 59, 48, 0.3)';
          showAllBtnHoverBorder = '1px solid rgba(255, 59, 48, 0.5)';
          showAllBtnShadow = '0 2px 8px rgba(255, 59, 48, 0.25)';

        } else {
          primaryColor = '#d62015';
          primaryHover = '#e63025';
          primaryDark = '#bb1800';
          primaryLight = '#ff5544';
          primaryBg = 'rgba(214, 32, 21, 0.04)';
          primaryBgHover = 'rgba(214, 32, 21, 0.08)';

          // Фоны для светлой красной темы - более цветные
          headerBg = '#fef6f5'; // Header с легким красным оттенком
          bodyBg = '#fdf0ee';   // Body с заметным красным оттенком

          // Цвета для global-anime-card-info - более заметные в светлой теме
          cardInfoBg = 'rgba(214, 32, 21, 0.08)';
          cardInfoBorder = 'rgba(214, 32, 21, 0.15)';
          cardInfoHoverBg = 'rgba(214, 32, 21, 0.12)';

          // Цвета для search-bar-anime - убираем резкие тени
          searchBarBg = 'rgba(255, 255, 255, 0.95)';
          searchBarHoverBg = 'rgba(255, 255, 255, 1)';
          searchBarBorder = 'rgba(0, 0, 0, 0.06)';
          searchBarHoverBorder = 'rgba(214, 32, 21, 0.2)';
          searchBarShadow = 'rgba(214, 32, 21, 0.05)';

          // Цвета для profile - мягче
          profileIconBorder = 'rgba(0, 0, 0, 0.08)';
          profileIconHoverBorder = 'rgba(214, 32, 21, 0.3)';
          profileIconShadow = 'rgba(0, 0, 0, 0.05)';
          profileIconHoverShadow = 'rgba(214, 32, 21, 0.08)';
          profileDropdownHoverBg = 'rgba(214, 32, 21, 0.05)';

          // Цвета для apps-dropdown
          appsDropdownHoverBg = 'radial-gradient(circle at center, rgba(230, 48, 37, 0.1), transparent 80%)';

          // Цвета для profile блоков - светлая красная тема
          friendsBlockBg = '#fffbfb';
          friendsBlockBorder = '#f0e6e6';
          friendsHoverBorder = '#ff4c4c';
          recentActivityBg = '#fff8f8';
          recentActivityBorder = '#f0e0e0';
          activityIconColor = '#ff5252';

          // Цвета для кнопок - светлая красная тема
          toggleReviewsBtnBg = 'transparent';
          toggleReviewsBtnBorder = '#ff4c4c';
          toggleReviewsBtnHoverBg = '#ff4c4c';
          toggleReviewsBtnText = '#ff4c4c';
          toggleReviewsBtnHoverText = '#ffffff';

          // Цвета для anime-page
          animeWatchButtonBg = 'linear-gradient(135deg, rgba(230, 48, 37, 0.85) 0%, rgba(245, 65, 55, 0.75) 100%)';
          animeWatchButtonHoverBg = 'linear-gradient(135deg, rgba(230, 48, 37, 0.95) 0%, rgba(245, 65, 55, 0.85) 100%)';
          animeFavoriteButtonHoverBg = 'rgba(230, 48, 37, 0.08)';
          animeTabActiveBackground = 'linear-gradient(135deg, rgba(230, 48, 37, 0.12) 0%, rgba(230, 48, 37, 0.08) 100%)';
          animeTabHoverBg = 'rgba(230, 48, 37, 0.04)';
          animeGenreTagBg = 'rgba(230, 48, 37, 0.06)';
          animeGenreTagHoverBg = 'rgba(230, 48, 37, 0.12)';
          animeScreenshotHoverShadow = 'rgba(230, 48, 37, 0.25)';

          // Цвета для collection-status
          collectionStatusActiveBg = 'rgba(230, 48, 37, 0.12)';
          collectionStatusActiveGradient = 'linear-gradient(135deg, rgba(230, 48, 37, 0.15) 0%, rgba(230, 48, 37, 0.08) 100%)';

          // Цвета для comments-button
          commentsButtonBg = 'linear-gradient(135deg, rgba(230, 48, 37, 0.08) 0%, rgba(230, 48, 37, 0.04) 100%)';
          commentsButtonHoverBg = 'linear-gradient(135deg, rgba(230, 48, 37, 0.15) 0%, rgba(230, 48, 37, 0.08) 100%)';
          commentsButtonBorder = 'rgba(230, 48, 37, 0.25)';
          commentsButtonHoverBorder = 'rgba(230, 48, 37, 0.4)';

          // Цвета для collection-status-button
          collectionStatusButtonBg = 'linear-gradient(135deg, rgba(230, 48, 37, 0.06) 0%, rgba(230, 48, 37, 0.02) 100%)';
          collectionStatusButtonHoverBg = 'linear-gradient(135deg, rgba(230, 48, 37, 0.12) 0%, rgba(230, 48, 37, 0.06) 100%)';
          collectionStatusButtonBorder = 'rgba(230, 48, 37, 0.18)';
          collectionStatusButtonHoverBorder = 'rgba(230, 48, 37, 0.35)';

          // Активное состояние favorite-button
          favoriteButtonActiveBg = 'linear-gradient(135deg, rgba(230, 48, 37, 0.18) 0%, rgba(230, 48, 37, 0.08) 100%)';
          favoriteButtonActiveColor = '#e63025';
          favoriteButtonActiveBorder = '#e63025';
          favoriteButtonActiveShadow = '0 4px 16px rgba(230, 48, 37, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)';

          // Цвета для test-top-section-modern
          topSectionModernBg = 'linear-gradient(145deg, rgba(230, 48, 37, 0.06) 0%, rgba(230, 48, 37, 0.02) 20%, var(--bg-primary) 100%)';

          // Цвета для test-extra-info-modern
          extraInfoModernBg = 'linear-gradient(135deg, rgba(230, 48, 37, 0.04) 0%, rgba(230, 48, 37, 0.015) 100%)';

          // Цвета для anime-description-section-modern
          descriptionSectionModernBg = 'linear-gradient(145deg, rgba(230, 48, 37, 0.03) 0%, rgba(230, 48, 37, 0.008) 50%, var(--bg-primary) 100%)';

          // Цвет фона для reviews-section-standalone (практически незаметный)
          reviewsSectionClassicBg = 'rgba(230, 48, 37, 0.02)';

          // Цвет фона для user-rating-input (практически незаметный)
          userRatingInputClassicBg = 'rgba(230, 48, 37, 0.015)';

          // Цвет фона для comment-item (практически незаметный)
          commentItemClassicBg = 'rgba(230, 48, 37, 0.012)';

          // Цвета для show-all-btn - мягче
          showAllBtnBg = 'linear-gradient(135deg, #d62015 0%, #e63025 100%)';
          showAllBtnHoverBg = 'linear-gradient(135deg, #e63025 0%, #d62015 100%)';
          showAllBtnBorder = '1px solid rgba(214, 32, 21, 0.2)';
          showAllBtnHoverBorder = '1px solid rgba(214, 32, 21, 0.3)';
          showAllBtnShadow = '0 2px 6px rgba(214, 32, 21, 0.12)';

        }
        break;

      case 'blue':
        if (isDark) {
          primaryColor = '#007aff';
          primaryHover = '#409cff';
          primaryDark = '#0051d5';
          primaryLight = '#66b0ff';
          primaryBg = 'rgba(0, 122, 255, 0.1)';
          primaryBgHover = 'rgba(0, 122, 255, 0.15)';

          // Фоны для темной синей темы
          headerBg = 'rgba(24, 26, 36, 0.65)'; // Header полупрозрачный с синим оттенком
          bodyBg = '#08090f';   // Body с более заметным синим оттенком

          // Цвета для global-anime-card-info
          cardInfoBg = 'rgba(0, 122, 255, 0.05)';
          cardInfoBorder = 'rgba(0, 122, 255, 0.2)';
          cardInfoHoverBg = 'rgba(0, 122, 255, 0.12)';

          // Цвета для search-bar-anime
          searchBarBg = 'rgba(20, 20, 20, 0.85)';
          searchBarHoverBg = 'rgba(25, 25, 25, 0.9)';
          searchBarBorder = 'rgba(255, 255, 255, 0.08)';
          searchBarHoverBorder = 'rgba(0, 122, 255, 0.4)';
          searchBarShadow = 'rgba(0, 122, 255, 0.12)';

          // Цвета для profile
          profileIconBorder = 'rgba(255, 255, 255, 0.1)';
          profileIconHoverBorder = 'rgba(0, 122, 255, 0.5)';
          profileIconShadow = 'rgba(0, 0, 0, 0.2)';
          profileIconHoverShadow = 'rgba(0, 122, 255, 0.15)';
          profileDropdownHoverBg = 'rgba(0, 122, 255, 0.1)';

          // Цвета для apps-dropdown
          appsDropdownHoverBg = 'radial-gradient(circle at center, rgba(0, 122, 255, 0.12), transparent 80%)';

          // Цвета для profile блоков
          friendsBlockBg = '#151a1f';
          friendsBlockBorder = '#26323a';
          friendsHoverBorder = '#4c9aff';
          recentActivityBg = '#13181a';
          recentActivityBorder = '#202f35';
          activityIconColor = '#4c9aff';

          // Цвета для кнопок - темная синяя тема
          toggleReviewsBtnBg = 'transparent';
          toggleReviewsBtnBorder = '#4c9aff';
          toggleReviewsBtnHoverBg = '#4c9aff';
          toggleReviewsBtnText = '#4c9aff';
          toggleReviewsBtnHoverText = '#ffffff';

          // Цвета для anime-page
          animeWatchButtonBg = 'linear-gradient(135deg, rgba(0, 122, 255, 0.9) 0%, rgba(30, 140, 255, 0.8) 100%)';
          animeWatchButtonHoverBg = 'linear-gradient(135deg, rgba(0, 122, 255, 1) 0%, rgba(30, 140, 255, 0.95) 100%)';
          animeFavoriteButtonHoverBg = 'rgba(0, 122, 255, 0.1)';
          animeTabActiveBackground = 'linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(0, 122, 255, 0.1) 100%)';
          animeTabHoverBg = 'rgba(0, 122, 255, 0.05)';
          animeGenreTagBg = 'rgba(0, 122, 255, 0.08)';
          animeGenreTagHoverBg = 'rgba(0, 122, 255, 0.15)';
          animeScreenshotHoverShadow = 'rgba(0, 122, 255, 0.3)';

          // Цвета для collection-status
          collectionStatusActiveBg = 'rgba(0, 122, 255, 0.15)';
          collectionStatusActiveGradient = 'linear-gradient(135deg, rgba(0, 122, 255, 0.2) 0%, rgba(0, 122, 255, 0.1) 100%)';

          // Цвета для comments-button
          commentsButtonBg = 'linear-gradient(135deg, rgba(0, 122, 255, 0.1) 0%, rgba(0, 122, 255, 0.05) 100%)';
          commentsButtonHoverBg = 'linear-gradient(135deg, rgba(0, 122, 255, 0.2) 0%, rgba(0, 122, 255, 0.1) 100%)';
          commentsButtonBorder = 'rgba(0, 122, 255, 0.3)';
          commentsButtonHoverBorder = 'rgba(0, 122, 255, 0.5)';

          // Цвета для collection-status-button
          collectionStatusButtonBg = 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.03) 100%)';
          collectionStatusButtonHoverBg = 'linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(0, 122, 255, 0.08) 100%)';
          collectionStatusButtonBorder = 'rgba(0, 122, 255, 0.2)';
          collectionStatusButtonHoverBorder = 'rgba(0, 122, 255, 0.4)';

          // Активное состояние favorite-button
          favoriteButtonActiveBg = 'linear-gradient(135deg, rgba(0, 122, 255, 0.2) 0%, rgba(0, 122, 255, 0.1) 100%)';
          favoriteButtonActiveColor = '#007aff';
          favoriteButtonActiveBorder = '#007aff';
          favoriteButtonActiveShadow = '0 4px 16px rgba(0, 122, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';

          // Цвета для test-top-section-modern
          topSectionModernBg = 'linear-gradient(145deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.03) 20%, var(--bg-primary) 100%)';

          // Цвета для test-extra-info-modern
          extraInfoModernBg = 'linear-gradient(135deg, rgba(0, 122, 255, 0.05) 0%, rgba(0, 122, 255, 0.02) 100%)';

          // Цвета для anime-description-section-modern
          descriptionSectionModernBg = 'linear-gradient(145deg, rgba(0, 122, 255, 0.04) 0%, rgba(0, 122, 255, 0.01) 50%, var(--bg-primary) 100%)';

          // Цвет фона для reviews-section-standalone (практически незаметный)
          reviewsSectionClassicBg = 'rgba(0, 122, 255, 0.025)';

          // Цвет фона для user-rating-input (практически незаметный)
          userRatingInputClassicBg = 'rgba(0, 122, 255, 0.02)';

          // Цвет фона для comment-item (практически незаметный)
          commentItemClassicBg = 'rgba(0, 122, 255, 0.018)';

          // Цвета для show-all-btn (современный красивый, классический простой)
          showAllBtnBg = 'linear-gradient(135deg, #007aff 0%, #3388ff 100%)';
          showAllBtnHoverBg = 'linear-gradient(135deg, #3388ff 0%, #007aff 100%)';
          showAllBtnBorder = '1px solid rgba(0, 122, 255, 0.3)';
          showAllBtnHoverBorder = '1px solid rgba(0, 122, 255, 0.5)';
          showAllBtnShadow = '0 2px 8px rgba(0, 122, 255, 0.25)';

        } else {
          primaryColor = '#0055bb';
          primaryHover = '#0066dd';
          primaryDark = '#003388';
          primaryLight = '#3388ff';
          primaryBg = 'rgba(0, 85, 187, 0.04)';
          primaryBgHover = 'rgba(0, 85, 187, 0.08)';

          // Фоны для светлой синей темы - более цветные
          headerBg = '#f4f8fe'; // Header с легким синим оттенком
          bodyBg = '#eef4fd';   // Body с заметным синим оттенком

          // Цвета для global-anime-card-info - более заметные в светлой теме
          cardInfoBg = 'rgba(0, 85, 187, 0.08)';
          cardInfoBorder = 'rgba(0, 85, 187, 0.15)';
          cardInfoHoverBg = 'rgba(0, 85, 187, 0.12)';

          // Цвета для search-bar-anime - убираем резкие тени
          searchBarBg = 'rgba(255, 255, 255, 0.95)';
          searchBarHoverBg = 'rgba(255, 255, 255, 1)';
          searchBarBorder = 'rgba(0, 0, 0, 0.06)';
          searchBarHoverBorder = 'rgba(0, 85, 187, 0.2)';
          searchBarShadow = 'rgba(0, 85, 187, 0.05)';

          // Цвета для profile - мягче
          profileIconBorder = 'rgba(0, 0, 0, 0.08)';
          profileIconHoverBorder = 'rgba(0, 85, 187, 0.3)';
          profileIconShadow = 'rgba(0, 0, 0, 0.05)';
          profileIconHoverShadow = 'rgba(0, 85, 187, 0.08)';
          profileDropdownHoverBg = 'rgba(0, 85, 187, 0.05)';

          // Цвета для apps-dropdown
          appsDropdownHoverBg = 'radial-gradient(circle at center, rgba(0, 102, 221, 0.1), transparent 80%)';

          // Цвета для profile блоков - светлая синяя тема
          friendsBlockBg = '#f8fbff';
          friendsBlockBorder = '#e0f0ff';
          friendsHoverBorder = '#4c9aff';
          recentActivityBg = '#f8fbff';
          recentActivityBorder = '#e0f0ff';
          activityIconColor = '#4c9aff';

          // Цвета для кнопок - светлая синяя тема
          toggleReviewsBtnBg = 'transparent';
          toggleReviewsBtnBorder = '#4c9aff';
          toggleReviewsBtnHoverBg = '#4c9aff';
          toggleReviewsBtnText = '#4c9aff';
          toggleReviewsBtnHoverText = '#ffffff';

          // Цвета для anime-page
          animeWatchButtonBg = 'linear-gradient(135deg, rgba(0, 102, 221, 0.85) 0%, rgba(25, 120, 240, 0.75) 100%)';
          animeWatchButtonHoverBg = 'linear-gradient(135deg, rgba(0, 102, 221, 0.95) 0%, rgba(25, 120, 240, 0.85) 100%)';
          animeFavoriteButtonHoverBg = 'rgba(0, 102, 221, 0.08)';
          animeTabActiveBackground = 'linear-gradient(135deg, rgba(0, 102, 221, 0.12) 0%, rgba(0, 102, 221, 0.08) 100%)';
          animeTabHoverBg = 'rgba(0, 102, 221, 0.04)';
          animeGenreTagBg = 'rgba(0, 102, 221, 0.06)';
          animeGenreTagHoverBg = 'rgba(0, 102, 221, 0.12)';
          animeScreenshotHoverShadow = 'rgba(0, 102, 221, 0.25)';

          // Цвета для collection-status
          collectionStatusActiveBg = 'rgba(0, 102, 221, 0.12)';
          collectionStatusActiveGradient = 'linear-gradient(135deg, rgba(0, 102, 221, 0.15) 0%, rgba(0, 102, 221, 0.08) 100%)';

          // Цвета для comments-button
          commentsButtonBg = 'linear-gradient(135deg, rgba(0, 102, 221, 0.08) 0%, rgba(0, 102, 221, 0.04) 100%)';
          commentsButtonHoverBg = 'linear-gradient(135deg, rgba(0, 102, 221, 0.15) 0%, rgba(0, 102, 221, 0.08) 100%)';
          commentsButtonBorder = 'rgba(0, 102, 221, 0.25)';
          commentsButtonHoverBorder = 'rgba(0, 102, 221, 0.4)';

          // Цвета для collection-status-button
          collectionStatusButtonBg = 'linear-gradient(135deg, rgba(0, 102, 221, 0.06) 0%, rgba(0, 102, 221, 0.02) 100%)';
          collectionStatusButtonHoverBg = 'linear-gradient(135deg, rgba(0, 102, 221, 0.12) 0%, rgba(0, 102, 221, 0.06) 100%)';
          collectionStatusButtonBorder = 'rgba(0, 102, 221, 0.18)';
          collectionStatusButtonHoverBorder = 'rgba(0, 102, 221, 0.35)';

          // Активное состояние favorite-button
          favoriteButtonActiveBg = 'linear-gradient(135deg, rgba(0, 102, 221, 0.18) 0%, rgba(0, 102, 221, 0.08) 100%)';
          favoriteButtonActiveColor = '#0066dd';
          favoriteButtonActiveBorder = '#0066dd';
          favoriteButtonActiveShadow = '0 4px 16px rgba(0, 102, 221, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)';

          // Цвета для test-top-section-modern
          topSectionModernBg = 'linear-gradient(145deg, rgba(0, 102, 221, 0.06) 0%, rgba(0, 102, 221, 0.02) 20%, var(--bg-primary) 100%)';

          // Цвета для test-extra-info-modern
          extraInfoModernBg = 'linear-gradient(135deg, rgba(0, 102, 221, 0.04) 0%, rgba(0, 102, 221, 0.015) 100%)';

          // Цвета для anime-description-section-modern
          descriptionSectionModernBg = 'linear-gradient(145deg, rgba(0, 102, 221, 0.03) 0%, rgba(0, 102, 221, 0.008) 50%, var(--bg-primary) 100%)';

          // Цвет фона для reviews-section-standalone (практически незаметный)
          reviewsSectionClassicBg = 'rgba(0, 102, 221, 0.02)';

          // Цвет фона для user-rating-input (практически незаметный)
          userRatingInputClassicBg = 'rgba(0, 102, 221, 0.015)';

          // Цвет фона для comment-item (практически незаметный)
          commentItemClassicBg = 'rgba(0, 102, 221, 0.012)';

          // Цвета для show-all-btn - мягче
          showAllBtnBg = 'linear-gradient(135deg, #0055bb 0%, #0066dd 100%)';
          showAllBtnHoverBg = 'linear-gradient(135deg, #0066dd 0%, #0055bb 100%)';
          showAllBtnBorder = '1px solid rgba(0, 85, 187, 0.2)';
          showAllBtnHoverBorder = '1px solid rgba(0, 85, 187, 0.3)';
          showAllBtnShadow = '0 2px 6px rgba(0, 85, 187, 0.12)';

        }
        break;
    }

    // Применяем CSS переменные через стиль элемент с максимальным приоритетом
    const styleId = 'theme-colors-override';

    // Удаляем старый элемент если есть
    const oldStyle = document.getElementById(styleId);
    if (oldStyle) {
      oldStyle.remove();
    }

    // Создаём новый элемент и добавляем в самый конец head
    const styleElement = document.createElement('style');
    styleElement.id = styleId;

    // Форсируем высокий приоритет
    styleElement.setAttribute('data-priority', 'highest');

    // Создаём CSS с переопределением всех переменных и прямым применением стилей
    styleElement.textContent = `
      /* КРИТИЧЕСКИ ВАЖНО: Глобальное правило для полного удаления outline у табов */
      .test-tabs-modern,
      .test-tabs-modern:hover,
      .test-tabs-modern:focus,
      .test-tabs-modern:focus-visible,
      .test-tabs-modern:focus-within,
      .test-tabs-modern:active,
      .test-tabs-modern:before,
      .test-tabs-modern:after,
      .anime-tabs,
      .anime-tabs:hover,
      .anime-tabs:focus,
      .anime-tabs:focus-visible,
      .anime-tabs:focus-within,
      .anime-tabs:active,
      .anime-tabs:before,
      .anime-tabs:after,
      div.test-tabs-modern,
      div.anime-tabs,
      [class*="test-tabs-modern"],
      [class*="anime-tabs"],
      .test-tabs-modern *,
      .anime-tabs *,
      .test-tabs-modern button,
      .anime-tabs button,
      .test-tabs-modern button:focus,
      .anime-tabs button:focus,
      .test-tabs-modern button:focus-visible,
      .anime-tabs button:focus-visible,
      .test-tabs-modern button.active,
      .anime-tabs button.active,
      .anime-tabs .anime-tab,
      .anime-tabs .anime-tab:focus,
      .anime-tabs .anime-tab:focus-visible,
      .anime-tabs .anime-tab.active {
        outline: 0 !important;
        outline: none !important;
        outline-width: 0px !important;
        outline-style: none !important;
        outline-color: transparent !important;
        outline-offset: 0px !important;
        -webkit-tap-highlight-color: transparent !important;
        -webkit-focus-ring-color: transparent !important;
        -moz-outline-radius: 0 !important;
        box-shadow: none !important;
        border-color: var(--bg-secondary) !important;
      }
      
      /* Принудительно убираем стандартные браузерные стили фокуса */
      .test-tabs-modern::-moz-focus-inner,
      .anime-tabs::-moz-focus-inner,
      .test-tabs-modern button::-moz-focus-inner,
      .anime-tabs button::-moz-focus-inner {
        border: 0 !important;
        outline: 0 !important;
      }
      
      /* Переопределяем только базовые primary переменные */
      :root {
        --primary-color: ${primaryColor} !important;
        --primary-hover: ${primaryHover} !important;
        --primary-dark: ${primaryDark} !important;
        --primary-light: ${primaryLight} !important;
        --primary-bg: ${primaryBg} !important;
        --primary-bg-hover: ${primaryBgHover} !important;
        --header-bg: ${headerBg} !important;
        --body-bg: ${bodyBg} !important;
        --bg-secondary: ${headerBg} !important;
        
        /* Переменные для global-anime-card-info */
        --card-info-bg: ${cardInfoBg} !important;
        --card-info-border: ${cardInfoBorder} !important;
        --card-info-hover-bg: ${cardInfoHoverBg} !important;
        
        /* Переменные для search-bar-anime */
        --search-bar-bg: ${searchBarBg} !important;
        --search-bar-hover-bg: ${searchBarHoverBg} !important;
        --search-bar-border: ${searchBarBorder} !important;
        --search-bar-hover-border: ${searchBarHoverBorder} !important;
        --search-bar-shadow: ${searchBarShadow} !important;
        
        /* Переменные для profile */
        --profile-icon-border: ${profileIconBorder} !important;
        --profile-icon-hover-border: ${profileIconHoverBorder} !important;
        --profile-icon-shadow: ${profileIconShadow} !important;
        --profile-icon-hover-shadow: ${profileIconHoverShadow} !important;
        --profile-dropdown-hover-bg: ${profileDropdownHoverBg} !important;
        
        /* Переменные для apps-dropdown */
        --apps-dropdown-hover-bg: ${appsDropdownHoverBg} !important;
        
        /* Переменные для profile блоков */
        --friends-block-bg: ${friendsBlockBg} !important;
        --friends-block-border: ${friendsBlockBorder} !important;
        --friends-hover-border: ${friendsHoverBorder} !important;
        --recent-activity-bg: ${recentActivityBg} !important;
        --recent-activity-border: ${recentActivityBorder} !important;
        --activity-icon-color: ${activityIconColor} !important;
        
        /* Переменные для кнопок */
        --toggle-reviews-btn-bg: ${toggleReviewsBtnBg} !important;
        --toggle-reviews-btn-border: ${toggleReviewsBtnBorder} !important;
        --toggle-reviews-btn-hover-bg: ${toggleReviewsBtnHoverBg} !important;
        --toggle-reviews-btn-text: ${toggleReviewsBtnText} !important;
        --toggle-reviews-btn-hover-text: ${toggleReviewsBtnHoverText} !important;
        
        /* Переменные для anime-page */
        --anime-watch-button-bg: ${animeWatchButtonBg} !important;
        --anime-watch-button-hover-bg: ${animeWatchButtonHoverBg} !important;
        --anime-favorite-button-hover-bg: ${animeFavoriteButtonHoverBg} !important;
        --anime-tab-active-bg: ${animeTabActiveBackground} !important;
        --anime-tab-hover-bg: ${animeTabHoverBg} !important;
        --anime-genre-tag-bg: ${animeGenreTagBg} !important;
        --anime-genre-tag-hover-bg: ${animeGenreTagHoverBg} !important;
        --anime-screenshot-hover-shadow: ${animeScreenshotHoverShadow} !important;
        
        /* Переменные для collection-status */
        --collection-status-active-bg: ${collectionStatusActiveBg} !important;
        --collection-status-active-gradient: ${collectionStatusActiveGradient} !important;
        
        /* Переменные для comments-button */
        --comments-button-bg: ${commentsButtonBg} !important;
        --comments-button-hover-bg: ${commentsButtonHoverBg} !important;
        --comments-button-border: ${commentsButtonBorder} !important;
        --comments-button-hover-border: ${commentsButtonHoverBorder} !important;
        
        /* Переменные для collection-status-button */
        --collection-status-button-bg: ${collectionStatusButtonBg} !important;
        --collection-status-button-hover-bg: ${collectionStatusButtonHoverBg} !important;
        --collection-status-button-border: ${collectionStatusButtonBorder} !important;
        --collection-status-button-hover-border: ${collectionStatusButtonHoverBorder} !important;
        
        /* Переменные для активного состояния favorite-button */
        --favorite-button-active-bg: ${favoriteButtonActiveBg} !important;
        --favorite-button-active-color: ${favoriteButtonActiveColor} !important;
        --favorite-button-active-border: ${favoriteButtonActiveBorder} !important;
        --favorite-button-active-shadow: ${favoriteButtonActiveShadow} !important;
        
        /* Переменные для test-top-section-modern */
        --top-section-modern-bg: ${topSectionModernBg} !important;
        
        /* Переменные для test-extra-info-modern */
        --extra-info-modern-bg: ${extraInfoModernBg} !important;
        
        /* Переменные для anime-description-section-modern */
        --description-section-modern-bg: ${descriptionSectionModernBg} !important;
        
        /* Переменная для reviews-section-standalone фон */
        --reviews-section-classic-bg: ${reviewsSectionClassicBg} !important;
        
        /* Переменная для user-rating-input фон */
        --user-rating-input-classic-bg: ${userRatingInputClassicBg} !important;
        
        /* Переменная для comment-item фон */
        --comment-item-classic-bg: ${commentItemClassicBg} !important;
        
        /* Переменные для show-all-btn */
        --show-all-btn-bg: ${showAllBtnBg} !important;
        --show-all-btn-hover-bg: ${showAllBtnHoverBg} !important;
        --show-all-btn-border: ${showAllBtnBorder} !important;
        --show-all-btn-hover-border: ${showAllBtnHoverBorder} !important;
        --show-all-btn-shadow: ${showAllBtnShadow} !important;
        
      }
      
      /* Body background через CSS переменную */
      body {
        background-color: var(--body-bg) !important;
      }
      
      /* Переопределяем только элементы модального окна темы */
      .theme-option-card.active {
        color: ${primaryColor} !important;
        border-color: ${primaryColor} !important;
        background: ${primaryBg} !important;
      }
      
      .color-option-item.active {
        border-color: ${primaryColor} !important;
      }
      
      /* Стили для global-anime-card-info с плавными переходами и переменными цветами темы */
      .global-anime-card-info {
        background-color: var(--card-info-bg) !important;
        border: 1px solid var(--card-info-border) !important;
        border-radius: 12px !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .global-anime-card-info:hover {
        background-color: var(--card-info-hover-bg) !important;
        border-color: var(--primary-color) !important;
        transform: ${theme === 'dark' ? 'translateY(-1px)' : 'none'} !important;
        box-shadow: ${theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.05)'} !important;
      }
      
      /* Стили для search-bar-anime с плавными переходами */
      .search-bar-anime {
        background: var(--search-bar-bg) !important;
        border-color: var(--search-bar-border) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .search-bar-anime:hover {
        background: var(--search-bar-hover-bg) !important;
        border-color: var(--search-bar-hover-border) !important;
        box-shadow: ${theme === 'dark' ? '0 4px 16px var(--search-bar-shadow)' : '0 2px 8px var(--search-bar-shadow)'} !important;
        transform: ${theme === 'dark' ? 'translateY(-1px)' : 'none'} !important;
      }
      
      /* Стили для profile с плавными переходами */
      .profile .profile-icon {
        border-color: var(--profile-icon-border) !important;
        box-shadow: 0 2px 8px var(--profile-icon-shadow) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .profile .profile-icon:hover {
        border-color: var(--profile-icon-hover-border) !important;
        box-shadow: ${theme === 'dark' ? '0 4px 16px var(--profile-icon-hover-shadow)' : '0 2px 6px var(--profile-icon-hover-shadow)'} !important;
        transform: ${theme === 'dark' ? 'translateY(-1px) scale(1.02)' : 'scale(1.02)'} !important;
      }
      
      .profile .profile-dropdown ul li a:hover,
      .profile .profile-dropdown ul li button:hover {
        background: var(--profile-dropdown-hover-bg) !important;
        color: var(--primary-color) !important;
        transform: translateX(4px) !important;
      }
      
      /* Стили для apps-dropdown с плавными переходами */
      .our-apps .apps-dropdown ul li a:hover {
        background: var(--apps-dropdown-hover-bg) !important;
        color: var(--primary-color) !important;
      }
      
      /* Стили для anime-page с динамическими цветами */
      .test-watch-button-modern,
      .test-watch-button {
        background: var(--anime-watch-button-bg) !important;
        color: rgba(255, 255, 255, 0.95) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .test-watch-button-modern:hover:not(.disabled),
      .test-watch-button:hover:not(.disabled) {
        background: var(--anime-watch-button-hover-bg) !important;
        transform: translateY(-1px) !important;
      }
      
      .test-favorite-button-modern:hover,
      .test-favorite-button:hover {
        background: var(--anime-favorite-button-hover-bg) !important;
        color: var(--primary-color) !important;
      }
      
      .test-tabs-modern button.active,
      .test-tabs button.active {
        background: var(--anime-tab-active-bg) !important;
        color: var(--primary-color) !important;
      }
      
      .test-tabs-modern button:hover:not(.active),
      .test-tabs button:hover:not(.active) {
        background: var(--anime-tab-hover-bg) !important;
        color: var(--primary-color) !important;
      }

      .genre-tag-modern,
      .genre-tag {
        background: var(--anime-genre-tag-bg) !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .genre-tag-modern:hover,
      .genre-tag:hover {
        background: var(--anime-genre-tag-hover-bg) !important;
        color: var(--primary-color) !important;
      }
      
      .screenshot-modern:hover {
        box-shadow: 0 12px 40px var(--anime-screenshot-hover-shadow) !important;
      }
      
      /* Простая обводка для классического стиля скриншотов */
      .screenshot:hover {
        border-color: var(--primary-color) !important;
        transform: none !important;
        box-shadow: none !important;
      }
      
      /* Стили для collection-status активных элементов */
      .collection-status-item-modern.active {
        background: var(--collection-status-active-gradient) !important;
        color: var(--primary-color) !important;
        border-left: 3px solid var(--primary-color) !important;
      }
      
      .collection-status-item.active {
        background: var(--collection-status-active-bg) !important;
        color: var(--primary-color) !important;
      }
      
      /* Стили для test-comments-button */
      .test-comments-button {
        background: var(--comments-button-bg) !important;
        border-color: var(--comments-button-border) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .test-comments-button:hover {
        background: var(--comments-button-hover-bg) !important;
        border-color: var(--comments-button-hover-border) !important;
        transform: ${theme === 'dark' ? 'translateY(-1px)' : 'none'} !important;
        box-shadow: ${theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.08)'} !important;
      }
      
      /* Стили для collection-status-button */
      .collection-status-button-modern,
      .collection-status-button {
        background: var(--collection-status-button-bg) !important;
        border-color: var(--collection-status-button-border) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .collection-status-button-modern:hover,
      .collection-status-button:hover {
        background: var(--collection-status-button-hover-bg) !important;
        border-color: var(--collection-status-button-hover-border) !important;
        transform: ${theme === 'dark' ? 'translateY(-1px)' : 'none'} !important;
        box-shadow: ${theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.08)'} !important;
      }
      
      /* Активные состояния для favorite-button */
      .test-favorite-button-modern.active,
      .test-favorite-button.active {
        background: var(--favorite-button-active-bg) !important;
        color: var(--favorite-button-active-color) !important;
        border-color: var(--favorite-button-active-border) !important;
        box-shadow: var(--favorite-button-active-shadow) !important;
      }
      
      /* Стили для test-top-section-modern */
      .test-top-section-modern {
        background: var(--top-section-modern-bg) !important;
        box-shadow: none !important;
        border: none !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      /* ПЕРЕОПРЕДЕЛЯЕМ ВСЕ: Убираем обводку у контейнеров вкладок */
      .test-tabs-modern,
      .anime-tabs,
      div.test-tabs-modern,
      div.anime-tabs {
        outline: 0 !important;
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        outline-color: transparent !important;
        border: 1px solid var(--bg-secondary) !important;
      }
      
      .test-tabs-modern:hover,
      .anime-tabs:hover,
      .test-tabs-modern:focus,
      .anime-tabs:focus,
      .test-tabs-modern:focus-within,
      .anime-tabs:focus-within,
      .test-tabs-modern:focus-visible,
      .anime-tabs:focus-visible,
      .test-tabs-modern:active,
      .anime-tabs:active {
        outline: 0 !important;
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
        outline-color: transparent !important;
        border: 1px solid var(--bg-secondary) !important;
        box-shadow: none !important;
      }
      
      /* Убираем outline у кнопок внутри табов */
      .test-tabs-modern button,
      .anime-tabs button,
      .anime-tabs .anime-tab {
        outline: none !important;
      }
      
      .test-tabs-modern button:focus,
      .test-tabs-modern button:focus-visible,
      .test-tabs-modern button:hover,
      .anime-tabs button:focus,
      .anime-tabs button:focus-visible,
      .anime-tabs button:hover,
      .anime-tabs .anime-tab:focus,
      .anime-tabs .anime-tab:focus-visible,
      .anime-tabs .anime-tab:hover {
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Дополнительные правила для полного удаления outline */
      .test-tabs-modern *,
      .anime-tabs *,
      .test-tabs-modern *:focus,
      .anime-tabs *:focus,
      .test-tabs-modern *:focus-visible,
      .anime-tabs *:focus-visible,
      .test-tabs-modern *:hover,
      .anime-tabs *:hover,
      .test-tabs-modern *:active,
      .anime-tabs *:active {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
      }
      
      /* Убираем outline для любых вложенных элементов */
      div.test-tabs-modern,
      div.anime-tabs,
      .test-tabs-modern:not(#\\#),
      .anime-tabs:not(#\\#) {
        outline: none !important;
        outline-width: 0 !important;
        outline-style: none !important;
      }
      
      /* Стили для test-extra-info-modern */
      .test-extra-info-modern {
        background: var(--extra-info-modern-bg) !important;
        border: none !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      /* Стили для anime-description-section-modern */
      .anime-description-section-modern {
        background: var(--description-section-modern-bg) !important;
        border: none !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      /* Убираем верхнюю полосу у anime-description-section-modern */
      .anime-description-section-modern::before {
        display: none !important;
      }
    
      
      /* Исправляем цвет кнопок на белый в обоих стилях */
      .reviews-section-standalone .anime-rating-section .user-rating-input button,
      .reviews-section-standalone .anime-rating-section .rating-btn-load-more-more,
      .reviews-section-standalone .anime-rating-section .rating-btn-load-more-collapse-all,
      .comments-section-standalone .comment-form button,
      .comments-section-standalone .load-more-comments {
        color: white !important;
      }
      
      
      /* Убираем цветные полоски (::before) у reviews-section */
      .reviews-section-standalone::before,
      .comments-section-standalone::before {
        display: none !important;
      }
      
      /* Убираем некрасивые тени в категориях */
      .anime-grid-container {
        background: none !important;
      }
      
      /* Убираем все тени в современной теме аниме страницы */
      .test-poster-modern,
      .test-poster-modern:hover {
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      
      .test-top-section-modern {
        box-shadow: none !important;
        border: none !important;
      }
      
      .test-content-section-modern {
        box-shadow: none !important;
      }
      
      .test-description-section-modern,
      .anime-description-section-modern {
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      
      .test-anime-screenshot,
      .test-anime-screenshot:hover {
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      
      .test-watch-button-modern,
      .test-watch-button-modern:hover:not(.disabled) {
        box-shadow: none !important;
      }
      
      .test-favorite-button-modern,
      .test-favorite-button-modern:hover,
      .test-favorite-button-modern.active {
        box-shadow: none !important;
      }
      
      .collection-status-button-modern,
      .collection-status-button-modern:hover {
        box-shadow: none !important;
      }
      
      .test-tabs-modern .tab-item.active {
        box-shadow: none !important;
      }
      
      .reviews-modal-overlay-modern .reviews-modal-modern {
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      
      .comments-modal-overlay-modern .comments-modal-modern {
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      
      .test-extra-info-modern {
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      
      .test-rating-card-modern,
      .test-rating-card-modern:hover {
        box-shadow: none !important;
      }
      
      .genre-tag-modern {
        box-shadow: none !important;
      }
      
      .test-comments-button-modern,
      .test-comments-button-modern:hover {
        box-shadow: none !important;
      }
      
      .test-rating-input-modern button,
      .test-rating-input-modern button:hover {
        box-shadow: none !important;
      }
      
      .test-user-review-card-modern,
      .test-user-review-card-modern:hover {
        box-shadow: none !important;
      }
      
      .test-avatar-modern,
      .test-avatar-modern:hover {
        box-shadow: none !important;
      }
      
      .show-all-btn-modern,
      .show-all-btn-modern:hover {
        box-shadow: none !important;
      }
      
      .rating-btn-load-more-more,
      .rating-btn-load-more-collapse-all {
        box-shadow: none !important;
      }
      
      /* Убираем анимации с тенями */
      @keyframes glow {
        0%, 100%, 50% {
          box-shadow: none !important;
        }
      }
      
      .test-notification-toast-modern {
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      
      /* Исправляем фоны для светлой темы - делаем их светлыми */
      ${theme === 'light' ? `
        .test-top-section-modern {
          background: ${headerBg} !important;
        }
        
        .test-description-section-modern,
        .anime-description-section-modern,
        .test-extra-info-modern {
          background: rgba(255, 255, 255, 0.8) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .test-anime-page-modern {
          background: ${bodyBg} !important;
        }
        
        .test-banner-container-modern {
          background: ${headerBg} !important;
        }
        
        .test-tabs-modern {
          background: rgba(255, 255, 255, 0.6) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .test-tabs-modern .tab-item {
          color: rgba(0, 0, 0, 0.7) !important;
        }
        
        .test-tabs-modern .tab-item.active {
          background: rgba(255, 255, 255, 0.9) !important;
          color: var(--primary-color) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .reviews-modal-overlay-modern .reviews-modal-modern,
        .comments-modal-overlay-modern .comments-modal-modern {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .test-user-review-card-modern {
          background: rgba(255, 255, 255, 0.7) !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
        }
        
        .test-poster-modern {
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .test-genre-tag-modern {
          background: rgba(255, 255, 255, 0.8) !important;
          color: rgba(0, 0, 0, 0.7) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .test-info-section-modern {
          color: rgba(0, 0, 0, 0.8) !important;
        }
        
        .test-title-modern {
          color: rgba(0, 0, 0, 0.9) !important;
        }
        
        .test-subtitle-modern {
          color: rgba(0, 0, 0, 0.6) !important;
        }
        
        .test-description-text-modern {
          color: rgba(0, 0, 0, 0.8) !important;
        }
        
        .test-info-item-modern {
          color: rgba(0, 0, 0, 0.7) !important;
        }
        
        .test-info-item-modern .info-label-modern {
          color: rgba(0, 0, 0, 0.5) !important;
        }
        
        .test-info-item-modern .info-value-modern {
          color: rgba(0, 0, 0, 0.8) !important;
        }
        
        .test-banner-overlay-modern {
          background: linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(255, 255, 255, 0.95) 100%) !important;
        }
        
        .anime-description-section-modern h2,
        .anime-description-section-modern p,
        .anime-description-section-modern span,
        .anime-description-section-modern div,
        .anime-description-section-modern strong,
        .anime-description-section-modern em,
        .anime-description-section-modern * {
          color: #000000 !important;
        }
        
        .anime-description-section-modern .info-item {
          color: #000000 !important;
        }
        
        .anime-description-section-modern .info-label {
          color: rgba(0, 0, 0, 0.7) !important;
        }
        
        .anime-description-section-modern .info-value {
          color: #000000 !important;
        }
        
        .details-section h1,
        .details-section h2,
        .details-section h3,
        .details-section h4,
        .details-section h5,
        .details-section h6,
        .details-section p,
        .details-section span,
        .details-section div,
        .details-section strong,
        .details-section em,
        .details-section a,
        .details-section * {
          color: #000000 !important;
        }
        
        .details-section .info-item {
          color: #000000 !important;
        }
        
        .details-section .info-label {
          color: rgba(0, 0, 0, 0.7) !important;
        }
        
        .details-section .info-value {
          color: #000000 !important;
        }
        
        .test-rating-modern.rating-high {
          background: var(--primary-bg) !important;
          border-color: var(--primary-color) !important;
          color: var(--primary-color) !important;
        }
        
        .test-rating-modern.rating-medium {
          background: rgba(251, 191, 36, 0.1) !important;
          border-color: rgba(251, 191, 36, 0.3) !important;
          color: #d97706 !important;
        }
        
        .test-rating-modern.rating-low {
          background: rgba(239, 68, 68, 0.1) !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
          color: #dc2626 !important;
        }
        
        .test-rating.rating-high {
          background: var(--primary-bg) !important;
          border-color: var(--primary-color) !important;
          color: var(--primary-color) !important;
        }
        
        .test-rating.rating-medium {
          background: rgba(251, 191, 36, 0.1) !important;
          border-color: rgba(251, 191, 36, 0.3) !important;
          color: #d97706 !important;
        }
        
        .test-rating.rating-low {
          background: rgba(239, 68, 68, 0.1) !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
          color: #dc2626 !important;
        }
        
        .test-top-section {
          background: ${headerBg} !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .test-top-section h1,
        .test-top-section h2,
        .test-top-section h3,
        .test-top-section p,
        .test-top-section span,
        .test-top-section div,
        .test-top-section * {
          color: rgba(0, 0, 0, 0.8) !important;
        }
        
        .test-top-section .test-title {
          color: rgba(0, 0, 0, 0.9) !important;
        }
        
        .test-top-section .test-subtitle {
          color: rgba(0, 0, 0, 0.6) !important;
        }
        
        .design-switcher button,
        .design-switcher-modern button {
          background: rgba(255, 255, 255, 0.9) !important;
          color: rgba(0, 0, 0, 0.8) !important;
          border: 1px solid var(--primary-color) !important;
          box-shadow: none !important;
        }
        
        .design-switcher button:hover,
        .design-switcher-modern button:hover {
          background: rgba(255, 255, 255, 1) !important;
          border-color: var(--primary-hover) !important;
          color: var(--primary-color) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }
        
        .profile-layout .profile-sidebar .profile-block {
          background: rgba(255, 255, 255, 0.9) !important;
          color: rgba(0, 0, 0, 0.9) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
        }
        
        .profile-layout .profile-sidebar .profile-block h2 {
          color: rgba(0, 0, 0, 0.9) !important;
        }
        
        .profile-layout .profile-sidebar .stats-chart-container {
          background: rgba(255, 255, 255, 0.9) !important;
          color: rgba(0, 0, 0, 0.8) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .profile-layout .profile-sidebar .stats-chart-container h2 {
          color: rgba(0, 0, 0, 0.9) !important;
        }
        
        .profile-layout .profile-sidebar .stats-chart-container .stats-list .stat-line {
          color: rgba(0, 0, 0, 0.8) !important;
        }
        
        .profile-layout .profile-sidebar .stats-chart-container .stats-list .stat-line span:first-child {
          color: rgba(0, 0, 0, 0.9) !important;
        }
        
        .profile-layout .profile-sidebar .achievements .achievements-grid .achievement {
          background: rgba(255, 255, 255, 0.8) !important;
          color: rgba(0, 0, 0, 0.8) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .profile-layout .profile-sidebar .achievements .achievements-grid .achievement .achievement-title {
          color: rgba(0, 0, 0, 0.9) !important;
        }
        
        .profile-layout .profile-sidebar .achievements .achievements-grid .achievement.add-more {
          background: rgba(240, 240, 240, 0.9) !important;
          color: rgba(0, 0, 0, 0.6) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .profile-layout .profile-sidebar .achievements .add-more-label {
          color: rgba(0, 0, 0, 0.6) !important;
        }
        
        .profile-skeleton .friends-skeleton {
          background: rgba(255, 255, 255, 0.9) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        
        .anime-profile-page .profile-stats,
        .anime-profile-page .friends-list {
          background: rgba(255, 255, 255, 0.9) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          color: rgba(0, 0, 0, 0.8) !important;
        }
        
        .anime-profile-page .profile-stats h3,
        .anime-profile-page .friends-list h3 {
          color: rgba(0, 0, 0, 0.9) !important;
        }
        
        .anime-profile-page .profile-stats p,
        .anime-profile-page .friends-list p {
          color: rgba(0, 0, 0, 0.8) !important;
        }
      ` : ''}
      
      /* Делаем заголовки категорий более заметными в зависимости от темы */
      .category-title {
        background: ${theme === 'dark'
        ? 'linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)'
        : 'linear-gradient(135deg, #000000 0%, rgba(0, 0, 0, 0.9) 100%)'} !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
        font-weight: ${theme === 'dark' ? '700' : '800'} !important;
        ${theme === 'light' ? 'text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;' : ''}
      }
      
      .category-title:hover {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      
      /* СПЕЦИАЛЬНОЕ исключение для admin-anime-subtabs - отключаем только hover контейнера */
      .admin-anime-subtabs {
        border-bottom-color: rgba(55, 65, 81, 0.3) !important;
      }
      
      .admin-anime-subtabs:hover,
      .admin-anime-subtabs:focus,
      .admin-anime-subtabs:active {
        border-bottom-color: rgba(55, 65, 81, 0.3) !important;
        border-color: rgba(55, 65, 81, 0.3) !important;
        color: inherit !important;
        background: transparent !important;
        border-image: none !important;
        box-shadow: none !important;
        outline: none !important;
      }
      
      /* Отключаем псевдоэлементы только у самого контейнера, НЕ у кнопок */
      .admin-anime-subtabs:hover::before,
      .admin-anime-subtabs:hover::after,
      .admin-anime-subtabs::before,
      .admin-anime-subtabs::after {
        display: none !important;
        content: none !important;
        border: none !important;
        background: none !important;
      }
      
      /* РАЗРЕШАЕМ активное состояние кнопок с цветами темы */
      .admin-anime-subtabs .admin-subtab.active {
        color: var(--primary-color) !important;
        background: var(--primary-bg) !important;
      }
      
      /* АКТИВНЫЕ ВКЛАДКИ ПРОФИЛЯ - ПОЛНОЕ ПЕРЕОПРЕДЕЛЕНИЕ */
      .profile-tabs .profile-tab.active,
      .profile-tab.active,
      body .profile-tab.active {
        color: #000 !important;
        background-color: var(--primary-color) !important;
        font-weight: 700 !important;
      }
      
      .profile-tab.active::before,
      .profile-tab.active::after {
        display: none !important;
      }
      
      .user-collections-block .tabs-container .tab-button.active,
      .tab-button.active,
      body .tab-button.active {
        color: #000 !important;
        background-color: var(--primary-color) !important;
        font-weight: 700 !important;
      }
      
      .tab-button.active::before,
      .tab-button.active::after {
        display: none !important;
      }
      
      /* ЗАГОЛОВКИ - АДАПТИВНЫЙ ЦВЕТ ПО ТЕМЕ */
      .user-collections-block h2,
      .now-watching h2 {
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      /* PROFILE ANIME CARD - АДАПТАЦИЯ ПОД ТЕМУ И ЦВЕТОВУЮ СХЕМУ */
      .profile-anime-card {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.05)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'} !important;
        backdrop-filter: blur(10px) !important;
      }
      
      .profile-anime-card:hover {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.1)'} !important;
        box-shadow: ${theme === 'light' ? '0 8px 30px rgba(0, 0, 0, 0.15)' : '0 12px 40px rgba(0, 0, 0, 0.3)'} !important;
      }
      
      .profile-anime-card:focus {
        outline: 2px solid var(--primary-color) !important;
      }
      
      .profile-anime-card-title {
        color: ${theme === 'light' ? '#1a1a1a' : '#ffffff'} !important;
      }
      
      .profile-anime-card-year {
        color: var(--primary-color) !important;
      }
      
      .profile-anime-card-season {
        color: ${theme === 'light' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'} !important;
      }
      
      .profile-anime-card-episodes {
        background: var(--primary-color) !important;
        border: 1px solid var(--primary-color) !important;
        color: #fff !important;
        opacity: ${theme === 'light' ? '0.9' : '0.8'} !important;
      }
      
      .profile-anime-card-progress {
        color: var(--primary-color) !important;
        opacity: 0.8 !important;
      }
      
      /* RECENT ACTIVITY - АДАПТАЦИЯ ПОД ТЕМУ И ЦВЕТОВУЮ СХЕМУ */
      .recent-activity {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : '#111'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : '#222'} !important;
        backdrop-filter: blur(10px) !important;
      }
      
      .recent-activity h2 {
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .recent-activity .activity-list li {
        border-bottom: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : '#222'} !important;
      }
      
      .recent-activity .activity-list li .text {
        color: ${theme === 'light' ? 'rgba(26, 26, 26, 0.8)' : '#ccc'} !important;
      }
      
      .recent-activity .activity-list li .text strong {
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .recent-activity .activity-list li .text a {
        color: var(--primary-color) !important;
      }
      
      .recent-activity .activity-list li .text .time {
        color: ${theme === 'light' ? 'rgba(26, 26, 26, 0.6)' : '#888'} !important;
      }
      
      .recent-activity .activity-list li .icon {
        color: var(--primary-color) !important;
      }
      
      .btn-toggle-activity {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'transparent'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.2)' : '#222'} !important;
        color: ${theme === 'light' ? '#000' : '#ccc'} !important;
      }
      
      .btn-toggle-activity:hover {
        background: var(--primary-color) !important;
        color: #fff !important;
        border-color: var(--primary-color) !important;
      }
      
      /* USER REVIEWS BLOCK - АДАПТАЦИЯ ПОД ТЕМУ И ЦВЕТОВУЮ СХЕМУ */
      .user-review-modern {
        background: ${theme === 'light'
        ? 'rgba(255, 255, 255, 0.8)'
        : `linear-gradient(135deg, rgba(var(--primary-color-rgb, 255, 165, 0), 0.015) 0%, rgba(17, 24, 39, 0.8) 100%)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)'
      } !important;
        backdrop-filter: blur(10px) !important;
      }
      
      .user-review-modern:hover {
        background: ${theme === 'light'
        ? 'rgba(255, 255, 255, 0.95)'
        : `linear-gradient(135deg, rgba(var(--primary-color-rgb, 255, 165, 0), 0.03) 0%, rgba(17, 24, 39, 0.9) 100%)`
      } !important;
        border-color: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.2)'
        : 'rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)'
      } !important;
        box-shadow: ${theme === 'light'
        ? '0 8px 25px rgba(0, 0, 0, 0.1)'
        : '0 8px 25px rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)'
      } !important;
      }
      
      .review-header-modern .avatar-modern {
        background: ${theme === 'light'
        ? 'rgba(255, 255, 255, 0.9)'
        : `radial-gradient(circle, rgba(30, 41, 59, 0.8) 0%, rgba(var(--primary-color-rgb, 255, 165, 0), 0.05) 100%)`
      } !important;
        border: 2px solid ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(var(--primary-color-rgb, 255, 165, 0), 0.12)'
      } !important;
      }
      
      .review-header-modern .avatar-modern:hover {
        border-color: var(--primary-color) !important;
        box-shadow: ${theme === 'light'
        ? '0 4px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)'
        : '0 4px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.12)'
      } !important;
      }
      
      .review-header-modern .avatar-modern > div {
        color: ${theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'var(--text-secondary)'} !important;
      }
      
      .review-meta-modern strong {
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .review-meta-modern strong:hover {
        color: var(--primary-color) !important;
      }
      
      .rating-stars-modern span {
        color: var(--primary-color) !important;
      }
      
      .review-content-modern .review-text-modern {
        color: ${theme === 'light' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.8)'} !important;
      }
      
      .rating-btn-load-more-more-modern,
      .rating-btn-load-more-collapse-all-modern {
        background: var(--primary-color) !important;
        border: 1px solid var(--primary-color) !important;
        color: #fff !important;
      }
      
      .rating-btn-load-more-more-modern:hover,
      .rating-btn-load-more-collapse-all-modern:hover {
        background: var(--primary-hover) !important;
        border-color: var(--primary-hover) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.25) !important;
      }
      
      
      /* REVIEW CARD КЛАССИЧЕСКИЙ - АДАПТАЦИЯ ПОД ТЕМУ И ЦВЕТОВУЮ СХЕМУ */
      .user-reviews-block .review-card,
      .review-card {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : '#1a1a1a'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
        backdrop-filter: blur(10px) !important;
        box-shadow: ${theme === 'light'
        ? '0 4px 20px rgba(0, 0, 0, 0.08)'
        : '0 0 10px rgba(0, 0, 0, 0.3)'
      } !important;
      }
      
      .user-reviews-block .review-card:hover,
      .review-card:hover {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(26, 26, 26, 0.8)'} !important;
        border-color: ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'var(--primary-color)'} !important;
        box-shadow: ${theme === 'light'
        ? '0 8px 30px rgba(0, 0, 0, 0.12)'
        : '0 8px 25px rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)'
      } !important;
        transform: translateY(-2px) !important;
      }
      
      /* Заголовок аниме в review-card */
      .review-card .anime-header-review .anime-info-review h3 {
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      /* Рейтинг в review-card */
      .review-card .anime-header-review .anime-info-review .rating {
        color: var(--primary-color) !important;
      }
      
      /* Текст отзыва */
      .review-card .review-text {
        color: ${theme === 'light' ? 'rgba(26, 26, 26, 0.8)' : '#ccc'} !important;
      }
      
      /* Время публикации */
      .review-card .timestamp {
        color: ${theme === 'light' ? 'rgba(26, 26, 26, 0.6)' : '#666'} !important;
      }
      
      /* PC SETTINGS - АДАПТАЦИЯ ПОД ТЕМУ И ЦВЕТОВУЮ СХЕМУ */
      .pc-acc-sett-providerr-container {
        background: ${theme === 'light' ? 'transparent' : 'transparent'} !important;
      }
      
      /* ОТКЛЮЧЕНИЕ ВЫДЕЛЕНИЯ ТЕКСТА В КОНТЕЙНЕРАХ НАСТРОЕК */
      .pc-acc-sett-providerr-container,
      .pc-acc-sett-providerr-right,
      .pc-acc-sett-providerr-preview,
      .pc-acc-sett-providerr-preview-card,
      .pc-acc-sett-providerr-left {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
      
      /* РАЗРЕШАЕМ ВЫДЕЛЕНИЕ ТОЛЬКО В ПОЛЯХ ВВОДА */
      .pc-acc-sett-providerr-input,
      .pc-acc-sett-providerr-textarea {
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
      }
      
      .pc-acc-sett-providerr-tab-btn {
        background: ${theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
        color: ${theme === 'light' ? '#333' : '#fff'} !important;
      }
      
      .pc-acc-sett-providerr-tab-btn:hover {
        background: ${theme === 'light' ? 'rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)' : 'rgba(var(--primary-color-rgb, 255, 165, 0), 0.08)'} !important;
        border-color: var(--primary-color) !important;
      }
      
      .pc-acc-sett-providerr-tab-btn.active {
        background: var(--primary-bg) !important;
        border-color: var(--primary-color) !important;
        color: var(--primary-color) !important;
      }
      
      .pc-acc-sett-providerr-right {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.02)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
        backdrop-filter: blur(10px) !important;
      }
      
      .pc-acc-sett-providerr-tab-header {
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .pc-acc-sett-providerr-category,
      .pc-acc-sett-providerr-label {
        color: ${theme === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)'} !important;
      }
      
      .pc-acc-sett-providerr-input,
      .pc-acc-sett-providerr-textarea,
      .pc-acc-sett-providerr-file {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.25)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.08)'} !important;
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .pc-acc-sett-providerr-input:focus,
      .pc-acc-sett-providerr-textarea:focus {
        border-color: var(--primary-color) !important;
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 255, 165, 0), 0.2) !important;
      }
      
      .pc-acc-sett-providerr-toggle-btn {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.08)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'} !important;
        color: ${theme === 'light' ? '#333' : '#fff'} !important;
      }
      
      .pc-acc-sett-providerr-toggle-btn:hover {
        background: var(--primary-bg) !important;
        border-color: var(--primary-color) !important;
        color: var(--primary-color) !important;
      }
      
      .pc-acc-sett-providerr-file-btn {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.08)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'} !important;
        color: ${theme === 'light' ? '#333' : '#fff'} !important;
      }
      
      .pc-acc-sett-providerr-file-btn:hover {
        background: var(--primary-bg) !important;
        border-color: var(--primary-color) !important;
        color: var(--primary-color) !important;
      }
      
      .pc-acc-sett-providerr-save {
        background: var(--primary-color) !important;
        color: #fff !important;
        border: 1px solid var(--primary-color) !important;
      }
      
      .pc-acc-sett-providerr-save:hover {
        background: var(--primary-hover) !important;
        border-color: var(--primary-hover) !important;
      }
      
      .pc-acc-sett-providerr-save:disabled {
        opacity: 0.6 !important;
      }
      
      .pc-acc-sett-providerr-cancel {
        background: transparent !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'} !important;
        color: ${theme === 'light' ? '#333' : '#fff'} !important;
      }
      
      .pc-acc-sett-providerr-cancel:hover {
        background: ${theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'} !important;
        border-color: ${theme === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'} !important;
      }
      
      .pc-acc-sett-providerr-preview-card {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.02)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
        backdrop-filter: blur(10px) !important;
      }
      
      .pc-acc-sett-providerr-preview-nick,
      .pc-acc-sett-providerr-preview-bio {
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .pc-acc-sett-providerr-warning {
        color: ${theme === 'light' ? '#d97706' : '#f59e0b'} !important;
      }
      
      /* MOBILE SETTINGS - АДАПТАЦИЯ ПОД ТЕМУ И ЦВЕТОВУЮ СХЕМУ */
      .mset-container {
        background: ${theme === 'light' ? 'transparent' : 'transparent'} !important;
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      /* ОТКЛЮЧЕНИЕ ВЫДЕЛЕНИЯ ТЕКСТА В МОБИЛЬНЫХ НАСТРОЙКАХ */
      .mset-container,
      .mset-content,
      .mset-preview-card,
      .mset-section,
      .mset-group {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
      
      /* РАЗРЕШАЕМ ВЫДЕЛЕНИЕ ТОЛЬКО В ПОЛЯХ ВВОДА */
      .mset-input,
      .mset-textarea {
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
      }
      
      .mset-topbar {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.7)'} !important;
        backdrop-filter: blur(10px) !important;
      }
      
      .mset-back {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.05)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'} !important;
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .mset-back:hover {
        background: var(--primary-bg) !important;
        border-color: var(--primary-color) !important;
        color: var(--primary-color) !important;
      }
      
      .mset-title {
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .mset-tab {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.03)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .mset-tab:hover {
        background: var(--primary-bg) !important;
        border-color: var(--primary-color) !important;
        color: var(--primary-color) !important;
      }
      
      .mset-category,
      .mset-label {
        color: ${theme === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)'} !important;
      }
      
      .mset-input,
      .mset-textarea {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.25)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.08)'} !important;
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .mset-input:focus,
      .mset-textarea:focus {
        border-color: var(--primary-color) !important;
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 255, 165, 0), 0.2) !important;
      }
      
      .mset-file-btn {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.08)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'} !important;
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .mset-file-btn:hover {
        background: var(--primary-bg) !important;
        border-color: var(--primary-color) !important;
        color: var(--primary-color) !important;
      }
      
      .mset-preview-card {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.02)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
      }
      
      .mset-preview-banner {
        background: ${theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)'} !important;
      }
      
      .mset-avatar-ph {
        background: ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
      }
      
      .mset-nick {
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .mset-bio {
        color: ${theme === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)'} !important;
      }
      
      .mset-save {
        background: var(--primary-color) !important;
        color: #fff !important;
      }
      
      .mset-save:hover {
        background: var(--primary-hover) !important;
      }
      
      .mset-save:disabled {
        opacity: 0.6 !important;
      }
      
      .mset-cancel {
        background: transparent !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'} !important;
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .mset-cancel:hover {
        background: ${theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'} !important;
        border-color: ${theme === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'} !important;
      }
      
      .mset-toggle {
        background: ${theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.08)'} !important;
        border: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'} !important;
        color: ${theme === 'light' ? '#000' : '#fff'} !important;
      }
      
      .mset-toggle:hover {
        background: var(--primary-bg) !important;
        border-color: var(--primary-color) !important;
        color: var(--primary-color) !important;
      }
      
      .mset-warning {
        color: ${theme === 'light' ? '#d97706' : '#f59e0b'} !important;
      }
      
      .mset-sticky {
        background: ${theme === 'light'
        ? 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 35%, rgba(255,255,255,0.85) 100%)'
        : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.85) 100%)'
      } !important;
        border-top: 1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
      }
      
      /* YUMEKO АДМИН САЙДБАР - АДАПТАЦИЯ ПОД ТЕМУ + ЦВЕТОВУЮ СХЕМУ */
      .yumeko-admin-sidebar {
        background: ${theme === 'light'
        ? `linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)`
        : `linear-gradient(180deg, #0d0d0d 0%, #121212 100%)`
      } !important;
        border-right: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 175, 82, 222), 0.15)`
        : `rgba(var(--primary-color-rgb, 175, 82, 222), 0.15)`
      } !important;
      }

      /* ВЕСЬ ТЕКСТ В САЙДБАРЕ */
      .yumeko-admin-sidebar p,
      .yumeko-admin-sidebar div,
      .yumeko-admin-sidebar a {
        color: ${theme === 'light' ? '#374151' : '#a1a1aa'} !important;
      }

      /* ЗАГОЛОВОК YUMEKO САЙДБАРА */
      .yumeko-admin-title {
        background: ${theme === 'light'
        ? 'linear-gradient(135deg, #1f1f1f 0%, #3f3f3f 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #c9c9c9 100%)'
      } !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
      }

      /* КНОПКИ НАВИГАЦИИ YUMEKO АДМИН САЙДБАРА */
      .yumeko-admin-nav-item span {
        color: ${theme === 'light' ? '#525252' : '#a1a1aa'} !important;
      }

      /* HOVER КНОПКИ НАВИГАЦИИ */
      .yumeko-admin-nav-item:hover {
        background: ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 175, 82, 222), 0.08)`
        : `rgba(var(--primary-color-rgb, 175, 82, 222), 0.08)`
      } !important;
      }

      .yumeko-admin-nav-item:hover span {
        color: ${theme === 'light' ? '#1f2937' : '#e4e4e7'} !important;
      }

      /* HOVER ИКОНКИ */
      .yumeko-admin-nav-item:hover svg {
        color: var(--primary-color, #af52de) !important;
      }

      /* АКТИВНАЯ КНОПКА НАВИГАЦИИ */
      .yumeko-admin-nav-item.active {
        background: ${theme === 'light'
        ? `linear-gradient(135deg, rgba(var(--primary-color-rgb, 175, 82, 222), 0.12) 0%, rgba(var(--primary-color-rgb, 175, 82, 222), 0.08) 100%)`
        : `linear-gradient(135deg, rgba(var(--primary-color-rgb, 175, 82, 222), 0.15) 0%, rgba(var(--primary-color-rgb, 175, 82, 222), 0.1) 100%)`
      } !important;
      }
      
      .yumeko-admin-nav-item.active span {
        color: ${theme === 'light' ? '#1f1f1f' : '#ffffff'} !important;
      }

      .yumeko-admin-nav-item.active svg {
        color: var(--primary-color, #af52de) !important;
      }
      
      /* АДМИН КОНТЕНТ - АДАПТАЦИЯ ПОД ТЕМУ + ЦВЕТОВУЮ СХЕМУ */
      .admin-content {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 3%, #f8fafc)`
        : `color-mix(in srgb, var(--primary-color) 5%, #0f0f0f)`
      } !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      /* ВЕСЬ ТЕКСТ В АДМИН КОНТЕНТЕ */
      .admin-content p,
      .admin-content div:not(.cell-id),
      .admin-content span:not(.cell-id span),
      .admin-content label,
      .admin-content a {
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      /* СПЕЦИАЛЬНО ДЛЯ CELL-ID В АДМИН КОНТЕНТЕ */
      .admin-content .cell-id,
      .admin-content .cell-id span {
        color: ${theme === 'light' ? '#1f2937' : '#ffffff'} !important;
      }

      /* АДМИН СЕКЦИЯ - АДАПТАЦИЯ ПОД ТЕМУ + ЦВЕТОВУЮ СХЕМУ */
      .admin-section {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 5%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 8%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
      } !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }
      
      /* ЗАГОЛОВКИ И ТЕКСТ В АДМИН СЕКЦИИ */
      .admin-section h1,
      .admin-section h2,
      .admin-section h3,
      .admin-section p,
      .admin-section span,
      .admin-section label {
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      /* FILTER SELECT - АДАПТАЦИЯ */
      .filter-select {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 5%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 10%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
      } !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      /* SEARCH INPUT - АДАПТАЦИЯ */
      .search-input {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 3%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 8%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
      } !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      .search-input:focus {
        border-color: var(--primary-color) !important;
        box-shadow: 0 0 0 3px ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
      } !important;
      }

      /* TABLE CONTAINER - АДАПТАЦИЯ */
      .table-container {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 2%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 5%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
      } !important;
      }

      /* TABLE HEADER - АДАПТАЦИЯ */
      .table-header {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 10%, #f3f4f6)`
        : `color-mix(in srgb, var(--primary-color) 15%, #1f1f1f)`
      } !important;
        border: 2px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
      } !important;
        color: ${theme === 'light' ? '#111827' : '#f9fafb'} !important;
      }

      /* TABLE ROW - АДАПТАЦИЯ С HOVER */
      .table-row {
        background: transparent !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        transition: all 0.2s ease !important;
      }

      .table-row:hover {
        background: ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.06)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
      } !important;
        border-left: 3px solid var(--primary-color) !important;
        transform: translateX(2px) !important;
      }

      .table-row:hover td {
        color: ${theme === 'light' ? '#111827' : '#f3f4f6'} !important;
      }

      /* ADD BUTTON - АДАПТАЦИЯ */
      .add-button {
        background: ${theme === 'light'
        ? `linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 80%, #000000) 100%)`
        : `linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 90%, #000000) 100%)`
      } !important;
        color: #ffffff !important;
        border: none !important;
        box-shadow: ${theme === 'light'
        ? `0 4px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
        : `0 4px 20px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
      } !important;
      }

      .add-button:hover {
        transform: translateY(-2px) !important;
        box-shadow: ${theme === 'light'
        ? `0 6px 20px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
        : `0 8px 25px rgba(var(--primary-color-rgb, 255, 165, 0), 0.5)`
      } !important;
      }

      /* PAGINATION ANIME - АДАПТАЦИЯ */
      .pagination-anime {
        background: ${theme === 'light'
        ? `rgba(255, 255, 255, 0.8)`
        : `rgba(26, 26, 26, 0.8)`
      } !important;
        padding: 12px !important;
        border-radius: 8px !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
      } !important;
      }

      /* PAGE BUTTON ANIME - АДАПТАЦИЯ */
      .page-button-anime {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 5%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 10%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
      } !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
      }

      .page-button-anime:hover {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 10%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 15%, #1a1a1a)`
      } !important;
        border-color: var(--primary-color) !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      /* PAGE BUTTON ANIME ACTIVE - АДАПТАЦИЯ */
      .page-button-anime.active {
        background: var(--primary-color) !important;
        color: #ffffff !important;
        border-color: var(--primary-color) !important;
        font-weight: 600 !important;
        box-shadow: ${theme === 'light'
        ? `0 2px 8px rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
        : `0 3px 12px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
      } !important;
      }

      /* ID BADGE - АДАПТАЦИЯ ТОЛЬКО ДЛЯ СВЕТЛОЙ ТЕМЫ */
      .id-badge {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 90%, #000000)`
        : '#000000'
      } !important;
        color: #ffffff !important;
        border: 1px solid ${theme === 'light'
        ? 'var(--primary-color)'
        : '#333333'
      } !important;
        padding: 4px 8px !important;
        border-radius: 6px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
      }

      /* ANIME TITLE - АДАПТАЦИЯ ТОЛЬКО ДЛЯ СВЕТЛОЙ ТЕМЫ */
      .anime-title {
        color: ${theme === 'light'
        ? '#111827'
        : '#ffffff'
      } !important;
        font-weight: 600 !important;
        transition: color 0.2s ease !important;
      }

      .anime-title:hover {
        color: ${theme === 'light'
        ? 'var(--primary-color)'
        : '#ffffff'
      } !important;
        text-decoration: ${theme === 'light' ? 'underline' : 'none'} !important;
      }

      /* TITLE WRAPPER - БЕЗ ФОНА */
      .title-wrapper {
        background: transparent !important;
      }

      /* CELL - АДАПТАЦИЯ ТОЛЬКО ДЛЯ СВЕТЛОЙ ТЕМЫ */
      .cell {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 3%, #ffffff)`
        : 'transparent'
      } !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.08)`
        : 'transparent'
      } !important;
      }

      /* CELL-TYPE - БЕЗ ФОНА */
      .cell-type,
      .cell.cell-type {
        background: transparent !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
        font-weight: 500 !important;
        padding: 8px 12px !important;
      }

      /* CELL-YEAR - БЕЗ ФОНА */
      .cell-year,
      .cell.cell-year {
        background: transparent !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
      }

      /* CELL-STATUS - БЕЗ ФОНА */
      .cell-status,
      .cell.cell-status {
        background: transparent !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
      }

      /* CELL-ACTIONS - БЕЗ ФОНА */
      .cell-actions,
      .cell.cell-actions {
        background: transparent !important;
      }

      /* CELL-ID - БЕЗ ФОНА И БЕЛЫЙ ТЕКСТ НА ТЕМНОЙ ТЕМЕ */
      .cell-id,
      .cell.cell-id {
        background: transparent !important;
        color: ${theme === 'light' ? '#1f2937' : '#ffffff'} !important;
        font-weight: 600 !important;
      }
      
      /* TYPE TAG - АДАПТАЦИЯ ТОЛЬКО ДЛЯ СВЕТЛОЙ ТЕМЫ */
      .type-tag {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 10%, #f3f4f6)`
        : 'rgba(255, 255, 255, 0.1)'
      } !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : 'rgba(255, 255, 255, 0.2)'
      } !important;
        padding: 4px 12px !important;
        border-radius: 20px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
      }

      /* ADMIN ANIME UPDATES TABLE - АДАПТАЦИЯ ТОЛЬКО ДЛЯ СВЕТЛОЙ ТЕМЫ */
      .admin-anime-updates-table {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 2%, #ffffff)`
        : 'transparent'
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : 'transparent'
      } !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      .admin-anime-updates-table th {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 8%, #f9fafb)`
        : 'transparent'
      } !important;
        color: ${theme === 'light' ? '#111827' : '#f3f4f6'} !important;
        border-bottom: 2px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : 'rgba(255, 255, 255, 0.1)'
      } !important;
        font-weight: 600 !important;
      }

      .admin-anime-updates-table td {
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        border-bottom: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.05)`
        : 'rgba(255, 255, 255, 0.05)'
      } !important;
      }

      .admin-anime-updates-table tr:hover {
        background: ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.05)`
        : 'transparent'
      } !important;
      }

      .admin-anime-updates-table tr:hover td {
        color: ${theme === 'light' ? '#111827' : '#e5e7eb'} !important;
      }

      /* ADMIN ANIME UPDATES TABLE HEADER - АДАПТАЦИЯ ТОЛЬКО ДЛЯ СВЕТЛОЙ ТЕМЫ */
      .admin-anime-updates-table-header {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 10%, #f3f4f6)`
        : 'transparent'
      } !important;
        border: 2px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : 'rgba(255, 255, 255, 0.1)'
      } !important;
        color: ${theme === 'light' ? '#111827' : '#f9fafb'} !important;
        padding: 16px 20px !important;
        font-weight: 700 !important;
        border-radius: 12px 12px 0 0 !important;
      }

      .admin-anime-updates-table-header h1,
      .admin-anime-updates-table-header h2,
      .admin-anime-updates-table-header h3,
      .admin-anime-updates-table-header span {
        color: ${theme === 'light' ? '#111827' : '#f9fafb'} !important;
      }

      /* ADMIN ANIME UPDATES SYNC BTN - АДАПТАЦИЯ ПОД ОБЕ ТЕМЫ */
      .admin-anime-updates-sync-btn {
        background: ${theme === 'light'
        ? `linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 80%, #000000) 100%)`
        : `linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 70%, #000000) 100%)`
      } !important;
        color: #ffffff !important;
        border: 1px solid var(--primary-color) !important;
        box-shadow: ${theme === 'light'
        ? `0 2px 10px rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
        : `0 3px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
      } !important;
        font-weight: 600 !important;
        transition: all 0.3s ease !important;
      }

      .admin-anime-updates-sync-btn:hover {
        transform: translateY(-2px) !important;
        box-shadow: ${theme === 'light'
        ? `0 4px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
        : `0 6px 20px rgba(var(--primary-color-rgb, 255, 165, 0), 0.5)`
      } !important;
      }

      .admin-anime-updates-sync-btn.active {
        animation: pulse 2s infinite !important;
        background: var(--primary-color) !important;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      /* ADMIN ANIME UPDATES FILTER SELECT - АДАПТАЦИЯ ПОД ОБЕ ТЕМЫ */
      .admin-anime-updates-filter-select {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 5%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 10%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
      } !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
      }

      .admin-anime-updates-filter-select:hover {
        border-color: ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
      } !important;
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 8%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 15%, #1a1a1a)`
      } !important;
      }
      
      .admin-anime-updates-filter-select:focus {
        border-color: var(--primary-color) !important;
        box-shadow: 0 0 0 3px ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
      } !important;
        outline: none !important;
      }

      .admin-anime-updates-filter-select option {
        background: ${theme === 'light' ? '#ffffff' : '#1a1a1a'} !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      /* MODERN ADMIN USERS - АДАПТАЦИЯ ПОД ТЕМУ + ЦВЕТОВУЮ СХЕМУ */
      .modern-admin-users {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 2%, #f8fafc)`
        : `color-mix(in srgb, var(--primary-color) 4%, #0f0f0f)`
      } !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      /* ADMIN USERS CONTAINER - АДАПТАЦИЯ */
      .admin-users-container {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 3%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 6%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
      } !important;
        border-radius: 12px !important;
      }

      /* SORT BUTTON - АДАПТАЦИЯ */
      .sort-button {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 5%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 10%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
      } !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
      }

      .sort-button:hover {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 10%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 15%, #1a1a1a)`
      } !important;
        border-color: var(--primary-color) !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }

      .sort-button.active {
        background: var(--primary-color) !important;
        color: #ffffff !important;
        border-color: var(--primary-color) !important;
        font-weight: 600 !important;
      }

      /* MODERN USER CARD - АДАПТАЦИЯ */
      .modern-user-card {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 3%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 8%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.12)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
      } !important;
        box-shadow: ${theme === 'light'
        ? `0 2px 8px rgba(var(--primary-color-rgb, 255, 165, 0), 0.08)`
        : `0 3px 12px rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
      } !important;
        border-radius: 12px !important;
        transition: all 0.3s ease !important;
      }

      .modern-user-card:hover {
        transform: translateY(-4px) !important;
        box-shadow: ${theme === 'light'
        ? `0 6px 20px rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
        : `0 8px 25px rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
      } !important;
        border-color: ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.35)`
      } !important;
      }

      .modern-user-card h3,
      .modern-user-card .user-name {
        color: ${theme === 'light' ? '#111827' : '#f9fafb'} !important;
        font-weight: 600 !important;
      }

      .modern-user-card p,
      .modern-user-card .user-info {
        color: ${theme === 'light' ? '#6b7280' : '#9ca3af'} !important;
      }

      /* PAGINATION BTN - АДАПТАЦИЯ */
      .pagination-btn {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 5%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 10%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
      } !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
      }

      .pagination-btn:hover:not(:disabled) {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 10%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 15%, #1a1a1a)`
      } !important;
        border-color: var(--primary-color) !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
        transform: translateY(-1px) !important;
      }

      .pagination-btn.active {
        background: var(--primary-color) !important;
        color: #ffffff !important;
        border-color: var(--primary-color) !important;
        font-weight: 600 !important;
        box-shadow: ${theme === 'light'
        ? `0 2px 8px rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
        : `0 3px 12px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
      } !important;
      }
      
      .pagination-btn:disabled {
        background: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.02)'
      } !important;
        color: ${theme === 'light' ? '#9ca3af' : '#4b5563'} !important;
        border-color: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.08)'
      } !important;
        cursor: not-allowed !important;
      }

      /* PAGE INFO - АДАПТАЦИЯ */
      .page-info {
        background: ${theme === 'light'
        ? `rgba(255, 255, 255, 0.9)`
        : `rgba(26, 26, 26, 0.9)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
      } !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        padding: 8px 16px !important;
        border-radius: 8px !important;
        font-weight: 500 !important;
      }
      
      .page-info .current-page {
        color: var(--primary-color) !important;
        font-weight: 700 !important;
      }
      
      /* ADMIN CATEGORY LOADING - АДАПТАЦИЯ */
      .admin-category-loading {
        background: ${theme === 'light'
        ? `rgba(255, 255, 255, 0.95)`
        : `rgba(26, 26, 26, 0.95)`
      } !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
      }

      /* LOADING CONTENT - АДАПТАЦИЯ */
      .loading-content {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 3%, #f3f4f6)`
        : `color-mix(in srgb, var(--primary-color) 8%, #1a1a1a)`
      } !important;
        position: relative !important;
        overflow: hidden !important;
      }

      .loading-content::after {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: ${theme === 'light'
        ? `linear-gradient(90deg, transparent, rgba(var(--primary-color-rgb, 255, 165, 0), 0.1), transparent)`
        : `linear-gradient(90deg, transparent, rgba(var(--primary-color-rgb, 255, 165, 0), 0.2), transparent)`
      } !important;
        animation: shimmer 1.5s infinite !important;
      }

      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }

      /* CATEGORY SELECTOR WRAPPER - АДАПТАЦИЯ */
      .category-selector-wrapper {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 3%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 6%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
      } !important;
        border-radius: 12px !important;
        padding: 12px !important;
      }

      /* CATEGORY CHIP - АДАПТАЦИЯ */
      .category-chip {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 5%, #f9fafb)`
        : `color-mix(in srgb, var(--primary-color) 10%, #262626)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
      } !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        padding: 6px 12px !important;
        border-radius: 20px !important;
        font-weight: 500 !important;
        transition: all 0.2s ease !important;
        cursor: pointer !important;
      }

      .category-chip:hover {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 10%, #f9fafb)`
        : `color-mix(in srgb, var(--primary-color) 15%, #262626)`
      } !important;
        border-color: var(--primary-color) !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
      }
      
      .category-chip.active {
        background: var(--primary-color) !important;
        color: #ffffff !important;
        border-color: var(--primary-color) !important;
        font-weight: 600 !important;
        box-shadow: ${theme === 'light'
        ? `0 2px 8px rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
        : `0 3px 12px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
      } !important;
      }

      /* SCROLL BTN - АДАПТАЦИЯ */
      .scroll-btn {
        background: ${theme === 'light'
        ? `linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 80%, #000000) 100%)`
        : `linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 70%, #000000) 100%)`
      } !important;
        color: #ffffff !important;
        border: none !important;
        box-shadow: ${theme === 'light'
        ? `0 4px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
        : `0 6px 20px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
      } !important;
        border-radius: 50% !important;
        transition: all 0.3s ease !important;
      }

      .scroll-btn:hover {
        transform: scale(1.1) !important;
        box-shadow: ${theme === 'light'
        ? `0 6px 20px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
        : `0 8px 25px rgba(var(--primary-color-rgb, 255, 165, 0), 0.5)`
      } !important;
      }

      /* ADMIN CATEGORY BLOCK - АДАПТАЦИЯ */
      .admin-category-block {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 4%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 8%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.12)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
      } !important;
        border-radius: 12px !important;
        padding: 16px !important;
        transition: all 0.3s ease !important;
      }

      .admin-category-block:hover {
        box-shadow: ${theme === 'light'
        ? `0 4px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `0 6px 20px rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
      } !important;
        border-color: ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
      } !important;
      }

      .admin-category-block h3 {
        color: ${theme === 'light' ? '#111827' : '#f9fafb'} !important;
      }
      
      /* ICONS - АДАПТАЦИЯ */
      .admin-panel .icon,
      .admin-panel svg,
      .admin-panel i {
        color: ${theme === 'light' ? '#6b7280' : '#9ca3af'} !important;
        transition: color 0.2s ease !important;
      }

      .admin-panel button:hover .icon,
      .admin-panel button:hover svg,
      .admin-panel button:hover i {
        color: var(--primary-color) !important;
      }

      .admin-panel .active .icon,
      .admin-panel .active svg,
      .admin-panel .active i {
        color: var(--primary-color) !important;
      }

      /* CATEGORY LOCAL SEARCH - АДАПТАЦИЯ */
      .category-local-search {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 3%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 8%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
      } !important;
        color: ${theme === 'light' ? '#1f2937' : '#e5e7eb'} !important;
        padding: 10px 16px !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        transition: all 0.2s ease !important;
      }
      
      .category-local-search:focus {
        border-color: var(--primary-color) !important;
        box-shadow: 0 0 0 3px ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
      } !important;
        outline: none !important;
      }

      .category-local-search::placeholder {
        color: ${theme === 'light' ? '#9ca3af' : '#6b7280'} !important;
      }

      /* PROFILE ANIME CARD НОВЫЕ ЭЛЕМЕНТЫ - АДАПТАЦИЯ */
      .profile-anime-card-voices {
        margin-top: 8px !important;
      }

      .profile-anime-card-voice-item {
        padding: 2px 0 !important;
      }

      .voice-name {
        color: ${theme === 'light' ? 'rgba(31, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)'} !important;
        font-weight: 500 !important;
      }

      .voice-count {
        color: var(--primary-color) !important;
        font-weight: 600 !important;
      }

      .profile-anime-card-voice-more {
        color: ${theme === 'light' ? 'rgba(31, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.6)'} !important;
        font-weight: 500 !important;
      }

      .profile-anime-card-bottom {
        margin-top: auto !important;
        display: flex !important;
        justify-content: flex-end !important;
        align-items: center !important;
        gap: 8px !important;
      }

      .profile-anime-progress-button {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 12%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 15%, #000000)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
      } !important;
        color: var(--primary-color) !important;
        border-radius: 8px !important;
        padding: 6px 10px !important;
        font-size: 10px !important;
        font-weight: 600 !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        text-decoration: none !important;
        white-space: nowrap !important;
      }

      .profile-anime-progress-button:hover {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 18%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 25%, #000000)`
      } !important;
        border-color: var(--primary-color) !important;
        transform: translateY(-1px) !important;
        box-shadow: ${theme === 'light'
        ? `0 2px 8px rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
        : `0 3px 12px rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
      } !important;
      }

      .profile-anime-progress-button:active {
        transform: translateY(0) !important;
      }

      .profile-anime-progress-button svg {
        width: 14px !important;
        height: 14px !important;
        stroke-width: 2.5 !important;
        color: var(--primary-color) !important;
        stroke: var(--primary-color) !important;
      }

      .profile-anime-card-episodes {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 90%, #000000)`
        : `rgba(124, 92, 255, 0.8)`
      } !important;
        color: #ffffff !important;
        border: 1px solid ${theme === 'light'
        ? 'var(--primary-color)'
        : 'rgba(124, 92, 255, 0.3)'
      } !important;
        font-size: 10px !important;
        font-weight: 600 !important;
        padding: 4px 8px !important;
        border-radius: 6px !important;
        white-space: nowrap !important;
      }

      /* PROGRESS MODAL - АДАПТАЦИЯ */
      .progress-modal-backdrop {
        background: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.5)'
        : 'rgba(0, 0, 0, 0.75)'
      } !important;
      }

      .progress-modal {
        background: ${theme === 'light'
        ? '#ffffff'
        : '#1a1a1a'
      } !important;
        border: 1px solid ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.1)'
      } !important;
      }

      .progress-modal-header {
        border-bottom: 1px solid ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.1)'
      } !important;
      }

      .progress-modal-title {
        color: ${theme === 'light' ? '#1a1a1a' : '#ffffff'} !important;
      }

      .progress-modal-anime-title {
        color: ${theme === 'light' ? '#666666' : 'rgba(255, 255, 255, 0.7)'} !important;
      }

      .progress-modal-close {
        background: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.1)'
      } !important;
        color: ${theme === 'light' ? '#1a1a1a' : '#ffffff'} !important;
      }

      .progress-modal-close:hover {
        background: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.2)'
      } !important;
      }

      .progress-episode-item {
        background: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.02)'
        : 'rgba(255, 255, 255, 0.03)'
      } !important;
        border: 1px solid ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.08)'
        : 'rgba(255, 255, 255, 0.08)'
      } !important;
      }

      .progress-episode-item:hover {
        background: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.04)'
        : 'rgba(255, 255, 255, 0.05)'
      } !important;
        border-color: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.12)'
        : 'rgba(255, 255, 255, 0.12)'
      } !important;
      }

      .progress-episode-number {
        color: ${theme === 'light' ? '#1a1a1a' : '#ffffff'} !important;
      }

      .progress-episode-count {
        color: ${theme === 'light' ? '#666666' : 'rgba(255, 255, 255, 0.5)'} !important;
        background: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.08)'
        : 'rgba(255, 255, 255, 0.08)'
      } !important;
      }

      .progress-voice-name {
        color: ${theme === 'light' ? '#1a1a1a' : '#ffffff'} !important;
      }

      .progress-voice-source {
        color: ${theme === 'light' ? '#666666' : 'rgba(255, 255, 255, 0.5)'} !important;
        background: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.08)'
        : 'rgba(255, 255, 255, 0.08)'
      } !important;
      }

      .progress-bar {
        background: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.1)'
      } !important;
      }

      .progress-time {
        color: ${theme === 'light' ? '#666666' : 'rgba(255, 255, 255, 0.6)'} !important;
      }

      .progress-date {
        color: ${theme === 'light' ? '#999999' : 'rgba(255, 255, 255, 0.4)'} !important;
      }

      .loading-spinner {
        border-color: ${theme === 'light'
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.1)'
      } !important;
        border-top-color: var(--primary-color) !important;
      }

      /* ANIME COVER CONTAINER - АДАПТАЦИЯ */
      .anime-cover-container {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 2%, #f9fafb)`
        : `color-mix(in srgb, var(--primary-color) 5%, #1a1a1a)`
      } !important;
        border: 2px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
      } !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        position: relative !important;
        transition: all 0.3s ease !important;
      }

      .anime-cover-container:hover {
        border-color: var(--primary-color) !important;
        box-shadow: ${theme === 'light'
        ? `0 8px 25px rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : `0 10px 30px rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
      } !important;
        transform: scale(1.02) !important;
      }

      .anime-cover-container img {
        transition: transform 0.3s ease !important;
      }

      .anime-cover-container:hover img {
        transform: scale(1.05) !important;
      }

      /* ADMIN CATEGORY CONTAINER - БЕЗ ФОНА */
      .admin-category-container {
        background: transparent !important;
        background-color: transparent !important;
      }

      /* ADMIN TABLE - АДАПТАЦИЯ */
      .admin-table {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 2%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 5%, #1a1a1a)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
      } !important;
        border-radius: 12px !important;
        overflow: hidden !important;
      }

      .admin-table thead {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 5%, #f9fafb)`
        : `color-mix(in srgb, var(--primary-color) 10%, #262626)`
      } !important;
      }

      .admin-table th {
        background: transparent !important;
        color: ${theme === 'light' ? '#111827' : '#f3f4f6'} !important;
        font-weight: 600 !important;
        border-bottom: 2px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.25)`
      } !important;
        padding: 12px 16px !important;
      }

      .admin-table td {
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        border-bottom: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.05)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
      } !important;
        padding: 12px 16px !important;
      }

      .admin-table tbody tr {
        transition: all 0.2s ease !important;
      }

      .admin-table tbody tr:hover {
        background: ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.04)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.08)`
      } !important;
      }

      /* ADMIN TABLE HEADER - АДАПТАЦИЯ */
      .admin-table-header {
        background: ${theme === 'light'
        ? `linear-gradient(135deg, 
              color-mix(in srgb, var(--primary-color) 12%, #f3f4f6) 0%, 
              color-mix(in srgb, var(--primary-color) 6%, #f9fafb) 100%)`
        : `linear-gradient(135deg, 
              color-mix(in srgb, var(--primary-color) 18%, #1f1f1f) 0%, 
              color-mix(in srgb, var(--primary-color) 10%, #262626) 100%)`
      } !important;
        border: 2px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.2)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
      } !important;
        color: ${theme === 'light' ? '#111827' : '#f9fafb'} !important;
        padding: 20px 24px !important;
        border-radius: 12px 12px 0 0 !important;
        font-weight: 700 !important;
        font-size: 18px !important;
        box-shadow: ${theme === 'light'
        ? `0 2px 8px rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
        : `0 3px 12px rgba(var(--primary-color-rgb, 255, 165, 0), 0.15)`
      } !important;
      }

      .admin-table-header h1,
      .admin-table-header h2,
      .admin-table-header h3 {
        color: ${theme === 'light' ? '#111827' : '#f9fafb'} !important;
        margin: 0 !important;
      }

      .admin-table-header .header-actions {
        display: flex !important;
        gap: 12px !important;
        align-items: center !important;
      }

      .admin-table-header .header-subtitle {
        color: ${theme === 'light' ? '#6b7280' : '#9ca3af'} !important;
        font-size: 14px !important;
        font-weight: 400 !important;
        margin-top: 4px !important;
      }

      /* ADMIN TABLE ROW - АДАПТАЦИЯ */
      .admin-table-row {
        background: transparent !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        transition: all 0.2s ease !important;
        border-bottom: 1px solid ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.05)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.08)`
      } !important;
      }

      .admin-table-row:hover {
        background: ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.06)`
        : `rgba(var(--primary-color-rgb, 255, 165, 0), 0.1)`
      } !important;
        border-left: 3px solid var(--primary-color) !important;
        transform: translateX(2px) !important;
      }

      .admin-table-row:hover td {
        color: ${theme === 'light' ? '#111827' : '#f3f4f6'} !important;
      }

      .admin-table-row.active {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 8%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 12%, #1a1a1a)`
      } !important;
        border-left: 3px solid var(--primary-color) !important;
      }

      .admin-table-row.active td {
        color: ${theme === 'light' ? '#111827' : '#ffffff'} !important;
        font-weight: 500 !important;
      }

      .admin-table-row td {
        padding: 12px 16px !important;
        vertical-align: middle !important;
      }

      .admin-table-row:first-child {
        border-top: none !important;
      }

      .admin-table-row:last-child {
        border-bottom: none !important;
      }

      /* SIDEBAR TOGGLE - АДАПТАЦИЯ */
      .sidebar-toggle {
        background: ${theme === 'light'
        ? `linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 85%, #000000) 100%)`
        : `linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 75%, #000000) 100%)`
      } !important;
        color: #ffffff !important;
        border: 1px solid var(--primary-color) !important;
        box-shadow: ${theme === 'light'
        ? `0 2px 10px rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
        : `0 3px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
      } !important;
        border-radius: 8px !important;
        padding: 10px !important;
        transition: all 0.3s ease !important;
        cursor: pointer !important;
      }

      .sidebar-toggle:hover {
        transform: translateX(2px) !important;
        box-shadow: ${theme === 'light'
        ? `0 4px 15px rgba(var(--primary-color-rgb, 255, 165, 0), 0.4)`
        : `0 6px 20px rgba(var(--primary-color-rgb, 255, 165, 0), 0.5)`
      } !important;
      }

      .sidebar-toggle:active {
        transform: scale(0.95) !important;
      }

      .sidebar-toggle svg,
      .sidebar-toggle .icon,
      .sidebar-toggle i {
        color: #ffffff !important;
        fill: #ffffff !important;
        transition: transform 0.3s ease !important;
      }

      .sidebar-toggle:hover svg,
      .sidebar-toggle:hover .icon,
      .sidebar-toggle:hover i {
        transform: rotate(180deg) !important;
      }

      .sidebar-toggle.collapsed {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 20%, #ffffff)`
        : `color-mix(in srgb, var(--primary-color) 25%, #1a1a1a)`
      } !important;
        color: ${theme === 'light' ? 'var(--primary-color)' : '#ffffff'} !important;
      }

      .sidebar-toggle.collapsed svg,
      .sidebar-toggle.collapsed .icon,
      .sidebar-toggle.collapsed i {
        color: ${theme === 'light' ? 'var(--primary-color)' : '#ffffff'} !important;
        fill: ${theme === 'light' ? 'var(--primary-color)' : '#ffffff'} !important;
      }

      /* COLLECTION MOBILE SECTION TABS - ИСПРАВЛЕНИЕ HOVER */
      .collection-mobile-section-tabs {
        pointer-events: auto !important;
      }

      .collection-mobile-section-tabs:hover .collection-mobile-section-tab {
        /* Отменяем подсветку всех кнопок при наведении на контейнер */
        background: rgba(255, 255, 255, 0.05) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
      }

      .collection-mobile-section-tabs:hover .collection-mobile-section-tab.active {
        /* Активная кнопка остается активной */
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 15%, #f0f0f0)`
        : `rgba(124, 92, 255, 0.22)`
      } !important;
        border-color: ${theme === 'light'
        ? `var(--primary-color)`
        : `rgba(124, 92, 255, 0.45)`
      } !important;
      }

      /* Только конкретная кнопка подсвечивается при наведении */
      .collection-mobile-section-tab:hover {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 8%, #ffffff)`
        : `rgba(255, 255, 255, 0.1)`
      } !important;
        border-color: ${theme === 'light'
        ? `rgba(var(--primary-color-rgb, 255, 165, 0), 0.3)`
        : `rgba(255, 255, 255, 0.2)`
      } !important;
      }

      .collection-mobile-section-tab {
        background: ${theme === 'light'
        ? `rgba(0, 0, 0, 0.03)`
        : `rgba(255, 255, 255, 0.05)`
      } !important;
        border: 1px solid ${theme === 'light'
        ? `rgba(0, 0, 0, 0.08)`
        : `rgba(255, 255, 255, 0.08)`
      } !important;
        color: ${theme === 'light' ? '#374151' : '#d1d5db'} !important;
        transition: all 0.2s ease !important;
      }

      .collection-mobile-section-tab.active {
        background: ${theme === 'light'
        ? `color-mix(in srgb, var(--primary-color) 15%, #f0f0f0)`
        : `rgba(124, 92, 255, 0.22)`
      } !important;
        border-color: ${theme === 'light'
        ? `var(--primary-color)`
        : `rgba(124, 92, 255, 0.45)`
      } !important;
        color: ${theme === 'light' ? 'var(--primary-color)' : '#ffffff'} !important;
        font-weight: 600 !important;
      }
      
      /* ФИНАЛЬНОЕ МАКСИМАЛЬНОЕ ПЕРЕОПРЕДЕЛЕНИЕ PROFILE TABS - УБИВАЕМ ВСЕ СТАРЫЕ СТИЛИ */
      html body .profile-tab.active,
      html body .profile-tabs .profile-tab.active,
      .profile-tab.active,
      .profile-tabs .profile-tab.active {
        color: #000 !important;
        background-color: var(--primary-color) !important;
        font-weight: 700 !important;
      }
      
      html body .tab-button.active,
      html body .user-collections-block .tab-button.active,
      .tab-button.active,
      .user-collections-block .tab-button.active {
        color: #000 !important;
        background-color: var(--primary-color) !important;
        font-weight: 700 !important;
      }
      
    `;

    // Добавляем стиль в самый конец head для максимального приоритета
    document.head.appendChild(styleElement);


    // Сохраняем в localStorage
    localStorage.setItem('theme', theme);
    localStorage.setItem('colorScheme', colorScheme);
  }, [theme, colorScheme]);

  // Функция для сохранения настроек темы на сервер
  const saveThemeSettings = async (newTheme?: Theme, newColorScheme?: ColorScheme) => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('Пользователь не авторизован, настройки сохранены только локально');
        return;
      }

      const settings: { theme?: string; colorScheme?: string } = {};
      if (newTheme) settings.theme = newTheme;
      if (newColorScheme) settings.colorScheme = newColorScheme;

      if (Object.keys(settings).length === 0) {
        console.log('Нечего сохранять - настройки пусты');
        return;
      }

      console.log('Отправка настроек темы на сервер:', settings);

      const response = await fetch(`${API_SERVER}/api/profile/theme-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Настройки темы успешно сохранены на сервер:', data);
      } else {
        const errorText = await response.text();
        console.error('❌ Не удалось сохранить настройки темы на сервер. Статус:', response.status, 'Ответ:', errorText);
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения настроек темы на сервер:', error);
    }
  };

  // Обёртка для setTheme с сохранением на сервер
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    saveThemeSettings(newTheme, undefined);
  };

  // Обёртка для setColorScheme с сохранением на сервер
  const handleSetColorScheme = (newColorScheme: ColorScheme) => {
    setColorScheme(newColorScheme);
    localStorage.setItem('colorScheme', newColorScheme);
    saveThemeSettings(undefined, newColorScheme);
  };

  // Обёртка для setLayoutMode с сохранением в localStorage
  const handleSetLayoutMode = (newLayoutMode: LayoutMode) => {
    setLayoutMode(newLayoutMode);
    localStorage.setItem('layoutMode', newLayoutMode);
    // Применяем класс к layout
    if (typeof window !== 'undefined') {
      document.body.classList.remove('layout-centered', 'layout-fullscreen');
      document.body.classList.add(`layout-${newLayoutMode}`);
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      colorScheme,
      layoutMode,
      setTheme: handleSetTheme,
      setColorScheme: handleSetColorScheme,
      setLayoutMode: handleSetLayoutMode,
      loadUserThemeSettings,
      resetToDefaultTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Хук для использования темы
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};