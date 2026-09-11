'use client';

import React, { useState, useMemo } from 'react';
import { Link as LinkType, ReadingStatus } from '@linkiac/shared';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LinkCard } from '@/components/LinkCard';
import { SaveLinkModal } from '@/components/SaveLinkModal';
import { SendLinkModal } from '@/components/SendLinkModal';
import { MoveLinkModal } from '@/components/MoveLinkModal';
import { BulkActionBar } from '@/components/BulkActionBar';
import { useApp } from '@/lib/app-context';
import {
  Layers,
  Filter,
  CheckSquare,
  Square,
  Plus,
  Inbox,
  Folder as FolderIcon,
  X,
  ArrowLeft,
} from 'lucide-react';

export default function LibraryPage() {
  const { links, folders, bulkMoveLinks } = useApp();

  // Navigation / Tree filter state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isUnfiledOnly, setIsUnfiledOnly] = useState(false);

  // Secondary filters
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  const [sendingLink, setSendingLink] = useState<LinkType | null>(null);
  const [movingLink, setMovingLink] = useState<LinkType | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Folder context
  const currentFolder = useMemo(() => {
    return selectedFolderId ? folders.find(f => f.id === selectedFolderId) : null;
  }, [folders, selectedFolderId]);

  const subfolders = useMemo(() => {
    return selectedFolderId ? folders.filter(f => f.parent_folder_id === selectedFolderId) : [];
  }, [folders, selectedFolderId]);

  const parentFolder = useMemo(() => {
    return currentFolder?.parent_folder_id ? folders.find(f => f.id === currentFolder.parent_folder_id) : null;
  }, [folders, currentFolder]);

  // Active view header title
  const activeViewTitle = useMemo(() => {
    if (currentFolder) return `Folder: ${currentFolder.name}`;
    if (isUnfiledOnly) return 'Unfiled Links';
    return 'All Saved Links';
  }, [currentFolder, isUnfiledOnly]);

  // Matching folders for search query
  const matchingFolders = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return folders.filter(f => f.name.toLowerCase().includes(q));
  }, [folders, searchQuery]);

  // Filter links
  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      // Tree filing filter
      if (selectedFolderId) {
        if (link.folder_id !== selectedFolderId) return false;
      } else if (isUnfiledOnly) {
        if (link.folder_id) return false;
      }

      // Reading status filter
      if (statusFilter !== 'all' && link.reading_status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = link.title?.toLowerCase().includes(q);
        const matchesUrl = link.url.toLowerCase().includes(q);
        const matchesComment = link.comment?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesUrl && !matchesComment) return false;
      }

      return true;
    });
  }, [links, selectedFolderId, isUnfiledOnly, statusFilter, searchQuery]);

  // Multi-select helpers
  const handleToggleSelect = (id: string) => {
    if (selectedLinkIds.includes(id)) {
      setSelectedLinkIds(selectedLinkIds.filter(lId => lId !== id));
    } else {
      setSelectedLinkIds([...selectedLinkIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    if (selectedLinkIds.length === filteredLinks.length) {
      setSelectedLinkIds([]);
    } else {
      setSelectedLinkIds(filteredLinks.map(l => l.id));
    }
  };

  // Drag and drop handler
  const handleDropOnTarget = (
    target: { type: 'all' | 'unfiled' | 'folder'; id?: string },
    draggedIds?: string[]
  ) => {
    const idsToMove = (draggedIds && draggedIds.length > 0)
      ? draggedIds
      : (selectedLinkIds.length > 0 ? selectedLinkIds : []);

    if (idsToMove.length === 0) return;

    let targetLabel = 'Unfiled';
    if (target.type === 'unfiled' || target.type === 'all') {
      bulkMoveLinks(idsToMove, null, null);
      targetLabel = target.type === 'all' ? 'All Links (Unfiled)' : 'Unfiled';
    } else if (target.type === 'folder' && target.id) {
      const folder = folders.find(f => f.id === target.id);
      bulkMoveLinks(idsToMove, null, target.id);
      targetLabel = folder ? `Folder "${folder.name}"` : 'Folder';
    }

    setToastNotice(`Moved ${idsToMove.length} ${idsToMove.length === 1 ? 'link' : 'links'} to ${targetLabel}`);
    setTimeout(() => setToastNotice(null), 3500);

    setSelectedLinkIds(prev => prev.filter(id => !idsToMove.includes(id)));
  };

  return (
    <div className="h-screen bg-[#F9FAFB] text-[#111827] dark:bg-zinc-950 dark:text-zinc-100 flex flex-col overflow-hidden transition-colors duration-150">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          selectedFolderId={selectedFolderId}
          isUnfiledOnly={isUnfiledOnly}
          onSelectAll={() => {
            setSelectedFolderId(null);
            setIsUnfiledOnly(false);
          }}
          onSelectUnfiled={() => {
            setSelectedFolderId(null);
            setIsUnfiledOnly(true);
          }}
          onSelectFolder={id => {
            setSelectedFolderId(id);
            setIsUnfiledOnly(false);
          }}
          onDropOnTarget={handleDropOnTarget}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 dark:border-zinc-800/80 pb-5">
            <div>
              {/* Back navigation button if inside a subfolder */}
              {parentFolder && (
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(parentFolder.id)}
                  className="inline-flex items-center gap-1.5 text-xs text-[#093329] dark:text-[#BCD94E] hover:underline font-medium mb-1.5 transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>Back to {parentFolder.name}</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">
                  {activeViewTitle}
                </h1>
                <span className="text-xs font-mono text-gray-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-2 py-0.5 rounded-full shadow-xs">
                  {filteredLinks.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                {selectedFolderId
                  ? 'Viewing items in this folder'
                  : isUnfiledOnly
                  ? 'Unorganized links without a folder'
                  : 'All links saved across your entire library'}
              </p>
            </div>

            {/* View Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  if (isSelectMode) setSelectedLinkIds([]);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors min-h-[38px] ${
                  isSelectMode
                    ? 'bg-[#093329] border-[#093329] text-white dark:bg-[#BCD94E] dark:border-[#BCD94E] dark:text-[#093329] dark:font-bold'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 shadow-xs'
                }`}
              >
                {isSelectMode ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>{isSelectMode ? 'Cancel Select' : 'Select'}</span>
              </button>

              {isSelectMode && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white shadow-xs"
                >
                  {selectedLinkIds.length === filteredLinks.length ? 'Deselect All' : 'Select All'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#093329] hover:bg-[#0d4739] text-white dark:bg-[#BCD94E] dark:hover:bg-[#a8c43f] dark:text-[#093329] font-semibold dark:font-bold text-xs shadow-md shadow-[#093329]/15 dark:shadow-[#BCD94E]/15 active:scale-95 transition-all min-h-[38px]"
              >
                <Plus size={15} />
                <span>Save Link</span>
              </button>
            </div>
          </div>

          {/* Subfolders Navigation Bar (if active folder has child subfolders) */}
          {currentFolder && subfolders.length > 0 && (
            <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-gray-200/90 dark:border-zinc-800/80 shadow-xs space-y-2">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <FolderIcon size={13} className="text-amber-500" />
                <span>Subfolders ({subfolders.length})</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {subfolders.map(sub => {
                  const subCount = links.filter(l => l.folder_id === sub.id).length;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedFolderId(sub.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs font-medium border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 transition-all group shadow-xs"
                    >
                      <FolderIcon size={13} className="text-amber-500 group-hover:scale-110 transition-transform" />
                      <span>{sub.name}</span>
                      <span className="text-[10px] text-gray-500 dark:text-zinc-500 bg-gray-200/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full font-mono">
                        {subCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matching Folders Search Section */}
          {matchingFolders.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 shadow-xs space-y-2">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <FolderIcon size={13} className="text-amber-500" />
                <span>Matching Folders ({matchingFolders.length})</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {matchingFolders.map(folder => {
                  const folderCount = links.filter(l => l.folder_id === folder.id).length;
                  const isCurrent = selectedFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setIsUnfiledOnly(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isCurrent
                          ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300'
                          : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700/50 shadow-xs'
                      }`}
                    >
                      <FolderIcon size={13} className="text-amber-500" />
                      <span>{folder.name}</span>
                      <span className="text-[10px] text-gray-500 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-full font-mono">
                        {folderCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Chips Bar (Reading Status) */}
          <div className="space-y-3">
            {/* Reading Status Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-gray-500 dark:text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mr-1">Status:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'to_read', label: 'To Read' },
                { id: 'reading', label: 'Reading' },
                { id: 'done', label: 'Done' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as ReadingStatus | 'all')}
                  className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap shadow-xs ${
                    statusFilter === tab.id
                      ? 'bg-[#093329] text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-sm'
                      : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredLinks.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-zinc-800 rounded-3xl bg-white/50 dark:bg-zinc-900/20">
              <Inbox size={40} className="text-gray-400 dark:text-zinc-600 mb-3" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-zinc-300">No links found</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 max-w-sm mt-1 mb-4">
                No items match your active folder, reading status, or search query.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-[#093329] hover:bg-[#0d4739] text-white dark:bg-[#BCD94E] dark:hover:bg-[#a8c43f] dark:text-[#093329] dark:font-bold text-xs font-semibold shadow-md dark:shadow-[#BCD94E]/15"
              >
                Save your first link
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLinks.map(link => (
                <LinkCard
                  key={link.id}
                  link={link}
                  isSelected={selectedLinkIds.includes(link.id)}
                  onToggleSelect={handleToggleSelect}
                  onEdit={l => setEditingLink(l)}
                  onSend={l => setSendingLink(l)}
                  onMove={l => setMovingLink(l)}
                  selectedCount={selectedLinkIds.length}
                  selectedLinkIds={selectedLinkIds}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastNotice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#093329] dark:bg-[#BCD94E] text-white dark:text-[#093329] dark:font-bold text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl shadow-[#093329]/30 dark:shadow-[#BCD94E]/30 border border-white/20 dark:border-black/10 flex items-center gap-2 animate-bounce">
          <CheckSquare size={14} />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedLinkIds}
        onClearSelection={() => setSelectedLinkIds([])}
      />

      {/* Modals */}
      <SaveLinkModal
        isOpen={showAddModal || !!editingLink}
        editLink={editingLink}
        onClose={() => {
          setShowAddModal(false);
          setEditingLink(null);
        }}
      />

      <SendLinkModal
        isOpen={!!sendingLink}
        sourceLink={sendingLink}
        onClose={() => setSendingLink(null)}
      />

      <MoveLinkModal
        isOpen={!!movingLink}
        link={movingLink}
        onClose={() => setMovingLink(null)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
