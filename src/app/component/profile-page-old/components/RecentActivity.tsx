'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { useTheme } from '../../../context/ThemeContext';
import * as LucideIcons from 'lucide-react';

interface ActivityItem {
  id: number;
  type: string;
  message: string;
  animeId?: number;
  animeTitle?: string;
  createdAt: string;
}

export const RecentActivity: React.FC<{ username?: string }> = ({ username }) => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [expanded, setExpanded] = useState<boolean>(false);
  const { theme, colorScheme } = useTheme();

  // Функция для выбора иконки по типу активности
  const getActivityIcon = (type: string, message: string) => {
    const iconProps = { size: 18, strokeWidth: 2 };
    
    // Определяем тип по содержимому сообщения или типу
    if (message.includes('добавил') || message.includes('добавила') || type.includes('add')) {
      return <LucideIcons.Plus {...iconProps} />;
    }
    if (message.includes('оценил') || message.includes('оценила') || type.includes('rating')) {
      return <LucideIcons.Star {...iconProps} />;
    }
    if (message.includes('посмотрел') || message.includes('посмотрела') || type.includes('watch')) {
      return <LucideIcons.Play {...iconProps} />;
    }
    if (message.includes('завершил') || message.includes('завершила') || type.includes('complete')) {
      return <LucideIcons.CheckCircle {...iconProps} />;
    }
    if (message.includes('комментарий') || message.includes('отзыв') || type.includes('comment')) {
      return <LucideIcons.MessageCircle {...iconProps} />;
    }
    if (message.includes('друзья') || message.includes('подружился') || type.includes('friend')) {
      return <LucideIcons.Users {...iconProps} />;
    }
    if (message.includes('планирует') || type.includes('plan')) {
      return <LucideIcons.Calendar {...iconProps} />;
    }
    if (message.includes('бросил') || message.includes('бросила') || type.includes('drop')) {
      return <LucideIcons.X {...iconProps} />;
    }
    
    // Иконка по умолчанию
    return <LucideIcons.Activity {...iconProps} />;
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!username) return;
      try {
        const res = await fetch(`${API_SERVER}/api/activity/user/${encodeURIComponent(username)}?limit=20`);
        if (!res.ok) return;
        const data: ActivityItem[] = await res.json();
        if (!ignore) setItems(data);
      } catch {}
    }
    load();
    return () => {
      ignore = true;
    };
  }, [username]);

  const visibleItems = useMemo(() => {
    return expanded ? items : items.slice(0, 5);
  }, [items, expanded]);

  if (!username) return null;

  return (
    <div className="recent-activity" data-theme={theme} data-color-scheme={colorScheme}>
      <h2>Последняя активность</h2>
      <ul className={`activity-list ${expanded ? 'expanded' : ''}`}>
        {visibleItems.map((it) => (
          <li key={it.id} className="activity-item">
            <span className="icon">
              {getActivityIcon(it.type, it.message)}
            </span>
            <span className="text">
              {it.message}
              <span className="time">{new Date(it.createdAt).toLocaleString()}</span>
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="activity-item">
            <span className="icon">
              <LucideIcons.Clock size={18} strokeWidth={2} />
            </span>
            <span className="text">Нет активности</span>
          </li>
        )}
      </ul>
      {items.length > 5 && (
        <div className="activity-toggle">
          <button 
            type="button" 
            className="btn-toggle-activity" 
            onClick={() => setExpanded(v => !v)}
            data-theme={theme}
            data-color-scheme={colorScheme}
          >
            {expanded ? 'Скрыть' : 'Показать ещё'}
          </button>
        </div>
      )}
    </div>
  );
};


