'use client';

import React, { useState } from 'react';
import { Link as LinkType, ReadingStatus, isSafeWebUrl, ensureUrlProtocol, extractDefaultThumbnail } from '@linkiac/shared';
import {
  ExternalLink,
  MoreVertical,
  Send,
  FolderInput,
  Trash2,
  Edit2,
  CheckCircle2,
  BookOpen,
  Clock,
  Globe,
  Check,
} from 'lucide-react';
import { useApp } from '@/lib/app-context';

interface LinkCardProps {
  link: LinkType;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (link: LinkType) => void;
  onSend: (link: LinkType) => void;
  onMove: (link: LinkType) => void;
  selectedCount?: number;
  selectedLinkIds?: string[];
}

export function LinkCard({
  link,
  isSelected,
  onToggleSelect,
  onEdit,
  onSend,
  onMove,
  selectedCount = 0,
  selectedLinkIds = [],
}: LinkCardProps) {
  const { updateLink, deleteLink } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isSafe = isSafeWebUrl(link.url);
  const clickableUrl = isSafe ? ensureUrlProtocol(link.url) : null;

  const handleDragStart = (e: React.DragEvent) => {
    if (showMenu || showStatusMenu) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    const idsToMove = isSelected && selectedLinkIds.length > 0 ? selectedLinkIds : [link.id];
    e.dataTransfer.setData('text/plain', link.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ linkIds: idsToMove }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleStatusChange = (status: ReadingStatus) => {
    updateLink(link.id, { reading_status: status });
    setShowStatusMenu(false);
  };

  const statusConfig = {
    to_read: {
      label: 'To Read',
      icon: <Clock size={12} className="text-amber-400" />,
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    reading: {
      label: 'Reading',
      icon: <BookOpen size={12} className="text-sky-400" />,
      badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    },
    done: {
      label: 'Done',
      icon: <CheckCircle2 size={12} className="text-emerald-400" />,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
  };

  const currentStatus = statusConfig[link.reading_status] || statusConfig.to_read;

  return (
    <div
      draggable={!showMenu && !showStatusMenu}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40 scale-[0.98] border-dashed border-[#093329] dark:border-[#BCD94E] shadow-2xl' : ''
      } ${
        isSelected
          ? 'bg-white dark:bg-zinc-900 border-[#093329] dark:border-[#BCD94E] shadow-lg shadow-[#093329]/10 dark:shadow-[#BCD94E]/10 ring-2 ring-[#093329]/20 dark:ring-[#BCD94E]/30'
          : 'bg-white dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-900 border-gray-200/90 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700/80 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Multi-Item Dragging Badge */}
      {isDragging && isSelected && selectedCount > 1 && (
        <div className="absolute top-2 right-2 z-30 bg-[#093329] dark:bg-[#BCD94E] text-white dark:text-[#093329] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xl border border-white/20 animate-pulse">
          Moving {selectedCount} items
        </div>
      )}
      {/* Checkbox for Bulk Selection */}
      <div className="absolute top-3 left-3 z-20">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleSelect(link.id);
          }}
          aria-label={isSelected ? `Deselect ${link.title || 'link'}` : `Select ${link.title || 'link'}`}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-[#093329] text-white dark:bg-[#BCD94E] dark:text-[#093329]'
              : 'bg-white/85 dark:bg-zinc-950/80 backdrop-blur-md border border-gray-300 dark:border-white/20 text-transparent hover:border-gray-500 group-hover:block shadow-sm'
          }`}
          title="Select link"
        >
          <Check size={14} className={isSelected ? 'block' : 'opacity-0 group-hover:opacity-60'} />
        </button>
      </div>

      {/* Thumbnail Focal Point */}
      {(() => {
        const effectiveThumbnail = link.thumbnail_url || extractDefaultThumbnail(link.url);
        return (
          <div className="relative w-full h-44 bg-gray-100 dark:bg-zinc-950/90 overflow-hidden">
            {effectiveThumbnail && !imageError ? (
              effectiveThumbnail.includes('google.com/s2/favicons') ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900/60 p-6">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                    <img
                      src={effectiveThumbnail}
                      alt={link.title || link.url}
                      className="w-8 h-8 object-contain"
                      onError={() => setImageError(true)}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 dark:text-zinc-500 truncate max-w-full">
                    {new URL(ensureUrlProtocol(link.url)).hostname}
                  </span>
                </div>
              ) : (
                <img
                  src={effectiveThumbnail}
                  alt={link.title || link.url}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={() => setImageError(true)}
                />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-950 text-gray-400 dark:text-zinc-600">
                <Globe size={32} className="opacity-40 mb-1.5" />
                <span className="text-[11px] font-mono opacity-60">
                  {isSafeWebUrl(link.url) ? new URL(ensureUrlProtocol(link.url)).hostname : 'Note'}
                </span>
              </div>
            )}

            {/* Status Pill on Thumbnail */}
            <div className="absolute bottom-2.5 left-2.5 z-10">
          <div className="relative">
            <button
              type="button"
              aria-label={`Change reading status: currently ${currentStatus.label}`}
              aria-haspopup="menu"
              aria-expanded={showStatusMenu}
              onClick={e => {
                e.stopPropagation();
                setShowStatusMenu(!showStatusMenu);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-transform active:scale-95 ${currentStatus.badgeClass}`}
            >
              {currentStatus.icon}
              <span>{currentStatus.label}</span>
            </button>

            {showStatusMenu && (
              <div className="absolute left-0 bottom-full mb-1.5 w-32 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl dark:shadow-2xl py-1 z-30">
                {(['to_read', 'reading', 'done'] as ReadingStatus[]).map(statusKey => {
                  const item = statusConfig[statusKey];
                  return (
                    <button
                      key={statusKey}
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleStatusChange(statusKey);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/80 hover:text-gray-900 dark:hover:text-white text-left"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Card Actions Trigger */}
        <div className="absolute top-3 right-3 z-20">
          <div className="relative">
            <button
              type="button"
              aria-label={`More options for ${link.title || link.url}`}
              aria-haspopup="menu"
              aria-expanded={showMenu}
              onClick={e => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-7 h-7 rounded-lg bg-white/85 dark:bg-zinc-950/80 backdrop-blur-md border border-gray-300 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white shadow-sm transition-colors"
            >
              <MoreVertical size={15} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl dark:shadow-2xl py-1 z-30 animate-fade-in text-xs">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onSend(link);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white text-left"
                >
                  <Send size={14} className="text-[#093329] dark:text-[#BCD94E]" />
                  <span>Send to Friend</span>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onMove(link);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white text-left"
                >
                  <FolderInput size={14} className="text-amber-500" />
                  <span>Move to Folder...</span>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit(link);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white text-left"
                >
                  <Edit2 size={14} className="text-gray-500 dark:text-zinc-400" />
                  <span>Edit Link</span>
                </button>
                <div className="my-1 border-t border-gray-100 dark:border-zinc-800/80" />
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    if (confirm('Delete this link from your library?')) {
                      deleteLink(link.id);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-left"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  })()}

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title or Raw text */}
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-[#093329] dark:group-hover:text-[#BCD94E] transition-colors">
            {link.title || link.url}
          </h3>

          {/* Safe Web URL or Free Text */}
          {isSafe && clickableUrl ? (
            <a
              href={clickableUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500 hover:text-[#093329] dark:hover:text-[#BCD94E] font-mono truncate max-w-full mb-2 transition-colors"
            >
              <span className="truncate">{link.url}</span>
              <ExternalLink size={11} className="flex-shrink-0" />
            </a>
          ) : (
            <p className="text-xs text-gray-500 dark:text-zinc-500 font-mono truncate mb-2 select-text" title={link.url}>
              {link.url}
            </p>
          )}

          {/* Personal Comment */}
          {link.comment && (
            <p className="text-xs text-gray-600 dark:text-zinc-400 italic line-clamp-2 bg-gray-50 dark:bg-zinc-950/50 p-2 rounded-lg border border-gray-200/80 dark:border-zinc-800/60 mb-2">
              &quot;{link.comment}&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
