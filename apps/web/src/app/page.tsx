import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  FolderTree,
  Users,
  Globe,
  Share2,
  BookmarkCheck,
  Download,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Layers,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { LinkiacLogo } from '@/components/LinkiacLogo';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col selection:bg-[#BCD94E] selection:text-[#093329]">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#F9FAFB]/85 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center group">
            <LinkiacLogo height={42} className="group-hover:scale-[1.02] transition-transform" />
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
            <a href="#features" className="hover:text-[#093329] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#093329] transition-colors">
              How It Works
            </a>
            <Link href="/privacy" className="hover:text-[#093329] transition-colors">
              Privacy Policy
            </Link>
          </nav>

          {/* Right Action Buttons (Log In & Sign Up) */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-[#111827] hover:text-[#093329] transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#093329] hover:bg-[#0d4739] text-white shadow-md shadow-[#093329]/15 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Sign Up</span>
              <ArrowRight size={14} className="text-[#BCD94E]" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION (Aligned with Image 3 Banner Reference)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-10 pb-8 sm:pt-14 sm:pb-10">
        {/* Soft Organic Background Blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#BCD94E]/15 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#093329]/5 via-[#BCD94E]/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline & Description */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Category Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#BCD94E]/25 border border-[#BCD94E]/40 text-[#093329] text-xs font-bold tracking-wide">
                <Sparkles size={13} className="text-[#093329]" />
                <span>Universal Link Library & Smart Hub</span>
              </div>

              {/* Heading 1: Inter ExtraBold (800) tracking tight */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-[#111827] leading-[1.12]">
                All your links.<br />
                <span className="text-[#093329]">One central hub.</span>
              </h1>

              {/* Body Text: Inter Regular (400) 16px to 18px line-height relaxed */}
              <p className="text-base sm:text-lg text-gray-600 font-normal leading-relaxed max-w-xl">
                Save, organize, and share links from Facebook, Instagram, YouTube, and everywhere else on the web.
              </p>
            </div>

            {/* Right Column: Illustrated Floating Cards Composition (Image 3) */}
            <div className="lg:col-span-6 relative flex items-center justify-center min-h-[380px] sm:min-h-[460px]">
              {/* Organic Soft Green Curved Background */}
              <div className="absolute w-[360px] sm:w-[480px] h-[360px] sm:h-[480px] rounded-full bg-gradient-to-tr from-[#E8F0C9]/70 via-[#BCD94E]/20 to-transparent -z-10" />

              {/* Constellation Dashed Connecting Lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none -z-5"
                viewBox="0 0 500 400"
                fill="none"
              >
                <path
                  d="M 160 170 C 230 190, 310 140, 370 100"
                  stroke="#093329"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  strokeOpacity="0.25"
                />
                <path
                  d="M 370 140 C 350 220, 320 280, 260 300"
                  stroke="#093329"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  strokeOpacity="0.25"
                />
                <path
                  d="M 140 210 C 130 280, 180 320, 220 320"
                  stroke="#093329"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  strokeOpacity="0.25"
                />
              </svg>

              {/* Floating Cards Container */}
              <div className="relative w-full max-w-[480px] h-[380px]">
                {/* 1. Top-Right Card: Video / Web Browser Card */}
                <div className="absolute top-2 right-2 sm:right-6 w-60 sm:w-68 rounded-2xl bg-white p-3.5 shadow-xl shadow-gray-300/40 border border-gray-100 hover:-translate-y-1 transition-transform">
                  <div className="flex items-center gap-1.5 pb-2.5 border-b border-gray-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-auto text-[10px] text-gray-400 font-medium">youtube.com</span>
                  </div>
                  <div className="mt-2.5 rounded-xl bg-gray-100/90 h-24 flex items-center justify-center relative overflow-hidden group">
                    <div className="w-9 h-9 rounded-full bg-[#093329]/80 flex items-center justify-center text-white shadow-sm">
                      <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="h-3 w-4/5 rounded bg-gray-200" />
                    <div className="h-2 w-1/2 rounded bg-gray-100" />
                  </div>
                </div>

                {/* 2. Mid-Left Card: Social Post Card */}
                <div className="absolute top-24 left-0 sm:left-4 w-56 sm:w-64 rounded-2xl bg-white p-3.5 shadow-lg shadow-gray-200/60 border border-gray-100 hover:-translate-y-1 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                      IG
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-3/4 rounded bg-gray-300" />
                      <div className="h-2 w-1/2 rounded bg-gray-200" />
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                    <span>Saved to &quot;Design Inspo&quot;</span>
                    <span className="text-[#093329] font-semibold">Ready</span>
                  </div>
                </div>

                {/* 3. Foreground Center-Bottom Card: Signature Highlight Card */}
                <div className="absolute bottom-4 left-10 sm:left-14 w-68 sm:w-76 rounded-2xl bg-white p-4 shadow-2xl shadow-gray-400/30 border-2 border-[#BCD94E] flex items-center gap-4 hover:-translate-y-1 transition-transform">
                  {/* Vibrant Lime Circle Badge */}
                  <div className="w-10 h-10 rounded-full bg-[#BCD94E] flex items-center justify-center text-[#093329] shrink-0 shadow-md shadow-[#BCD94E]/40">
                    <BookmarkCheck size={20} className="text-[#093329]" />
                  </div>
                  {/* High Contrast Pill Bars */}
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-32 rounded-full bg-[#093329]" />
                    <div className="h-2.5 w-20 rounded-full bg-gray-300" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#BCD94E]/20 text-[#093329]">
                    Inbox
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. CORE FEATURES (Bento Grid)
      ───────────────────────────────────────────────────────────── */}
      <section id="features" className="pt-6 pb-16 sm:pt-8 sm:pb-20 max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#BCD94E]/20 text-[#093329] text-xs font-bold uppercase tracking-wider">
            Built for Mindful Link Management
          </div>
          {/* Heading 2: Inter Bold (700) 30px to 38px */}
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#111827]">
            Never lose a great recommendation again.
          </h2>
          <p className="text-base text-gray-600 leading-relaxed font-normal">
            Designed to replace messy chat bookmarks, forgotten open browser tabs, and disconnected note apps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-[#BCD94E] transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#BCD94E]/20 text-[#093329] flex items-center justify-center font-bold">
              <Globe size={24} />
            </div>
            {/* Heading 3: Inter SemiBold (600) 20px */}
            <h3 className="text-xl font-semibold tracking-normal text-[#111827]">
              Save Anything, Any Format
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed font-normal">
              Regular articles, YouTube videos, Instagram reels, Facebook reels, website pages, partial addresses, or simply a note. Linkiac
              will keep everything for you in one place.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-[#BCD94E] transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#093329]/10 text-[#093329] flex items-center justify-center font-bold">
              <FolderTree size={24} />
            </div>
            <h3 className="text-xl font-semibold tracking-normal text-[#111827]">
              Infinite Organization
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed font-normal">
              Deeply nested folders, reading statuses (To Read, Reading, Done), and instant search
              by title, domain, or private notes.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-[#BCD94E] transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#BCD94E]/20 text-[#093329] flex items-center justify-center font-bold">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-semibold tracking-normal text-[#111827]">
              Private Recommendations
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed font-normal">
              Share links directly with friends. Incoming recommendations land in your dedicated
              Inbox. Save it or Decline it.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-[#BCD94E] transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#093329]/10 text-[#093329] flex items-center justify-center font-bold">
              <Download size={24} />
            </div>
            <h3 className="text-xl font-semibold tracking-normal text-[#111827]">
              Bookmark Import & Export
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed font-normal">
              Bring your existing browser bookmarks from Google Chrome, Apple Safari, Firefox, or Edge in your Linkiac Library with one click.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-[#BCD94E] transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#BCD94E]/20 text-[#093329] flex items-center justify-center font-bold">
              <Smartphone size={24} />
            </div>
            <h3 className="text-xl font-semibold tracking-normal text-[#111827]">
              Real-time Cross-Platform Sync
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed font-normal">
              Access your library seamlessly across Desktop Web and Mobile. All changes sync in real-time.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-3xl p-7 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-[#BCD94E] transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#093329]/10 text-[#093329] flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-semibold tracking-normal text-[#111827]">
              Private & Secure by Default
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed font-normal">
              No data selling, no advertising trackers, and full account deletion controls.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. HOW IT WORKS (3 Simple Steps)
      ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 bg-white border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-[#111827]">
              Simple, intentional link curation
            </h2>
            <p className="text-sm text-gray-600 font-normal">
              Get up and running in three effortless steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-[#093329] text-[#BCD94E] font-bold text-sm flex items-center justify-center mx-auto sm:mx-0">
                1
              </div>
              <h3 className="text-lg font-semibold text-[#111827]">Copy & Paste</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                Copy any link from your browser or favorite app and paste it into Linkiac with one click.
              </p>
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-[#093329] text-[#BCD94E] font-bold text-sm flex items-center justify-center mx-auto sm:mx-0">
                2
              </div>
              <h3 className="text-lg font-semibold text-[#111827]">Organize & Tag</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                File into nested folders, add personal reading notes, or set your reading progress.
              </p>
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-[#093329] text-[#BCD94E] font-bold text-sm flex items-center justify-center mx-auto sm:mx-0">
                3
              </div>
              <h3 className="text-lg font-semibold text-[#111827]">Recommend Privately</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                Pass links to friends directly without noisy broadcast notifications or public feeds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. CALL TO ACTION BANNER (Brand Deep Green & Lime)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-8 w-full">
        <div className="rounded-3xl bg-[#093329] text-white p-8 sm:p-14 relative overflow-hidden shadow-2xl shadow-[#093329]/20">
          {/* Subtle Ambient Lime Accent in Corner */}
          <div className="absolute top-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#BCD94E]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-6 text-left">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Ready to organize your entire digital life?
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/90 font-normal leading-relaxed">
              Create your free Linkiac library today. Save anything, organize with zero clutter, and share with the
              people who matter most.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/signup"
                className="px-8 py-3.5 rounded-full text-base font-bold bg-[#BCD94E] hover:bg-[#b0cc44] text-[#093329] shadow-lg shadow-[#BCD94E]/30 hover:shadow-xl active:scale-95 transition-all text-center"
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className="px-7 py-3.5 rounded-full text-base font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/20 active:scale-95 transition-all text-center"
              >
                Sign In to Existing Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200/80 bg-white py-12 px-4 sm:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LinkiacLogo height={36} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 font-medium">
            <Link href="/login" className="hover:text-[#093329] transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="hover:text-[#093329] transition-colors">
              Sign Up
            </Link>
            <a href="#features" className="hover:text-[#093329] transition-colors">
              Features
            </a>
            <Link href="/privacy" className="hover:text-[#093329] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#093329] transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="hover:text-[#093329] transition-colors">
              Cookies
            </Link>
            <span className="text-gray-300">•</span>
            <span>linkiac.eu</span>
            <span className="text-gray-300">•</span>
            <span>v1.0.0</span>
          </div>

          <p className="text-xs text-gray-400 font-normal">
            &copy; {new Date().getFullYear()} Linkiac. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
