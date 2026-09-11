'use client';

import React, { useState } from 'react';
import { Folder } from '@linkiac/shared';
import {
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Layers,
  Inbox,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/lib/app-context';

interface FolderTreeProps {
  selectedFolderId: string | null;
  isUnfiledOnly: boolean;
  onSelectAll: () => void;
  onSelectUnfiled: () => void;
  onSelectFolder: (id: string) => void;
  onDropOnTarget?: (
    target: { type: 'all' | 'unfiled' | 'folder'; id?: string },
    linkIds?: string[]
  ) => void;
}

export function FolderTree({
  selectedFolderId,
  isUnfiledOnly,
  onSelectAll,
  onSelectUnfiled,
  onSelectFolder,
  onDropOnTarget,
}: FolderTreeProps) {
  const { folders, links, addFolder, deleteFolder } = useApp();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showAddRootFolder, setShowAddRootFolder] = useState(false);
  const [newRootFolderName, setNewRootFolderName] = useState('');
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateRootFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRootFolderName.trim()) return;
    addFolder(newRootFolderName.trim(), null, null);
    setNewRootFolderName('');
    setShowAddRootFolder(false);
  };

  const handleCreateSubfolder = (parentFolderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const name = prompt('Subfolder name:');
    if (name && name.trim()) {
      addFolder(name.trim(), null, parentFolderId);
      setExpandedFolders(prev => new Set([...prev, parentFolderId]));
    }
  };

  // Drag over / drop helpers
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !e.currentTarget.contains(related)) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, target: { type: 'all' | 'unfiled' | 'folder'; id?: string }) => {
    e.preventDefault();
    setDragOverTarget(null);

    let ids: string[] = [];
    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed.linkIds) && parsed.linkIds.length > 0) {
          ids = parsed.linkIds;
        }
      }
    } catch {}

    if (ids.length === 0) {
      const plainId = e.dataTransfer.getData('text/plain');
      if (plainId) ids = [plainId];
    }

    if (onDropOnTarget) onDropOnTarget(target, ids);
  };

  // Count links
  const totalLinksCount = links.length;
  const unfiledCount = links.filter(l => !l.folder_id).length;

  const renderFolderNode = (folder: Folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isDragOver = dragOverTarget === `folder-${folder.id}`;
    const childFolders = folders.filter(f => f.parent_folder_id === folder.id);
    const folderLinkCount = links.filter(l => l.folder_id === folder.id).length;

    return (
      <div key={folder.id} className="select-none">
        <div
          onDragOver={e => handleDragOver(e, `folder-${folder.id}`)}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, { type: 'folder', id: folder.id })}
          onClick={() => onSelectFolder(folder.id)}
          className={`group flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer ${
            isSelected
              ? 'bg-[#093329]/10 text-[#093329] dark:bg-[#BCD94E]/15 dark:text-[#BCD94E] font-medium'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200'
          } ${isDragOver ? 'ring-2 ring-[#BCD94E] bg-[#BCD94E]/20 text-[#093329] dark:text-[#BCD94E] font-semibold shadow-lg shadow-[#BCD94E]/20 scale-[1.02]' : ''}`}
          style={{ paddingLeft: `${Math.min(depth * 14 + 10, 80)}px` }}
        >
          <div className="flex items-center gap-1.5 truncate">
            {childFolders.length > 0 ? (
              <button
                type="button"
                onClick={e => toggleFolder(folder.id, e)}
                aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200"
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : (
              <div className="w-4" />
            )}
            {isExpanded ? (
              <FolderOpen size={14} className="text-[#093329] dark:text-[#BCD94E] flex-shrink-0" />
            ) : (
              <FolderIcon size={14} className="text-amber-500 flex-shrink-0" />
            )}
            <span className="truncate">{folder.name}</span>
          </div>

          <div className="flex items-center gap-1">
            {isDragOver ? (
              <span className="text-[10px] font-bold text-[#093329] bg-[#BCD94E] border border-[#BCD94E] px-1.5 py-0.5 rounded shadow-sm">
                Drop to move
              </span>
            ) : (
              <>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    title="Add nested subfolder"
                    aria-label="Add nested subfolder"
                    onClick={e => handleCreateSubfolder(folder.id, e)}
                    className="p-1 hover:text-gray-900 dark:hover:text-zinc-100 rounded"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    type="button"
                    title="Delete folder"
                    aria-label="Delete folder"
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(`Delete folder "${folder.name}" and subfolders? Contained links will become unfiled.`)) {
                        deleteFolder(folder.id);
                      }
                    }}
                    className="p-1 hover:text-red-500 dark:hover:text-red-400 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {folderLinkCount > 0 && (
                  <span className="text-[10px] font-mono text-gray-500 bg-gray-100 dark:text-zinc-500 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                    {folderLinkCount}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {isExpanded && childFolders.length > 0 && (
          <div>{childFolders.map(child => renderFolderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter(f => f.parent_folder_id === null);

  return (
    <div className="space-y-4">
      {/* Primary Views: All Links & Unfiled */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={onSelectAll}
          onDragOver={e => handleDragOver(e, 'all')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, { type: 'all' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            !selectedFolderId && !isUnfiledOnly
              ? 'bg-[#093329] text-white dark:bg-zinc-800 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
          } ${dragOverTarget === 'all' ? 'ring-2 ring-[#BCD94E] bg-[#BCD94E]/20 text-[#093329] dark:text-[#BCD94E] font-semibold scale-[1.02] shadow-lg shadow-[#BCD94E]/20' : ''}`}
        >
          <span className="flex items-center gap-2">
            <Layers size={15} className="text-[#093329] dark:text-[#BCD94E]" />
            <span>All Links</span>
          </span>
          {dragOverTarget === 'all' ? (
            <span className="text-[10px] font-bold text-[#093329] bg-[#BCD94E] border border-[#BCD94E] px-1.5 py-0.5 rounded shadow-sm">
              Drop to unfile
            </span>
          ) : (
            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 dark:text-zinc-500 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full">
              {totalLinksCount}
            </span>
          )}
        </button>

        {/* Unfiled */}
        <button
          type="button"
          onClick={onSelectUnfiled}
          onDragOver={e => handleDragOver(e, 'unfiled')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, { type: 'unfiled' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            isUnfiledOnly
              ? 'bg-[#093329] text-white dark:bg-zinc-800 shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
          } ${dragOverTarget === 'unfiled' ? 'ring-2 ring-[#BCD94E] bg-[#BCD94E]/20 text-[#093329] dark:text-[#BCD94E] font-semibold scale-[1.02] shadow-lg shadow-[#BCD94E]/20' : ''}`}
        >
          <span className="flex items-center gap-2">
            <Inbox size={15} className="text-gray-400 dark:text-zinc-500" />
            <span>Unfiled</span>
          </span>
          <span className="text-[10px] font-mono text-gray-500 bg-gray-100 dark:text-zinc-500 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full">
            {unfiledCount}
          </span>
        </button>
      </div>

      {/* Folders Tree Section */}
      <div>
        <div className="flex items-center justify-between px-2 mb-1.5">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
            Folders
          </span>
          <button
            type="button"
            onClick={() => setShowAddRootFolder(!showAddRootFolder)}
            className="text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-100 p-1 rounded transition-colors"
            aria-label="Create New Folder"
            title="Create New Folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>

        {showAddRootFolder && (
          <form onSubmit={handleCreateRootFolder} className="mb-2 px-1">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="New folder name..."
                value={newRootFolderName}
                onChange={e => setNewRootFolderName(e.target.value)}
                autoFocus
                className="flex-1 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#093329] dark:focus:ring-[#BCD94E] dark:focus:border-[#BCD94E] shadow-xs"
              />
              <button
                type="submit"
                className="bg-[#093329] hover:bg-[#0d4739] dark:bg-[#BCD94E] dark:hover:bg-[#a8c43f] text-white dark:text-[#093329] dark:font-bold px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="space-y-0.5">
          {rootFolders.length === 0 ? (
            <p className="text-[11px] text-gray-400 dark:text-zinc-600 px-2 py-1">No folders created yet</p>
          ) : (
            rootFolders.map(rootFolder => renderFolderNode(rootFolder, 0))
          )}
        </div>
      </div>
    </div>
  );
}
