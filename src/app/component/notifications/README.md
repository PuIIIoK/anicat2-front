# Система уведомлений AniCat

Красивая и минималистичная система уведомлений с поддержкой иконок Lucide React.

## Особенности

- ✅ **Русский язык** - все уведомления на русском языке
- ✅ **Автоматическое удаление** - старые уведомления о коллекциях автоматически удаляются при новых изменениях
- ✅ **Красивый дизайн** - современный минималистичный дизайн с анимациями
- ✅ **Иконки Lucide React** - каждое уведомление имеет соответствующую иконку
- ✅ **Типизация** - полная поддержка TypeScript
- ✅ **Адаптивность** - работает на всех устройствах
- ✅ **Доступность** - поддержка screen readers и клавиатурной навигации

## Использование

### Базовое использование

```tsx
import { useNotifications } from '@/component/notifications/NotificationManager';

function MyComponent() {
  const { addNotification } = useNotifications();

  const handleClick = () => {
    addNotification({
      message: 'Операция выполнена успешно!',
      type: 'success',
      duration: 3000
    });
  };

  return <button onClick={handleClick}>Показать уведомление</button>;
}
```

### Уведомления о коллекциях

```tsx
import { useNotifications } from '@/component/notifications/NotificationManager';

function CollectionComponent() {
  const { showCollectionNotification } = useNotifications();

  const addToFavorites = () => {
    // Старые уведомления о коллекциях автоматически удаляются
    showCollectionNotification('"Атака титанов" добавлено в избранное');
  };

  const changeCollection = () => {
    showCollectionNotification('"Наруто" перемещено из "Смотрю" в "Просмотрено"');
  };

  return (
    <>
      <button onClick={addToFavorites}>В избранное</button>
      <button onClick={changeCollection}>Изменить статус</button>
    </>
  );
}
```

### Уведомления о комментариях

```tsx
import { useNotifications } from '@/component/notifications/NotificationManager';

function CommentComponent() {
  const { showCommentNotification } = useNotifications();

  const sendComment = () => {
    showCommentNotification('Комментарий успешно отправлен!');
  };

  const sendReply = () => {
    showCommentNotification('Ответ успешно отправлен!');
  };

  return (
    <>
      <button onClick={sendComment}>Отправить комментарий</button>
      <button onClick={sendReply}>Ответить</button>
    </>
  );
}
```

## API

### `NotificationProvider`

Компонент-провайдер, который должен обернуть всё приложение (уже добавлен во все layout файлы).

### `useNotifications()`

Хук для работы с уведомлениями.

#### Методы

- `addNotification(notification)` - добавить произвольное уведомление
- `removeNotification(id)` - удалить уведомление по ID
- `clearCategoryNotifications(category)` - удалить все уведомления определённой категории
- `showCollectionNotification(message, type?)` - показать уведомление о коллекции (автоматически удаляет старые)
- `showCommentNotification(message, type?)` - показать уведомление о комментарии

#### Типы уведомлений

- `success` - успешная операция (зелёный)
- `error` - ошибка (красный)
- `warning` - предупреждение (оранжевый)
- `info` - информация (синий)

## Интеграция

Система уведомлений уже интегрирована в следующие компоненты:

### Коллекции (`new-anime-card.tsx`)

- Добавление/удаление из избранного
- Изменение статуса в коллекциях
- Перемещение между коллекциями

### Комментарии (`useCommentsModal.tsx`)

- Отправка нового комментария
- Отправка ответа на комментарий

## Стили

Все стили находятся в `NotificationManager.scss` и включают:

- Анимации появления и исчезновения
- Адаптивный дизайн для мобильных устройств
- Поддержка тёмной темы
- Прогресс-бар для отображения времени до автоматического закрытия

## Настройка

При желании можно настроить:

- Время показа уведомлений (параметр `duration`)
- Позицию на экране (в CSS `notification-container`)
- Стили для разных типов (в SCSS файле)
- Добавить новые категории уведомлений
