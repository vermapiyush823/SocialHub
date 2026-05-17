"use client";

import { useAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import { resolveAvatarUrl } from '@/lib/cloudinary';

export default function UserProfilePage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [profileUser, setProfileUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (userId) {
      if (currentUser && currentUser._id === userId) {
        router.push('/profile'); // Redirect to own profile if it's the current user
        return;
      }
      loadUserData();
      loadPosts();
    }
  }, [userId, currentUser]);

  const loadUserData = async () => {
    try {
      const res = await api.get(`/users/${userId}`);
      const userData = res.data.user;
      setProfileUser(userData);
      
      // Check if current user is in followers
      if (currentUser && userData.followers) {
        setIsFollowing(userData.followers.some((f: any) => f._id === currentUser._id));
        setFollowersCount(userData.followers.length);
      }
    } catch (e) {
      console.error(e);
      // Maybe user not found, redirect to feed
      router.push('/feed');
    }
  };

  const loadPosts = async () => {
    try {
      const res = await api.get(`/posts/user/${userId}`);
      setPosts(res.data.posts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      const prevIsFollowing = isFollowing;
      setIsFollowing(!isFollowing);
      setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1);

      const res = await api.post(`/users/${userId}/follow`);
      setIsFollowing(res.data.isFollowing);
      
      // Refresh user data to get exact counts
      const userRes = await api.get(`/users/${userId}`);
      setFollowersCount(userRes.data.user.followers?.length || 0);
    } catch (e) {
      console.error(e);
      // Revert on error
      setIsFollowing(isFollowing);
      setFollowersCount(followersCount);
    }
  };

  if (!profileUser) {
    return (
      <div className="min-h-dvh bg-bg dark:bg-dm-bg flex justify-center p-20">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-coral-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg dark:bg-dm-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-dm-surface/90 backdrop-blur-xl border-b border-stone-50/50 dark:border-dm-border px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-dm-surface2 text-stone-600 dark:text-dm-muted transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 className="text-[20px] font-bold text-stone-900 dark:text-dm-text">{profileUser.name}</h1>
      </header>

      {/* Profile content */}
      <div className="p-5 max-w-2xl mx-auto flex flex-col gap-6">
        
        {/* Profile card */}
        <div className="bg-white dark:bg-dm-surface rounded-2xl border border-stone-100 dark:border-dm-border shadow-sm p-8 text-center animate-fade-in relative">
          {/* Avatar */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            {resolveAvatarUrl(profileUser) ? (
              <img
                src={resolveAvatarUrl(profileUser)}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-sm"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center font-bold text-rose-500 text-3xl border-4 border-white shadow-sm">
                {profileUser.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="text-[22px] font-bold text-stone-900 dark:text-dm-text mb-1">{profileUser.name}</h2>
          <p className="text-sm text-stone-400 dark:text-dm-muted mb-5">{profileUser.bio || 'No bio yet.'}</p>
          
          <button 
            onClick={handleFollowToggle} 
            className={`px-8 py-2.5 rounded-full font-bold text-[14px] transition-all cursor-pointer shadow-sm ${
              isFollowing 
                ? 'bg-stone-100 text-stone-700 hover:bg-red-50 hover:text-red-600' 
                : 'bg-coral-primary text-white hover:bg-coral-hover shadow-coral-primary/30'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Posts', value: loading ? '-' : posts.length },
            { label: 'Followers', value: followersCount },
            { label: 'Following', value: profileUser.following?.length || 0 },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-dm-surface rounded-2xl border border-stone-100 dark:border-dm-border shadow-sm p-4 text-center">
              <div className="text-[22px] font-extrabold text-stone-900 dark:text-dm-text leading-tight">{stat.value}</div>
              <div className="text-[12px] font-medium text-stone-400 dark:text-dm-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* User's Posts Feed */}
        <div className="mt-4">
          <h3 className="text-lg font-bold text-stone-900 dark:text-dm-text mb-4">Posts</h3>
          
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
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map(post => (
                <PostCard 
                  key={post._id} 
                  post={post} 
                  currentUserId={currentUser?._id || ''}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
