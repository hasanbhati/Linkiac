'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useApp } from '@/lib/app-context';
import { BarChart3, Globe, Bookmark, BookOpen, CheckCircle2, Clock, Folder, Layers } from 'lucide-react';

export default function DashboardPage() {
  const { links, categories, folders, domainStats } = useApp();

  const toReadCount = links.filter(l => l.reading_status === 'to_read').length;
  const readingCount = links.filter(l => l.reading_status === 'reading').length;
  const doneCount = links.filter(l => l.reading_status === 'done').length;

  const totalValidDomainLinks = links.filter(l => !!l.domain).length;
  const maxCount = domainStats.length > 0 ? domainStats[0].count : 1;

  return (
    <div className="h-screen bg-[#F9FAFB] text-[#111827] dark:bg-zinc-950 dark:text-zinc-100 flex flex-col overflow-hidden transition-colors duration-150">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden">
        <Sidebar
          selectedFolderId={null}
          isUnfiledOnly={false}
          onSelectAll={() => {}}
          onSelectUnfiled={() => {}}
          onSelectFolder={() => {}}
        />

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-8">
          {/* Header */}
          <div className="border-b border-gray-200/80 dark:border-zinc-800/80 pb-5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 flex items-center gap-2.5">
              <BarChart3 size={22} className="text-[#093329] dark:text-[#BCD94E]" />
              <span>Personal Analytics & Domain Habits</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
              Private domain frequency statistics and reading status progression across your saved library.
            </p>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 space-y-1">
              <span className="text-gray-500 dark:text-zinc-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark size={13} className="text-[#093329] dark:text-[#BCD94E]" /> Total Links
              </span>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-zinc-100">{links.length}</p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500">{totalValidDomainLinks} with parsed web domains</p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 space-y-1">
              <span className="text-gray-500 dark:text-zinc-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-amber-500" /> To Read
              </span>
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{toReadCount}</p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                {links.length > 0 ? Math.round((toReadCount / links.length) * 100) : 0}% of library
              </p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 space-y-1">
              <span className="text-gray-500 dark:text-zinc-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={13} className="text-sky-600 dark:text-sky-400" /> Currently Reading
              </span>
              <p className="text-2xl font-extrabold text-sky-700 dark:text-sky-400">{readingCount}</p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500">In-progress content</p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 space-y-1">
              <span className="text-gray-500 dark:text-zinc-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" /> Completed
              </span>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{doneCount}</p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                {links.length > 0 ? Math.round((doneCount / links.length) * 100) : 0}% completion rate
              </p>
            </div>
          </div>

          {/* Reading Status Progress Bar */}
          <div className="glass-card rounded-2xl p-5 border border-gray-200 dark:border-zinc-800 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Reading Progress Distribution</h2>
            <div className="w-full h-3 bg-gray-100 dark:bg-zinc-900 rounded-full overflow-hidden flex border border-gray-200 dark:border-zinc-800">
              <div
                style={{ width: `${links.length > 0 ? (toReadCount / links.length) * 100 : 0}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`To Read: ${toReadCount}`}
              />
              <div
                style={{ width: `${links.length > 0 ? (readingCount / links.length) * 100 : 0}%` }}
                className="bg-sky-500 h-full transition-all"
                title={`Reading: ${readingCount}`}
              />
              <div
                style={{ width: `${links.length > 0 ? (doneCount / links.length) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Done: ${doneCount}`}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>To Read ({toReadCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span>Reading ({readingCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Done ({doneCount})</span>
              </div>
            </div>
          </div>

          {/* Most Saved Domains (DASH-01 to DASH-05) */}
          <div className="glass-card rounded-2xl p-6 border border-gray-200 dark:border-zinc-800 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                <Globe size={18} className="text-[#093329] dark:text-[#BCD94E]" />
                <span>Most Frequently Saved Domains</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
                Parsed from valid URLs saved in your library (excluding unconstrained plain text notes).
              </p>
            </div>

            {domainStats.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-zinc-500 italic py-6 text-center">
                No web domains saved yet. Save standard website or video URLs to generate analytics.
              </p>
            ) : (
              <div className="space-y-3">
                {domainStats.map((item, idx) => {
                  const percentage = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.domain} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-gray-800 dark:text-zinc-200 font-medium flex items-center gap-2">
                          <span className="text-gray-400 dark:text-zinc-500 font-mono text-[11px] w-5">#{idx + 1}</span>
                          <span>{item.domain}</span>
                        </span>
                        <span className="text-gray-600 dark:text-zinc-400 font-semibold">{item.count} links</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#093329] to-[#BCD94E] rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
