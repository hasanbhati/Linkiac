'use client';

import React from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopButton({ className = '' }: { className?: string }) {
  const handleScrollTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleScrollTop}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:text-[#093329] hover:bg-[#093329]/5 border border-gray-300/80 shadow-xs transition-all active:scale-95 cursor-pointer ${className}`}
      aria-label="Scroll to top of page"
    >
      <ArrowUp size={13} className="text-[#093329]" />
      <span>Scroll to top</span>
    </button>
  );
}
