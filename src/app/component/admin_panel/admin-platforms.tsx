
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { API_SERVER } from '@/tools/constants';

type Release = { version: string; build: number; notes?: string; apkUrl?: string };

function PlatformList({ platform }: { platform: 'android' | 'pc' }) {
  const [list, setList] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewNotes, setViewNotes] = useState<string | null>(null);
  const router = useRouter();

  const fetchLatest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_SERVER}/api/app/list?platform=${platform}`);
      if (res.ok) {
        const arr: unknown = await res.json();
        const mapped: Release[] = Array.isArray(arr)
          ? (arr as Array<Record<string, unknown>>).map((it) => ({
              version: String(it.version ?? ''),
              build: Number((it.build as number | string | undefined) ?? 0),
              notes: (it.notes as string | undefined),
              apkUrl: (it.apkUrl as string | undefined),
            }))
          : [];
        setList(mapped);
      } else {
        // fallback на latest
        const r2 = await fetch(`${API_SERVER}/api/app/latest?platform=${platform}`);
        if (r2.ok) {
          const data = await r2.json();
          setList([{ version: data.version, build: data.build, notes: data.notes, apkUrl: data.apkUrl }]);
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLatest(); }, [platform]);

  return (
    <div className="admin-panel-platforms-section admin-platforms-container">
      {/* Десктопная версия */}
      <div className="desktop-only">
        <div className="admin-panel-platforms-header">
          <h2>{platform === 'android' ? 'Телефон (Android)' : 'ПК'}</h2>
          <button className="admin-panel-platforms-add" onClick={() => router.push(`?admin_panel=edit-apps-add&platform=${platform}`)}>+ Добавить версию</button>
        </div>
      {loading ? (
        <div className="admin-panel-platforms-loading">Загрузка...</div>
      ) : (
        <div className="admin-panel-platforms-table">
          <div className="row head">
            <span>Версия</span>
            <span>Билд</span>
            <span>Заметки</span>
            <span>Ссылка</span>
            <span></span>
          </div>
          {list.map((r, i) => (
            <div className="row" key={i}>
              <span>{r.version}</span>
              <span>{r.build}</span>
              <span>{r.notes ? <button className="admin-panel-platforms-notes-btn" onClick={() => setViewNotes(r.notes!)}>посмотреть</button> : '-'}</span>
              <span>{r.apkUrl ? <a href={r.apkUrl} target="_blank">скачать</a> : '-'}</span>
              <span>
                <button className="admin-panel-platforms-delete-btn" onClick={async () => {
                  const ok = window.confirm(`Удалить версию ${r.version}?`);
                  if (!ok) return;
                  try {
                    await fetch(`${API_SERVER}/api/app/admin/release?platform=${platform}&version=${encodeURIComponent(r.version)}`, { method: 'DELETE' });
                    await fetchLatest();
                  } catch {}
                }}>удалить</button>
              </span>
            </div>
          )          )}
        </div>
      )}
      </div>
      
      {/* Мобильная версия */}
      <div className="mobile-only">
        <div className="mobile-platform-header">
          <h2>{platform === 'android' ? 'Телефон (Android)' : 'ПК'}</h2>
          <button 
            className="mobile-add-version-btn" 
            onClick={() => router.push(`?admin_panel=edit-apps-add&platform=${platform}`)}
          >
            + Добавить версию
          </button>
        </div>
        
        {loading ? (
          <div className="mobile-loading">Загрузка...</div>
        ) : (
          <div className="mobile-platforms-list">
            {list.map((r, i) => (
              <div className="mobile-platform-card" key={i}>
                <div className="mobile-platform-info">
                  <div className="mobile-version-info">
                    <span className="mobile-version">Версия: {r.version}</span>
                    <span className="mobile-build">Билд: {r.build}</span>
                  </div>
                  <div className="mobile-platform-actions">
                    {r.notes && (
                      <button 
                        className="mobile-platform-btn notes"
                        onClick={() => setViewNotes(r.notes!)}
                      >
                        Заметки
                      </button>
                    )}
                    {r.apkUrl && (
                      <a 
                        className="mobile-platform-btn download"
                        href={r.apkUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Скачать
                      </a>
                    )}
                    <button 
                      className="mobile-platform-btn delete"
                      onClick={async () => {
                        const ok = window.confirm(`Удалить версию ${r.version}?`);
                        if (!ok) return;
                        try {
                          await fetch(`${API_SERVER}/api/app/admin/release?platform=${platform}&version=${encodeURIComponent(r.version)}`, { method: 'DELETE' });
                          await fetchLatest();
                        } catch {}
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {viewNotes !== null && (
        <div className="admin-panel-platforms-notes-modal" onClick={() => setViewNotes(null)}>
          <div className="admin-panel-platforms-notes-content" onClick={e => e.stopPropagation()}>
            <div className="admin-panel-platforms-notes-header">
              <h3>Что нового?</h3>
              <button onClick={() => setViewNotes(null)}>✕</button>
            </div>
            <pre className="admin-panel-platforms-notes-pre">{(viewNotes || '').replaceAll('\r\n', '\n')}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPlatforms() {
  const sp = useSearchParams();
  const platformParam = (sp.get('platform') || 'android').toLowerCase();
  const platform: 'android' | 'pc' = platformParam === 'pc' ? 'pc' : 'android';

  return (
    <div className="admin-panel-platforms">
      <PlatformList platform={platform} />
    </div>
  );
}


