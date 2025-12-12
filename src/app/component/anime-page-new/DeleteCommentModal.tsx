'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface DeleteCommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    commentText: string;
    isReply?: boolean;
}

const DeleteCommentModal: React.FC<DeleteCommentModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    commentText,
    isReply = false
}) => {
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const captchaRef = useRef<HCaptcha>(null);

    const canDelete = !!captchaToken;

    const handleCaptchaVerify = (token: string) => {
        setCaptchaToken(token);
    };

    const handleConfirm = async () => {
        if (!canDelete) return;
        
        setIsDeleting(true);
        try {
            await onConfirm();
            handleClose();
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        if (isDeleting) return;
        setCaptchaToken(null);
        if (captchaRef.current) {
            captchaRef.current.resetCaptcha();
        }
        onClose();
    };

    // Сброс при открытии/закрытии
    useEffect(() => {
        if (isOpen) {
            setCaptchaToken(null);
            setIsDeleting(false);
        }
    }, [isOpen]);

    // Закрытие на ESC
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isDeleting) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, isDeleting]);

    if (!isOpen) return null;

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isDeleting) handleClose();
            }}
        >
            <div 
                style={{
                    background: 'var(--bg-primary, #1a1a1a)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '420px',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Trash2 size={20} style={{ color: '#ef4444' }} />
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                            Удалить {isReply ? 'ответ' : 'комментарий'}?
                        </span>
                    </div>
                    {!isDeleting && (
                        <button 
                            onClick={handleClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted, #888)',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                                display: 'flex',
                                transition: 'all 0.2s'
                            }}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {commentText && (
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            marginBottom: '20px',
                            borderLeft: '3px solid var(--primary-color, #af52de)'
                        }}>
                            <p style={{ 
                                margin: 0, 
                                color: 'var(--text-secondary, #aaa)', 
                                fontSize: '0.9rem',
                                lineHeight: 1.5,
                                wordBreak: 'break-word'
                            }}>
                                &quot;{commentText.length > 120 ? commentText.substring(0, 120) + '...' : commentText}&quot;
                            </p>
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        borderRadius: '10px',
                        marginBottom: '20px'
                    }}>
                        <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                        <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                            Это действие нельзя отменить
                        </span>
                    </div>

                    {/* hCaptcha */}
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ color: 'var(--text-muted, #888)', fontSize: '0.85rem' }}>
                            Подтвердите, что вы не робот:
                        </span>
                        <HCaptcha
                            ref={captchaRef}
                            sitekey="5df4f0a0-b066-4732-980a-694cd7661c2e"
                            onVerify={handleCaptchaVerify}
                            theme="dark"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '20px 24px',
                    borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))'
                }}>
                    <button 
                        onClick={handleClose}
                        disabled={isDeleting}
                        style={{
                            flex: 1,
                            padding: '12px 20px',
                            background: 'transparent',
                            border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                            borderRadius: '10px',
                            color: 'var(--text-primary, #fff)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: isDeleting ? 0.5 : 1
                        }}
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!canDelete || isDeleting}
                        style={{
                            flex: 1,
                            padding: '12px 20px',
                            background: canDelete ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: canDelete && !isDeleting ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: canDelete ? 1 : 0.6
                        }}
                    >
                        <Trash2 size={16} />
                        {isDeleting ? 'Удаление...' : 'Удалить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteCommentModal;
