'use client';

import React, { useState } from 'react';
import { SendRecipient, ReadingStatus } from '@linkiac/shared';
import { X, Check, Folder, Layers, User } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { CustomSelect, SelectOption } from './CustomSelect';

interface AcceptSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: SendRecipient | null;
}

export function AcceptSuggestionModal({ isOpen, onClose, suggestion }: AcceptSuggestionModalProps) {
  const { categories, folders, acceptSuggestion } = useApp();

  const [folderId, setFolderId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('to_read');
  const [comment, setComment] = useState('');

  React.useEffect(() => {
    if (suggestion) {
      setFolderId(null);
      setCategoryId(null);
      setReadingStatus(suggestion.reading_status || 'to_read');
      // PRD: By default copy sender comment to personal comment, editable before accepting
      setComment(suggestion.send?.comment || '');
    }
  }, [suggestion, isOpen]);

  if (!isOpen || !suggestion || !suggestion.send) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    acceptSuggestion(suggestion.id, categoryId, folderId, comment.trim() || null);
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

  const categoryOptions: SelectOption[] = [
    { value: 'none', label: 'No category' },
    ...categories.map(c => ({
      value: c.id,
      label: c.name,
      icon: <Layers size={14} className="text-indigo-400" />,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Check size={18} className="text-emerald-400" />
            <span>Accept to My Library</span>
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
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {/* Link info */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
              <User size={12} />
              <span>Recommended by @{suggestion.send.sender?.username || 'friend'}</span>
            </div>
            <p className="text-xs font-mono text-zinc-300 line-clamp-2">{suggestion.send.url}</p>
          </div>

          {/* Filing Destinations */}
          <CustomSelect
            label="File into Folder"
            value={folderId || 'none'}
            onChange={val => setFolderId(val === 'none' ? null : val)}
            options={folderOptions}
            placeholder="Select a folder"
          />

          <CustomSelect
            label="Assign to Category"
            value={categoryId || 'none'}
            onChange={val => setCategoryId(val === 'none' ? null : val)}
            options={categoryOptions}
            placeholder="Select a category"
          />

          {/* Personal Comment */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Personal Note (saved to your copy)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add your note or retain friend recommendation note..."
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
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              Save to Library
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
