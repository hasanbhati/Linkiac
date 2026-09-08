'use client';

import React, { useState } from 'react';
import { Category, Folder } from '@linkiac/shared';
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
  selectedCategoryId: string | null;
  selectedFolderId: string | null;
  isUnfiledOnly: boolean;
  onSelectAll: () => void;
  onSelectUnfiled: () => void;
  onSelectCategory: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onDropOnTarget?: (
    target: { type: 'all' | 'unfiled' | 'category' | 'folder'; id?: string },
    linkIds?: string[]
  ) => void;
}

export function FolderTree({
  selectedCategoryId,
  selectedFolderId,
  isUnfiledOnly,
  onSelectAll,
  onSelectUnfiled,
  onSelectCategory,
  onSelectFolder,
  onDropOnTarget,
}: FolderTreeProps) {
  const { categories, folders, links, addCategory, addFolder, deleteCategory, deleteFolder } = useApp();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
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

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName('');
    setShowAddCat(false);
  };

  const handleCreateSubfolder = (parentFolderId: string | null, categoryId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    const name = prompt('Folder name:');
    if (name && name.trim()) {
      addFolder(name.trim(), categoryId, parentFolderId);
      if (parentFolderId) {
        setExpandedFolders(prev => new Set([...prev, parentFolderId]));
      }
    }
  };

  // Drag over / drop helpers
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Prevent flickering when hovering child elements
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !e.currentTarget.contains(related)) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, target: { type: 'all' | 'unfiled' | 'category' | 'folder'; id?: string }) => {
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

  // Count links in nodes
  const totalLinksCount = links.length;
  const unfiledCount = links.filter(l => !l.category_id && !l.folder_id).length;

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
              <FolderIcon size={14} className="text-zinc-500 flex-shrink-0" />
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
                    onClick={e => handleCreateSubfolder(folder.id, folder.category_id, e)}
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

  return (
    <div className="space-y-4">
      {/* Primary Views */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={onSelectAll}
          onDragOver={e => handleDragOver(e, 'all')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, { type: 'all' })}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
            !selectedCategoryId && !selectedFolderId && !isUnfiledOnly
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

      {/* Categories & Contained Folders */}
      <div className="pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Categories</span>
          <button
            type="button"
            onClick={() => setShowAddCat(!showAddCat)}
            className="text-zinc-400 hover:text-zinc-100 p-1"
            title="Add Category"
          >
            <Plus size={14} />
          </button>
        </div>

        {showAddCat && (
          <form onSubmit={handleCreateCategory} className="mb-2 px-1">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Category name..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
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

        <div className="space-y-1">
          {categories.map(cat => {
            const isCatSelected = selectedCategoryId === cat.id && !selectedFolderId;
            const isDragOver = dragOverTarget === `category-${cat.id}`;
            const catRootFolders = folders.filter(f => f.category_id === cat.id && f.parent_folder_id === null);

            return (
              <div key={cat.id} className="space-y-0.5">
                <div
                  onDragOver={e => handleDragOver(e, `category-${cat.id}`)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, { type: 'category', id: cat.id })}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    isCatSelected
                      ? 'bg-indigo-600/15 text-indigo-400'
                      : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100'
                  } ${isDragOver ? 'ring-2 ring-indigo-500 bg-indigo-600/30 text-white font-semibold shadow-lg shadow-indigo-500/20 scale-[1.02]' : ''}`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>{cat.name}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    {isDragOver ? (
                      <span className="text-[10px] font-bold text-indigo-200 bg-indigo-900/90 border border-indigo-400 px-1.5 py-0.5 rounded shadow-sm">
                        Drop to move
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title="Add folder in this category"
                          onClick={e => handleCreateSubfolder(null, cat.id, e)}
                          className="p-1 hover:text-zinc-100 rounded"
                        >
                          <FolderPlus size={13} />
                        </button>
                        <button
                          type="button"
                          title="Delete category"
                          onClick={e => {
                            e.stopPropagation();
                            if (confirm(`Delete category "${cat.name}"? Contained folders and links will become standalone.`)) {
                              deleteCategory(cat.id);
                            }
                          }}
                          className="p-1 hover:text-red-400 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Render root folders for this category */}
                <div className="space-y-0.5">
                  {catRootFolders.map(rootFolder => renderFolderNode(rootFolder, 1))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Standalone Folders (no category) */}
      <div className="pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Standalone Folders</span>
          <button
            type="button"
            onClick={e => handleCreateSubfolder(null, null, e)}
            className="text-zinc-400 hover:text-zinc-100 p-1"
            title="Add Standalone Folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>

        <div className="space-y-0.5">
          {folders
            .filter(f => f.category_id === null && f.parent_folder_id === null)
            .map(rootFolder => renderFolderNode(rootFolder, 0))}
        </div>
      </div>
    </div>
  );
}
