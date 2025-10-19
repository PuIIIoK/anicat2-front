'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, Shield, AlertTriangle } from 'lucide-react';

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
    const [captchaAnswer, setCaptchaAnswer] = useState('');
    const [captchaQuestion, setCaptchaQuestion] = useState({ question: '', answer: 0 });
    const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
    const [showError, setShowError] = useState(false);

    // Генерация простой математической капчи
    const generateCaptcha = () => {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operations = ['+', '-', '×'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        
        let answer;
        let question;
        
        switch (operation) {
            case '+':
                answer = num1 + num2;
                question = `${num1} + ${num2}`;
                break;
            case '-':
                // Убеждаемся, что результат положительный
                const larger = Math.max(num1, num2);
                const smaller = Math.min(num1, num2);
                answer = larger - smaller;
                question = `${larger} - ${smaller}`;
                break;
            case '×':
                answer = num1 * num2;
                question = `${num1} × ${num2}`;
                break;
            default:
                answer = num1 + num2;
                question = `${num1} + ${num2}`;
        }
        
        setCaptchaQuestion({ question, answer });
    };

    // Генерация капчи при открытии модалки
    useEffect(() => {
        if (isOpen) {
            generateCaptcha();
            setCaptchaAnswer('');
            setIsAnswerCorrect(false);
            setShowError(false);
        }
    }, [isOpen]);

    // Проверка ответа капчи
    useEffect(() => {
        if (captchaAnswer && !isNaN(parseInt(captchaAnswer))) {
            const userAnswer = parseInt(captchaAnswer);
            setIsAnswerCorrect(userAnswer === captchaQuestion.answer);
            setShowError(false);
        } else {
            setIsAnswerCorrect(false);
        }
    }, [captchaAnswer, captchaQuestion.answer]);

    const handleConfirm = () => {
        if (isAnswerCorrect) {
            onConfirm();
            onClose();
        } else {
            setShowError(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isAnswerCorrect) {
            handleConfirm();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="delete-comment-modal-overlay">
            <div className="delete-comment-modal">
                <div className="delete-comment-modal-header">
                    <div className="delete-comment-modal-title">
                        <AlertTriangle className="delete-comment-modal-icon" size={24} />
                        <span>Удаление {isReply ? 'ответа' : 'комментария'}</span>
                    </div>
                    <button 
                        className="delete-comment-modal-close"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="delete-comment-modal-content">
                    <div className="delete-comment-modal-warning">
                        <p>Вы действительно хотите удалить {isReply ? 'этот ответ' : 'этот комментарий'}?</p>
                        
                        {commentText && (
                            <div className="delete-comment-modal-preview">
                                <strong>Содержимое:</strong>
                                <p>&quot;{commentText.length > 100 ? commentText.substring(0, 100) + '...' : commentText}&quot;</p>
                            </div>
                        )}
                        
                        <div className="delete-comment-modal-notice">
                            <Shield size={16} />
                            <span>Это действие нельзя отменить</span>
                        </div>
                    </div>

                    <div className="delete-comment-modal-captcha">
                        <label className="delete-comment-modal-captcha-label">
                            Для подтверждения решите пример:
                        </label>
                        <div className="delete-comment-modal-captcha-container">
                            <div className="delete-comment-modal-captcha-question">
                                {captchaQuestion.question} = ?
                            </div>
                            <input
                                type="number"
                                value={captchaAnswer}
                                onChange={(e) => setCaptchaAnswer(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ответ"
                                className={`delete-comment-modal-captcha-input ${
                                    isAnswerCorrect ? 'correct' : showError ? 'error' : ''
                                }`}
                                autoFocus
                            />
                        </div>
                        {showError && (
                            <div className="delete-comment-modal-error">
                                Неверный ответ. Попробуйте еще раз.
                            </div>
                        )}
                    </div>
                </div>

                <div className="delete-comment-modal-actions">
                    <button 
                        className="delete-comment-modal-cancel"
                        onClick={onClose}
                    >
                        Отмена
                    </button>
                    <button 
                        className={`delete-comment-modal-confirm ${isAnswerCorrect ? 'enabled' : 'disabled'}`}
                        onClick={handleConfirm}
                        disabled={!isAnswerCorrect}
                    >
                        <Trash2 size={16} />
                        Удалить {isReply ? 'ответ' : 'комментарий'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteCommentModal;
