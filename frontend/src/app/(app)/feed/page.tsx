"use client";

import { useAuth } from '@/lib/auth';
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';

interface Post {
  _id: string;
  userId: { _id: string; name: string; profilePicPublicId?: string; profilePicUrl?: string };
  caption: string;
  media: { publicId: string; type: 'image' | 'video' }[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => { loadFeed(); }, []);

  const loadFeed = async (cursor?: string) => {
    try {
      const url = cursor ? `/posts/feed?cursor=${cursor}` : '/posts/feed';
      const r = await api.get(url);
      setPosts(p => cursor ? [...p, ...r.data.posts] : r.data.posts);
      setHasMore(r.data.hasMore);
      setNextCursor(r.data.nextCursor);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); setLoadingMore(false); }
  };

  const lastRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && nextCursor) {
        setLoadingMore(true); loadFeed(nextCursor);
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMore, nextCursor]);

  return (
    <div className="min-h-dvh bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-50/50 px-5 py-4 flex items-center justify-between">
        <span className="text-[26px] font-black tracking-tight text-coral-primary" style={{ fontFamily: 'Georgia, serif' }}>
          Glimpse
        </span>
        <button onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 rounded-full bg-coral-primary text-white text-[13px] font-bold hover:bg-coral-hover hover:-translate-y-0.5 transition-all cursor-pointer shadow-sm shadow-coral-primary/20"
        >+ Post</button>
      </header>

      {/* Feed */}
      <div className="p-4 pb-28 max-w-[580px] mx-auto flex flex-col gap-5">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-3 border-stone-200 border-t-coral-primary rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <h3 className="text-base font-semibold text-stone-500 mb-1">No posts yet</h3>
            <p className="text-sm mb-5">Create your first post and start sharing!</p>
            <button onClick={() => setShowCreate(true)} className="px-6 py-2.5 rounded-full bg-coral-primary text-white font-bold text-sm cursor-pointer shadow-sm">Create Post</button>
          </div>
        ) : (
          <>
            {posts.map((p, i) => (
              <div key={p._id} ref={i === posts.length - 1 ? lastRef : undefined}>
                <PostCard post={p} currentUserId={user?._id || ''} onDelete={id => setPosts(ps => ps.filter(x => x._id !== id))} />
              </div>
            ))}
            {loadingMore && <div className="flex justify-center py-4"><div className="w-6 h-6 border-3 border-stone-200 border-t-coral-primary rounded-full animate-spin" /></div>}
            {!hasMore && posts.length > 0 && (
              <p className="text-center py-5 text-stone-400 text-sm flex items-center justify-center gap-1.5">
                You&apos;re all caught up!
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </p>
            )}
          </>
        )}
      </div>

      {showCreate && <CreatePostModal onPostCreated={p => setPosts(ps => [p, ...ps])} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
