'use client';

import React, { useState } from 'react';
import { Link as LinkType } from '@linkiac/shared';
import { X, FolderInput, Folder } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { CustomSelect, SelectOption } from './CustomSelect';

interface MoveLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: LinkType | null;
}

export function MoveLinkModal({ isOpen, onClose, link }: MoveLinkModalProps) {
  const { folders, updateLink } = useApp();

  const [folderId, setFolderId] = useState<string | null>(link?.folder_id || null);

  React.useEffect(() => {
    if (link) {
      setFolderId(link.folder_id);
    }
  }, [link, isOpen]);

  if (!isOpen || !link) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateLink(link.id, {
      folder_id: folderId,
      category_id: null,
    });
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
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm flex items-center gap-2">
            <FolderInput size={16} className="text-amber-500" />
            <span>Move Link</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-xs text-gray-600 dark:text-zinc-400 truncate font-medium">&quot;{link.title || link.url}&quot;</p>

          <CustomSelect
            label="Destination Folder"
            value={folderId || 'none'}
            onChange={val => setFolderId(val === 'none' ? null : val)}
            options={folderOptions}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#093329] hover:bg-[#0d4739] dark:bg-[#BCD94E] dark:hover:bg-[#a8c43f] text-white dark:text-[#093329] font-medium dark:font-bold rounded-xl text-xs shadow-md shadow-[#093329]/15 dark:shadow-[#BCD94E]/15 active:scale-95 transition-all"
            >
              Move Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
