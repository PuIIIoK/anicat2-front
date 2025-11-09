'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cookieStorage } from '@/utils/cookies';
import { setAuthToken } from '@/app/utils/auth';
import { API_SERVER } from '@/hosts/constants';

function AuthCallbackContent() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Обработка авторизации...');
  const searchParams = useSearchParams();

  useEffect(() => {
    const processAuth = async () => {
      try {
        const token = searchParams.get('token');
        const userString = searchParams.get('user');

        if (!token) {
          throw new Error('Токен не получен');
        }

        // Сохраняем токен в cookies на 365 дней
        cookieStorage.setAuthToken(token);
        
        // Также сохраняем в localStorage для доступа из JavaScript
        // (на случай если кука HttpOnly и недоступна через document.cookie)
        setAuthToken(token);

        if (userString) {
          try {
            const user = JSON.parse(decodeURIComponent(userString));
            cookieStorage.setUser(user);
          } catch (e) {
            console.warn('Failed to parse user data:', e);
          }
        }

        // Загружаем настройки темы пользователя с сервера
        setMessage('Загрузка настроек темы...');
        try {
          const response = await fetch(`${API_SERVER}/api/profile/theme-settings`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const themeData = await response.json();
            console.log('✅ Настройки темы загружены при авторизации:', themeData);
            
            // Сохраняем в localStorage для немедленного применения
            if (themeData.theme) {
              localStorage.setItem('theme', themeData.theme);
            }
            if (themeData.colorScheme) {
              localStorage.setItem('colorScheme', themeData.colorScheme);
            }
          } else {
            console.warn('Не удалось загрузить настройки темы, будут использованы локальные');
          }
        } catch (error) {
          console.error('Ошибка загрузки настроек темы:', error);
        }

        setStatus('success');
        setMessage('✓ Авторизация успешна!');

        // Небольшая задержка для отображения успеха
        setTimeout(() => {
          window.location.href = '/';
        }, 500);

      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('✗ Ошибка авторизации');

        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    processAuth();
  }, [searchParams]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7e22ce 100%)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '48px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: status === 'processing' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                      status === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          fontSize: '48px',
          fontWeight: 'bold',
        }}>
          {status === 'processing' && (
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}></div>
          )}
          {status === 'success' && '✓'}
          {status === 'error' && '✗'}
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#1f2937',
          textAlign: 'center',
          margin: 0,
        }}>
          {message}
        </h1>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #7e22ce 100%)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          padding: '48px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '48px',
            fontWeight: 'bold',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}></div>
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            textAlign: 'center',
            margin: 0,
          }}>
            Загрузка...
          </h1>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

