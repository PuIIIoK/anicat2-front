'use client';

import React, { useEffect, useState } from 'react';
import { API_SERVER } from '@/hosts/constants';
import type { Friend } from '../types';
import { OptimizedImage } from './OptimizedImage';
import { useRouter } from 'next/navigation';

interface MobileFriendsFullModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileDataChanged?: () => void;
}

type TabKey = 'friends' | 'requests' | 'outgoing';

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

const MobileFriendsFullModal: React.FC<MobileFriendsFullModalProps> = ({ isOpen, onClose, onProfileDataChanged }) => {
  const [tab, setTab] = useState<TabKey>('friends');
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Friend[]>([]);
  const [outgoing, setOutgoing] = useState<Friend[]>([]);

  const me = getMyUsername();
  const router = useRouter();
  const goToProfile = (u?: string) => { if (u) router.push(`/profile/${u}`); };

  const loadAll = async () => {
    if (!me) return;
    setLoading(true);
    try {
      const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
        fetch(`${API_SERVER}/api/friends/list/${encodeURIComponent(me)}`),
        fetch(`${API_SERVER}/api/friends/requests/incoming/${encodeURIComponent(me)}`),
        fetch(`${API_SERVER}/api/friends/requests/outgoing/${encodeURIComponent(me)}`),
      ]);

      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setFriends((data || []).map((d: Record<string, unknown>, idx: number) => ({
          id: d.id as number ?? idx,
          name: (d.nickname as string) || (d.username as string),
          username: d.username as string,
          nickname: d.nickname as string,
          roles: d.roles as string[],
          bio: d.bio as string,
          avatarUrl: d.avatarUrl as string,
          bannerUrl: d.bannerUrl as string,
          verified: d.verified as boolean,
        })));
      } else {
        setFriends([]);
      }

      if (incomingRes.ok) {
        const data = await incomingRes.json();
        setIncoming((data || []).map((d: Record<string, unknown>, idx: number) => ({
          id: d.id as number ?? idx,
          name: (d.nickname as string) || (d.username as string),
          username: d.username as string,
          nickname: d.nickname as string,
          roles: d.roles as string[],
          bio: d.bio as string,
          avatarUrl: d.avatarUrl as string,
          bannerUrl: d.bannerUrl as string,
          verified: d.verified as boolean,
        })));
      } else {
        setIncoming([]);
      }

      if (outgoingRes.ok) {
        const data = await outgoingRes.json();
        setOutgoing((data || []).map((d: Record<string, unknown>, idx: number) => ({
          id: d.id as number ?? idx,
          name: (d.nickname as string) || (d.username as string),
          username: d.username as string,
          nickname: d.nickname as string,
          roles: d.roles as string[],
          bio: d.bio as string,
          avatarUrl: d.avatarUrl as string,
          bannerUrl: d.bannerUrl as string,
          verified: d.verified as boolean,
        })));
      } else {
        setOutgoing([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTab('friends');
      loadAll();
    }
  }, [isOpen]);

  const doUnfriend = async (username: string | undefined) => {
    if (!username || !me) return;
    try {
      await fetch(`${API_SERVER}/api/friends/unfriend?me=${encodeURIComponent(me)}&other=${encodeURIComponent(username)}`, { method: 'POST' });
      await loadAll();
      onProfileDataChanged?.();
    } catch {}
  };

  const doAccept = async (username: string | undefined) => {
    if (!username || !me) return;
    try {
      await fetch(`${API_SERVER}/api/friends/accept?me=${encodeURIComponent(me)}&from=${encodeURIComponent(username)}`, { method: 'POST' });
      await loadAll();
      onProfileDataChanged?.();
    } catch {}
  };

  const doDecline = async (username: string | undefined) => {
    if (!username || !me) return;
    try {
      await fetch(`${API_SERVER}/api/friends/decline?me=${encodeURIComponent(me)}&from=${encodeURIComponent(username)}`, { method: 'POST' });
      await loadAll();
      onProfileDataChanged?.();
    } catch {}
  };

  const doCancelOutgoing = async (username: string | undefined) => {
    if (!username || !me) return;
    try {
      await fetch(`${API_SERVER}/api/friends/cancel-outgoing?me=${encodeURIComponent(me)}&to=${encodeURIComponent(username)}`, { method: 'POST' });
      await loadAll();
      onProfileDataChanged?.();
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="mobile-friends-modal-overlay" onClick={onClose}>
      <div className="mobile-friends-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-friends-modal-header">
          <div className="mobile-friends-tabs">
            <button className={`tab-chip ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>Друзья ({friends.length})</button>
            <button className={`tab-chip ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>Заявки ({incoming.length})</button>
            <button className={`tab-chip ${tab === 'outgoing' ? 'active' : ''}`} onClick={() => setTab('outgoing')}>Ваши запросы ({outgoing.length})</button>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="mobile-friends-modal-body">
          {loading ? (
            <div className="loading-center">Загрузка...</div>
          ) : tab === 'friends' ? (
            <div className="mobile-friends-list">
              {friends.length === 0 ? (
                <div className="empty-text">У вас пока нет друзей</div>
              ) : friends.map((f) => (
                <div
                  key={f.id}
                  className="mobile-friend-item"
                  onClick={() => goToProfile(f.username)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className={`banner ${f.bannerUrl ? 'has-image' : 'neon-bg'}`}
                    style={f.bannerUrl ? { backgroundImage: `url('${f.bannerUrl}')` } : undefined}
                  />
                  <div className="row">
                    <div className="left">
                      <OptimizedImage src={f.avatarUrl || '/black-avatar.svg'} alt="avatar" width={42} height={42} fallbackSrc="/black-avatar.svg" style={{ borderRadius: '50%', objectFit: 'cover', objectPosition: 'center' }} />
                      <div className="col">
                        <div className={`name ${f.roles?.includes('ADMIN') ? 'admin' : f.roles?.includes('MODERATOR') ? 'moderator' : 'user'}`}>
                          {f.name}
                          {f.verified && (
                            <span className="verified-badge-mobile" title="Верифицированный пользователь" style={{ marginLeft: 6 , top: 13}}>
                              <svg className="verified-icon-mobile" viewBox="0 0 24 24" width={14} height={14}>
                                <g>
                                  <path fillRule="evenodd" clipRule="evenodd" d="M14.6563 5.24291C15.4743 5.88358 16 6.8804 16 8C16 9.11964 15.4743 10.1165 14.6562 10.7572C14.7816 11.7886 14.4485 12.8652 13.6568 13.6569C12.8651 14.4486 11.7885 14.7817 10.7571 14.6563C10.1164 15.4743 9.1196 16 8 16C6.88038 16 5.88354 15.4743 5.24288 14.6562C4.21141 14.7817 3.13481 14.4485 2.34312 13.6568C1.55143 12.8652 1.2183 11.7886 1.34372 10.7571C0.525698 10.1164 0 9.1196 0 8C0 6.88038 0.525715 5.88354 1.34376 5.24288C1.21834 4.21141 1.55147 3.13481 2.34316 2.34312C3.13485 1.55143 4.21145 1.2183 5.24291 1.34372C5.88358 0.525698 6.8804 0 8 0C9.11964 0 10.1165 0.525732 10.7572 1.3438C11.7886 1.21838 12.8652 1.55152 13.6569 2.3432C14.4486 3.13488 14.7817 4.21146 14.6563 5.24291ZM12.2071 6.20711L10.7929 4.79289L7 8.58579L5.20711 6.79289L3.79289 8.20711L7 11.4142L12.2071 6.20711Z" fill="#d60000"></path>
                                </g>
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="username">@{f.username}</div>
                      </div>
                    </div>
                    <div className="right">
                      <button className="btn-danger" onClick={(e) => { e.stopPropagation(); doUnfriend(f.username); }}>Удалить</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'requests' ? (
            <div className="mobile-requests-list">
              {incoming.length === 0 ? (
                <div className="empty-text">Нет входящих заявок</div>
              ) : incoming.map((r) => (
                <div
                  key={r.id}
                  className="mobile-request-item"
                  onClick={() => goToProfile(r.username)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="left">
                    <OptimizedImage src={r.avatarUrl || '/black-avatar.svg'} alt="avatar" width={40} height={40} fallbackSrc="/black-avatar.svg" style={{ borderRadius: '50%' }} />
                    <div className="col">
                      <div className="name">{r.name}</div>
                      <div className="username">@{r.username}</div>
                    </div>
                  </div>
                  <div className="right">
                    <button className="btn-primary" onClick={(e) => { e.stopPropagation(); doAccept(r.username); }}>Принять</button>
                    <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); doDecline(r.username); }}>Отклонить</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mobile-requests-list">
              {outgoing.length === 0 ? (
                <div className="empty-text">Нет исходящих заявок</div>
              ) : outgoing.map((r) => (
                <div
                  key={r.id}
                  className="mobile-request-item"
                  onClick={() => goToProfile(r.username)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="left">
                    <div className="col">
                      <div className="name">{r.name}</div>
                      <div className="username">@{r.username}</div>
                    </div>
                  </div>
                  <div className="right">
                    <button className="btn-danger" onClick={(e) => { e.stopPropagation(); doCancelOutgoing(r.username); }}>Отменить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileFriendsFullModal;


