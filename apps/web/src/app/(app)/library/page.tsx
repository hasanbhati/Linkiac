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
  Tag as TagIcon,
  X,
} from 'lucide-react';

export default function LibraryPage() {
  const { links, categories, folders, tags, bulkMoveLinks } = useApp();

  // Navigation / Tree filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isUnfiledOnly, setIsUnfiledOnly] = useState(false);

  // Secondary filters
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  const [sendingLink, setSendingLink] = useState<LinkType | null>(null);
  const [movingLink, setMovingLink] = useState<LinkType | null>(null);

  // Active view header title
  const activeViewTitle = useMemo(() => {
    if (selectedFolderId) {
      const f = folders.find(folder => folder.id === selectedFolderId);
      return f ? `Folder: ${f.name}` : 'Folder';
    }
    if (selectedCategoryId) {
      const c = categories.find(cat => cat.id === selectedCategoryId);
      return c ? `Category: ${c.name}` : 'Category';
    }
    if (isUnfiledOnly) return 'Unfiled Links';
    return 'All Saved Links';
  }, [selectedFolderId, selectedCategoryId, isUnfiledOnly, folders, categories]);

  // Filter links
  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      // Tree filing filter
      if (selectedFolderId) {
        if (link.folder_id !== selectedFolderId) return false;
      } else if (selectedCategoryId) {
        if (link.category_id !== selectedCategoryId) return false;
      } else if (isUnfiledOnly) {
        if (link.category_id || link.folder_id) return false;
      }

      // Reading status filter
      if (statusFilter !== 'all' && link.reading_status !== statusFilter) {
        return false;
      }

      // Tags filter (AND semantics)
      if (selectedTagNames.length > 0) {
        const linkTagNames = new Set((link.tags || []).map(t => t.name.toLowerCase()));
        for (const reqTag of selectedTagNames) {
          if (!linkTagNames.has(reqTag.toLowerCase())) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = link.title?.toLowerCase().includes(q);
        const matchesUrl = link.url.toLowerCase().includes(q);
        const matchesComment = link.comment?.toLowerCase().includes(q);
        const matchesTags = (link.tags || []).some(t => t.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesUrl && !matchesComment && !matchesTags) return false;
      }

      return true;
    });
  }, [links, selectedFolderId, selectedCategoryId, isUnfiledOnly, statusFilter, selectedTagNames, searchQuery]);

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

  const toggleTagFilter = (tagName: string) => {
    if (selectedTagNames.includes(tagName)) {
      setSelectedTagNames(selectedTagNames.filter(t => t !== tagName));
    } else {
      setSelectedTagNames([...selectedTagNames, tagName]);
    }
  };

  // Drag and drop handler
  const handleDropOnTarget = (target: { type: 'all' | 'unfiled' | 'category' | 'folder'; id?: string }) => {
    // Moves currently selected links or dragged link
    if (selectedLinkIds.length > 0) {
      if (target.type === 'unfiled' || target.type === 'all') {
        bulkMoveLinks(selectedLinkIds, null, null);
      } else if (target.type === 'category' && target.id) {
        bulkMoveLinks(selectedLinkIds, target.id, null);
      } else if (target.type === 'folder' && target.id) {
        const folder = folders.find(f => f.id === target.id);
        bulkMoveLinks(selectedLinkIds, folder ? folder.category_id : null, target.id);
      }
      setSelectedLinkIds([]);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-24 md:pb-8">
        {/* Desktop Sidebar */}
        <Sidebar
          selectedCategoryId={selectedCategoryId}
          selectedFolderId={selectedFolderId}
          isUnfiledOnly={isUnfiledOnly}
          onSelectAll={() => {
            setSelectedCategoryId(null);
            setSelectedFolderId(null);
            setIsUnfiledOnly(false);
          }}
          onSelectUnfiled={() => {
            setSelectedCategoryId(null);
            setSelectedFolderId(null);
            setIsUnfiledOnly(true);
          }}
          onSelectCategory={id => {
            setSelectedCategoryId(id);
            setSelectedFolderId(null);
            setIsUnfiledOnly(false);
          }}
          onSelectFolder={id => {
            setSelectedFolderId(id);
            setSelectedCategoryId(null);
            setIsUnfiledOnly(false);
          }}
          onDropOnTarget={handleDropOnTarget}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                  {activeViewTitle}
                </h1>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                  {filteredLinks.length}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {selectedFolderId
                  ? 'Viewing items in this folder'
                  : selectedCategoryId
                  ? 'Viewing items categorized under this group'
                  : isUnfiledOnly
                  ? 'Unorganized links without a folder or category'
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
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {isSelectMode ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>{isSelectMode ? 'Cancel Select' : 'Select'}</span>
              </button>

              {isSelectMode && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
                >
                  {selectedLinkIds.length === filteredLinks.length ? 'Deselect All' : 'Select All'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all min-h-[38px]"
              >
                <Plus size={15} />
                <span>Save Link</span>
              </button>
            </div>
          </div>

          {/* Filter Chips Bar (Reading Status & Tags) */}
          <div className="space-y-3">
            {/* Reading Status Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mr-1">Status:</span>
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
                  className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tag Filters */}
            {tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mr-1">Tags:</span>
                {tags.map(t => {
                  const isSelected = selectedTagNames.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTagFilter(t.name)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-medium shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <TagIcon size={11} className={isSelected ? 'text-white' : 'text-zinc-500'} />
                      <span>{t.name}</span>
                      {isSelected && <X size={12} className="ml-0.5 hover:opacity-80" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cards Grid */}
          {filteredLinks.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
              <Inbox size={40} className="text-zinc-600 mb-3" />
              <h3 className="text-base font-semibold text-zinc-300">No links found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
                No items match your active folder, reading status, or search query.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
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
                />
              ))}
            </div>
          )}
        </main>
      </div>

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
