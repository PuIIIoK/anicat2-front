"use client";

import React, { FC } from "react";
import Link from "next/link";
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

export interface CommentVM {
  commentId: number;
  animeId: number;
  verified?: boolean;
  nickname?: string | null;
  roles: string[];
  username: string;
  text: string;
  likes: number;
  dislikes: number;
  userReaction?: "like" | "dislike" | null;
  replies: ReplyVM[];
}

interface CommentItemProps {
  comment: CommentVM;
  avatarUrl?: string;
  roleClass: string;
  usernameLinkClass?: string;
  reactionsState: Record<number, "like" | "dislike" | null>;
  onReact: (commentId: number, type: "like" | "dislike") => void;
  renderRatingBadge: (likes?: number, dislikes?: number, baseClass?: string) => React.ReactNode;
  onEditStart?: (id: number, text: string) => void;
  onDelete?: (id: number) => void;
  isOwnComment: boolean;
  isMobile?: boolean;
  onReplyClick?: (commentId: number) => void;
  showRepliesButton?: boolean;
  repliesCount?: number;
}

const CommentItem: FC<CommentItemProps> = ({
  comment,
  avatarUrl,
  roleClass,
  reactionsState,
  onReact,
  renderRatingBadge,
  onEditStart,
  onDelete,
  isOwnComment,
  isMobile = false,
  onReplyClick,
  showRepliesButton = true,
  repliesCount = 0,
}) => {
  const containerItemClass = isMobile ? "modal-comment-item-mobile" : "modal-comment-item";
  const avatarClass = isMobile ? "modal-avatar-mobile" : "modal-avatar";
  const contentClass = isMobile ? "modal-comment-content-mobile" : "modal-comment-content";
  const headerClass = isMobile ? "modal-comment-header-mobile" : "modal-comment-header";
  const usernameClass = isMobile ? "username-comments-mobile" : "username-comments";
  const verifiedClass = isMobile ? "verified-icon-mobile" : "verified-icon";
  const ratingClass = isMobile ? "rating-mobile" : "rating";
  const ratingUpClass = isMobile ? "rating-up-mobile" : "rating-up";
  const ratingDownClass = isMobile ? "rating-down-mobile" : "rating-down";
  const likesBaseClass = isMobile ? "likes-count-mobile" : "likes-count";
  const editButtonClass = isMobile ? "edit-button-mobile" : "edit-button";
  const toggleRepliesButtonClass = isMobile ? "toggle-replies-button-mobile" : "toggle-replies-button";
  const deleteButtonClass = isMobile ? "delete-button-mobile" : "delete-button";

  return (
    <div className={containerItemClass}>
      <Link href={`/profile/${comment.username}`} className={avatarClass} style={{ textDecoration: "none", color: "inherit" }}>
        <Avatar username={comment.username} url={avatarUrl} />
      </Link>
      <div className={contentClass}>
        <div className={headerClass}>
          <Link
            href={`/profile/${comment.username}`}
            className={`${usernameClass} ${roleClass}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {comment.nickname || comment.username}
            {comment.verified && (
              <VerifiedIcon className={verifiedClass} width={isMobile ? 18 : 25} height={isMobile ? 18 : 25} style={{ marginLeft: isMobile ? 4 : 5 }} />
            )}
          </Link>
          <div className={ratingClass}>
            <ArrowBigUp
              size={isMobile ? 18 : 18}
              className={`${ratingUpClass} ${reactionsState[comment.commentId] === "like" ? "active" : ""}`}
              onClick={() => onReact(comment.commentId, "like")}
            />
            <ArrowBigDown
              size={isMobile ? 18 : 18}
              className={`${ratingDownClass} ${
                reactionsState[comment.commentId] === "dislike"
                  ? "active"
                  : reactionsState[comment.commentId] === null
                  ? "default-red"
                  : ""
              }`}
              onClick={() => onReact(comment.commentId, "dislike")}
            />
            {renderRatingBadge(comment.likes, comment.dislikes, likesBaseClass)}
          </div>
        </div>

        {/* Текст комментария рендерится родителем, чтобы переиспользовать существующую разметку */}

        {/* Кнопки действий */}
        <div className={isMobile ? "modal-comment-actions-mobile" : undefined}>
          {isOwnComment && onEditStart && (
            <button className={editButtonClass} onClick={() => onEditStart(comment.commentId, comment.text)}>
              Редактировать
            </button>
          )}
          {showRepliesButton && onReplyClick && (
            <button className={toggleRepliesButtonClass} onClick={() => onReplyClick(comment.commentId)}>
              {repliesCount > 0 ? `Показать ответы (${repliesCount})` : "Ответить"}
            </button>
          )}
          {isOwnComment && onDelete && (
            <button className={deleteButtonClass} onClick={() => onDelete(comment.commentId)}>
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;


