'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bookmark, Plus, Inbox, Shield, Sparkles, User, LogOut, Search } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { SaveLinkModal } from './SaveLinkModal';

interface NavbarProps {
  onSearchChange?: (q: string) => void;
  searchQuery?: string;
}

export function Navbar({ onSearchChange, searchQuery = '' }: NavbarProps) {
  const { currentUser, suggestions, resetToSeed } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const pendingSuggestionsCount = suggestions.filter(s => s.status === 'pending').length;

  return (
    <>
      <header className="sticky top-0 z-30 w-full glass border-b border-zinc-800/80 px-4 sm:px-8 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/library" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Bookmark className="text-white fill-white" size={16} />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Linkiac
            </span>
          </Link>

          {/* Quick Search */}
          {onSearchChange && (
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by title, raw text, domain, or notes..."
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          )}

          {/* Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all min-h-[44px]"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Save Link</span>
            </button>

            {/* Inbox Quick Access */}
            <Link
              href="/inbox"
              className="relative p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Suggestions Inbox"
            >
              <Inbox size={18} />
              {pendingSuggestionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-zinc-950 animate-pulse">
                  {pendingSuggestionsCount}
                </span>
              )}
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-zinc-800/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 bg-indigo-900/50 flex items-center justify-center">
                  {currentUser.avatar_url ? (
                    <img src={currentUser.avatar_url} alt={currentUser.username} className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-indigo-300" />
                  )}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in text-xs">
                  <div className="px-4 py-2 border-b border-zinc-800">
                    <p className="font-semibold text-zinc-100 truncate">{currentUser.display_name}</p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">@{currentUser.username}</p>
                    {currentUser.is_admin && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                        <Shield size={10} /> Admin
                      </span>
                    )}
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    Account & Data Settings
                  </Link>

                  {currentUser.is_admin && (
                    <Link
                      href="/admin"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2 text-indigo-400 hover:bg-zinc-800"
                    >
                      Admin Panel
                    </Link>
                  )}

                  <div className="my-1 border-t border-zinc-800" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      if (confirm('Reset to initial demo seed data?')) {
                        resetToSeed();
                        window.location.reload();
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 flex items-center gap-2"
                  >
                    <Sparkles size={13} className="text-amber-400" />
                    <span>Reset Demo Data</span>
                  </button>

                  <Link
                    href="/login"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-red-400 hover:bg-zinc-800"
                  >
                    Sign Out
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <SaveLinkModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </>
  );
}
