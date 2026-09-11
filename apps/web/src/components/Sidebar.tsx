'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Inbox, Users, BarChart3, Settings, Shield } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { FolderTree } from './FolderTree';

interface SidebarProps {
  selectedFolderId: string | null;
  isUnfiledOnly: boolean;
  onSelectAll: () => void;
  onSelectUnfiled: () => void;
  onSelectFolder: (id: string) => void;
  onDropOnTarget?: (
    target: { type: 'all' | 'unfiled' | 'folder'; id?: string },
    linkIds?: string[]
  ) => void;
}

export function Sidebar({
  selectedFolderId,
  isUnfiledOnly,
  onSelectAll,
  onSelectUnfiled,
  onSelectFolder,
  onDropOnTarget,
}: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, suggestions } = useApp();

  const pendingSuggestionsCount = suggestions.filter(
    s => s.status === 'pending' && s.recipient_id === currentUser.id
  ).length;

  const navItems = [
    {
      name: 'My Library',
      href: '/library',
      icon: <Bookmark size={16} />,
      isActive: pathname.startsWith('/library'),
    },
    {
      name: 'Inbox',
      href: '/inbox',
      icon: <Inbox size={16} />,
      badge: pendingSuggestionsCount > 0 ? pendingSuggestionsCount : undefined,
      isActive: pathname === '/inbox',
    },
    {
      name: 'Friends',
      href: '/friends',
      icon: <Users size={16} />,
      isActive: pathname === '/friends',
    },
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <BarChart3 size={16} />,
      isActive: pathname === '/dashboard',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: <Settings size={16} />,
      isActive: pathname.startsWith('/settings'),
    },
  ];

  if (currentUser.is_admin) {
    navItems.push({
      name: 'Admin Panel',
      href: '/admin',
      icon: <Shield size={16} />,
      isActive: pathname.startsWith('/admin'),
    });
  }

  const isLibraryPage = pathname.startsWith('/library');

  return (
    <aside className="w-64 flex-shrink-0 hidden md:flex flex-col h-full border-r border-gray-200/80 dark:border-zinc-800/80 p-4 space-y-6 overflow-y-auto bg-white/40 dark:bg-transparent">
      {/* Primary Workspaces */}
      <nav className="space-y-1">
        {navItems.map(item => (
          <Link
            key={item.name}
            href={item.href}
            aria-current={item.isActive ? 'page' : undefined}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              item.isActive
                ? 'bg-[#093329] dark:bg-[#BCD94E]/15 text-white dark:text-[#BCD94E] dark:border dark:border-[#BCD94E]/30 shadow-md shadow-[#093329]/15 dark:shadow-[#BCD94E]/10 font-semibold'
                : 'text-gray-600 hover:bg-gray-100 hover:text-[#093329] dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              {item.icon}
              <span>{item.name}</span>
            </span>
            {item.badge !== undefined && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.isActive
                    ? 'bg-[#BCD94E] text-[#093329] dark:bg-[#BCD94E] dark:text-[#093329]'
                    : 'bg-[#093329] dark:bg-[#BCD94E]/20 text-white dark:text-[#BCD94E]'
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Library Tree Filter Hierarchy */}
      {isLibraryPage && (
        <div className="pt-2 border-t border-gray-200/80 dark:border-zinc-800/80">
          <FolderTree
            selectedFolderId={selectedFolderId}
            isUnfiledOnly={isUnfiledOnly}
            onSelectAll={onSelectAll}
            onSelectUnfiled={onSelectUnfiled}
            onSelectFolder={onSelectFolder}
            onDropOnTarget={onDropOnTarget}
          />
        </div>
      )}
    </aside>
  );
}
