"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

export default function RegisterPage() {
  const { register: registerUser, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setIsSubmitting(true);
    try { await registerUser(name, email, password); router.push('/feed'); }
    catch (err: any) { setError(err.response?.data?.error || 'Registration failed.'); }
    finally { setIsSubmitting(false); }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      setError('');
      setIsSubmitting(true);
      try {
        await loginWithGoogle(credentialResponse.credential);
        router.push('/feed');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Google login failed. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication failed. Please try again.');
  };

  const inputCls = "w-full px-4 py-3.5 border-[1.5px] border-stone-100 rounded-2xl text-[15px] text-stone-900 bg-bg/50 outline-none transition-all focus:border-coral-primary focus:bg-white focus:ring-4 focus:ring-coral-light placeholder:text-stone-400";

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 bg-bg">
      <div className="animate-fade-in w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight text-coral-primary mb-2" style={{ fontFamily: 'Georgia, serif' }}>SocialHub</h1>
          <p className="text-stone-500 text-[15px] font-medium">Create your account and start connecting.</p>
        </div>

        <div className="bg-white rounded-[32px] border-none shadow-[0_8px_40px_rgba(244,107,92,0.08)] p-8">
          <form onSubmit={handleSubmit}>
            {error && <div className="px-4 py-3 rounded-lg bg-red-50 text-red-600 text-sm mb-5 border border-red-200">{error}</div>}

            <div className="mb-5">
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Full Name</label>
              <input type="text" className={inputCls} placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required minLength={2} />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Email</label>
              <input type="email" className={inputCls} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Password</label>
              <input type="password" className={inputCls} placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
            <div className="mb-7">
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Confirm Password</label>
              <input type="password" className={inputCls} placeholder="Repeat your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full py-4 rounded-full font-bold text-[16px] text-white bg-coral-primary shadow-[0_8px_20px_rgba(244,107,92,0.25)] hover:bg-coral-hover hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >{isSubmitting ? 'Creating account...' : 'Create Account'}</button>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-stone-200"></div>
              <span className="px-3 text-xs text-stone-400 font-medium">OR</span>
              <div className="flex-1 border-t border-stone-200"></div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                shape="pill"
                size="large"
                theme="outline"
                text="signup_with"
              />
            </div>
          </form>
        </div>

        <p className="text-center mt-8 text-[15px] text-stone-500 font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-coral-primary font-bold hover:text-coral-hover underline decoration-coral-light underline-offset-4 decoration-2">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
