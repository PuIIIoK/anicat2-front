'use client';

import React from 'react';
import { AUTH_SITE_URL } from '@/hosts/constants';

interface AuthPromptModalProps {
  show: boolean;
  onClose: () => void;
}

const AuthPromptModal: React.FC<AuthPromptModalProps> = ({ show, onClose }) => {
  if (!show) return null;

  const handleAuth = () => {
    window.location.href = AUTH_SITE_URL;
  };

  return (
    <div
      className="auth-prompt-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
      }}
    >
      <div
        className="auth-prompt-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary, #1a1a2e)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          maxWidth: 400,
          width: '100%',
          padding: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            aria-label="Закрыть"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              width: 32,
              height: 32,
              borderRadius: '50%',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ textAlign: 'center', padding: '0 8px 8px' }}>
          <div style={{ 
            fontSize: 15, 
            lineHeight: 1.6, 
            marginBottom: 24,
            color: 'rgba(255,255,255,0.9)'
          }}>
            Йоу, братишь, если хочешь больше функций от сайта, то пожалуйста авторизируйся. И тогда тебе будут доступны все функции сайта)
          </div>
          
          <button
            onClick={handleAuth}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary-color, #af52de) 0%, #8b3fc4 100%)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 16,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 15px rgba(175, 82, 222, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Авторизироваться
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPromptModal;




