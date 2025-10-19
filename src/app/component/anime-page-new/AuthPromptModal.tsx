'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface AuthPromptModalProps {
  show: boolean;
  onClose: () => void;
}

const AuthPromptModal: React.FC<AuthPromptModalProps> = ({ show, onClose }) => {
  const router = useRouter();
  if (!show) return null;

  return (
    <div
      className="auth-prompt-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        className="auth-prompt-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111',
          color: '#fff',
          border: '1px solid #333',
          borderRadius: 12,
          maxWidth: 520,
          width: '92%',
          padding: '22px 20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            aria-label="Закрыть"
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#aaa',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '6px 6px 2px 6px' }}>
          <div style={{ fontSize: 18, lineHeight: 1.5, marginBottom: 18 }}>
            Йоу, братишь, если хочешь больше функций от сайта, то пожалуйста или авторизируйся, или зарегистрируйся (если ты впервые у нас). И тогда тебе будут доступны все функции сайта)
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/register')}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #2a2a2a',
                background: '#1f2937',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Зарегистрироваться
            </button>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #2a2a2a',
                background: '#0ea5e9',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Авторизироваться
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPromptModal;




