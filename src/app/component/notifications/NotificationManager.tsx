'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import WelcomeModal from './WelcomeModal';
import UpdateNotificationModal from './UpdateNotificationModal';
import { API_SERVER } from '@/hosts/constants';
import { getAuthToken } from '../../utils/auth';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import './NotificationManager.scss';

interface UpdateInfo {
  version: string;
  type: string;
  releaseNotes: string;
}

interface NotificationStatus {
  showWelcome: boolean;
  showUpdate: boolean;
  updateInfo: UpdateInfo | null;
}

const NotificationManager: React.FC = () => {
  // Welcome modal disabled - no longer shown
  const [welcomeModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверить статус уведомлений с сервера
  const checkNotificationStatus = async (): Promise<NotificationStatus | null> => {
    try {
      const token = getAuthToken();
      console.log('[NotificationManager] Проверка статуса уведомлений...', token ? 'с токеном' : 'без токена');

      if (!token) {
        // Если пользователь не авторизован, проверяем localStorage для приветственного уведомления
        const welcomeShown = localStorage.getItem('welcomeNotificationShown') === 'true';
        console.log('[NotificationManager] Пользователь не авторизован. welcomeShown:', welcomeShown);
        return {
          showWelcome: !welcomeShown,
          showUpdate: false,
          updateInfo: null
        };
      }

      const response = await fetch(`${API_SERVER}/api/notifications/check-notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[NotificationManager] Ответ от сервера:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('[NotificationManager] Данные с сервера:', data);
        return data;
      } else {
        console.warn('[NotificationManager] Не удалось получить статус уведомлений с сервера:', response.status);
        // Fallback на localStorage
        const welcomeShown = localStorage.getItem('welcomeNotificationShown') === 'true';
        return {
          showWelcome: !welcomeShown,
          showUpdate: false,
          updateInfo: null
        };
      }
    } catch (error) {
      console.error('[NotificationManager] Ошибка проверки статуса уведомлений:', error);
      // Fallback на localStorage
      const welcomeShown = localStorage.getItem('welcomeNotificationShown') === 'true';
      return {
        showWelcome: !welcomeShown,
        showUpdate: false,
        updateInfo: null
      };
    }
  };

  // Отметить приветственное уведомление как показанное
  const markWelcomeSeen = async () => {
    try {
      const token = getAuthToken();
      console.log('[NotificationManager] Отмечаем приветствие как просмотренное...', token ? 'на сервере' : 'локально');

      if (!token) {
        // Если пользователь не авторизован, сохраняем в localStorage
        localStorage.setItem('welcomeNotificationShown', 'true');
        console.log('[NotificationManager] Приветствие сохранено в localStorage');
        return;
      }

      const response = await fetch(`${API_SERVER}/api/notifications/mark-welcome-shown`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('[NotificationManager] Приветствие успешно отмечено на сервере');
      } else {
        console.warn('[NotificationManager] Ошибка отправки на сервер, сохраняем локально');
        localStorage.setItem('welcomeNotificationShown', 'true');
      }
    } catch (error) {
      console.error('[NotificationManager] Ошибка сохранения статуса приветственного уведомления:', error);
      // В случае ошибки, сохраняем локально
      localStorage.setItem('welcomeNotificationShown', 'true');
    }
  };

  // Отметить обновление как просмотренное
  const markUpdateSeen = async (version: string) => {
    try {
      const token = getAuthToken();
      console.log('[NotificationManager] Отмечаем обновление как просмотренное...', version, token ? 'на сервере' : 'локально');

      if (!token) {
        // Если пользователь не авторизован, сохраняем в localStorage
        localStorage.setItem('lastSeenUpdateVersion', version);
        console.log('[NotificationManager] Версия обновления сохранена в localStorage:', version);
        return;
      }

      const response = await fetch(`${API_SERVER}/api/notifications/mark-update-seen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version }),
      });

      if (response.ok) {
        console.log('[NotificationManager] Обновление успешно отмечено на сервере:', version);
      } else {
        console.warn('[NotificationManager] Ошибка отправки обновления на сервер, сохраняем локально');
        localStorage.setItem('lastSeenUpdateVersion', version);
      }
    } catch (error) {
      console.error('[NotificationManager] Ошибка сохранения статуса обновления:', error);
      // В случае ошибки, сохраняем локально
      localStorage.setItem('lastSeenUpdateVersion', version);
    }
  };

  // Welcome modal handling removed - no longer used
  const handleWelcomeClose = () => {
    // No-op - welcome modal disabled
  };

  // Закрытие модального окна обновления
  const handleUpdateClose = () => {
    console.log('[NotificationManager] Закрываем окно обновления');
    setUpdateModalOpen(false);
    if (updateInfo) {
      markUpdateSeen(updateInfo.version);
    }
  };

  // Инициализация при загрузке компонента
  useEffect(() => {
    const initializeNotifications = async () => {
      console.log('[NotificationManager] Инициализация уведомлений...');
      setIsLoading(true);

      // Небольшая задержка для лучшего UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('[NotificationManager] Задержка завершена, проверяем уведомления');

      const status = await checkNotificationStatus();
      console.log('[NotificationManager] Полученный статус:', status);

      if (status) {
        if (status.updateInfo) {
          setUpdateInfo(status.updateInfo);
          console.log('[NotificationManager] Установлена информация об обновлении:', status.updateInfo);
        }

        // Welcome modal removed - only show updates
        if (status.showUpdate && status.updateInfo) {
          console.log('[NotificationManager] 🔔 Показываем уведомление об обновлении');
          setUpdateModalOpen(true);
        } else {
          console.log('[NotificationManager] ✅ Нет уведомлений для показа - пользователь все видел');
        }
      } else {
        console.log('[NotificationManager] Не удалось получить статус уведомлений');
      }

      setIsLoading(false);
      console.log('[NotificationManager] Инициализация завершена');
    };

    // Проверяем уведомления только после небольшой задержки, чтобы страница успела загрузиться
    console.log('[NotificationManager] Установка таймера инициализации...');
    const timer = setTimeout(initializeNotifications, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Не рендерим ничего во время загрузки
  if (isLoading) {
    return null;
  }

  return (
    <>
      <WelcomeModal
        isOpen={welcomeModalOpen}
        onClose={handleWelcomeClose}
      />

      <UpdateNotificationModal
        isOpen={updateModalOpen}
        onClose={handleUpdateClose}
        updateInfo={updateInfo}
      />
    </>
  );
};

// ===== СТАРАЯ СИСТЕМА УВЕДОМЛЕНИЙ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ =====

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  showCollectionNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };

    setNotifications(prev => [...prev, newNotification]);

    // Автоматически удаляем уведомление через указанное время
    const duration = notification.duration || 3000;
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const showCollectionNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    addNotification({ message, type, duration: 3000 });
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        showCollectionNotification
      }}
    >
      {children}

      {/* Рендерим уведомления */}
      <div className="notification-container">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`notification-item notification-${notification.type}`}
          >
            <div className="notification-content">
              <div className="notification-icon">
                {notification.type === 'success' && <CheckCircle size={18} />}
                {notification.type === 'error' && <XCircle size={18} />}
                {notification.type === 'warning' && <AlertTriangle size={18} />}
                {notification.type === 'info' && <Info size={18} />}
              </div>
              <div className="notification-message">
                {notification.message}
              </div>
              <button
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
                aria-label="Закрыть уведомление"
              >
                <X size={16} />
              </button>
            </div>
            <div className="notification-progress">
              <div
                className="notification-progress-bar"
                style={{
                  animationDuration: `${notification.duration || 3000}ms`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationManager;