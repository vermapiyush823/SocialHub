"use client";

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  getFeedImageUrl,
  getVideoUrl,
  resolveAvatarUrl,
} from '@/lib/cloudinary';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostUser {
  _id: string;
  name: string;
  profilePicPublicId?: string;
  profilePicUrl?: string;
}

interface MediaItem {
  publicId: string;
  type: 'image' | 'video';
}

interface Comment {
  _id: string;
  userId: PostUser;
  content: string;
  createdAt: string;
}

interface Post {
  _id: string;
  userId: PostUser;
  caption: string;
  media: MediaItem[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface Props {
  post: Post;
  currentUserId: string;
  onDelete?: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PostCard({ post, currentUserId, onDelete }: Props) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  const isOwner = post.userId._id === currentUserId;

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleLike = async () => {
    const prev = { liked: isLiked, count: likesCount };
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    if (!isLiked) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 600); }
    try {
      const res = await api.post(`/posts/${post._id}/like`);
      setIsLiked(res.data.isLiked);
      setLikesCount(res.data.likesCount);
    } catch { setIsLiked(prev.liked); setLikesCount(prev.count); }
  };

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setIsLoadingComments(true);
      try { const r = await api.get(`/comments/${post._id}`); setComments(r.data.comments); }
      catch (e) { console.error(e); }
      finally { setIsLoadingComments(false); }
    }
    setShowComments(!showComments);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    try {
      const r = await api.post(`/comments/${post._id}`, { content: commentInput.trim() });
      setComments(p => [...p, r.data.comment]);
      setCommentsCount(r.data.commentsCount);
      setCommentInput('');
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try { await api.delete(`/posts/${post._id}`); onDelete?.(post._id); }
    catch (e) { console.error(e); }
  };

  // Resolve the primary media item (first element)
  const primaryMedia = post.media?.[0] ?? null;
  const avatarUrl = resolveAvatarUrl(post.userId);

  return (
    <div className="bg-white rounded-[24px] border-none shadow-[0_8px_30px_rgb(244,107,92,0.06)] overflow-hidden transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 pb-3">
        <Link href={`/user/${post.userId._id}`} className="w-11 h-11 rounded-full bg-coral-light flex items-center justify-center font-bold text-coral-primary text-base shrink-0 overflow-hidden cursor-pointer">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            post.userId.name?.charAt(0)?.toUpperCase()
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/user/${post.userId._id}`} className="font-semibold text-[16px] text-text-main hover:underline cursor-pointer block truncate">
            {post.userId.name}
          </Link>
          <div className="text-[13px] text-text-muted">{timeAgo(post.createdAt)}</div>
        </div>
        {isOwner && (
          <button onClick={handleDelete} className="p-2 rounded-xl text-stone-300 hover:text-stone-600 hover:bg-bg transition-colors cursor-pointer group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Caption */}
      {post.caption && <p className="px-5 pb-4 text-[15px] leading-relaxed text-text-main">{post.caption}</p>}

      {/* Media — Cloudinary-optimised */}
      {primaryMedia && (
        <div className="px-4 pb-4">
          {primaryMedia.type === 'video' ? (
            <video
              src={getVideoUrl(primaryMedia.publicId)}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[500px] rounded-[16px] bg-black"
              aria-label="Post video"
            />
          ) : (
            <img
              src={getFeedImageUrl(primaryMedia.publicId)}
              alt="Post"
              className="w-full max-h-[500px] object-cover rounded-[16px]"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Stats */}
      {(likesCount > 0 || commentsCount > 0) && (
        <div className="px-5 pb-3 text-[13px] text-text-muted font-semibold flex items-center gap-4">
          {likesCount > 0 && (
            <span className="flex items-center gap-1.5 text-coral-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likesCount}
            </span>
          )}
          {commentsCount > 0 && (
            <span className="cursor-pointer hover:text-text-main transition-colors flex items-center gap-1.5" onClick={toggleComments}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {commentsCount}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 px-5 py-3 border-t border-stone-50/50">
        <button onClick={handleLike}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-semibold transition-all cursor-pointer ${isLiked
            ? 'bg-gradient-to-r from-coral-gradient-start to-coral-primary text-white shadow-md shadow-coral-primary/20'
            : 'bg-coral-light text-coral-primary hover:bg-[#FFEAE5]'
            }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"
            fill={isLiked ? '#fff' : 'none'} stroke={isLiked ? '#fff' : 'currentColor'}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={likeAnim ? 'animate-heart' : ''}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likesCount > 0 ? (likesCount >= 1000 ? (likesCount / 1000).toFixed(1) + 'K' : likesCount) : 'Like'}
        </button>

        <button onClick={toggleComments}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-semibold bg-white border border-stone-100 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {commentsCount > 0 ? commentsCount : 'Comment'}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-stone-50/50">
          {isLoadingComments ? (
            <p className="p-4 text-center text-stone-400 text-sm">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="p-4 text-center text-stone-400 text-sm">No comments yet. Be the first!</p>
          ) : (
            comments.map(c => (
              <div key={c._id} className="flex gap-2.5 px-4 py-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-50 to-rose-100 flex items-center justify-center font-bold text-rose-500 text-[10px] shrink-0 mt-0.5 overflow-hidden">
                  {resolveAvatarUrl(c.userId) ? (
                    <img src={resolveAvatarUrl(c.userId)} alt={c.userId.name} className="w-full h-full object-cover" />
                  ) : (
                    c.userId.name?.charAt(0)?.toUpperCase()
                  )}
                </div>
                <div>
                  <span className="font-semibold text-[13px] text-stone-900">{c.userId.name} </span>
                  <span className="text-sm text-stone-600">{c.content}</span>
                  <div className="text-[11px] text-stone-400 mt-0.5">{timeAgo(c.createdAt)}</div>
                </div>
              </div>
            ))
          )}
          <form onSubmit={submitComment} className="flex gap-2 px-5 py-4 border-t border-stone-50/50">
            <input
              value={commentInput} onChange={e => setCommentInput(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2.5 rounded-full border border-stone-200 text-sm outline-none bg-stone-50 text-text-main focus:border-coral-primary focus:bg-white transition-colors placeholder:text-stone-400"
            />
            <button type="submit" disabled={!commentInput.trim()}
              className="px-5 py-2.5 rounded-full bg-coral-primary text-white text-[13px] font-semibold disabled:bg-stone-300 disabled:cursor-not-allowed cursor-pointer hover:bg-coral-hover transition-colors shadow-sm"
            >Post</button>
          </form>
        </div>
      )}
    </div>
  );
}
