"use client";

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-dvh bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-50/50 px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-[26px] font-black tracking-tight text-coral-primary" style={{ fontFamily: 'Georgia, serif' }}>Profile</h1>
        <button className="p-2 rounded-full hover:bg-bg text-stone-400 transition-colors cursor-pointer">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      {/* Profile content */}
      <div className="p-5 max-w-2xl mx-auto flex flex-col gap-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center font-bold text-rose-500 text-3xl shrink-0 border-4 border-white shadow-sm">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <h2 className="text-[22px] font-bold text-stone-900 mb-1">{user?.name}</h2>
          <p className="text-sm text-stone-500 mb-4">{user?.email}</p>
          <p className="text-sm text-stone-400 mb-5">{user?.bio || 'No bio yet. Tell others about yourself!'}</p>
          <button className="px-6 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold text-[13px] hover:bg-stone-200 transition-colors cursor-pointer">
            Edit Profile
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Posts', value: '0' },
            { label: 'Followers', value: user?.followers?.length || '0' },
            { label: 'Following', value: user?.following?.length || '0' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-center">
              <div className="text-[22px] font-extrabold text-stone-900 leading-tight">{stat.value}</div>
              <div className="text-[12px] font-medium text-stone-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Menu items */}
        <div className="bg-white rounded-[24px] border-none shadow-[0_8px_30px_rgb(244,107,92,0.06)] overflow-hidden">
          {[
            { 
              label: 'Saved Posts', 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            },
            { 
              label: 'Privacy Settings', 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            },
            { 
              label: 'Notifications', 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            },
            { 
              label: 'Help & Support', 
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            },
          ].map((item, idx) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-bg transition-colors cursor-pointer text-[15px] text-text-main font-medium ${idx < 3 ? 'border-b border-stone-50/50' : ''}`}
            >
              <span className="text-coral-primary shrink-0 flex items-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl bg-red-50 text-red-600 font-bold text-[15px] hover:bg-red-100 transition-colors cursor-pointer"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
