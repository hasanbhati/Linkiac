'use client';

import React, { useState, useEffect } from 'react';
import { Link as LinkType, ReadingStatus } from '@linkiac/shared';
import { X, Sparkles, Upload, Loader2, Bookmark, Folder, Tag as TagIcon } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { CustomSelect, SelectOption } from './CustomSelect';

interface SaveLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  editLink?: LinkType | null;
}

export function SaveLinkModal({ isOpen, onClose, editLink }: SaveLinkModalProps) {
  const { categories, folders, addLink, updateLink } = useApp();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('to_read');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editLink) {
      setUrl(editLink.url);
      setTitle(editLink.title || '');
      setComment(editLink.comment || '');
      setReadingStatus(editLink.reading_status);
      setCategoryId(editLink.category_id);
      setFolderId(editLink.folder_id);
      setTagsList((editLink.tags || []).map(t => t.name));
      setThumbnailUrl(editLink.thumbnail_url);
    } else {
      setUrl('');
      setTitle('');
      setComment('');
      setReadingStatus('to_read');
      setCategoryId(null);
      setFolderId(null);
      setTagsList([]);
      setThumbnailUrl(null);
      setError(null);
    }
  }, [editLink, isOpen]);

  if (!isOpen) return null;

  const handleFetchPreview = async () => {
    if (!url.trim()) return;
    setIsFetchingPreview(true);
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.title && !title) setTitle(data.title);
        if (data.thumbnail_url) setThumbnailUrl(data.thumbnail_url);
      }
    } catch {
      // Non-fatal, gracefully ignored per PRD
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tagsList.includes(val)) {
        setTagsList([...tagsList, val]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setTagsList(tagsList.filter(t => t !== tagName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a URL, text, or broken link to save.');
      return;
    }

    try {
      if (editLink) {
        updateLink(editLink.id, {
          url: url.trim(),
          title: title.trim() || null,
          comment: comment.trim() || null,
          reading_status: readingStatus,
          category_id: categoryId,
          folder_id: folderId,
          thumbnail_url: thumbnailUrl,
        });
      } else {
        await addLink({
          url: url.trim(),
          title: title.trim() || null,
          comment: comment.trim() || null,
          reading_status: readingStatus,
          category_id: categoryId,
          folder_id: folderId,
          tags: tagsList,
          thumbnail_url: thumbnailUrl,
        });
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save link';
      setError(message);
    }
  };

  // Folder options for CustomSelect
  const folderOptions: SelectOption[] = [
    { value: 'none', label: 'No folder (Unfiled)' },
    ...folders.map(f => {
      const cat = categories.find(c => c.id === f.category_id);
      return {
        value: f.id,
        label: f.name,
        badge: cat ? cat.name : 'Standalone',
        icon: <Folder size={14} className="text-amber-400" />,
      };
    }),
  ];

  // Category options
  const categoryOptions: SelectOption[] = [
    { value: 'none', label: 'No category' },
    ...categories.map(c => ({
      value: c.id,
      label: c.name,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Bookmark size={18} className="text-indigo-400" />
            <span>{editLink ? 'Edit Saved Link' : 'Save Anything to Linkiac'}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              {error}
            </div>
          )}

          {/* Raw Text / URL Input (Intentionally unconstrained) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                URL or Arbitrary Text *
              </label>
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={isFetchingPreview || !url.trim()}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isFetchingPreview ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>Auto-fetch preview</span>
              </button>
            </div>
            <textarea
              rows={2}
              required
              placeholder="Paste any URL, broken link, reel text, or sentence..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Title (optional)
            </label>
            <input
              type="text"
              placeholder="Give it a title or leave empty..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Personal Comment */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Personal Note / Comment
            </label>
            <textarea
              rows={2}
              placeholder="Why are you saving this? Key takeaway..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Reading Status & Organization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomSelect
              label="Reading Status"
              value={readingStatus}
              onChange={val => setReadingStatus(val as ReadingStatus)}
              options={[
                { value: 'to_read', label: 'To Read' },
                { value: 'reading', label: 'Reading' },
                { value: 'done', label: 'Done' },
              ]}
            />

            <CustomSelect
              label="Folder"
              value={folderId || 'none'}
              onChange={val => setFolderId(val === 'none' ? null : val)}
              options={folderOptions}
              placeholder="Select folder"
            />
          </div>

          {/* Category */}
          <CustomSelect
            label="Category"
            value={categoryId || 'none'}
            onChange={val => setCategoryId(val === 'none' ? null : val)}
            options={categoryOptions}
            placeholder="Assign to top-level category"
          />

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Tags (press Enter to add)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tagsList.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-zinc-800 text-zinc-200 border border-zinc-700"
                >
                  <TagIcon size={11} className="text-zinc-400" />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400 ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="e.g. frontend, inspiration, reading..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Custom Thumbnail URL */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Thumbnail Image URL (optional)
            </label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/... or paste image URL"
              value={thumbnailUrl || ''}
              onChange={e => setThumbnailUrl(e.target.value || null)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              {editLink ? 'Save Changes' : 'Save to Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
