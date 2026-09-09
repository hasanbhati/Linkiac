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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
            <FolderInput size={16} className="text-amber-400" />
            <span>Move Link</span>
          </h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-xs text-zinc-400 truncate font-medium">&quot;{link.title || link.url}&quot;</p>

          <CustomSelect
            label="Destination Folder"
            value={folderId || 'none'}
            onChange={val => setFolderId(val === 'none' ? null : val)}
            options={folderOptions}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs shadow-md shadow-indigo-600/20"
            >
              Move Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
