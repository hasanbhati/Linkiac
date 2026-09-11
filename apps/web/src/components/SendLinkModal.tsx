'use client';

import React, { useState } from 'react';
import { Link as LinkType, parseNormalizedDomain } from '@linkiac/shared';
import { X, Send, User, Check } from 'lucide-react';
import { useApp } from '@/lib/app-context';

interface SendLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLink?: LinkType | null;
}

export function SendLinkModal({ isOpen, onClose, sourceLink }: SendLinkModalProps) {
  const { currentUser, friends, sendLinkToFriends } = useApp();

  const [url, setUrl] = useState(sourceLink ? sourceLink.url : '');
  const [title, setTitle] = useState(sourceLink ? (sourceLink.title || '') : '');
  const [comment, setComment] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (sourceLink) {
      setUrl(sourceLink.url);
      setTitle(sourceLink.title || parseNormalizedDomain(sourceLink.url) || '');
    } else {
      setUrl('');
      setTitle('');
    }
    setComment('');
    setSelectedFriendIds([]);
    setError(null);
  }, [sourceLink, isOpen]);

  if (!isOpen) return null;

  // Filter only accepted friends
  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  const toggleFriend = (id: string) => {
    if (selectedFriendIds.includes(id)) {
      setSelectedFriendIds(selectedFriendIds.filter(fId => fId !== id));
    } else {
      setSelectedFriendIds([...selectedFriendIds, id]);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (!sourceLink && (!title || title === parseNormalizedDomain(url))) {
      const domain = parseNormalizedDomain(newUrl);
      if (domain) {
        setTitle(domain);
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please provide a URL or text to send.');
      return;
    }
    if (selectedFriendIds.length === 0) {
      setError('Please select at least one friend to receive this link.');
      return;
    }

    setIsSending(true);
    try {
      const trimmedUrl = url.trim();
      const domainFallback = parseNormalizedDomain(trimmedUrl);
      const effectiveTitle = title.trim() || sourceLink?.title || domainFallback || trimmedUrl;

      await sendLinkToFriends({
        url: trimmedUrl,
        title: effectiveTitle,
        comment: comment.trim() || null,
        recipient_ids: selectedFriendIds,
        source_link_id: sourceLink ? sourceLink.id : null,
        thumbnail_url: sourceLink ? sourceLink.thumbnail_url : null,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Send size={18} className="text-[#093329] dark:text-[#BCD94E]" />
            <span>Send Link to Friends</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
              {error}
            </div>
          )}

          {/* URL preview / input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Link to Share *
            </label>
            <input
              type="text"
              required
              readOnly={!!sourceLink}
              placeholder="https://... or raw note"
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#093329]/20 dark:focus:ring-[#BCD94E]/30 dark:focus:border-[#BCD94E] font-mono text-xs shadow-xs"
            />
          </div>

          {/* Link Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                Link Title
              </label>
              <span className="text-[11px] text-gray-400 dark:text-zinc-500">Visible to recipient</span>
            </div>
            <input
              type="text"
              placeholder="Title for this link (keep or edit)..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#093329]/20 dark:focus:ring-[#BCD94E]/30 dark:focus:border-[#BCD94E] shadow-xs"
            />
          </div>

          {/* Select Friends (Multi-recipient) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Select Friends ({selectedFriendIds.length} chosen)
            </label>
            {acceptedFriends.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-zinc-500 italic p-3 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-zinc-800">
                You do not have any accepted friends yet. Add friends from the Friends tab first!
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto p-1">
                {acceptedFriends.map(f => {
                  const friendProfile = f.requester_id === currentUser.id ? f.recipient : f.requester;
                  if (!friendProfile) return null;
                  const isChecked = selectedFriendIds.includes(friendProfile.id);

                  return (
                    <button
                      key={friendProfile.id}
                      type="button"
                      onClick={() => toggleFriend(friendProfile.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors border ${
                        isChecked
                          ? 'bg-[#093329]/10 border-[#093329]/40 text-[#093329] dark:bg-[#BCD94E]/15 dark:border-[#BCD94E]/40 dark:text-[#BCD94E]'
                          : 'bg-gray-50 hover:bg-gray-100 dark:bg-zinc-950 dark:border-zinc-800 border-gray-200 text-gray-800 dark:text-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <User size={14} className={isChecked ? 'text-[#093329] dark:text-[#BCD94E]' : 'text-gray-400 dark:text-zinc-500'} />
                        <span className="font-medium truncate">{friendProfile.display_name || friendProfile.username}</span>
                        <span className="text-gray-400 dark:text-zinc-500 text-[11px]">@{friendProfile.username}</span>
                      </span>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isChecked ? 'bg-[#093329] border-[#093329] text-white dark:bg-[#BCD94E] dark:border-[#BCD94E] dark:text-[#093329]' : 'border-gray-300 dark:border-zinc-700'
                        }`}
                      >
                        {isChecked && <Check size={12} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Message / Comment */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Message to Friends (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Check this out! Thought of you..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#093329]/20 dark:focus:ring-[#BCD94E]/30 dark:focus:border-[#BCD94E] shadow-xs"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || selectedFriendIds.length === 0}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#093329] hover:bg-[#0d4739] dark:bg-[#BCD94E] dark:hover:bg-[#a8c43f] dark:text-[#093329] dark:font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#093329]/15 dark:shadow-[#BCD94E]/15 active:scale-95 transition-all"
            >
              {isSending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
