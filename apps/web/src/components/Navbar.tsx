'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, RefreshCw, User, LogOut, Search, Sun, Moon } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { useTheme } from '@/lib/theme-context';
import { LinkiacLogo } from '@/components/LinkiacLogo';

interface NavbarProps {
  onSearchChange?: (q: string) => void;
  searchQuery?: string;
}

export function Navbar({ onSearchChange, searchQuery = '' }: NavbarProps) {
  const { currentUser, syncAllFromSupabase, signOut } = useApp();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 w-full glass border-b border-gray-200/80 dark:border-zinc-800/80 px-4 sm:px-8 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/library" className="flex items-center group py-0.5">
            <LinkiacLogo height={38} className="group-hover:scale-105 transition-transform" />
          </Link>

          {/* Quick Search */}
          {onSearchChange && (
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Search links"
                  placeholder="Search by title, raw text, domain, notes, or folder..."
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#093329]/20 dark:focus:ring-[#BCD94E]/30 dark:focus:border-[#BCD94E] shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl text-gray-600 hover:text-[#093329] hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/80 transition-all active:scale-95 flex items-center justify-center border border-gray-200/60 dark:border-transparent"
              aria-label="Toggle light and dark theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun size={17} className="text-[#BCD94E] transition-transform hover:rotate-45" />
              ) : (
                <Moon size={17} className="text-[#093329] transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-label="User account menu"
                aria-expanded={showUserMenu}
                aria-haspopup="true"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300 dark:border-zinc-700 bg-emerald-100 dark:bg-[#093329] flex items-center justify-center">
                  {currentUser.avatar_url ? (
                    <img src={currentUser.avatar_url} alt={currentUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-[#093329] dark:text-[#BCD94E]" />
                  )}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-2xl py-2 z-50 animate-fade-in text-xs">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-zinc-800">
                    <p className="font-semibold text-gray-900 dark:text-zinc-100 truncate">{currentUser.display_name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono truncate">@{currentUser.username}</p>
                    {currentUser.is_admin && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-[#093329]/10 dark:bg-[#BCD94E]/15 text-[#093329] dark:text-[#BCD94E] border border-[#093329]/20 dark:border-[#BCD94E]/30 px-2 py-0.5 rounded-md">
                        <Shield size={10} /> Admin
                      </span>
                    )}
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Account & Data Settings
                  </Link>

                  {currentUser.is_admin && (
                    <Link
                      href="/admin"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2 text-[#093329] dark:text-[#BCD94E] hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Admin Panel
                    </Link>
                  )}

                  <div className="my-1 border-t border-gray-100 dark:border-zinc-800" />

                  <button
                    type="button"
                    onClick={async () => {
                      setShowUserMenu(false);
                      await syncAllFromSupabase();
                    }}
                    className="w-full text-left px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200 flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw size={13} className="text-[#093329] dark:text-[#BCD94E]" />
                    <span>Sync Library</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setShowUserMenu(false);
                      await signOut();
                    }}
                    className="w-full text-left px-4 py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-zinc-800 hover:text-red-600 dark:hover:text-red-300 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
