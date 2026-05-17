"use client";

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Password change state
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [delLoading, setDelLoading] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (passwordForm.newPass.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPwLoading(true);
    try {
      await api.patch('/users/password', {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.newPass,
      });
      setPwMsg({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' });
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDelLoading(true);
    try {
      await api.delete('/users/account');
      logout();
      router.push('/login');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete account.');
    } finally {
      setDelLoading(false);
    }
  };

  if (!user) return null;

  const isGoogleUser = (user as any).authProvider === 'google';

  // Reusable section component
  const SettingSection = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-dm-surface rounded-2xl border border-stone-100 dark:border-dm-border shadow-sm overflow-hidden animate-fade-in">
      <div className="px-6 py-5 border-b border-stone-50 dark:border-dm-border">
        <h3 className="text-[16px] font-bold text-stone-900 dark:text-dm-text">{title}</h3>
        {subtitle && <p className="text-[13px] text-stone-400 dark:text-dm-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );

  const InfoRow = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
    <div className="flex items-center justify-between py-3 border-b border-stone-50 dark:border-dm-border last:border-b-0">
      <span className="text-[13px] font-medium text-stone-500 dark:text-dm-muted">{label}</span>
      <span className="text-[14px] font-semibold text-stone-800 dark:text-dm-text flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg dark:bg-dm-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-dm-surface/90 backdrop-blur-xl border-b border-stone-50/50 dark:border-dm-border px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-dm-surface2 text-stone-600 dark:text-dm-muted transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 className="text-[20px] font-bold text-stone-900 dark:text-dm-text">Settings</h1>
      </header>

      <div className="p-5 max-w-2xl mx-auto flex flex-col gap-5">

        {/* Appearance */}
        <SettingSection title="Appearance" subtitle="Customize how the app looks">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral-primary"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral-primary"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
              <div>
                <p className="text-[14px] font-semibold text-stone-800 dark:text-dm-text">Theme</p>
                <p className="text-[12px] text-stone-400 dark:text-dm-muted">Switch between light and dark mode</p>
              </div>
            </div>
            <div className="flex items-center bg-stone-100 dark:bg-dm-surface2 rounded-xl p-0.5">
              <button
                onClick={() => setTheme('light')}
                className={`px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${theme === 'light' ? 'bg-white dark:bg-dm-border shadow-sm text-coral-primary' : 'text-stone-500 dark:text-dm-muted hover:text-stone-700'}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 -mt-0.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${theme === 'dark' ? 'bg-white dark:bg-dm-border shadow-sm text-coral-primary' : 'text-stone-500 dark:text-dm-muted hover:text-stone-700'}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1 -mt-0.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                Dark
              </button>
            </div>
          </div>
        </SettingSection>

        {/* Account Information */}
        <SettingSection title="Account Information" subtitle="Your basic account details">
          <InfoRow label="Name" value={user.name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow
            label="Auth Provider"
            value={isGoogleUser ? 'Google' : 'Email & Password'}
            icon={isGoogleUser ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral-primary"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral-primary"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            )}
          />
          <InfoRow label="Member Since" value={new Date((user as any).createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} />
        </SettingSection>

        {/* Change Password */}
        {!isGoogleUser && (
          <SettingSection title="Change Password" subtitle="Update your account password">
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 dark:text-dm-muted mb-1.5 uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-dm-border text-[14px] outline-none focus:border-coral-primary focus:ring-2 focus:ring-coral-primary/10 transition-all bg-stone-50 dark:bg-dm-surface2 focus:bg-white dark:focus:bg-dm-bg text-text-main dark:text-dm-text placeholder:text-stone-400 dark:placeholder:text-dm-muted"
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 dark:text-dm-muted mb-1.5 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPass}
                  onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-dm-border text-[14px] outline-none focus:border-coral-primary focus:ring-2 focus:ring-coral-primary/10 transition-all bg-stone-50 dark:bg-dm-surface2 focus:bg-white dark:focus:bg-dm-bg text-text-main dark:text-dm-text placeholder:text-stone-400 dark:placeholder:text-dm-muted"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 dark:text-dm-muted mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-dm-border text-[14px] outline-none focus:border-coral-primary focus:ring-2 focus:ring-coral-primary/10 transition-all bg-stone-50 dark:bg-dm-surface2 focus:bg-white dark:focus:bg-dm-bg text-text-main dark:text-dm-text placeholder:text-stone-400 dark:placeholder:text-dm-muted"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              {pwMsg && (
                <div className={`px-4 py-2.5 rounded-xl text-[13px] font-medium ${pwMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900' : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900'}`}>
                  {pwMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={pwLoading}
                className="mt-1 px-6 py-2.5 rounded-xl bg-coral-primary text-white font-bold text-[14px] hover:bg-coral-hover transition-colors cursor-pointer shadow-sm shadow-coral-primary/20 disabled:opacity-60 disabled:cursor-not-allowed self-start"
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </SettingSection>
        )}

        {/* Danger Zone */}
        <div className="bg-white dark:bg-dm-surface rounded-2xl border border-red-100 dark:border-red-900/50 shadow-sm overflow-hidden animate-fade-in">
          <div className="px-6 py-5 border-b border-red-50 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/20">
            <h3 className="text-[16px] font-bold text-red-700 dark:text-red-400">Danger Zone</h3>
            <p className="text-[13px] text-red-400 dark:text-red-500/70 mt-0.5">Irreversible actions</p>
          </div>
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Logout */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-stone-800 dark:text-dm-text">Log Out</p>
                <p className="text-[12px] text-stone-400 dark:text-dm-muted">Sign out of your account on this device.</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-2 rounded-xl bg-stone-100 dark:bg-dm-surface2 text-stone-700 dark:text-dm-text font-semibold text-[13px] hover:bg-stone-200 dark:hover:bg-dm-border transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>

            <div className="border-t border-stone-100 dark:border-dm-border" />

            {/* Delete Account */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-red-700 dark:text-red-400">Delete Account</p>
                  <p className="text-[12px] text-stone-400 dark:text-dm-muted">Permanently delete your account and all data.</p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                  className="px-5 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold text-[13px] hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors cursor-pointer border border-red-100 dark:border-red-900/50"
                >
                  {showDeleteConfirm ? 'Cancel' : 'Delete'}
                </button>
              </div>

              {showDeleteConfirm && (
                <div className="mt-4 p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 animate-fade-in">
                  <p className="text-[13px] text-red-600 dark:text-red-400 mb-3 font-medium">
                    Type <span className="font-bold bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">DELETE</span> to confirm account deletion.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={deleteInput}
                      onChange={e => setDeleteInput(e.target.value)}
                      placeholder="Type DELETE"
                      className="flex-1 px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-[14px] outline-none focus:border-red-400 bg-white dark:bg-dm-surface2 text-red-800 dark:text-red-300 placeholder:text-red-300 dark:placeholder:text-red-800"
                    />
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteInput !== 'DELETE' || delLoading}
                      className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold text-[13px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-red-700 transition-colors"
                    >
                      {delLoading ? 'Deleting...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
