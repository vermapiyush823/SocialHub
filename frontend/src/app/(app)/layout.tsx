"use client";

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isChatRoom = /^\/chat\/[a-zA-Z0-9]+$/.test(pathname);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-3 border-stone-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className={isChatRoom ? '' : 'pb-20'}>{children}</div>
      {!isChatRoom && <BottomNav />}
    </>
  );
}
