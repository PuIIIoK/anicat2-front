'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API_SERVER } from '@/hosts/constants';
import { FaUserPlus, FaUserCheck, FaHourglassHalf } from 'react-icons/fa';

type FriendStatus = 'ADD' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_INCOMING' | 'UNKNOWN';

interface Props {
  targetUsername: string;
  onChanged?: () => void;
}

function getToken(): string | null {
  const m = typeof document !== 'undefined' ? document.cookie.match(/token=([^;]+)/) : null;
  return m ? m[1] : null;
}

function getMyUsername(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || payload.sub || null;
  } catch {
    return null;
  }
}

const AddFriendButton: React.FC<Props> = ({ targetUsername, onChanged }) => {
  const [status, setStatus] = useState<FriendStatus>('UNKNOWN');
  const [loading, setLoading] = useState(false);

  const me = useMemo(() => getMyUsername(), []);
  const canShow = !!me && me !== targetUsername;

  const fetchStatus = useCallback(async () => {
    if (!canShow || !me) return;
    try {
      const res = await fetch(`${API_SERVER}/api/friends/status?me=${encodeURIComponent(me)}&other=${encodeURIComponent(targetUsername)}`);
      if (res.ok) {
        const data = await res.json();
        const s = (data.status as FriendStatus) || 'UNKNOWN';
        setStatus(s);
      }
    } catch {
      setStatus('UNKNOWN');
    }
  }, [me, targetUsername, canShow]);

  useEffect(() => {
    fetchStatus();
    
    // Периодическая проверка статуса каждые 5 секунд
    const interval = setInterval(fetchStatus, 5000);
    
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const sendRequest = async () => {
    if (!me) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_SERVER}/api/friends/request?from=${encodeURIComponent(me)}&to=${encodeURIComponent(targetUsername)}`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchStatus();
        // Вызываем callback для обновления данных на основном профиле
        onChanged?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const acceptIncoming = async () => {
    if (!me) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_SERVER}/api/friends/accept?me=${encodeURIComponent(me)}&from=${encodeURIComponent(targetUsername)}`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchStatus();
        // Вызываем callback для обновления данных на основном профиле
        onChanged?.();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!canShow) return null;

  if (status === 'FRIENDS') {
    return (
      <button className="add-friend-btn friend-btn--friends" disabled>
        <FaUserCheck style={{ marginRight: 8, verticalAlign: 'middle' }} /> В друзьях
      </button>
    );
  }
  if (status === 'REQUEST_SENT') {
    return (
      <button className="add-friend-btn friend-btn--pending" disabled>
        <FaHourglassHalf style={{ marginRight: 8, verticalAlign: 'middle' }} /> Ожидание
      </button>
    );
  }
  if (status === 'REQUEST_INCOMING') {
    return (
      <button className="add-friend-btn friend-btn--accept" onClick={acceptIncoming} disabled={loading}>
        <FaUserCheck style={{ marginRight: 8, verticalAlign: 'middle' }} /> Принять заявку
      </button>
    );
  }
  return (
    <button className="add-friend-btn friend-btn--add" onClick={sendRequest} disabled={loading}>
      <FaUserPlus style={{ marginRight: 8, verticalAlign: 'middle' }} /> Добавить в друзья
    </button>
  );
};

export default AddFriendButton;


