'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, Send, Heart, Reply, MoreVertical } from 'lucide-react';

interface Comment {
    id: number;
    username: string;
    text: string;
    timestamp: string;
    likes: number;
    isLiked: boolean;
    replies?: Comment[];
}

interface CommentsModalProps {
    show: boolean;
    onClose: () => void;
    isModern?: boolean;
    animeTitle: string;
    comments: Comment[];
    onSubmitComment: (text: string) => void;
    onLikeComment: (commentId: number) => void;
    onReplyComment: (commentId: number, text: string) => void;
    onOpen?: () => void;
    loading?: boolean;
}

const CommentsModal: React.FC<CommentsModalProps> = ({
    show,
    onClose,
    isModern = false,
    animeTitle,
    comments,
    onSubmitComment,
    onLikeComment,
    onReplyComment,
    onOpen,
}) => {
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');

    // Загрузка комментариев при открытии
    React.useEffect(() => {
        if (show && onOpen) {
            onOpen();
        }
    }, [show, onOpen]);

    if (!show) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        
        onSubmitComment(newComment.trim());
        setNewComment('');
    };

    const handleReply = (commentId: number, e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        
        onReplyComment(commentId, replyText.trim());
        setReplyText('');
        setReplyingTo(null);
    };

    return (
        <div className={`comments-modal-overlay ${isModern ? 'modern' : 'classic'}`}>
            <div className="comments-modal" onClick={e => e.stopPropagation()}>
                {/* Заголовок */}
                <div className="modal-header">
                    <div className="header-content">
                        <h2>Комментарии</h2>
                        <p className="anime-title">{animeTitle}</p>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Форма добавления комментария */}
                <div className="comment-form">
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Напишите комментарий..."
                                className="comment-input"
                                rows={3}
                            />
                            <button 
                                type="submit" 
                                className="submit-button"
                                disabled={!newComment.trim()}
                            >
                                <Send size={18} />
                                Отправить
                            </button>
                        </div>
                    </form>
                </div>

                {/* Список комментариев */}
                <div className="comments-list">
                    {comments.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">💬</div>
                            <h3>Пока нет комментариев</h3>
                            <p>Станьте первым, кто оставит комментарий!</p>
                        </div>
                    ) : (
                        comments.map((comment, index) => (
                            <div key={`comment-${comment.id || index}`} className="comment-item">
                                <div className="comment-header">
                                    <div className="user-info">
                                        <Link href={`/profile/${comment.username}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="user-avatar">
                                                {(comment.username || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-details">
                                                <span className="username">{comment.username}</span>
                                                <span className="timestamp">{comment.timestamp}</span>
                                            </div>
                                        </Link>
                                    </div>
                                    <button className="menu-button">
                                        <MoreVertical size={16} />
                                    </button>
                                </div>

                                <div className="comment-content">
                                    <p>{comment.text}</p>
                                </div>

                                <div className="comment-actions">
                                    <button 
                                        className={`action-button ${comment.isLiked ? 'liked' : ''}`}
                                        onClick={() => onLikeComment(comment.id)}
                                    >
                                        <Heart size={16} fill={comment.isLiked ? '#e50914' : 'none'} />
                                        {comment.likes > 0 && <span>{comment.likes}</span>}
                                    </button>
                                    
                                    <button 
                                        className="action-button"
                                        onClick={() => setReplyingTo(comment.id)}
                                    >
                                        <Reply size={16} />
                                        Ответить
                                    </button>
                                </div>

                                {/* Форма ответа */}
                                {replyingTo === comment.id && (
                                    <div className="reply-form">
                                        <form onSubmit={(e) => handleReply(comment.id, e)}>
                                            <div className="reply-input-group">
                                                <textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder={`Ответить ${comment.username}...`}
                                                    className="reply-input"
                                                    rows={2}
                                                    autoFocus
                                                />
                                                <div className="reply-actions">
                                                    <button 
                                                        type="button"
                                                        className="cancel-button"
                                                        onClick={() => {
                                                            setReplyingTo(null);
                                                            setReplyText('');
                                                        }}
                                                    >
                                                        Отмена
                                                    </button>
                                                    <button 
                                                        type="submit"
                                                        className="reply-submit"
                                                        disabled={!replyText.trim()}
                                                    >
                                                        Ответить
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* Ответы */}
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="replies-list">
                                        {comment.replies.map((reply, replyIndex) => (
                                            <div key={`reply-${reply.id || replyIndex}`} className="reply-item">
                                                <div className="comment-header">
                                                    <div className="user-info">
                                                        <Link href={`/profile/${reply.username}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div className="user-avatar">
                                                                {(reply.username || 'A').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="user-details">
                                                                <span className="username">{reply.username}</span>
                                                                <span className="timestamp">{reply.timestamp}</span>
                                                            </div>
                                                        </Link>
                                                    </div>
                                                </div>
                                                <div className="comment-content">
                                                    <p>{reply.text}</p>
                                                </div>
                                                <div className="comment-actions">
                                                    <button 
                                                        className={`action-button ${reply.isLiked ? 'liked' : ''}`}
                                                        onClick={() => onLikeComment(reply.id)}
                                                    >
                                                        <Heart size={14} fill={reply.isLiked ? '#e50914' : 'none'} />
                                                        {reply.likes > 0 && <span>{reply.likes}</span>}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentsModal;
