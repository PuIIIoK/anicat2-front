'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_SERVER } from '@/tools/constants';

export default function AdminPlatformsAdd() {
  const sp = useSearchParams();
  const router = useRouter();
  const platformParam = (sp.get('platform') || 'android').toLowerCase();
  const platform: 'android' | 'pc' = platformParam === 'pc' ? 'pc' : 'android';

  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  // removed unused serverResp to satisfy linter
  const [uploading, setUploading] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');

  const goBack = () => router.push(`?admin_panel=edit-apps&platform=${platform}`);

  const requestPresignAndUpload = async () => {
    if (!file || !version.trim()) return;
    setUploading(true);
    setSteps(['Загружаем файл...']);
    try {
      const res = await fetch(`${API_SERVER}/api/app/admin/release/upload?platform=${platform}&version=${encodeURIComponent(version.trim())}&contentType=${encodeURIComponent(file.type || 'application/octet-stream')}`, { method: 'POST' });
      if (!res.ok) throw new Error('presign failed');
      const data = await res.json();
      const uploadUrl = data.uploadUrl as string;
      const put = await fetch(uploadUrl, { method: 'PUT', body: file });
      if (!put.ok) throw new Error('upload failed');
      setSteps(prev => [...prev, 'Подписываем...']);
      // server response captured implicitly in steps/redirect
      return data;
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!version.trim() || !file) return;
    setBusy(true);
    setSteps(['Загружаем файл...']);
    try {
      await requestPresignAndUpload();
      setSteps(prev => [...prev, 'Создаем релиз...']);
      const url = `${API_SERVER}/api/app/admin/release?platform=${platform}&version=${encodeURIComponent(version.trim())}&notes=${encodeURIComponent(notes.trim())}`;
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        await res.json();
        setSteps(prev => [...prev, 'Готово']);
        setTimeout(() => router.push(`?admin_panel=edit-apps&platform=${platform}`), 1000);
      }
    } catch {
      setSteps(prev => [...prev, 'Ошибка при создании релиза']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-panel-add-realese">
      <div className="admin-panel-add-realese-card">
        <div className="admin-panel-add-realese-header">
          <h2 className="admin-panel-add-realese-title">Добавить версию — {platform === 'android' ? 'Телефон' : 'ПК'}</h2>
          <button className="admin-panel-add-realese-back" onClick={goBack}>Назад</button>
        </div>

        <div className="admin-panel-add-realese-group">
          <label className="admin-panel-add-realese-label">Версия</label>
          <input className="admin-panel-add-realese-input" value={version} onChange={e => setVersion(e.target.value)} placeholder="3.0" />
        </div>
        <div className="admin-panel-add-realese-group">
          <label className="admin-panel-add-realese-label">Заметки</label>
          <textarea className="admin-panel-add-realese-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Описание изменений" />
        </div>
        <div className="admin-panel-add-realese-group">
          <label className="admin-panel-add-realese-label">Файл ({platform === 'android' ? 'APK' : 'ZIP/EXE'})</label>
          <div className="admin-panel-add-realese-filebox">
            <input
              id="rel-file"
              className="admin-panel-add-realese-fileinput"
              type="file"
              accept={platform === 'android' ? '.apk' : '.zip,.exe'}
              onChange={e => {
                const f = e.target.files?.[0] || null;
                if (!f) { setFile(null); setFileName(''); setFileError(''); return; }
                const name = f.name.toLowerCase();
                if (platform === 'android' && !name.endsWith('.apk')) {
                  setFile(null); setFileName(''); setFileError('Только файлы .apk'); return;
                }
                if (platform === 'pc' && !(name.endsWith('.zip') || name.endsWith('.exe'))) {
                  setFile(null); setFileName(''); setFileError('Допустимо: .zip или .exe'); return;
                }
                setFileError('');
                setFile(f); setFileName(f.name);
              }}
            />
            <label htmlFor="rel-file" className="admin-panel-add-realese-filelabel">Выберите файл</label>
            <span className="admin-panel-add-realese-filename">{fileName || 'Файл не выбран'}</span>
          </div>
          {fileError && <div className="admin-panel-add-realese-error">{fileError}</div>}
        </div>
        <div className="admin-panel-add-realese-group">
          <button className="admin-panel-add-realese-submit" disabled={busy || uploading || !file || !!fileError || !version.trim()} onClick={submit}>
            {busy || uploading ? 'Создание...' : 'Создать релиз'}
          </button>
          {(busy || uploading) && <span className="admin-panel-add-realese-spinner" />}
        </div>
        {(busy || uploading || steps.length) ? (
          <div className="admin-panel-add-realese-info">
            {steps.map((s, i) => (<div key={i}>{s}</div>))}
          </div>
        ) : null}
      </div>
    </div>
  );
}


