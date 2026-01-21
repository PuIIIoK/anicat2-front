'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cookieStorage, UserData } from '@/utils/cookies';
import { AUTH_SITE_URL } from '@/hosts/constants';

export default function AuthButton() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = cookieStorage.getAuthToken();
    const userData = cookieStorage.getUser();

    if (token && userData) {
      setIsAuthenticated(true);
      setUser(userData);
    }
    setIsLoading(false);
  };

  const handleLogin = () => {
    router.push('/auth');
  };

  const handleLogout = () => {
    cookieStorage.clearAuth();
    setIsAuthenticated(false);
    setUser(null);
    setShowDropdown(false);
    window.location.reload();
  };

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && user) {
    return (
      <div className="auth-user-menu" style={{ position: 'relative' }}>
        <button
          className="user-button"
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            fontSize: '14px',
          }}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span style={{ color: 'white', fontWeight: '500' }}>
            {user.name || user.email}
          </span>
        </button>

        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            padding: '12px',
            minWidth: '200px',
            zIndex: 1000,
          }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
              <strong>{user.name || 'Пользователь'}</strong>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '8px 12px',
                marginTop: '8px',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                textAlign: 'left',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="auth-login-button"
      style={{
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
      }}
    >
      Авторизация
    </button>
  );
}

