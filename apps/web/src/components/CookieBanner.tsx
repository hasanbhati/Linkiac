'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'linkiac_cookie_consent';

export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        setIsVisible(true);
      }
    } catch {
      // Ignore local storage error in private browsing
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'all');
    } catch {}
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'essential');
    } catch {}
    setIsVisible(false);
  };

  if (!mounted || !isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200/90 dark:border-zinc-800 shadow-xl shadow-black/10 dark:shadow-black/40 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#093329]/10 dark:bg-[#BCD94E]/15 border border-[#093329]/20 dark:border-[#BCD94E]/30 flex items-center justify-center flex-shrink-0 text-[#093329] dark:text-[#BCD94E]">
              <Cookie size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>Cookie & Privacy Preferences</span>
                <ShieldCheck size={13} className="text-emerald-500" />
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                EU ePrivacy Directive & GDPR Compliance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEssentialOnly}
            aria-label="Dismiss cookie banner"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
          Linkiac uses essential cookies to keep you safely signed in and remember your preferences. We also use minimal analytics to improve link curation. Read our{' '}
          <Link
            href="/cookies"
            className="font-semibold underline decoration-gray-400 dark:decoration-zinc-600 hover:text-[#093329] dark:hover:text-[#BCD94E] transition-colors"
          >
            Cookie Policy
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="font-semibold underline decoration-gray-400 dark:decoration-zinc-600 hover:text-[#093329] dark:hover:text-[#BCD94E] transition-colors"
          >
            Privacy Policy
          </Link>.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="flex-1 py-2 px-3 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors text-center"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 py-2 px-3 rounded-xl bg-[#093329] hover:bg-[#0d4739] dark:bg-[#BCD94E] dark:hover:bg-[#a8c43f] text-white dark:text-[#093329] text-xs font-semibold dark:font-bold shadow-md shadow-[#093329]/15 dark:shadow-[#BCD94E]/15 active:scale-95 transition-all text-center"
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
