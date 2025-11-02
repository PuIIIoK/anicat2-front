'use client';

import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../notifications/NotificationManager';
import { API_SERVER } from '@/hosts/constants';

// API response type
interface ApiFriendRequest {
  id?: number;
  username: string;
  nickname?: string;
}

interface Props {
  myUsername: string | null;
  onDataChanged?: () => void;
}

const FriendRequestNotification: React.FC<Props> = ({ myUsername, onDataChanged }) => {
  const { addNotification } = useNotifications();
  const [shown, setShown] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!myUsername) return;
    
    // Проверяем каждые 5 секунд
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_SERVER}/api/friends/requests/incoming/${encodeURIComponent(myUsername)}`);
        if (res.ok) {
          const data: ApiFriendRequest[] = await res.json();
          (data || []).forEach((r: ApiFriendRequest) => {
            const key = r.username || r.id?.toString();
            if (key && !shown[key]) {
              setShown((s) => ({ ...s, [key]: true }));
              addNotification({
                message: `${r.nickname || r.username} хочет добавить вас в друзья!`,
                type: 'info',
                duration: 5000
              });
              // Вызываем callback для обновления данных на основном профиле
              onDataChanged?.();
            }
          });
        }
      } catch (error) {
        console.error('Ошибка при проверке входящих заявок:', error);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [myUsername, shown, onDataChanged]);

  return null;
};

export default FriendRequestNotification;


