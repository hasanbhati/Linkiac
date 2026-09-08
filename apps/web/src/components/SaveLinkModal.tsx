'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Link as LinkType, ReadingStatus, extractDefaultThumbnail } from '@linkiac/shared';
import { X, Sparkles, Upload, Loader2, Bookmark, Folder, Tag as TagIcon, Image as ImageIcon, Trash2, Camera } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { getSupabase } from '@/lib/supabase/client';
import { CustomSelect, SelectOption } from './CustomSelect';

interface SaveLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  editLink?: LinkType | null;
}

export function SaveLinkModal({ isOpen, onClose, editLink }: SaveLinkModalProps) {
  const { currentUser, categories, folders, addLink, updateLink } = useApp();

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
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-fetch preview on URL change with 500ms debounce
  useEffect(() => {
    const raw = url.trim();
    if (!raw || editLink || !isOpen) return;

    // Immediately set default thumbnail if no custom thumbnail
    const defaultThumb = extractDefaultThumbnail(raw);
    if (defaultThumb && !thumbnailUrl) {
      setThumbnailUrl(defaultThumb);
    }

    const timer = setTimeout(async () => {
      setIsFetchingPreview(true);
      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.title && !title) setTitle(data.title);
          if (data.thumbnail_url) setThumbnailUrl(data.thumbnail_url);
        }
      } catch {
        // Non-fatal, default thumbnail already in place
      } finally {
        setIsFetchingPreview(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [url, editLink, isOpen]);

  const handleFetchPreview = async () => {
    if (!url.trim()) return;
    setIsFetchingPreview(true);
    try {
      const defaultThumb = extractDefaultThumbnail(url.trim());
      if (defaultThumb && !thumbnailUrl) {
        setThumbnailUrl(defaultThumb);
      }
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

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (!thumbnailUrl && newUrl.trim()) {
      const defaultThumb = extractDefaultThumbnail(newUrl.trim());
      if (defaultThumb) {
        setThumbnailUrl(defaultThumb);
      }
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setThumbnailError('Thumbnail image must be under 5MB.');
      return;
    }

    setIsUploadingThumbnail(true);
    setThumbnailError(null);

    try {
      const supabase = getSupabase();
      const fileExt = file.name.split('.').pop() || 'png';
      const cleanFileName = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('thumbnails')
        .upload(cleanFileName, file, { upsert: true });

      if (uploadErr) {
        throw new Error(uploadErr.message || 'Failed to upload thumbnail');
      }

      const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(cleanFileName);
      setThumbnailUrl(publicUrl);
    } catch (err: any) {
      setThumbnailError(err.message || 'Failed to upload thumbnail to storage.');
    } finally {
      setIsUploadingThumbnail(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  if (!isOpen) return null;

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
              onChange={e => handleUrlChange(e.target.value)}
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

          {/* Thumbnail / Visual Cover */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Thumbnail / Cover Image
              </label>
              {thumbnailUrl && (
                <button
                  type="button"
                  onClick={() => setThumbnailUrl(null)}
                  className="text-xs text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Remove cover</span>
                </button>
              )}
            </div>

            {thumbnailError && (
              <div className="p-2 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                {thumbnailError}
              </div>
            )}

            {thumbnailUrl ? (
              <div className="relative w-full h-36 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group">
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingThumbnail}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900/90 text-white text-xs font-medium hover:bg-zinc-800 flex items-center gap-1.5 shadow"
                  >
                    {isUploadingThumbnail ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                    <span>Replace Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl(null)}
                    className="px-3 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-medium hover:bg-red-500 flex items-center gap-1.5 shadow"
                  >
                    <Trash2 size={12} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingThumbnail}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {isUploadingThumbnail ? (
                    <Loader2 size={13} className="animate-spin text-indigo-400" />
                  ) : (
                    <Upload size={13} className="text-indigo-400" />
                  )}
                  <span>{isUploadingThumbnail ? 'Uploading...' : 'Upload Image'}</span>
                </button>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Or paste direct image URL..."
                    value={thumbnailUrl || ''}
                    onChange={e => setThumbnailUrl(e.target.value || null)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleThumbnailUpload}
              className="hidden"
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
