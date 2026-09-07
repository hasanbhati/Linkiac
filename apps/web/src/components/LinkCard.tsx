'use client';

import React, { useState } from 'react';
import { Link as LinkType, ReadingStatus, isSafeWebUrl, ensureUrlProtocol } from '@linkiac/shared';
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
  Tag as TagIcon,
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
}

export function LinkCard({
  link,
  isSelected,
  onToggleSelect,
  onEdit,
  onSend,
  onMove,
}: LinkCardProps) {
  const { updateLink, deleteLink } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isSafe = isSafeWebUrl(link.url);
  const clickableUrl = isSafe ? ensureUrlProtocol(link.url) : null;

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
      icon: <BookOpen size={12} className="text-indigo-400" />,
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
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
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
        isSelected
          ? 'bg-zinc-900 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
          : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700/80 shadow-md'
      }`}
    >
      {/* Checkbox for Bulk Selection */}
      <div className="absolute top-3 left-3 z-20">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleSelect(link.id);
          }}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-indigo-600 text-white'
              : 'bg-zinc-950/80 backdrop-blur-md border border-white/20 text-transparent hover:border-white/50 group-hover:block'
          }`}
          title="Select link"
        >
          <Check size={14} className={isSelected ? 'block' : 'opacity-0 group-hover:opacity-60'} />
        </button>
      </div>

      {/* Thumbnail Focal Point */}
      <div className="relative w-full h-44 bg-zinc-950/90 overflow-hidden">
        {link.thumbnail_url && !imageError ? (
          <img
            src={link.thumbnail_url}
            alt={link.title || 'Link preview thumbnail'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-900 to-zinc-950">
            <Globe size={32} className="text-zinc-700 mb-2" />
            <span className="text-xs text-zinc-500 font-mono line-clamp-1 max-w-[80%]">
              {link.domain || 'Note / Raw Text'}
            </span>
          </div>
        )}

        {/* Status Pill on Thumbnail */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <div className="relative">
            <button
              type="button"
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
              <div className="absolute left-0 bottom-full mb-1.5 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-30">
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
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white text-left"
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
              onClick={e => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-7 h-7 rounded-lg bg-zinc-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <MoreVertical size={15} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-30 animate-fade-in text-xs">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onSend(link);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white text-left"
                >
                  <Send size={14} className="text-indigo-400" />
                  <span>Send to Friend</span>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onMove(link);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white text-left"
                >
                  <FolderInput size={14} className="text-amber-400" />
                  <span>Move to Folder...</span>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit(link);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white text-left"
                >
                  <Edit2 size={14} className="text-zinc-400" />
                  <span>Edit Link</span>
                </button>
                <div className="my-1 border-t border-zinc-800/80" />
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    if (confirm('Delete this link from your library?')) {
                      deleteLink(link.id);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:bg-red-500/10 text-left"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title or Raw text */}
          <h3 className="font-semibold text-zinc-100 text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-indigo-300 transition-colors">
            {link.title || link.url}
          </h3>

          {/* Safe Web URL or Free Text */}
          {isSafe && clickableUrl ? (
            <a
              href={clickableUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-indigo-400 font-mono truncate max-w-full mb-2 transition-colors"
            >
              <span className="truncate">{link.url}</span>
              <ExternalLink size={11} className="flex-shrink-0" />
            </a>
          ) : (
            <p className="text-xs text-zinc-500 font-mono truncate mb-2 select-text" title={link.url}>
              {link.url}
            </p>
          )}

          {/* Personal Comment */}
          {link.comment && (
            <p className="text-xs text-zinc-400 italic line-clamp-2 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/60 mb-3">
              &quot;{link.comment}&quot;
            </p>
          )}
        </div>

        {/* Tag chips */}
        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 mt-auto border-t border-zinc-800/60">
            {link.tags.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700/40 font-medium"
              >
                <TagIcon size={10} className="text-zinc-500" />
                <span>{tag.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
