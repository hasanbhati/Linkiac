'use client';

import React, { useState } from 'react';
import { Link as LinkType } from '@linkiac/shared';
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
  const [comment, setComment] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (sourceLink) {
      setUrl(sourceLink.url);
    } else {
      setUrl('');
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
      await sendLinkToFriends({
        url: url.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Send size={18} className="text-indigo-400" />
            <span>Send Link to Friends</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              {error}
            </div>
          )}

          {/* URL preview / input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Link to Share *
            </label>
            <input
              type="text"
              required
              readOnly={!!sourceLink}
              placeholder="https://... or raw note"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>

          {/* Select Friends (Multi-recipient) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Select Friends ({selectedFriendIds.length} chosen)
            </label>
            {acceptedFriends.length === 0 ? (
              <p className="text-xs text-zinc-500 italic p-3 bg-zinc-950 rounded-xl border border-zinc-800">
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
                          ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <User size={14} className={isChecked ? 'text-indigo-400' : 'text-zinc-500'} />
                        <span className="font-medium truncate">{friendProfile.display_name || friendProfile.username}</span>
                        <span className="text-zinc-500 text-[11px]">@{friendProfile.username}</span>
                      </span>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-700'
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
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Message to Friends (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Check this out! Thought of you..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || selectedFriendIds.length === 0}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              {isSending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
