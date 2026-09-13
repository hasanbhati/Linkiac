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
  CheckSquare,
  Square,
  Plus,
  Inbox,
  Folder as FolderIcon,
  FolderPlus,
  X,
  ArrowLeft,
  ChevronRight,
  Search,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';

export default function LibraryPage() {
  const { links, folders, addFolder, bulkMoveLinks } = useApp();

  // Navigation / Tree filter state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isUnfiledOnly, setIsUnfiledOnly] = useState(false);
  const [mobileTab, setMobileTab] = useState<'all' | 'unfiled' | 'folders'>('all');

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
  const [showActivatedBanner, setShowActivatedBanner] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('activated') === 'true' || searchParams.get('verified') === 'true') {
        setShowActivatedBanner(true);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, []);

  // Folder creation modal state (for mobile & desktop)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  // Root folders (top level without parent)
  const rootFolders = useMemo(() => {
    return folders.filter(f => f.parent_folder_id === null);
  }, [folders]);

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

  // Active view header title (for desktop)
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

  // Unfiled count
  const unfiledCount = useMemo(() => {
    return links.filter(l => !l.folder_id).length;
  }, [links]);

  // Filter links
  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      // Tree filing filter
      if (selectedFolderId) {
        if (link.folder_id !== selectedFolderId) return false;
      } else if (isUnfiledOnly) {
        if (link.folder_id) return false;
      }

      // Reading status filter (only active if not 'all')
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
      bulkMoveLinks(idsToMove, null);
      targetLabel = target.type === 'all' ? 'All Links (Unfiled)' : 'Unfiled';
    } else if (target.type === 'folder' && target.id) {
      const folder = folders.find(f => f.id === target.id);
      bulkMoveLinks(idsToMove, target.id);
      targetLabel = folder ? `Folder "${folder.name}"` : 'Folder';
    }

    setToastNotice(`Moved ${idsToMove.length} ${idsToMove.length === 1 ? 'link' : 'links'} to ${targetLabel}`);
    setTimeout(() => setToastNotice(null), 3500);

    setSelectedLinkIds(prev => prev.filter(id => !idsToMove.includes(id)));
  };

  // Folder creation handler
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const created = addFolder(newFolderName.trim(), newFolderParentId);
    setNewFolderName('');
    setNewFolderParentId(null);
    setShowCreateFolderModal(false);
    setSelectedFolderId(created.id);
    setIsUnfiledOnly(false);
    setMobileTab('folders');
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
            setMobileTab('all');
          }}
          onSelectUnfiled={() => {
            setSelectedFolderId(null);
            setIsUnfiledOnly(true);
            setMobileTab('unfiled');
          }}
          onSelectFolder={id => {
            setSelectedFolderId(id);
            setIsUnfiledOnly(false);
            setMobileTab('folders');
          }}
          onDropOnTarget={handleDropOnTarget}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-8 pb-28 md:pb-8 overflow-y-auto space-y-4 md:space-y-6">
          {/* Account Activated Success Banner */}
          {showActivatedBanner && (
            <div
              role="status"
              className="relative overflow-hidden rounded-2xl bg-[#093329] dark:bg-[#152414] border border-[#BCD94E]/40 text-white p-4 sm:p-4.5 shadow-lg shadow-[#093329]/10 dark:shadow-[#BCD94E]/5 animate-fade-in flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3 sm:gap-3.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#BCD94E] text-[#093329] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <CheckCircle2 size={18} className="stroke-[2.5]" />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold text-white dark:text-[#BCD94E]">
                      Your account was activated successfully!
                    </h2>
                    <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#BCD94E]/20 text-[#BCD94E] border border-[#BCD94E]/30 hidden sm:inline-block">
                      Verified
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-emerald-100/80 dark:text-zinc-300 leading-relaxed max-w-xl">
                    Welcome to Linkiac! Your email has been confirmed and your library is ready. Start saving and organizing your links.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActivatedBanner(false)}
                className="p-1.5 rounded-lg text-emerald-200/70 hover:text-white dark:text-zinc-400 dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5 transition-colors shrink-0"
                aria-label="Close message"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* MOBILE VIEW CONTROLS (md:hidden - Matches Mobile App UI/UX) */}
          {/* ========================================================= */}
          <div className="md:hidden space-y-3">
            {/* 1. Mobile Header Row (Title & Select Button) */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Library
              </h1>
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  if (isSelectMode) setSelectedLinkIds([]);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  isSelectMode
                    ? 'bg-[#093329] border-[#093329] text-white dark:bg-[#BCD94E] dark:border-[#BCD94E] dark:text-[#093329]'
                    : 'bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-zinc-300 shadow-xs'
                }`}
              >
                {isSelectMode ? 'Done' : 'Select'}
              </button>
            </div>

            {/* 2. Mobile Search Bar */}
            <div className="relative flex items-center bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#27272a] rounded-2xl px-3 py-2 shadow-xs">
              <Search size={16} className="text-gray-400 dark:text-zinc-500 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search links, notes, or folders..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white ml-2 flex-shrink-0 font-medium"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {/* 3. Matching Folders Strip (from Search) */}
            {matchingFolders.length > 0 && (
              <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-2xl p-2.5 space-y-1.5 shadow-xs">
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                  MATCHING FOLDERS ({matchingFolders.length}):
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {matchingFolders.map(mf => (
                    <button
                      key={mf.id}
                      type="button"
                      onClick={() => {
                        setMobileTab('folders');
                        setSelectedFolderId(mf.id);
                        setIsUnfiledOnly(false);
                        setSearchQuery('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-800 dark:text-zinc-200 text-xs font-medium whitespace-nowrap"
                    >
                      <FolderIcon size={12} className="text-amber-500" />
                      <span>{mf.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Top Tab Filter Switcher (All links | Unfiled | Folders) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setMobileTab('all');
                  setSelectedFolderId(null);
                  setIsUnfiledOnly(false);
                }}
                className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  mobileTab === 'all'
                    ? 'bg-[#093329] border-[#093329] text-white dark:bg-[#BCD94E] dark:border-[#BCD94E] dark:text-[#093329] font-bold shadow-xs'
                    : 'bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#27272a] text-gray-600 dark:text-zinc-400'
                }`}
              >
                All links ({links.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileTab('unfiled');
                  setSelectedFolderId(null);
                  setIsUnfiledOnly(true);
                }}
                className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  mobileTab === 'unfiled'
                    ? 'bg-[#093329] border-[#093329] text-white dark:bg-[#BCD94E] dark:border-[#BCD94E] dark:text-[#093329] font-bold shadow-xs'
                    : 'bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#27272a] text-gray-600 dark:text-zinc-400'
                }`}
              >
                Unfiled ({unfiledCount})
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileTab('folders');
                  setIsUnfiledOnly(false);
                  if (!selectedFolderId && rootFolders.length > 0) {
                    setSelectedFolderId(rootFolders[0].id);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  mobileTab === 'folders'
                    ? 'bg-[#093329] border-[#093329] text-white dark:bg-[#BCD94E] dark:border-[#BCD94E] dark:text-[#093329] font-bold shadow-xs'
                    : 'bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#27272a] text-gray-600 dark:text-zinc-400'
                }`}
              >
                <FolderIcon
                  size={13}
                  className={mobileTab === 'folders' ? 'text-white dark:text-[#093329]' : 'text-amber-500'}
                />
                <span>Folders ({folders.length})</span>
              </button>
            </div>

            {/* 5. Horizontal Folder Chips Bar (when Folders tab is active) */}
            {mobileTab === 'folders' && (
              <div className="bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#27272a] rounded-2xl p-2 shadow-xs">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {/* + Folder button */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewFolderParentId(selectedFolderId || null);
                      setShowCreateFolderModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#1c1917] border border-gray-300 dark:border-[#3f3f46] text-gray-700 dark:text-zinc-300 text-xs font-semibold whitespace-nowrap hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <FolderPlus size={13} className="text-gray-500 dark:text-zinc-400" />
                    <span>+ Folder</span>
                  </button>

                  {/* Root folder chips */}
                  {rootFolders.map(rf => {
                    const isSelected = selectedFolderId === rf.id || currentFolder?.parent_folder_id === rf.id;
                    const fCount = links.filter(l => l.folder_id === rf.id).length;
                    return (
                      <button
                        key={rf.id}
                        type="button"
                        onClick={() => setSelectedFolderId(rf.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-300 font-semibold'
                            : 'bg-gray-50 dark:bg-[#1f1f23] border-gray-200 dark:border-[#2e2e34] text-gray-700 dark:text-zinc-400'
                        }`}
                      >
                        <FolderIcon size={13} className="text-amber-500" />
                        <span>{rf.name} ({fCount})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. Active Folder Navigation (Back button & Subfolders) */}
            {mobileTab === 'folders' && currentFolder && (parentFolder || subfolders.length > 0) && (
              <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-2xl p-3 space-y-2 shadow-xs">
                {parentFolder && (
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(parentFolder.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#093329] dark:text-[#BCD94E] font-semibold hover:underline"
                  >
                    <ArrowLeft size={13} />
                    <span>Back to {parentFolder.name}</span>
                  </button>
                )}

                {subfolders.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-[#27272a]">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                      SUBFOLDERS ({subfolders.length})
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {subfolders.map(sub => {
                        const subCount = links.filter(l => l.folder_id === sub.id).length;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setSelectedFolderId(sub.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] text-gray-800 dark:text-zinc-200 text-xs font-medium whitespace-nowrap"
                          >
                            <FolderIcon size={13} className="text-amber-500" />
                            <span>{sub.name}</span>
                            <span className="text-[10px] text-gray-500 dark:text-zinc-500">({subCount})</span>
                            <ChevronRight size={11} className="text-gray-400 dark:text-zinc-500" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* DESKTOP TOP CONTROL BAR (hidden md:flex) */}
          {/* ========================================================= */}
          <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 dark:border-zinc-800/80 pb-5">
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

          {/* Desktop Subfolders Navigation Bar */}
          {currentFolder && subfolders.length > 0 && (
            <div className="hidden md:block p-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-gray-200/90 dark:border-zinc-800/80 shadow-xs space-y-2">
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

          {/* Desktop Matching Folders Search Section */}
          {matchingFolders.length > 0 && (
            <div className="hidden md:block p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 shadow-xs space-y-2">
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

          {/* Desktop Reading Status Filter */}
          <div className="hidden md:block space-y-3">
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

          {/* Cards Grid / Empty State */}
          {filteredLinks.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-zinc-800/80 rounded-3xl bg-white/40 dark:bg-zinc-900/20 px-4">
              <BookOpen size={48} className="text-gray-300 dark:text-zinc-600 mb-3" />
              <h3 className="text-base font-bold text-gray-800 dark:text-zinc-200">No items found</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 max-w-sm mt-1 mb-4">
                Tap the + button below to save a link or note!
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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

      {/* ========================================================= */}
      {/* MOBILE FLOATING ACTION BUTTON (+) (md:hidden) */}
      {/* ========================================================= */}
      {!isSelectMode && (
        <button
          type="button"
          aria-label="Save link or note"
          onClick={() => setShowAddModal(true)}
          className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-[#BCD94E] hover:bg-[#a8c43f] text-[#093329] shadow-xl shadow-[#BCD94E]/25 border border-[#BCD94E]/40 flex items-center justify-center z-40 active:scale-95 transition-transform"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

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

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27272a] pb-3">
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                <FolderIcon size={16} className="text-amber-500" />
                <span>Create New Folder</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateFolderModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Design, Reading, Work..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#093329]/20 dark:focus:ring-[#BCD94E]/30"
                />
              </div>

              {folders.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                    Nest Under Parent Folder (Optional)
                  </label>
                  <select
                    value={newFolderParentId || ''}
                    onChange={e => setNewFolderParentId(e.target.value || null)}
                    className="w-full bg-white dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-xl px-3.5 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="">Root Level (No parent)</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#093329] dark:bg-[#BCD94E] text-white dark:text-[#093329] disabled:opacity-50 transition-all"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
