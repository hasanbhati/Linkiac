'use client';

import React, { useState } from 'react';
import { SendRecipient, ReadingStatus, parseNormalizedDomain, unpackSharedComment } from '@linkiac/shared';
import { X, Check, Folder, User } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { CustomSelect, SelectOption } from './CustomSelect';

interface AcceptSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: SendRecipient | null;
}

export function AcceptSuggestionModal({ isOpen, onClose, suggestion }: AcceptSuggestionModalProps) {
  const { folders, acceptSuggestion } = useApp();

  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('to_read');
  const [comment, setComment] = useState('');

  React.useEffect(() => {
    if (suggestion) {
      setFolderId(null);
      setReadingStatus(suggestion.reading_status || 'to_read');
      // PRD: By default copy sender comment to personal comment, editable before accepting
      const { title: unpackedTitle, note: unpackedNote } = unpackSharedComment(suggestion.send?.comment);
      setComment(unpackedNote || (unpackedTitle ? '' : (suggestion.send?.comment || '')));

      const rawSendTitle = suggestion.send?.title ? String(suggestion.send.title).trim() : '';
      const rawSourceTitle = suggestion.send?.source_link?.title ? String(suggestion.send.source_link.title).trim() : '';
      let initialTitle = rawSendTitle || unpackedTitle || rawSourceTitle;
      if (!initialTitle || initialTitle.toLowerCase().startsWith('shared by @')) {
        initialTitle = (suggestion.send?.url ? parseNormalizedDomain(suggestion.send.url) : '') || suggestion.send?.url || '';
      }
      setTitle(initialTitle);
    }
  }, [suggestion, isOpen]);

  if (!isOpen || !suggestion || !suggestion.send) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    acceptSuggestion(suggestion.id, null, folderId, comment.trim() || null, title.trim() || null);
    onClose();
  };

  const folderOptions: SelectOption[] = [
    { value: 'none', label: 'No folder (Unfiled)' },
    ...folders.map(f => ({
      value: f.id,
      label: f.name,
      icon: <Folder size={14} className="text-amber-400" />,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Check size={18} className="text-emerald-500" />
            <span>Accept to My Library</span>
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
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {/* Link info */}
          <div className="p-3 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[#093329] dark:text-[#BCD94E] font-medium">
              <User size={12} />
              <span>Recommended by @{suggestion.send.sender?.username || 'friend'}</span>
            </div>
            <p className="text-xs font-mono text-gray-700 dark:text-zinc-300 line-clamp-2">{suggestion.send.url}</p>
          </div>

          {/* Link Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                Link Title
              </label>
              <span className="text-[11px] text-gray-400 dark:text-zinc-500">Keep original or edit before saving</span>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title for your library (keep or edit)..."
              className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#093329]/20 dark:focus:ring-[#BCD94E]/30 dark:focus:border-[#BCD94E] shadow-xs"
            />
          </div>

          {/* Filing Destination */}
          <CustomSelect
            label="File into Folder"
            value={folderId || 'none'}
            onChange={val => setFolderId(val === 'none' ? null : val)}
            options={folderOptions}
            placeholder="Select a folder"
          />

          {/* Personal Comment */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Personal Note (saved to your copy)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add your note or retain friend recommendation note..."
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
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#093329] hover:bg-[#0d4739] dark:bg-[#BCD94E] dark:hover:bg-[#a8c43f] dark:text-[#093329] dark:font-bold shadow-md shadow-[#093329]/15 dark:shadow-[#BCD94E]/15 active:scale-95 transition-all"
            >
              Save to Library
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
