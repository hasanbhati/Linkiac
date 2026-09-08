'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Inbox, Users, BarChart3, Settings } from 'lucide-react';
import { useApp } from '@/lib/app-context';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { currentUser, suggestions } = useApp();

  const pendingCount = suggestions.filter(
    s => s.status === 'pending' && s.recipient_id === currentUser.id
  ).length;

  const tabs = [
    { name: 'Library', href: '/library', icon: <Bookmark size={18} />, active: pathname.startsWith('/library') },
    { name: 'Inbox', href: '/inbox', icon: <Inbox size={18} />, badge: pendingCount, active: pathname === '/inbox' },
    { name: 'Friends', href: '/friends', icon: <Users size={18} />, active: pathname === '/friends' },
    { name: 'Stats', href: '/dashboard', icon: <BarChart3 size={18} />, active: pathname === '/dashboard' },
    { name: 'Settings', href: '/settings', icon: <Settings size={18} />, active: pathname.startsWith('/settings') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-zinc-800/80 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 flex items-center justify-around">
      {tabs.map(tab => (
        <Link
          key={tab.name}
          href={tab.href}
          className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[56px] py-1 px-2 rounded-xl transition-all ${
            tab.active ? 'text-indigo-400 font-semibold' : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          <div className="relative">
            {tab.icon}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">{tab.name}</span>
        </Link>
      ))}
    </nav>
  );
}
