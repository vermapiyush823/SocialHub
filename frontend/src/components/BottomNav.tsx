"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    label: 'Feed', href: '/feed',
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? '#F46B5C' : 'none'} stroke={a ? '#F46B5C' : '#8F8B8A'} strokeWidth={a ? "1" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    label: 'Chat', href: '/chat',
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? '#F46B5C' : 'none'} stroke={a ? '#F46B5C' : '#8F8B8A'} strokeWidth={a ? "1" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    label: 'Matrimony', href: '/matrimony',
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? '#F46B5C' : 'none'} stroke={a ? '#F46B5C' : '#8F8B8A'} strokeWidth={a ? "1" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    label: 'Profile', href: '/profile',
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? '#F46B5C' : 'none'} stroke={a ? '#F46B5C' : '#8F8B8A'} strokeWidth={a ? "1" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 pb-safe bg-white/90 backdrop-blur-xl border-t border-stone-50/50 flex items-center justify-around z-[1000] shadow-[0_-8px_30px_rgba(0,0,0,0.02)] h-[80px] px-2">
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl relative no-underline transition-all duration-300 ${active ? '-translate-y-1' : ''}`}
          >
            <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
              {item.icon(active)}
            </div>
            {active && (
              <span className="w-1 h-1 rounded-full bg-coral-primary absolute bottom-1" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
