'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AuthCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState('Авторизация...');

    useEffect(() => {
        const token = searchParams.get('token');
        
        if (token) {
            // Save token to localStorage (key must be 'token' to match auth.ts)
            localStorage.setItem('token', token);
            
            // Save token to cookies (30 days expiry)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            document.cookie = `token=${token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
            
            setStatus('Авторизация успешна, перенаправление...');
            
            // Use window.location for hard redirect to ensure localStorage persists
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            setStatus('Ошибка авторизации: токен не найден');
            setTimeout(() => {
                router.push('/');
            }, 2000);
        }
    }, [searchParams, router]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
        }}>
            {/* Loading spinner */}
            <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#af52de',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />
            
            <p style={{ 
                fontSize: '18px',
                margin: 0,
                color: 'white'
            }}>
                {status}
            </p>
            
            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0a0a0a',
            color: 'white',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <Suspense fallback={
                <p style={{ fontSize: '18px', color: 'white' }}>Загрузка...</p>
            }>
                <AuthCallbackContent />
            </Suspense>
        </div>
    );
}
