# Yumeko Profile - Steam + Discord Style

Новый компонент профиля пользователя в стиле Steam + Discord для Yumeko.

## Структура

```
yumeko-anime-profile/
├── yumeko-profile-provider.tsx          # Главный компонент профиля
├── hooks/
│   └── useYumekoProfile.ts              # Хук для загрузки данных профиля
├── yumeko-profile-components/
│   ├── YumekoProfileBackground.tsx      # Фоновое изображение
│   ├── YumekoProfileHeader.tsx          # Шапка профиля (баннер, аватар, инфо)
│   ├── YumekoProfileSidebar.tsx         # Боковая панель (друзья, статистика)
│   └── YumekoProfileContent.tsx         # Основной контент (вкладки, аниме)
└── styles-for-profile/
    └── yumeko-profile.scss              # Стили в стиле Steam + Discord
```

## Особенности

### Дизайн
- **Steam-style**: Темная цветовая схема (#1b2838, #171a21, #2a475e)
- **Discord-style**: Современные карточки и элементы UI
- **Кастомные цвета**: Поддержка персональных цветов профиля через CSS переменные
- **Градиенты**: Плавные переходы и свечения
- **Адаптивность**: Полная поддержка мобильных устройств

### Функционал
- Загрузка данных профиля из API
- Поддержка анимированных аватаров и баннеров
- Система бейджей и ролей
- Список друзей с уведомлениями о заявках
- Статистика пользователя
- Вкладки контента (Обзор, Смотрю, Избранное, Отзывы)
- Поддержка банов и мутов
- Кэширование данных

### Цветовая схема
Профиль использует две основные переменные для кастомизации:
- `--profile-color-1`: Основной цвет (по умолчанию Steam Blue #66c0f4)
- `--profile-color-2`: Акцентный цвет (по умолчанию Discord Blurple #5865f2)

Эти цвета применяются к:
- Градиентам баннера
- Рамке аватара
- Активным вкладкам
- Hover эффектам
- Бейджам и статистике

## Использование

```tsx
import YumekoProfileProvider from '@/component/yumeko-anime-profile/yumeko-profile-provider';

<YumekoProfileProvider username="username" />
```

## API

Компонент использует следующие эндпоинты:
- `GET /api/profiles/get-profile?username={username}` - Основные данные профиля
- `GET /api/profiles/avatar?username={username}` - Аватар
- `GET /api/profiles/banner?username={username}` - Баннер
- `GET /api/profiles/background?username={username}` - Фон
- `GET /api/badges/user/{username}` - Бейджи
- `GET /api/friends/list/{username}` - Список друзей
- `GET /api/friends/requests/incoming/{username}` - Входящие заявки

## Темы

Профиль поддерживает светлую и темную темы через атрибут `data-theme`:
- `default` - Темная тема (Steam style)
- `light` - Светлая тема

## Адаптивность

- Desktop: Полная версия с сайдбаром
- Tablet (< 1024px): Сайдбар перемещается вниз
- Mobile (< 768px): Компактная версия с вертикальным layout
