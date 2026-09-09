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
              ? 'bg-indigo-600/15 text-indigo-400 font-medium'
              : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
          } ${isDragOver ? 'ring-2 ring-indigo-500 bg-indigo-600/30 text-white font-semibold shadow-lg shadow-indigo-500/20 scale-[1.02]' : ''}`}
          style={{ paddingLeft: `${Math.min(depth * 14 + 10, 80)}px` }}
        >
          <div className="flex items-center gap-1.5 truncate">
            {childFolders.length > 0 ? (
              <button
                type="button"
                onClick={e => toggleFolder(folder.id, e)}
                className="w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-200"
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : (
              <div className="w-4" />
            )}
            {isExpanded ? (
              <FolderOpen size={14} className="text-indigo-400 flex-shrink-0" />
            ) : (
              <FolderIcon size={14} className="text-amber-400/80 flex-shrink-0" />
            )}
            <span className="truncate">{folder.name}</span>
          </div>

          <div className="flex items-center gap-1">
            {isDragOver ? (
              <span className="text-[10px] font-bold text-indigo-200 bg-indigo-900/90 border border-indigo-400 px-1.5 py-0.5 rounded shadow-sm">
                Drop to move
              </span>
            ) : (
              <>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    title="Add nested subfolder"
                    onClick={e => handleCreateSubfolder(folder.id, e)}
                    className="p-1 hover:text-zinc-100 rounded"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    type="button"
                    title="Delete folder"
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(`Delete folder "${folder.name}" and subfolders? Contained links will become unfiled.`)) {
                        deleteFolder(folder.id);
                      }
                    }}
                    className="p-1 hover:text-red-400 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {folderLinkCount > 0 && (
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
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
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
          } ${dragOverTarget === 'all' ? 'ring-2 ring-indigo-500 bg-indigo-600/30 text-white font-semibold scale-[1.02] shadow-lg shadow-indigo-500/20' : ''}`}
        >
          <span className="flex items-center gap-2">
            <Layers size={15} className="text-indigo-400" />
            <span>All Links</span>
          </span>
          {dragOverTarget === 'all' ? (
            <span className="text-[10px] font-bold text-indigo-200 bg-indigo-900/90 border border-indigo-400 px-1.5 py-0.5 rounded shadow-sm">
              Drop to unfile
            </span>
          ) : (
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">
              {totalLinksCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onSelectUnfiled}
          onDragOver={e => handleDragOver(e, 'unfiled')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, { type: 'unfiled' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            isUnfiledOnly
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
          } ${dragOverTarget === 'unfiled' ? 'ring-2 ring-amber-500 bg-amber-600/20 text-white font-semibold scale-[1.02] shadow-lg shadow-amber-500/20' : ''}`}
        >
          <span className="flex items-center gap-2">
            <Inbox size={15} className="text-amber-400" />
            <span>Unfiled</span>
          </span>
          {dragOverTarget === 'unfiled' ? (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-950/90 border border-amber-500/40 px-1.5 py-0.5 rounded shadow-sm">
              Drop to unfile
            </span>
          ) : (
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">
              {unfiledCount}
            </span>
          )}
        </button>
      </div>

      {/* Folders Section */}
      <div className="pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Folders</span>
          <button
            type="button"
            onClick={() => setShowAddRootFolder(!showAddRootFolder)}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded"
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
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg text-xs font-medium"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="space-y-0.5">
          {rootFolders.length === 0 ? (
            <p className="text-[11px] text-zinc-600 px-2 py-1">No folders created yet</p>
          ) : (
            rootFolders.map(rootFolder => renderFolderNode(rootFolder, 0))
          )}
        </div>
      </div>
    </div>
  );
}
