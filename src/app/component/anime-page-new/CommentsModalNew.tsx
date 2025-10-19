"use client";

import React, { FC } from 'react';
import Link from 'next/link';
import {ArrowBigUp, ArrowBigDown, ArrowLeft} from 'lucide-react';
import useCommentsModal, { Comment, Reply } from './comments/useCommentsModal';
import VerifiedIcon from './comments/VerifiedIcon';
import Avatar from './comments/Avatar';

interface CommentsModalProps {
    show: boolean;
    onClose: () => void;
    animeId: string;
    myUsername: string | null;
    onRequireAuth?: () => void;
    isModernDesign?: boolean;
}

const CommentsModalNew: FC<CommentsModalProps> = ({ show, onClose, myUsername, animeId, onRequireAuth, isModernDesign = false }) => {
    const handleClose = () => {
        onClose();
    };
    
    const ctx = useCommentsModal({ show, animeId, myUsername, onRequireAuth: () => onRequireAuth?.() });
    const {
        comments, avatars, newComment, replyInputs, showReplies,
        editingCommentId, editingReplyId, editText,
        focusedCommentId, replyToUsername, commentReactions, replyReactions,
        loading, isMobile,
        setNewComment, setReplyingTo, setShowReplies,
        setEditText, setFocusedCommentId, setActiveCommentId, setReplyToUsername, setShowForm,
        handleBackToAll, handleCommentReaction, handleReplyReaction,
        handleReplyChange, handleSendReply, handleSend, startEditComment, startEditReply,
        cancelEdit, saveEdit, handleDeleteComment, handleDeleteReply,
        renderMultilineText, renderRatingBadge,
    } = ctx;

    if (!show) return null;

    // Базовые классы для стилей
    const modalClasses = {
        overlay: isModernDesign ? "comments-modal-overlay-modern" : "comments-modal-overlay",
        content: isModernDesign ? "comments-modal-content-modern" : "comments-modal-content",
        header: isModernDesign ? "comments-modal-header-modern" : "comments-modal-header",
        title: isModernDesign ? "comments-modal-title-modern" : "comments-modal-title",
        closeBtn: isModernDesign ? "comments-modal-close-modern" : "comments-modal-close",
        backBtn: isModernDesign ? "comments-modal-back-modern" : "comments-modal-back",
        list: isModernDesign ? "comments-list-modern" : "comments-list",
        item: isModernDesign ? "comment-item-modal-modern" : "comment-item-modal",
        avatar: isModernDesign ? "comment-avatar-modern" : "comment-avatar",
        commentContent: isModernDesign ? "comment-content-modern" : "comment-content",
        username: isModernDesign ? "comment-username-modern" : "comment-username",
        text: isModernDesign ? "comment-text-modern" : "comment-text",
        rating: isModernDesign ? "comment-rating-modern" : "comment-rating",
        actions: isModernDesign ? "comment-actions-modern" : "comment-actions",
        editBtn: isModernDesign ? "comment-edit-btn-modern" : "comment-edit-btn",
        deleteBtn: isModernDesign ? "comment-delete-btn-modern" : "comment-delete-btn",
        replyBtn: isModernDesign ? "comment-reply-btn-modern" : "comment-reply-btn",
        textarea: isModernDesign ? "comment-textarea-modern" : "comment-textarea",
        saveBtn: isModernDesign ? "comment-save-btn-modern" : "comment-save-btn",
        cancelBtn: isModernDesign ? "comment-cancel-btn-modern" : "comment-cancel-btn",
        replySection: isModernDesign ? "reply-section-modern" : "reply-section",
        repliesList: isModernDesign ? "replies-list-modern" : "replies-list",
        replyItem: isModernDesign ? "reply-item-modern" : "reply-item",
    };

    // При клике "Ответить"
    const handleReplyClick = (commentId: number, parentReplyId: number | null = null, replyingToUsername?: string) => {
        setFocusedCommentId(commentId);
        setActiveCommentId(commentId);
        setReplyingTo(parentReplyId);
        setReplyToUsername(parentReplyId ? replyingToUsername ?? null : null);
        setShowForm(true);
        setNewComment('');
        setShowReplies(prev => ({ ...prev, [commentId]: true }));
    };

    if (isMobile) {
        // Мобильная версия (пока оставляем как есть)
        return (
            <div className="mobile-comments-modal">
                <div className="mobile-modal-content">
                    <button onClick={handleClose} className="mobile-modal-close">✕</button>
                    <h2>Комментарии</h2>
                    <div className="mobile-comments-list">
                        {loading && <div className="loader">Загрузка...</div>}
                        {!loading && comments.length === 0 && (
                            <div className="no-comments">Нет комментариев</div>
                        )}
                        {comments.map((comment: Comment) => (
                            <div key={comment.commentId} className="mobile-comment-item">
                                <Link href={`/profile/${comment.username}`} className="mobile-comment-avatar" style={{ textDecoration: 'none' }}>
                                    <Avatar username={comment.username} url={avatars[comment.username]}/>
                                </Link>
                                <div className="mobile-comment-content">
                                    <Link href={`/profile/${comment.username}`} className="mobile-comment-username" style={{ textDecoration: 'none', color: 'inherit' }}>
                                        {comment.nickname || comment.username}
                                    </Link>
                                    <div className="mobile-comment-text">
                                        {renderMultilineText(comment.text)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={modalClasses.overlay} onClick={handleClose}>
            <div className={modalClasses.content} onClick={e => e.stopPropagation()}>
                {/* Заголовок модалки */}
                <div className={modalClasses.header}>
                    <h2 className={modalClasses.title}>Комментарии к аниме</h2>
                    <button onClick={handleClose} className={modalClasses.closeBtn}>✕</button>
                </div>

                {/* Кнопка "Назад" */}
                {focusedCommentId !== null && (
                    <button className={modalClasses.backBtn} onClick={handleBackToAll}>
                        <ArrowLeft size={18} />
                        Вернуться ко всем комментариям
                    </button>
                )}

                {/* Список комментариев */}
                <div className={modalClasses.list}>
                    {loading && (
                        <div className={isModernDesign ? "loader-modern" : "loader"}>Загрузка...</div>
                    )}
                    
                    {!loading && comments.length === 0 && (
                        <div className={isModernDesign ? "no-comments-modern" : "no-comments"}>
                            К данному аниме пока ещё нет комментариев.
                        </div>
                    )}

                    {comments
                        .filter((comment: Comment) => focusedCommentId === null || comment.commentId === focusedCommentId)
                        .map((comment: Comment) => (
                            <div key={comment.commentId} className={modalClasses.item}>
                                {/* Аватар */}
                                <Link href={`/profile/${comment.username}`} className={modalClasses.avatar} style={{ textDecoration: 'none' }}>
                                    <Avatar username={comment.username} url={avatars[comment.username]}/>
                                </Link>

                                {/* Контент комментария */}
                                <div className={modalClasses.commentContent}>
                                    {/* Заголовок комментария */}
                                    <div className="comment-header">
                                        <Link
                                            href={`/profile/${comment.username}`}
                                            className={modalClasses.username}
                                            style={{
                                                textDecoration: 'none',
                                                color: comment.roles.includes('ADMIN') ? '#dc2626'
                                                    : comment.roles.includes('MODERATOR') ? '#3b82f6'
                                                    : comment.roles.includes('PREMIUM') ? '#fbbf24'
                                                    : '#cccccc'
                                            }}
                                        >
                                            {comment.nickname || comment.username}
                                            {comment.verified && (
                                                <VerifiedIcon width={16} height={16} style={{ marginLeft: 6 }} />
                                            )}
                                        </Link>

                                        {/* Рейтинг комментария */}
                                        <div className={modalClasses.rating}>
                                            <ArrowBigUp
                                                size={16}
                                                className={`rating-up ${commentReactions[comment.commentId] === 'like' ? 'active' : ''}`}
                                                onClick={() => handleCommentReaction(comment.commentId, 'like')}
                                            />
                                            <ArrowBigDown
                                                size={16}
                                                className={`rating-down ${commentReactions[comment.commentId] === 'dislike' ? 'active' : ''}`}
                                                onClick={() => handleCommentReaction(comment.commentId, 'dislike')}
                                            />
                                            {renderRatingBadge(comment.likes, comment.dislikes, 'likes-count')}
                                        </div>
                                    </div>

                                    {/* Текст комментария или форма редактирования */}
                                    {editingCommentId === comment.commentId ? (
                                        <div className="edit-form">
                                            <textarea
                                                value={editText}
                                                onChange={e => setEditText(e.target.value)}
                                                rows={3}
                                                className={modalClasses.textarea}
                                                placeholder="Редактировать комментарий..."
                                            />
                                            <div className="edit-buttons">
                                                <button onClick={saveEdit} className={modalClasses.saveBtn}>
                                                    Сохранить
                                                </button>
                                                <button onClick={cancelEdit} className={modalClasses.cancelBtn}>
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={modalClasses.text}>
                                            {renderMultilineText(comment.text)}
                                        </div>
                                    )}

                                    {/* Действия с комментарием */}
                                    <div className={modalClasses.actions}>
                                        {comment.username === myUsername && (
                                            <>
                                                <button
                                                    className={modalClasses.editBtn}
                                                    onClick={() => startEditComment(comment.commentId, comment.text)}
                                                >
                                                    Редактировать
                                                </button>
                                                <button
                                                    className={modalClasses.deleteBtn}
                                                    onClick={() => handleDeleteComment(comment.commentId)}
                                                >
                                                    Удалить
                                                </button>
                                            </>
                                        )}

                                        {focusedCommentId === null && comment.replies.length > 0 && (
                                            <button
                                                className={modalClasses.replyBtn}
                                                onClick={() => handleReplyClick(comment.commentId)}
                                            >
                                                Показать ответы ({comment.replies.length})
                                            </button>
                                        )}
                                    </div>


                                    {/* Список ответов */}
                                    {showReplies[comment.commentId] && comment.replies.length > 0 && (
                                        <div className={modalClasses.repliesList}>
                                            {comment.replies.map((reply: Reply) => (
                                                <div key={reply.replyId} className={modalClasses.replyItem}>
                                                    <Link href={`/profile/${reply.username}`} className={modalClasses.avatar} style={{ textDecoration: 'none' }}>
                                                        <Avatar username={reply.username} url={avatars[reply.username]}/>
                                                    </Link>
                                                    <div className="reply-content">
                                                        <div className="reply-header">
                                                            <Link
                                                                href={`/profile/${reply.username}`}
                                                                className={modalClasses.username}
                                                                style={{
                                                                    textDecoration: 'none',
                                                                    color: reply.roles.includes('ADMIN') ? '#dc2626'
                                                                        : reply.roles.includes('MODERATOR') ? '#3b82f6'
                                                                        : reply.roles.includes('PREMIUM') ? '#fbbf24'
                                                                        : '#cccccc'
                                                                }}
                                                            >
                                                                {reply.nickname || reply.username}
                                                                {reply.verified && (
                                                                    <VerifiedIcon width={14} height={14} style={{ marginLeft: 4 }} />
                                                                )}
                                                            </Link>
                                                            <div className={modalClasses.rating}>
                                                                <ArrowBigUp
                                                                    size={14}
                                                                    className={`rating-up ${replyReactions[reply.replyId] === 'like' ? 'active' : ''}`}
                                                                    onClick={() => handleReplyReaction(reply.replyId, comment.commentId, 'like')}
                                                                />
                                                                <ArrowBigDown
                                                                    size={14}
                                                                    className={`rating-down ${replyReactions[reply.replyId] === 'dislike' ? 'active' : ''}`}
                                                                    onClick={() => handleReplyReaction(reply.replyId, comment.commentId, 'dislike')}
                                                                />
                                                                {renderRatingBadge(reply.likes, reply.dislikes, 'likes-count')}
                                                            </div>
                                                        </div>
                                                        
                                                        {editingReplyId === reply.replyId ? (
                                                            <div className="edit-form">
                                                                <textarea
                                                                    value={editText}
                                                                    onChange={e => setEditText(e.target.value)}
                                                                    rows={2}
                                                                    className={modalClasses.textarea}
                                                                />
                                                                <div className="edit-buttons">
                                                                    <button onClick={saveEdit} className={modalClasses.saveBtn}>Сохранить</button>
                                                                    <button onClick={cancelEdit} className={modalClasses.cancelBtn}>Отмена</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className={modalClasses.text}>
                                                                    {renderMultilineText(reply.text)}
                                                                </div>
                                                                <div className={modalClasses.actions}>
                                                                    {reply.username === myUsername && (
                                                                        <>
                                                                            <button
                                                                                className={modalClasses.editBtn}
                                                                                onClick={() => startEditReply(reply.replyId, reply.text)}
                                                                            >
                                                                                Редактировать
                                                                            </button>
                                                                            <button
                                                                                className={modalClasses.deleteBtn}
                                                                                onClick={() => handleDeleteReply(reply.replyId, comment.commentId)}
                                                                            >
                                                                                Удалить
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    <button
                                                                        className={modalClasses.replyBtn}
                                                                        onClick={() => {
                                                                            setReplyingTo(reply.replyId);
                                                                            setReplyToUsername(reply.username);
                                                                        }}
                                                                    >
                                                                        Ответить
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            
                                        </div>
                                    )}

                                    {/* Форма ответа снизу для конкретного комментария */}
                                    {focusedCommentId === comment.commentId && (
                                        <div className={modalClasses.replySection}>
                                            <h4>Ответить на комментарий {replyToUsername ? `@${replyToUsername}` : ''}</h4>
                                            <textarea
                                                value={replyInputs[comment.commentId] || ''}
                                                onChange={e => handleReplyChange(comment.commentId, e.target.value)}
                                                placeholder={replyToUsername ? `Ответить @${replyToUsername}...` : "Написать ответ..."}
                                                rows={4}
                                                className={modalClasses.textarea}
                                            />
                                            <div className="reply-buttons">
                                                <button
                                                    className={modalClasses.saveBtn}
                                                    onClick={() => handleSendReply(comment.commentId)}
                                                    disabled={!(replyInputs[comment.commentId] || '').trim()}
                                                >
                                                    Отправить ответ
                                                </button>
                                                <button
                                                    className={modalClasses.cancelBtn}
                                                    onClick={() => {
                                                        setReplyingTo(null);
                                                        setReplyToUsername(null);
                                                    }}
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>

                {/* Форма для нового комментария - внизу */}
                {focusedCommentId === null && (
                    <div className={isModernDesign ? "new-comment-form-modern" : "new-comment-form"}>
                        <h3>Написать комментарий</h3>
                        <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Напишите ваш комментарий..."
                            rows={4}
                            className={modalClasses.textarea}
                        />
                        <div className="new-comment-buttons">
                            <button
                                onClick={handleSend}
                                className={modalClasses.saveBtn}
                                disabled={!newComment.trim() || !myUsername}
                            >
                                {!myUsername ? 'Войдите для комментирования' : 'Отправить комментарий'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentsModalNew;
