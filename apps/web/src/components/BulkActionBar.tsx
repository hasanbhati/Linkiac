'use client';

import React, { useState } from 'react';
import { FolderInput, Trash2, X, CheckSquare } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { CustomSelect, SelectOption } from './CustomSelect';

interface BulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkActionBar({ selectedIds, onClearSelection }: BulkActionBarProps) {
  const { categories, folders, bulkMoveLinks, bulkDeleteLinks } = useApp();

  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  const handleBulkMove = () => {
    let resolvedCategoryId: string | null = null;
    if (selectedFolderId) {
      const f = folders.find(folder => folder.id === selectedFolderId);
      if (f) resolvedCategoryId = f.category_id;
    }
    bulkMoveLinks(selectedIds, resolvedCategoryId, selectedFolderId);
    setShowMoveDialog(false);
    onClearSelection();
  };

  const handleBulkDelete = () => {
    if (confirm(`Permanently delete ${selectedIds.length} selected links? This cannot be undone.`)) {
      bulkDeleteLinks(selectedIds);
      onClearSelection();
    }
  };

  const folderOptions: SelectOption[] = [
    { value: 'none', label: 'Unfiled (Remove folder)' },
    ...folders.map(f => ({
      value: f.id,
      label: f.name,
    })),
  ];

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 text-xs animate-slide-up">
        <div className="flex items-center gap-2 border-r border-zinc-800 pr-4">
          <CheckSquare size={16} className="text-indigo-400" />
          <span className="font-semibold text-zinc-100 whitespace-nowrap">
            {selectedIds.length} {selectedIds.length === 1 ? 'link' : 'links'} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMoveDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            <FolderInput size={14} className="text-amber-400" />
            <span>Move</span>
          </button>

          <button
            type="button"
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium transition-colors"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 text-zinc-500 hover:text-zinc-200 rounded-lg"
          title="Deselect all"
        >
          <X size={16} />
        </button>
      </div>

      {/* Bulk Move Dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-zinc-100 text-sm">Move {selectedIds.length} links to...</h3>
            <CustomSelect
              value={selectedFolderId || 'none'}
              onChange={val => setSelectedFolderId(val === 'none' ? null : val)}
              options={folderOptions}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMoveDialog(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkMove}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs"
              >
                Apply Move
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
