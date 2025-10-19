"use client";

import React, { FC } from "react";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import VerifiedIcon from "./VerifiedIcon";
import Avatar from "./Avatar";

export interface ReplyVM {
  replyId: number;
  parentCommentId: number;
  parentReplyId?: number | null;
  verified?: boolean;
  nickname?: string | null;
  roles: string[];
  username: string;
  userReaction?: "like" | "dislike" | null;
  text: string;
  likes: number;
  dislikes: number;
}

interface ReplyItemProps {
  reply: ReplyVM;
  avatarUrl?: string;
  roleClass: string;
  reactionsState: Record<number, "like" | "dislike" | null>;
  onReact: (replyId: number, commentId: number, type: "like" | "dislike") => void;
  renderRatingBadge: (likes?: number, dislikes?: number, baseClass?: string) => React.ReactNode;
  isOwnReply: boolean;
  isMobile?: boolean;
  onReplyClick?: (parentCommentId: number, parentReplyId: number, username: string) => void;
  onEditStart?: (replyId: number, text: string) => void;
  onDelete?: (replyId: number) => void;
  parentCommentId: number;
  repliedTo?: { username: string; text: string } | null;
}

const ReplyItem: FC<ReplyItemProps> = ({
  reply,
  avatarUrl,
  roleClass,
  reactionsState,
  onReact,
  renderRatingBadge,
  isOwnReply,
  isMobile = false,
  onReplyClick,
  onEditStart,
  onDelete,
  parentCommentId,
  repliedTo,
}) => {
  const containerItemClass = isMobile ? "reply-comments-item-mobile" : "reply-comments-item";
  const avatarClass = isMobile ? "reply-comments-avatar-mobile" : "reply-comments-avatar";
  const headerClass = isMobile ? "reply-comments-header-mobile" : "reply-comments-header";
  const usernameClass = isMobile ? "username-replies-mobile" : "username-replies";
  const verifiedClass = isMobile ? "verified-icon-mobile" : "verified-icon";
  const ratingClass = isMobile ? "rating-mobile" : "rating";
  const ratingUpClass = isMobile ? "rating-up-mobile" : "rating-up";
  const ratingDownClass = isMobile ? "rating-down-mobile" : "rating-down";
  const likesBaseClass = isMobile ? "likes-count-mobile" : "likes-count";

  const editButtonClass = isMobile ? "reply-comments-edit-button-mobile" : "reply-comments-edit-button";
  const deleteButtonClass = isMobile ? "reply-comments-delete-button-mobile" : "delete-button";
  const replyButtonClass = isMobile ? "reply-comments-reply-button-mobile" : "reply-comments-reply-button";
  const textClass = isMobile ? "reply-comments-text-mobile" : "reply-comments-text";
  const replyToInfoClass = isMobile ? "reply-to-info-mobile" : "reply-to-info";
  const replyToUsernameClass = isMobile ? "reply-to-username-mobile" : "reply-to-username";
  const replyToTextClass = isMobile ? "reply-to-text-mobile" : "reply-to-text";

  return (
    <div className={containerItemClass}>
      <div className={avatarClass}>
        <Avatar username={reply.username} url={avatarUrl} />
      </div>

      <div style={{ flex: 1 }}>
        <div className={headerClass}>
          <a
            href={`/profile/${reply.username}`}
            className={`${usernameClass} ${roleClass}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {reply.nickname || reply.username}
            {reply.verified && (
              <VerifiedIcon className={verifiedClass} width={isMobile ? 15 : 25} height={isMobile ? 15 : 25} />
            )}
          </a>
          <div className={ratingClass}>
            <ArrowBigUp
              size={isMobile ? 14 : 14}
              className={`${ratingUpClass} ${reactionsState[reply.replyId] === "like" ? "active" : ""}`}
              onClick={() => onReact(reply.replyId, parentCommentId, "like")}
            />
            <ArrowBigDown
              size={isMobile ? 14 : 14}
              className={`${ratingDownClass} ${
                reactionsState[reply.replyId] === "dislike"
                  ? "active"
                  : reactionsState[reply.replyId] === null
                  ? "default-red"
                  : ""
              }`}
              onClick={() => onReact(reply.replyId, parentCommentId, "dislike")}
            />
            {renderRatingBadge(reply.likes, reply.dislikes, likesBaseClass)}
          </div>
        </div>

        <div className={textClass}>
          {repliedTo && (
            <div className={replyToInfoClass}>
              <span className={replyToUsernameClass}>@{repliedTo.username}</span>:&nbsp;
              <span className={replyToTextClass}>{repliedTo.text}</span>
            </div>
          )}
          {/* Текст ответа рендерится родителем через уже существующий форматтер */}
        </div>

        {/* Кнопки действий */}
        {isOwnReply && onEditStart && (
          <button className={editButtonClass} onClick={() => onEditStart(reply.replyId, reply.text)}>
            Редактировать
          </button>
        )}
        {isOwnReply && onDelete && (
          <button className={deleteButtonClass} onClick={() => onDelete(reply.replyId)}>
            Удалить
          </button>
        )}
        {onReplyClick && (
          <button className={replyButtonClass} onClick={() => onReplyClick(parentCommentId, reply.replyId!, reply.username)}>
            Ответить
          </button>
        )}
      </div>
    </div>
  );
};

export default ReplyItem;


