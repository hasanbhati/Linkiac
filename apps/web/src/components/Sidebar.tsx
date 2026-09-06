'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Inbox, Users, BarChart3, Settings, Shield } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { FolderTree } from './FolderTree';

interface SidebarProps {
  selectedCategoryId: string | null;
  selectedFolderId: string | null;
  isUnfiledOnly: boolean;
  onSelectAll: () => void;
  onSelectUnfiled: () => void;
  onSelectCategory: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onDropOnTarget?: (target: { type: 'all' | 'unfiled' | 'category' | 'folder'; id?: string }) => void;
}

export function Sidebar({
  selectedCategoryId,
  selectedFolderId,
  isUnfiledOnly,
  onSelectAll,
  onSelectUnfiled,
  onSelectCategory,
  onSelectFolder,
  onDropOnTarget,
}: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, suggestions } = useApp();

  const pendingSuggestionsCount = suggestions.filter(s => s.status === 'pending').length;

  const navItems = [
    {
      name: 'My Library',
      href: '/library',
      icon: <Bookmark size={16} />,
      isActive: pathname.startsWith('/library'),
    },
    {
      name: 'Suggestions Inbox',
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
    <aside className="w-64 flex-shrink-0 hidden md:flex flex-col h-[calc(100vh-4.5rem)] sticky top-[4.5rem] border-r border-zinc-800/80 p-4 space-y-6 overflow-y-auto">
      {/* Primary Workspaces */}
      <nav className="space-y-1">
        {navItems.map(item => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              item.isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              {item.icon}
              <span>{item.name}</span>
            </span>
            {item.badge !== undefined && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.isActive ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
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
        <div className="pt-2 border-t border-zinc-800/80">
          <FolderTree
            selectedCategoryId={selectedCategoryId}
            selectedFolderId={selectedFolderId}
            isUnfiledOnly={isUnfiledOnly}
            onSelectAll={onSelectAll}
            onSelectUnfiled={onSelectUnfiled}
            onSelectCategory={onSelectCategory}
            onSelectFolder={onSelectFolder}
            onDropOnTarget={onDropOnTarget}
          />
        </div>
      )}
    </aside>
  );
}
