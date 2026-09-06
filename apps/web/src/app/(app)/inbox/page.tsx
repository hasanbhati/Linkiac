'use client';

import React, { useState } from 'react';
import { SendRecipient, ReadingStatus, isSafeWebUrl, ensureUrlProtocol } from '@linkiac/shared';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AcceptSuggestionModal } from '@/components/AcceptSuggestionModal';
import { useApp } from '@/lib/app-context';
import {
  Inbox,
  Check,
  X,
  User,
  Clock,
  ExternalLink,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function InboxPage() {
  const { suggestions, rejectSuggestion } = useApp();
  const [acceptingItem, setAcceptingItem] = useState<SendRecipient | null>(null);

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-24 md:pb-8">
        <Sidebar
          selectedCategoryId={null}
          selectedFolderId={null}
          isUnfiledOnly={false}
          onSelectAll={() => {}}
          onSelectUnfiled={() => {}}
          onSelectCategory={() => {}}
          onSelectFolder={() => {}}
        />

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6">
          {/* Header */}
          <div className="border-b border-zinc-800/80 pb-5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
                <Inbox size={22} className="text-indigo-400" />
                <span>Suggestions Inbox</span>
              </h1>
              <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                {pendingSuggestions.length}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Private recommendations sent directly to you by your accepted friends. Accept them into your library or decline.
            </p>
          </div>

          {/* Inbox Cards */}
          {pendingSuggestions.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                <Inbox size={24} />
              </div>
              <h3 className="text-base font-semibold text-zinc-200">Inbox Zero!</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                You have no pending link suggestions from friends right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSuggestions.map(item => {
                const send = item.send;
                if (!send) return null;

                const isSafe = isSafeWebUrl(send.url);
                const clickableUrl = isSafe ? ensureUrlProtocol(send.url) : null;
                const sender = send.sender;

                return (
                  <div
                    key={item.id}
                    className="glass-card rounded-2xl p-5 border border-zinc-800 flex flex-col justify-between space-y-4 hover:border-zinc-700/80 transition-all"
                  >
                    <div>
                      {/* Sender Row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center overflow-hidden">
                            {sender?.avatar_url ? (
                              <img src={sender.avatar_url} alt={sender.username} className="w-full h-full object-cover" />
                            ) : (
                              <User size={14} className="text-indigo-300" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-zinc-200">
                              {sender?.display_name || sender?.username || 'Friend'}
                            </span>
                            <span className="text-[11px] text-zinc-500 ml-1.5 font-mono">
                              @{sender?.username || 'user'}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* URL / Text */}
                      {isSafe && clickableUrl ? (
                        <a
                          href={clickableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-zinc-100 hover:text-indigo-400 flex items-center gap-1.5 line-clamp-2 transition-colors mb-2"
                        >
                          <span className="truncate">{send.url}</span>
                          <ExternalLink size={13} className="flex-shrink-0" />
                        </a>
                      ) : (
                        <p className="text-sm font-semibold text-zinc-100 line-clamp-2 mb-2 select-text font-mono">
                          {send.url}
                        </p>
                      )}

                      {/* Sender Note */}
                      {send.comment && (
                        <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 italic flex items-start gap-2">
                          <MessageSquare size={13} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span>"{send.comment}"</span>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Decline this suggestion? It will be removed from your inbox.')) {
                            rejectSuggestion(item.id);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                      >
                        <X size={14} />
                        <span>Decline</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAcceptingItem(item)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        <Check size={14} />
                        <span>Accept to Library</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <AcceptSuggestionModal
        isOpen={!!acceptingItem}
        suggestion={acceptingItem}
        onClose={() => setAcceptingItem(null)}
      />

      <MobileBottomNav />
    </div>
  );
}
