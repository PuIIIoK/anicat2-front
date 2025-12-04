"use client";

import React from "react";
import { useEffect, useState } from "react";
import { API_SERVER } from '@/hosts/constants';

export interface AvatarCacheItem {
  url: string;
  updated: number;
}

export interface UserProfile {
  username: string;
  nickname?: string;
  verified?: boolean;
  roles?: string[];
  muted?: boolean;
  muteReason?: string;
  muteEndDate?: string;
}

export interface Reply {
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

export interface Comment {
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
  replies: Reply[];
}

// API response types
export interface ApiReply {
  replyId: number;
  parentReplyId?: number | null;
  username: string;
  nickname?: string | null;
  verified?: boolean;
  roles?: string[];
  text: string;
  likes?: number;
  dislikes?: number;
  avatarUrl?: string;
}

export interface ApiComment {
  id: number;
  animeId: number;
  userUsername: string;
  nickname?: string | null;
  verified?: boolean;
  roles?: string;
  text: string;
  likes?: number;
  dislikes?: number;
  avatarUrl?: string;
  replies?: ApiReply[];
}

export interface ApiCommentResponse {
  id: number;
  animeId: number;
  userUsername?: string;
  nickname?: string | null;
  verified?: boolean;
  roles?: string;
  text: string;
  likes?: number;
  dislikes?: number;
}

export interface ApiReplyResponse {
  id: number;
  parentCommentId: number;
  parentReplyId?: number | null;
  userUsername?: string;
  nickname?: string | null;
  verified?: boolean;
  roles?: string;
  text: string;
  likes?: number;
  dislikes?: number;
}

export const useCommentsModal = (params: { show: boolean; animeId: string; myUsername: string | null; onRequireAuth?: () => void }) => {
  const { show, animeId, myUsername, onRequireAuth } = params;
  // const { show: showNotification } = useNotifications();

  const [comments, setComments] = useState<Comment[]>([]);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState<string>("");
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [showReplies, setShowReplies] = useState<Record<number, boolean>>({});

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [usernameFromToken, setUsernameFromToken] = useState<string | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);

