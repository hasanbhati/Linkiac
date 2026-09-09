import React from 'react';
import Link from 'next/link';
import { Bookmark, Sparkles, FolderTree, Users, ArrowRight, ShieldCheck, Globe, Laptop } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      {/* Header */}
      <header className="px-6 py-5 border-b border-zinc-900 glass sticky top-0 z-30 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Bookmark className="text-white fill-white" size={16} />
          </div>
          <span className="font-bold text-lg tracking-tight">Linkiac</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/library"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>Open Library</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Sparkles size={13} />
          <span>Universal Cross-Platform Link Engine & Private Recommendations</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] max-w-3xl mx-auto bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Save anything from anywhere on the internet.
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Websites, Instagram reels, YouTube videos, broken links, or arbitrary notes. Organize with infinite nested
          folders, track your reading progress, and privately share recommendations with friends.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/library"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Launch Web App</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/settings"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 active:scale-95 transition-all"
          >
            Import Browser Bookmarks
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Globe size={20} />
            </div>
            <h3 className="font-semibold text-zinc-100 text-base">Save Anything</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No format constraints. Save broken links, partial addresses, or sentences. Auto-fetches rich Open Graph
              previews whenever reachable.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FolderTree size={20} />
            </div>
            <h3 className="font-semibold text-zinc-100 text-base">Infinite Organization</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deeply nested folders, categories, and reading statuses. Drag-and-drop or use accessible
              move menus on touch screens.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users size={20} />
            </div>
            <h3 className="font-semibold text-zinc-100 text-base">Private Recommendations</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Accepted friends send links to your dedicated Suggestions Inbox. Accept links into your own library
              without modifying your friend&apos;s collection.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 px-6 text-center text-xs text-zinc-600">
        Linkiac v1.0 • Engineered with Next.js, PostgreSQL via Supabase, and Expo React Native.
      </footer>
    </div>
  );
}
