"use client";

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import { resolveAvatarUrl } from '@/lib/cloudinary';

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

    setUploadingPic(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload image and receive { publicId, type }
      const uploadRes = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { publicId } = uploadRes.data;

      // Store only the publicId — URL built dynamically via cloudinary.ts
      const res = await api.patch('/users/profile', { profilePicPublicId: publicId });
      updateUser(res.data.user);
      setProfileData(res.data.user);
    } catch (e) {
      console.error(e);
      alert('Failed to upload picture');
    } finally {
      setUploadingPic(false);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-50/50 px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[26px] font-black tracking-tight text-coral-primary" style={{ fontFamily: 'Georgia, serif' }}>Profile</h1>
        <button onClick={handleLogout} className="p-2 rounded-full hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors cursor-pointer" title="Log Out">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </header>

      {/* Profile content */}
      <div className="p-5 max-w-2xl mx-auto flex flex-col gap-6">
        
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center animate-fade-in relative">
          {/* Avatar */}
          <div className="relative w-24 h-24 mx-auto mb-4 cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            {resolveAvatarUrl(user) ? (
              <img
                src={resolveAvatarUrl(user)}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-sm"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center font-bold text-rose-500 text-3xl border-4 border-white shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingPic ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePicUpload} disabled={uploadingPic} />
          </div>

          {/* User Info / Edit Form */}
          {isEditing ? (
            <div className="text-left max-w-xs mx-auto animate-fade-in">
              <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Name</label>
              <input 
                value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                className="w-full px-3 py-2 mb-3 rounded-xl border border-stone-200 text-[13px] outline-none focus:border-coral-primary" 
              />
              <label className="block text-[11px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Bio</label>
              <textarea 
                value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})}
                className="w-full px-3 py-2 mb-4 rounded-xl border border-stone-200 text-[13px] outline-none focus:border-coral-primary resize-none h-20" 
              />
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold text-[13px] hover:bg-stone-200 transition-colors">Cancel</button>
                <button onClick={handleSaveProfile} className="flex-1 py-2 rounded-xl bg-coral-primary text-white font-bold text-[13px] hover:bg-coral-hover transition-colors shadow-sm shadow-coral-primary/30">Save</button>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h2 className="text-[22px] font-bold text-stone-900 mb-1">{user?.name}</h2>
              <p className="text-sm text-stone-500 mb-4">{user?.email}</p>
              <p className="text-sm text-stone-400 mb-5">{user?.bio || 'No bio yet. Tell others about yourself!'}</p>
              <button onClick={() => setIsEditing(true)} className="px-6 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold text-[13px] hover:bg-stone-200 transition-colors cursor-pointer">
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Posts', value: loading ? '-' : posts.length },
            { label: 'Followers', value: profileData?.followers?.length || '0' },
            { label: 'Following', value: profileData?.following?.length || '0' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-center">
              <div className="text-[22px] font-extrabold text-stone-900 leading-tight">{stat.value}</div>
              <div className="text-[12px] font-medium text-stone-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* User's Posts Feed */}
        <div className="mt-4">
          <h3 className="text-lg font-bold text-stone-900 mb-4">My Posts</h3>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-stone-200 border-t-coral-primary rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
              <div className="mb-3 flex justify-center text-stone-300">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <h3 className="font-semibold text-stone-500 mb-1">No posts yet</h3>
              <p className="text-[13px] text-stone-400">Share your first moment!</p>
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