  const [focusedCommentId, setFocusedCommentId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [commentReactions, setCommentReactions] = useState<Record<number, "like" | "dislike" | null>>({});
  const [replyReactions, setReplyReactions] = useState<Record<number, "like" | "dislike" | null>>({});
  const [loading, setLoading] = useState(true);
  const [, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 700);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
    const token = match ? match[1] : null;
    if (!token) return;

    fetch(`${API_SERVER}/api/auth/username-from-token`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Ошибка при получении username");
        return res.json();
      })
      .then((data: { username?: string }) => {
        if (data.username) {
          setUsernameFromToken(data.username);
          // Получаем полную информацию о пользователе, включая статус мута
          return fetch(`${API_SERVER}/api/auth/get-profile/username?username=${encodeURIComponent(data.username)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      })
      .then((res) => {
        if (res && res.ok) {
          return res.json();
        }
      })
      .then((profileData) => {
        if (profileData) {
          setCurrentUserProfile({
            username: profileData.username,
            nickname: profileData.nickname,
            verified: profileData.verified,
            roles: profileData.roles || [],
            muted: profileData.muted,
            muteReason: profileData.muteReason,
            muteEndDate: profileData.muteEndDate,
          });
        }
      })
      .catch((err) => console.error("Ошибка вызова API:", err));
  }, []);

  // Отключен кэш аватаров — всегда грузим с сервера

  const fetchAvatar = async (username: string) => {
    try {
      const res = await fetch(`${API_SERVER}/api/profiles/avatar?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data: { url?: string; staticUrl?: string } = await res.json();
        // Prefer staticUrl for images, fallback to url if not webm
        const url = data.staticUrl || (data.url && !data.url.endsWith('.webm') ? data.url : "");
        setAvatars((prev) => ({ ...prev, [username]: url }));
      } else {
        setAvatars((prev) => ({ ...prev, [username]: "" }));
      }
    } catch {
      setAvatars((prev) => ({ ...prev, [username]: "" }));
    }
  };

  const handleBackToAll = () => {
    setFocusedCommentId(null);
    setActiveCommentId(null);
    setReplyingTo(null);
    setNewComment("");
    setReplyToUsername(null);
    setShowForm(false);
    setShowReplies({});
    // Обновляем комментарии без показа спиннера
    reloadComments(false);
  };

  useEffect(() => {
    if (!animeId) return;

    const loadComments = async (showSpinner: boolean) => {
      try {
        if (showSpinner) setLoading(true);
        const res = await fetch(`${API_SERVER}/api/comments/all/${animeId}`);
        const rawData: ApiComment[] = await res.json();

        // Преобразуем данные от API в формат, ожидаемый компонентом
        const data: Comment[] = rawData.map((c: ApiComment) => {
          const mappedReplies: Reply[] = Array.isArray(c.replies)
            ? c.replies.map((r: ApiReply) => ({
                replyId: r.replyId,
                parentCommentId: c.id,
                parentReplyId: r.parentReplyId ?? null,
                username: r.username,
                nickname: r.nickname ?? null,
                verified: !!r.verified,
                roles: Array.isArray(r.roles) ? r.roles : [],
                text: r.text,
                likes: typeof r.likes === 'number' ? r.likes : 0,
                dislikes: typeof r.dislikes === 'number' ? r.dislikes : 0,
                userReaction: null,
              }))
            : [];

          return {
            commentId: c.id,
            animeId: c.animeId,
            verified: c.verified,
            nickname: c.nickname,
            roles: c.roles ? c.roles.split(',').map((r: string) => r.trim()) : [],
            username: c.userUsername,
            text: c.text,
            likes: c.likes ?? 0,
            dislikes: c.dislikes ?? 0,
            userReaction: null, // Будет загружено из localStorage
            replies: mappedReplies,
          } as Comment;
        });

        setComments(data);

        const usernames = new Set<string>();
        const newCommentReactions: Record<number, "like" | "dislike" | null> = {};
        const newReplyReactions: Record<number, "like" | "dislike" | null> = {};
        const newUserProfiles: Record<string, UserProfile> = {};
        const avatarsFromApi: Record<string, string> = {};

        rawData.forEach((c: ApiComment) => {
          if (c.userUsername) usernames.add(c.userUsername);
          newUserProfiles[c.userUsername] = {
            username: c.userUsername,
            nickname: c.nickname ?? undefined,
            verified: c.verified ?? undefined,
            roles: c.roles ? c.roles.split(',').map((r: string) => r.trim()) : [],
          };

          if (typeof c.avatarUrl === 'string' && c.avatarUrl.length > 0) {
            avatarsFromApi[c.userUsername] = c.avatarUrl;
          }

          const storedReaction = localStorage.getItem(`comment-reaction-${c.id}`);
          if (storedReaction) {
            newCommentReactions[c.id] = storedReaction as 'like' | 'dislike';
          }

          if (Array.isArray(c.replies)) {
            c.replies.forEach((r: ApiReply) => {
              if (r.username) usernames.add(r.username);
              newUserProfiles[r.username] = {
                username: r.username,
                nickname: r.nickname ?? undefined,
                verified: !!r.verified,
                roles: Array.isArray(r.roles) ? r.roles : [],
              };
              if (typeof r.avatarUrl === 'string' && r.avatarUrl.length > 0) {
                avatarsFromApi[r.username] = r.avatarUrl;
              }
              const storedReplyReaction = localStorage.getItem(`reply-reaction-${r.replyId}`);
              if (storedReplyReaction) newReplyReactions[r.replyId] = storedReplyReaction as 'like' | 'dislike';
            });
          }
        });

        // Сначала применяем аватары из API, затем дозагружаем пропущенные с сервера
        if (Object.keys(avatarsFromApi).length > 0) {
          setAvatars((prev) => ({ ...prev, ...avatarsFromApi }));
        }

        // Догружаем отсутствующие аватары только с сервера
        const usernamesToFetch = Array.from(usernames).filter((u) => !avatarsFromApi[u]);
        usernamesToFetch.forEach((u) => fetchAvatar(u));

        setUserProfiles(newUserProfiles);
        setCommentReactions(newCommentReactions);
        setReplyReactions(newReplyReactions);
      } catch (err) {
        console.error("Ошибка загрузки комментариев:", err);
        setComments([]);
      } finally {
        if (showSpinner) setLoading(false);
      }
    };

    if (show) {
      loadComments(true);
      // Разрешаем скролл внутри самой модалки на мобилке
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      const interval = setInterval(() => loadComments(false), 10000);
      return () => {
        clearInterval(interval);
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      };
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  }, [show, animeId]);

  const getRoleClass = (roles?: string[]) => {
    if (!roles || roles.length === 0) return "";
    if (roles.includes("ADMIN")) return "nickname-admin-comments";
    if (roles.includes("MODERATOR")) return "nickname-moderator-comments";
    if (roles.includes("PREMIUM")) return "nickname-premium-comments";
    return "username-user-comments";
  };
  const getRoleClassMobile = getRoleClass;
  const getRoleClassReplies = (roles?: string[]) => {
    if (!roles || roles.length === 0) return "";
    if (roles.includes("ADMIN")) return "nickname-admin-replies";
    if (roles.includes("MODERATOR")) return "nickname-moderator-replies";
    if (roles.includes("PREMIUM")) return "nickname-premium-replies";
    return "username-user-replies";
  };

  const handleCommentReaction = async (commentId: number, type: "like" | "dislike") => {
    // Блокируем реакцию для неавторизованных
    const tokenMatch = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
    if (!tokenMatch) {
      onRequireAuth?.();
      return;
    }
    const localKey = `comment-reaction-${commentId}`;
    const stored = localStorage.getItem(localKey) as "like" | "dislike" | null;
    const isRemoving = stored === type;
    const newType: "like" | "dislike" | null = isRemoving ? null : type;
    
    try {
      if (isRemoving) {
        await fetch(`${API_SERVER}/api/comments/${commentId}/remove-reaction`, { method: "PUT" });
        localStorage.removeItem(localKey);
      } else {
        await fetch(`${API_SERVER}/api/comments/${commentId}/${type}`, { method: "PUT" });
        localStorage.setItem(localKey, type);
      }
      
      // Обновляем локальное состояние
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.commentId !== commentId) return comment;
          let updatedLikes = comment.likes;
          let updatedDislikes = comment.dislikes;
          
          if (isRemoving) {
            if (type === "like") updatedLikes = Math.max(0, updatedLikes - 1);
            else updatedDislikes = Math.max(0, updatedDislikes - 1);
          } else {
            if (type === "like") {
              updatedLikes += 1;
              if (stored === "dislike") updatedDislikes = Math.max(0, updatedDislikes - 1);
            } else {
              updatedDislikes += 1;
              if (stored === "like") updatedLikes = Math.max(0, updatedLikes - 1);
            }
          }
          
          return { ...comment, likes: updatedLikes, dislikes: updatedDislikes };
        })
      );
      
