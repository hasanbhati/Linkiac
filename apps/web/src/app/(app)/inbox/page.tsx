'use client';

import React, { useState } from 'react';
import { SendRecipient, ReadingStatus, isSafeWebUrl, ensureUrlProtocol, unpackSharedComment } from '@linkiac/shared';
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
  ShieldAlert,
  Ban,
  Flag,
} from 'lucide-react';

export default function InboxPage() {
  const { currentUser, suggestions, rejectSuggestion } = useApp();
  const [acceptingItem, setAcceptingItem] = useState<SendRecipient | null>(null);
  const [reportingItem, setReportingItem] = useState<SendRecipient | null>(null);
  const [reportReason, setReportReason] = useState('Spam, scam, or phishing');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const pendingSuggestions = suggestions.filter(
    s => s.status === 'pending' && s.recipient_id === currentUser.id
  );

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingItem) return;
    setIsSubmittingReport(true);
    try {
      await rejectSuggestion(reportingItem.id);
      alert(`Report submitted under reason: "${reportReason}". Linkiac reviews reported content under our zero-tolerance policy within 24 hours. The recommendation has been removed.`);
      setReportingItem(null);
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleBlockSender = async (item: SendRecipient) => {
    const sender = item.send?.sender;
    const username = sender?.username || 'this user';
    if (confirm(`Block @${username}? This recommendation will be removed and they will not be able to send you links or friend requests.`)) {
      await rejectSuggestion(item.id);
      alert(`@${username} has been blocked.`);
    }
  };

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

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6">
          {/* Header */}
          <div className="border-b border-gray-200/80 dark:border-zinc-800/80 pb-5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 flex items-center gap-2.5">
                <Inbox size={22} className="text-[#093329] dark:text-[#BCD94E]" />
                <span>Inbox</span>
              </h1>
              <span className="text-xs font-mono text-gray-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-2 py-0.5 rounded-full shadow-xs">
                {pendingSuggestions.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
              Private recommendations sent directly to you by your accepted friends. Accept them into your library or decline.
            </p>
          </div>

          {/* Inbox Cards */}
          {pendingSuggestions.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-zinc-800 rounded-3xl bg-white/50 dark:bg-zinc-900/20">
              <div className="w-12 h-12 rounded-2xl bg-[#093329]/10 dark:bg-[#BCD94E]/10 border border-[#093329]/20 dark:border-[#BCD94E]/20 flex items-center justify-center text-[#093329] dark:text-[#BCD94E] mb-3">
                <Inbox size={24} />
              </div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-zinc-200">Inbox Zero!</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 max-w-sm mt-1">
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
                const { title: unpackedTitle, note: unpackedNote } = unpackSharedComment(send.comment);
                const rawSendTitle = send.title ? String(send.title).trim() : '';
                const rawSourceTitle = send.source_link?.title ? String(send.source_link.title).trim() : '';
                let itemTitle = rawSendTitle || unpackedTitle || rawSourceTitle;
                if (itemTitle.toLowerCase().startsWith('shared by @')) {
                  itemTitle = '';
                }
                const displayComment = unpackedTitle ? unpackedNote : send.comment;

                return (
                  <div
                    key={item.id}
                    className="glass-card rounded-2xl p-5 border border-gray-200 dark:border-zinc-800 flex flex-col justify-between space-y-4 hover:border-gray-300 dark:hover:border-zinc-700/80 transition-all shadow-xs"
                  >
                    <div>
                      {/* Sender Row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-[#093329]/40 border border-emerald-300 dark:border-[#BCD94E]/30 flex items-center justify-center overflow-hidden">
                            {sender?.avatar_url ? (
                              <img src={sender.avatar_url} alt={sender.username} className="w-full h-full object-cover" />
                            ) : (
                              <User size={14} className="text-[#093329] dark:text-[#BCD94E]" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-200">
                              {sender?.display_name || sender?.username || 'Friend'}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-zinc-500 ml-1.5 font-mono">
                              @{sender?.username || 'user'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setReportingItem(item)}
                            className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                            title="Report objectionable content"
                          >
                            <ShieldAlert size={13} />
                            <span>Report</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBlockSender(item)}
                            className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                            title={`Block @${sender?.username || 'sender'}`}
                          >
                            <Ban size={13} />
                            <span>Block</span>
                          </button>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* URL / Text */}
                      {itemTitle && (
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1 line-clamp-2">
                          {itemTitle}
                        </h3>
                      )}
                      {isSafe && clickableUrl ? (
                        <a
                          href={clickableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs ${itemTitle ? 'text-[#093329] hover:underline dark:text-[#BCD94E] dark:hover:text-[#a8c43f] font-mono' : 'text-sm font-semibold text-gray-900 dark:text-zinc-100 hover:text-[#093329]'} flex items-center gap-1.5 line-clamp-1 transition-colors mb-2`}
                        >
                          <span className="truncate font-mono">{send.url}</span>
                          <ExternalLink size={12} className="flex-shrink-0" />
                        </a>
                      ) : (
                        <p className={`text-xs ${itemTitle ? 'text-gray-500 dark:text-zinc-400 font-mono' : 'text-sm font-semibold text-gray-900 dark:text-zinc-100 font-mono'} line-clamp-1 mb-2 select-text`}>
                          {send.url}
                        </p>
                      )}

                      {/* Sender Note */}
                      {displayComment && (
                        <div className="p-3 bg-gray-50 dark:bg-zinc-950/70 rounded-xl border border-gray-200 dark:border-zinc-800/80 text-xs text-gray-700 dark:text-zinc-300 italic flex items-start gap-2">
                          <MessageSquare size={13} className="text-[#093329] dark:text-[#BCD94E] mt-0.5 flex-shrink-0" />
                          <span>&quot;{displayComment}&quot;</span>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Decline this suggestion? It will be removed from your inbox.')) {
                            rejectSuggestion(item.id);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 transition-colors"
                      >
                        <X size={14} />
                        <span>Decline</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAcceptingItem(item)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white dark:text-[#093329] dark:font-bold bg-[#093329] hover:bg-[#0d4739] dark:bg-[#BCD94E] dark:hover:bg-[#a8c43f] shadow-md shadow-[#093329]/15 dark:shadow-[#BCD94E]/15 active:scale-95 transition-all"
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

      {/* Report Content Modal for Apple Guideline 1.2 & Google Play Policy */}
      {reportingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <ShieldAlert size={20} />
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">Report Objectionable Content</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportingItem(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
              Linkiac maintains zero tolerance for objectionable material, spam, and abusive behavior. Select the reason for reporting this link from @{reportingItem.send?.sender?.username || 'user'}:
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div className="space-y-2">
                {[
                  'Spam, scam, or unsolicited advertising',
                  'Inappropriate, abusive, or harassing content',
                  'Malicious links, phishing, or malware',
                  'Illegal material or copyright violation',
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/60 cursor-pointer text-xs text-gray-800 dark:text-zinc-200 transition-colors"
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="text-[#093329] dark:text-[#BCD94E] focus:ring-[#BCD94E]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 shadow-md shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report & Remove'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
