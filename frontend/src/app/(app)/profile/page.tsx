"use client";

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import { resolveAvatarUrl, getLargeProfilePicUrl, getOriginalImageUrl, getThumbnailUrl } from '@/lib/cloudinary';

// Helper to get larger profile pic
const resolveLargeAvatarUrl = (user: any) => {
  if (user?.profilePicPublicId) return getLargeProfilePicUrl(user.profilePicPublicId);
  return user?.profilePicUrl || '';
};

// Helper for full-res preview
const resolveFullAvatarUrl = (user: any) => {
  if (user?.profilePicPublicId) return getOriginalImageUrl(user.profilePicPublicId);
  return user?.profilePicUrl || '';
};

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '' });
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<any>(null);
  const [optimisticAvatar, setOptimisticAvatar] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (user) {
      setEditForm({ name: user.name || '', bio: user.bio || '' });
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?._id) return;
    try {
      const [postsRes, userRes] = await Promise.all([
        api.get(`/posts/user/${user._id}`),
        api.get(`/users/${user._id}`)
      ]);
      setPosts(postsRes.data.posts);
      setProfileData(userRes.data.user);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSaveProfile = async () => {
    try {
      const res = await api.patch('/users/profile', editForm);
      updateUser(res.data.user);
      setProfileData(res.data.user);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('Failed to update profile');
    }
  };

  const handlePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check (images only for avatar)
    const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > IMAGE_MAX_BYTES) {
      alert(`Profile picture must be under 10 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setOptimisticAvatar(previewUrl);
    setUploadingPic(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { publicId } = uploadRes.data;

      const res = await api.patch('/users/profile', { profilePicPublicId: publicId });
      updateUser(res.data.user);
      setProfileData(res.data.user);
      setOptimisticAvatar(null); // Clear once backend confirms
    } catch (e) {
      console.error(e);
      alert('Failed to upload picture');
      setOptimisticAvatar(null);
    } finally {
      setUploadingPic(false);
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  // ─── Long Press / Hold Logic ───────────────────────────────────────────────
  const [isHolding, setIsHolding] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  const startHold = useCallback(() => {
    setIsHolding(true);
    holdTimer.current = setTimeout(() => {
      setShowPreview(true);
      if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
    }, 400); // 400ms to trigger preview
  }, []);

  const endHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setIsHolding(false);
  }, []);

  const closePreview = () => {
    setShowPreview(false);
    endHold();
  };

  if (!user) return null;

  const joinDate = profileData?.createdAt
    ? new Date(profileData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-dvh bg-bg dark:bg-dm-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-dm-surface/90 backdrop-blur-xl border-b border-stone-50/50 dark:border-dm-border px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[26px] font-black tracking-tight text-coral-primary" style={{ fontFamily: 'Georgia, serif' }}>Profile</h1>
        <div className="flex items-center gap-1">
          <Link href="/settings" className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-dm-surface2 text-stone-400 dark:text-dm-muted hover:text-stone-600 dark:hover:text-dm-text transition-colors cursor-pointer" title="Settings">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </Link>
          <button onClick={handleLogout} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 text-stone-400 dark:text-dm-muted hover:text-red-500 transition-colors cursor-pointer" title="Log Out">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      {/* Profile content */}
      <div className="p-5 max-w-2xl mx-auto flex flex-col gap-5">
        
        {/* Hero Profile Card */}
        <div className="bg-white dark:bg-dm-surface rounded-2xl border border-stone-100 dark:border-dm-border shadow-sm overflow-hidden animate-fade-in">
          {/* Banner — clean solid, no gradient */}
          <div className="h-28 bg-stone-100 dark:bg-dm-surface2" />

          {/* Avatar overlapping banner */}
          <div className="px-8 pb-8 -mt-16 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Avatar */}
              <div 
                className={`relative w-32 h-32 cursor-pointer group transition-all duration-300 shrink-0 ${isHolding ? 'scale-95' : 'scale-100'}`}
                onMouseDown={startHold}
                onMouseUp={endHold}
                onMouseLeave={endHold}
                onTouchStart={startHold}
                onTouchEnd={endHold}
                onClick={(e) => {
                  if (!showPreview) fileInputRef.current?.click();
                }}
              >
                {optimisticAvatar || resolveLargeAvatarUrl(user) ? (
                  <img
                    src={optimisticAvatar || resolveLargeAvatarUrl(user)}
                    alt="Profile"
                    className={`w-full h-full rounded-full object-cover border-4 border-white dark:border-dm-surface shadow-lg group-hover:brightness-90 transition-all ring-2 ring-stone-100 dark:ring-dm-border ${uploadingPic ? 'animate-pulse opacity-70' : ''}`}
                  />
                ) : (
                  <div className={`w-full h-full rounded-full bg-gradient-to-br from-orange-50 to-pink-50 dark:from-dm-surface2 dark:to-dm-border flex items-center justify-center font-bold text-rose-500 text-4xl border-4 border-white dark:border-dm-surface shadow-lg ring-2 ring-stone-100 dark:ring-dm-border ${uploadingPic ? 'animate-pulse' : ''}`}>
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                
                <div className={`absolute inset-0 bg-black/20 rounded-full flex items-center justify-center transition-opacity ${uploadingPic ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {uploadingPic ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Uploading</span>
                    </div>
                  ) : (
                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                  )}
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePicUpload} disabled={uploadingPic} />

              {/* Info next to avatar */}
              <div className="flex-1 min-w-0 pb-1">
                {isEditing ? (
                  <div className="animate-fade-in">
                    <label className="block text-[11px] font-semibold text-text-muted dark:text-dm-muted mb-1 uppercase tracking-wider">Name</label>
                    <input 
                      value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 mb-3 rounded-xl border border-stone-200 dark:border-dm-border text-[14px] text-stone-900 dark:text-dm-text outline-none focus:border-coral-primary focus:ring-2 focus:ring-coral-primary/10 transition-all bg-stone-50 dark:bg-dm-surface2 focus:bg-white dark:focus:bg-dm-bg" 
                    />
                    <label className="block text-[11px] font-semibold text-text-muted dark:text-dm-muted mb-1 uppercase tracking-wider">Bio</label>
                    <textarea 
                      value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})}
                      className="w-full px-3 py-2 mb-3 rounded-xl border border-stone-200 dark:border-dm-border text-[14px] text-stone-900 dark:text-dm-text outline-none focus:border-coral-primary focus:ring-2 focus:ring-coral-primary/10 resize-none h-20 transition-all bg-stone-50 dark:bg-dm-surface2 focus:bg-white dark:focus:bg-dm-bg placeholder:text-stone-400 dark:placeholder:text-dm-muted" 
                      maxLength={300}
                      placeholder="Write something about yourself..."
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setIsEditing(false); setEditForm({ name: user.name || '', bio: user.bio || '' }); }} className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-dm-surface2 text-stone-700 dark:text-dm-text font-bold text-[13px] hover:bg-stone-200 dark:hover:bg-dm-border transition-colors cursor-pointer">Cancel</button>
                      <button onClick={handleSaveProfile} className="flex-1 py-2.5 rounded-xl bg-coral-primary text-white font-bold text-[13px] hover:bg-coral-hover transition-colors shadow-sm shadow-coral-primary/30 cursor-pointer">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <h2 className="text-[22px] font-bold text-stone-900 dark:text-dm-text leading-tight truncate">{user?.name}</h2>
                    <p className="text-[13px] text-stone-400 dark:text-dm-muted mb-2">{user?.email}</p>
                    <p className="text-[14px] text-stone-500 dark:text-dm-muted leading-relaxed mb-3 line-clamp-2">{user?.bio || 'No bio yet. Tell others about yourself!'}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsEditing(true)} className="px-5 py-2 rounded-xl bg-stone-100 dark:bg-dm-surface2 text-stone-700 dark:text-dm-text font-semibold text-[13px] hover:bg-stone-200 dark:hover:bg-dm-border transition-colors cursor-pointer">
                        Edit Profile
                      </button>
                      {joinDate && (
                        <span className="text-[12px] text-stone-400 flex items-center gap-1">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          Joined {joinDate}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instagram-style Popup Preview */}
        {showPreview && (
          <div 
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={closePreview}
          >
            <div 
              className="relative max-w-[90vw] max-h-[70vh] aspect-square animate-scale-up"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
                closePreview();
              }}
            >
              <img 
                src={resolveFullAvatarUrl(user)} 
                alt="Full Preview"
                className="w-full h-full object-cover rounded-full shadow-2xl border-4 border-white"
              />
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold py-2 px-4 rounded-full">Tap to change profile picture</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Posts', value: loading ? '-' : posts.length, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral-primary"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
            { label: 'Followers', value: profileData?.followers?.length || '0', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral-primary"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { label: 'Following', value: profileData?.following?.length || '0', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-dm-surface rounded-2xl border border-stone-100 dark:border-dm-border shadow-sm p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex justify-center mb-1">{stat.icon}</div>
              <div className="text-[22px] font-extrabold text-stone-900 dark:text-dm-text leading-tight">{stat.value}</div>
              <div className="text-[12px] font-medium text-stone-400 dark:text-dm-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* User's Posts Feed */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-stone-900 dark:text-dm-text">My Posts</h3>
            {posts.length > 0 && (
              <div className="flex items-center bg-stone-100 dark:bg-dm-surface2 rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-dm-bg shadow-sm text-coral-primary' : 'text-stone-400 dark:text-dm-muted hover:text-stone-600 dark:hover:text-dm-text'}`}
                  title="List view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-dm-bg shadow-sm text-coral-primary' : 'text-stone-400 dark:text-dm-muted hover:text-stone-600 dark:hover:text-dm-text'}`}
                  title="Grid view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-stone-200 border-t-coral-primary rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-dm-surface rounded-2xl border border-stone-100 dark:border-dm-border">
              <div className="mb-4 flex justify-center text-stone-300 dark:text-dm-border">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <h3 className="font-bold text-stone-600 dark:text-dm-muted mb-1 text-[16px]">No posts yet</h3>
              <p className="text-[13px] text-stone-400 dark:text-dm-muted mb-4">Share your first moment with the community!</p>
              <button
                onClick={() => router.push('/feed')}
                className="px-6 py-2.5 rounded-xl bg-coral-primary text-white font-bold text-[13px] hover:bg-coral-hover transition-colors cursor-pointer shadow-sm shadow-coral-primary/20"
              >
                Create a Post
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
              {posts.map(post => {
                const media = post.media?.[0];
                return (
                  <div key={post._id} className="aspect-square bg-stone-100 dark:bg-dm-surface2 relative group cursor-pointer overflow-hidden">
                    {media ? (
                      media.type === 'video' ? (
                        <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                      ) : (
                        <img src={getThumbnailUrl(media.publicId)} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <p className="text-[11px] text-stone-500 dark:text-dm-muted text-center line-clamp-4">{post.caption}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-3 text-white text-[13px] font-bold">
                        <span className="flex items-center gap-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {post.likesCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {post.commentsCount}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map(post => (
                <PostCard 
                  key={post._id} 
                  post={post} 
                  currentUserId={user?._id || ''}
                  onDelete={handlePostDeleted}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
