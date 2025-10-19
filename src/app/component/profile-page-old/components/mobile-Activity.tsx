'use client';

import * as LucideIcons from 'lucide-react';
import { ClipLoader } from 'react-spinners';

interface ActivityItem {
  id?: number;
  message?: string;
  title?: string;
  createdAt?: string;
}

interface MobileActivityProps {
  recentActivity: ActivityItem[] | undefined;
  isLoading?: boolean;
}

const MobileActivity: React.FC<MobileActivityProps> = ({ recentActivity, isLoading = false }) => {
  const items = recentActivity || [];

  // Функция для определения иконки и цвета на основе текста активности
  const getActivityIcon = (message?: string) => {
    const text = (message || '').toLowerCase();
    
    if (text.includes('добавил') || text.includes('добавлен') || text.includes('добавила')) {
      return { Icon: LucideIcons.Plus, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)' };
    }
    if (text.includes('оценк') || text.includes('оцени')) {
      return { Icon: LucideIcons.Star, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)' };
    }
    if (text.includes('отзыв') || text.includes('комментари')) {
      return { Icon: LucideIcons.MessageSquare, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.12)' };
    }
    if (text.includes('изменил') || text.includes('обновил') || text.includes('изменила')) {
      return { Icon: LucideIcons.Edit, color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)' };
    }
    if (text.includes('удалил') || text.includes('удалила')) {
      return { Icon: LucideIcons.Trash2, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.12)' };
    }
    if (text.includes('посмотрел') || text.includes('просмотр') || text.includes('посмотрела')) {
      return { Icon: LucideIcons.Eye, color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)' };
    }
    if (text.includes('коллекц')) {
      return { Icon: LucideIcons.Folder, color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.12)' };
    }
    
    return { Icon: LucideIcons.Activity, color: '#9ca3af', bgColor: 'rgba(156, 163, 175, 0.12)' };
  };

  // Форматирование даты
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="recent-activity-mobile">
      <div className="activity-section-header">
        <LucideIcons.Activity size={20} />
        <h2>Активность</h2>
      </div>
      <div className="activity-list">
        {isLoading ? (
          <div className="loading-spinner-container">
            <ClipLoader color="var(--primary-color)" size={32} />
          </div>
        ) : (
          <>
            {items.slice(0, 10).map((it) => {
              const { Icon, color, bgColor } = getActivityIcon(it.message || it.title);
              
              return (
                <div key={it.id ?? `${it.message}-${it.createdAt}`} className="activity-card">
                  <div className="activity-icon" style={{ backgroundColor: bgColor, borderColor: color + '40' }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{it.message || it.title || 'Действие'}</div>
                    <div className="activity-time">
                      <LucideIcons.Clock size={11} />
                      <span>{formatDate(it.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="activity-empty">
                <LucideIcons.Inbox size={32} style={{ opacity: 0.3 }} />
                <span>Нет активности</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MobileActivity;