      setCommentReactions((prev) => ({ ...prev, [commentId]: newType }));
    } catch (err) {
      console.error("Ошибка при реакции на комментарий:", err);
    }
  };

  const handleReplyReaction = async (replyId: number, commentId: number, type: "like" | "dislike") => {
    // Блокируем реакцию для неавторизованных
    const tokenMatch = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
    if (!tokenMatch) {
      onRequireAuth?.();
      return;
    }
    const localKey = `reply-reaction-${replyId}`;
    const stored = localStorage.getItem(localKey) as "like" | "dislike" | null;
    const isRemoving = stored === type;
    const newType: "like" | "dislike" | null = isRemoving ? null : type;
    
    try {
      if (isRemoving) {
        await fetch(`${API_SERVER}/api/replies/${replyId}/remove-reaction`, { method: "PUT" });
        localStorage.removeItem(localKey);
      } else {
        await fetch(`${API_SERVER}/api/replies/${replyId}/${type}`, { method: "PUT" });
        localStorage.setItem(localKey, type);
      }
      setComments((prev) =>
        prev.map((comment) =>
          comment.commentId === commentId
            ? {
                ...comment,
                replies: comment.replies.map((reply) => {
                  if (reply.replyId !== replyId) return reply;
                  let updatedLikes = reply.likes;
                  let updatedDislikes = reply.dislikes;
                  if (isRemoving) {
                    if (type === "like") updatedLikes = Math.max(0, updatedLikes - 1);
                    else updatedDislikes = Math.max(0, updatedDislikes - 1);
                  } else {
                    if (type === "like") {
                      updatedLikes += 1;
                      if (stored === "dislike") updatedDislikes = Math.max(0, updatedDislikes - 1);
                    } else {
                      updatedDislikes += 1;
                      if (stored === "like") updatedLikes = Math.max(0, updatedLikes - 1);
                    }
                  }
                  return { ...reply, likes: updatedLikes, dislikes: updatedDislikes };
                }),
              }
            : comment
        )
      );
      setReplyReactions((prev) => ({ ...prev, [replyId]: newType }));
    } catch (err) {
      console.error("Ошибка при реакции на ответ:", err);
    }
  };

  const handleReplyChange = (commentId: number, text: string) => {
    setReplyInputs((prev) => ({ ...prev, [commentId]: text }));
  };

  const handleSendReply = (commentId: number) => {
    const tokenMatch = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
    if (!tokenMatch) {
      onRequireAuth?.();
      return;
    }
    
    // Проверяем статус мута
    if (checkMuteStatus()) {
      return;
    }
    
    const text = replyInputs[commentId];
    if (!text || !text.trim()) return;
    const newReply: Reply = {
      replyId: Date.now(),
      parentCommentId: commentId,
      username: myUsername || "You",
      text: text.trim(),
      likes: 0,
      dislikes: 0,
      roles: [],
    };
    setComments((prev) =>
      prev.map((comment) => (comment.commentId === commentId ? { ...comment, replies: [...comment.replies, newReply] } : comment))
    );
    setReplyInputs((prev) => ({ ...prev, [commentId]: "" }));
    setReplyingTo(null);
    setShowReplies((prev) => ({ ...prev, [commentId]: true }));
  };

  const checkMuteStatus = () => {
    if (currentUserProfile?.muted) {
      const muteEndDate = currentUserProfile.muteEndDate ? new Date(currentUserProfile.muteEndDate) : null;
      const now = new Date();
      
      if (muteEndDate && now > muteEndDate) {
        // Мут истек, можно комментировать
        return false;
      }
      
      // Показываем уведомление о муте
      const endDateStr = muteEndDate ? muteEndDate.toLocaleDateString('ru-RU') : 'неопределенного времени';
      const reason = currentUserProfile.muteReason || 'не указана';
      window.notificationManager?.show(`Вы не можете оставлять комментарии до ${endDateStr}. Причина: ${reason}`);
      return true;
    }
    return false;
  };

  const handleSendComment = async () => {
    const tokenMatch = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
    if (!tokenMatch) {
      onRequireAuth?.();
      return;
    }
    
    // Проверяем статус мута
    if (checkMuteStatus()) {
      return;
    }
    
    if (!newComment.trim()) return;
    const commentRequest = { animeId, username: myUsername || "You", text: newComment.trim() };
    try {
      const response = await fetch(`${API_SERVER}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentRequest),
      });
      if (!response.ok) throw new Error(`Ошибка при отправке комментария: ${response.statusText}`);
      const savedComment: ApiCommentResponse = await response.json();
      const newCommentObj: Comment = {
        commentId: savedComment.id,
        animeId: savedComment.animeId,
        username: savedComment.userUsername || commentRequest.username,
        nickname: savedComment.nickname ?? null,
        verified: savedComment.verified ?? false,
        roles: savedComment.roles ? savedComment.roles.split(',').map((r: string) => r.trim()) : [],
        text: savedComment.text,
        likes: savedComment.likes ?? 0,
        dislikes: savedComment.dislikes ?? 0,
        replies: [],
        userReaction: null,
      };
      
      // Сразу загружаем аватар для нового комментария
      if (!avatars[newCommentObj.username]) {
        const res = await fetch(
          `${API_SERVER}/api/profiles/avatar?username=${encodeURIComponent(newCommentObj.username)}`
        );
        if (res.ok) {
          const data: { url?: string; staticUrl?: string } = await res.json();
          const url = data.staticUrl || (data.url && !data.url.endsWith('.webm') ? data.url : "");
          setAvatars((prev) => ({ ...prev, [newCommentObj.username]: url }));
        }
      }
      
      setComments((prev) => [newCommentObj, ...prev]);
      setNewComment("");
      window.notificationManager?.show("Комментарий успешно отправлен!");
    } catch (error) {
      console.error("Ошибка при отправке комментария:", error);
    }
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    
    // Проверяем авторизацию
    const tokenMatch = document.cookie.match(/(?:^|;\s*)token\s*=\s*([^;]+)/);
    if (!tokenMatch) {
      onRequireAuth?.();
      return;
    }
    
    // Проверяем статус мута
    if (checkMuteStatus()) {
      return;
    }
    
    let text = newComment.trim();
    if (replyToUsername && replyingTo !== null) text = `@${replyToUsername},\n` + text;
    if (activeCommentId !== null) {
      const replyRequest = {
        parentCommentId: activeCommentId,
        parentReplyId: replyingTo,
        username: myUsername || "You",
        text,
      };
      try {
        const response = await fetch(`${API_SERVER}/api/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(replyRequest),
        });
        if (!response.ok) throw new Error("Ошибка при отправке ответа");
        const savedReply: ApiReplyResponse = await response.json();
        const newReply: Reply = {
          replyId: savedReply.id,
          parentCommentId: activeCommentId,
          parentReplyId: savedReply.parentReplyId ?? null,
          username: savedReply.userUsername || replyRequest.username,
          nickname: savedReply.nickname ?? null,
          verified: savedReply.verified ?? false,
          roles: savedReply.roles ? savedReply.roles.split(',').map((r: string) => r.trim()) : [],
          text: savedReply.text,
          likes: savedReply.likes ?? 0,
          dislikes: savedReply.dislikes ?? 0,
          userReaction: null,
        };
        
        // Сразу загружаем аватар для нового ответа
        if (!avatars[newReply.username]) {
          const res = await fetch(
            `${API_SERVER}/api/profiles/avatar?username=${encodeURIComponent(newReply.username)}`
          );
          if (res.ok) {
            const data: { url?: string; staticUrl?: string } = await res.json();
            const url = data.staticUrl || (data.url && !data.url.endsWith('.webm') ? data.url : "");
            setAvatars((prev) => ({ ...prev, [newReply.username]: url }));
          }
        }
        
        setComments((prev) =>
          prev.map((comment) =>
            comment.commentId === activeCommentId
              ? { ...comment, replies: [...comment.replies, newReply] }
              : comment
          )
        );
        setNewComment("");
        setReplyToUsername(null);
        setReplyingTo(null);
        setShowForm(true);
        window.notificationManager?.show("Ответ успешно отправлен!");
      } catch (err) {
        console.error("Ошибка при отправке ответа:", err);
      }
    } else {
      await handleSendComment();
    }
  };

  const startEditComment = (commentId: number, text: string) => {
    setEditingCommentId(commentId);
    setEditText(text);
    setEditingReplyId(null);
  };
  const startEditReply = (replyId: number, text: string) => {
    setEditingReplyId(replyId);
    setEditText(text);
    setEditingCommentId(null);
  };
  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingReplyId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    if (!usernameFromToken) return;
    try {
      if (editingCommentId !== null) {
        const response = await fetch(
          `${API_SERVER}/api/comments/edit?commentId=${editingCommentId}&username=${usernameFromToken}&text=${encodeURIComponent(
            editText
          )}`,
          { method: "PUT" }
        );
        if (!response.ok) return console.error("Ошибка при обновлении комментария");
        const updatedComment: ApiCommentResponse = await response.json();
        setComments((prev) =>
          prev.map((comment) =>
            comment.commentId === editingCommentId ? { ...comment, text: updatedComment.text } : comment
          )
        );
      } else if (editingReplyId !== null) {
        const response = await fetch(
          `${API_SERVER}/api/comments/edit?commentId=${editingReplyId}&username=${usernameFromToken}&text=${encodeURIComponent(
            editText
          )}`,
          { method: "PUT" }
        );
        if (!response.ok) return console.error("Ошибка при обновлении ответа");
        const updatedReply: ApiReplyResponse = await response.json();
        setComments((prev) =>
          prev.map((comment) => ({
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.replyId === editingReplyId ? { ...reply, text: updatedReply.text } : reply
            ),
          }))
        );
      }
      cancelEdit();
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
    }
  };

  const reloadComments = async (showSpinner: boolean = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await fetch(`${API_SERVER}/api/comments/all/${animeId}`);
      const rawData: ApiComment[] = await res.json();

      const data: Comment[] = rawData.map((c: ApiComment) => {
        const mappedReplies: Reply[] = Array.isArray(c.replies)
          ? c.replies.map((r: ApiReply) => ({
              replyId: r.replyId,
              parentCommentId: c.id,
              parentReplyId: r.parentReplyId ?? null,
              username: r.username,
              nickname: r.nickname ?? null,
              verified: !!r.verified,
              roles: Array.isArray(r.roles) ? r.roles : [],
              text: r.text,
              likes: typeof r.likes === 'number' ? r.likes : 0,
              dislikes: typeof r.dislikes === 'number' ? r.dislikes : 0,
              userReaction: null,
            }))
          : [];
        return {
          commentId: c.id,
          animeId: c.animeId,
          verified: c.verified,
          nickname: c.nickname,
          roles: c.roles ? c.roles.split(',').map((r: string) => r.trim()) : [],
          username: c.userUsername,
          text: c.text,
          likes: c.likes ?? 0,
          dislikes: c.dislikes ?? 0,
          userReaction: null,
          replies: mappedReplies,
        } as Comment;
      });

      setComments(data);

      const newCommentReactions: Record<number, "like" | "dislike" | null> = {};
      const newReplyReactions: Record<number, "like" | "dislike" | null> = {};

      rawData.forEach((c: ApiComment) => {
        const storedReaction = localStorage.getItem(`comment-reaction-${c.id}`);
        if (storedReaction) newCommentReactions[c.id] = storedReaction as 'like' | 'dislike';
        if (Array.isArray(c.replies)) {
          c.replies.forEach((r: ApiReply) => {
            const storedReplyReaction = localStorage.getItem(`reply-reaction-${r.replyId}`);
            if (storedReplyReaction) newReplyReactions[r.replyId] = storedReplyReaction as 'like' | 'dislike';
          });
        }
      });

      setCommentReactions(newCommentReactions);
      setReplyReactions(newReplyReactions);
    } catch (error) {
      console.error("Ошибка при обновлении комментариев:", error);
      setComments([]);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const username = myUsername || usernameFromToken;
      if (!username) {
        console.error("Не удалось определить username для удаления");
        return;
      }
      const response = await fetch(`${API_SERVER}/api/comments/${commentId}?username=${username}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Ошибка при удалении комментария");
      await reloadComments();
    } catch (err) {
      console.error("Ошибка при удалении:", err);
    }
  };

  const handleDeleteReply = async (replyId: number, commentId: number) => {
    try {
      const username = myUsername || usernameFromToken;
      if (!username) {
        console.error("Не удалось определить username для удаления");
        return;
      }
      const response = await fetch(`${API_SERVER}/api/replies/${replyId}?username=${username}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Ошибка при удалении ответа");
      setComments((prev) =>
        prev.map((comment) =>
          comment.commentId === commentId
            ? { ...comment, replies: comment.replies.filter((reply) => reply.replyId !== replyId) }
            : comment
        )
      );
    } catch (err) {
      console.error("Ошибка при удалении ответа:", err);
    }
  };

  const renderMultilineText = (text: string) =>
    text.split("\n").map((line, idx) => (
      <span key={`line-${idx}`}>
        {line}
        <br />
      </span>
    ));

  const renderReplyTextWithMention = (text: string) => {
    const match = text.match(/^@(\w+),/);
    if (match) {
      const username = match[1];
      const rest = text.replace(/^@\w+,/, "").trimStart();
      return (
        <>
          <span className="highlighted-mention">@{username},</span> {renderMultilineText(rest)}
        </>
      );
    }
    return renderMultilineText(text);
  };

  const computeRating = (likes?: number, dislikes?: number) => {
    const safeLikes = typeof likes === "number" ? likes : 0;
    const safeDislikes = typeof dislikes === "number" ? dislikes : 0;
    return safeLikes === 0 ? -safeDislikes : safeLikes - safeDislikes;
  };

  const renderRatingBadge = (likes?: number, dislikes?: number, baseClass = "likes-count") => {
    const rating = computeRating(likes, dislikes);
    const className = rating >= 0 ? `${baseClass} positive` : `${baseClass} negative`;
    return <span className={className}>{rating}</span>;
  };

  const getRoleColorStyle = (roles: string[]) => ({
    textDecoration: "none" as const,
    color: roles.includes("ADMIN")
      ? "#ff0000"
      : roles.includes("MODERATOR")
      ? "#00ff00"
      : roles.includes("PREMIUM")
      ? "#0000ff"
      : "#000000",
  });

  return {
    comments,
    avatars,
    newComment,
    replyInputs,
    replyingTo,
    showReplies,
    editingCommentId,
    editingReplyId,
    editText,
    usernameFromToken,
    activeCommentId,
    focusedCommentId,
    showForm,
    replyToUsername,
    commentReactions,
    replyReactions,
    loading,
    isMobile,
    setNewComment,
    setReplyingTo,
    setShowReplies,
    setEditingCommentId,
    setEditingReplyId,
    setEditText,
    setFocusedCommentId,
    setActiveCommentId,
    setReplyToUsername,
    setShowForm,
    getRoleClass,
    getRoleClassMobile,
    getRoleClassReplies,
    getRoleColorStyle,
    handleBackToAll,
    fetchAvatar,
    handleCommentReaction,
    handleReplyReaction,
    handleReplyChange,
    handleSendReply,
    handleSendComment,
    handleSend,
    startEditComment,
    startEditReply,
    cancelEdit,
    saveEdit,
    reloadComments,
    handleDeleteComment,
    handleDeleteReply,
    renderMultilineText,
    renderReplyTextWithMention,
    renderRatingBadge,
  } as const;
};

export default useCommentsModal;



