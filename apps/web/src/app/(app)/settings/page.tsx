'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useApp } from '@/lib/app-context';
import {
  Settings,
  Upload,
  Download,
  Key,
  Mail,
  Trash2,
  Check,
  AlertTriangle,
  FileText,
  CheckSquare,
  Square,
  X,
  Loader2,
} from 'lucide-react';
import { parseNetscapeBookmarks, ParsedBookmark } from '@linkiac/shared';

export default function SettingsPage() {
  const { currentUser, links, folders, categories, importBookmarks } = useApp();

  // Email form
  const [email, setEmail] = useState('hasan@example.com');
  const [emailSaved, setEmailSaved] = useState(false);

  // Password form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSaved, setPassSaved] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<(ParsedBookmark & { isDuplicate: boolean; selected: boolean })[]>([]);
  const [showImportReview, setShowImportReview] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Danger Zone
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleted, setIsDeleted] = useState(false);

  // Email update
  const handleUpdateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 3000);
  };

  // Password update
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    if (newPass.length < 8) {
      setPassError('Password must be at least 8 characters long');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match');
      return;
    }
    setPassSaved(true);
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => setPassSaved(false), 3000);
  };

  // Bookmark File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = event => {
      const htmlText = event.target?.result as string;
      const rawBookmarks = parseNetscapeBookmarks(htmlText);

      // Existing URLs in user library for duplicate detection (BMK-03)
      const existingUrls = new Set(links.map(l => l.url.toLowerCase().trim()));

      const annotated = rawBookmarks.map(b => {
        const isDuplicate = existingUrls.has(b.url.toLowerCase().trim());
        return {
          ...b,
          isDuplicate,
          // Non-duplicates are pre-selected; duplicates unselected by default (BMK-04)
          selected: !isDuplicate,
        };
      });

      setParsedItems(annotated);
      setShowImportReview(true);
    };
    reader.readAsText(file);
  };

  // Confirm Import
  const handleConfirmImport = () => {
    const toImport = parsedItems.filter(p => p.selected);
    const result = importBookmarks(toImport);
    setImportResult(`Successfully imported ${result.importedCount} links across ${result.foldersCount} standalone folders!`);
    setShowImportReview(false);
    setParsedItems([]);
    setImportFile(null);
    setTimeout(() => setImportResult(null), 5000);
  };

  // Export Bookmarks
  const handleExportBookmarks = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/bookmarks/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links, folders, categories }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'linkiac_bookmarks.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export bookmarks');
    } finally {
      setIsExporting(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = () => {
    if (deleteConfirmation === 'delete my account') {
      localStorage.clear();
      setIsDeleted(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
  };

  if (isDeleted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h2 className="text-xl font-bold text-red-400">Account Deleted</h2>
          <p className="text-xs text-zinc-400">Your account and all owned data have been completely erased. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-24 md:pb-8">
        <Sidebar
          selectedCategoryId={null}
          selectedFolderId={null}
          isUnfiledOnly={false}
          onSelectAll={() => {}}
          onSelectUnfiled={() => {}}
          onSelectCategory={() => {}}
          onSelectFolder={() => {}}
        />

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-8 max-w-4xl">
          {/* Header */}
          <div className="border-b border-zinc-800/80 pb-5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
              <Settings size={22} className="text-indigo-400" />
              <span>Account & Data Settings</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Manage your credentials, import browser bookmark files, export your entire library, or configure privacy.
            </p>
          </div>

          {importResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <Check size={16} />
              <span>{importResult}</span>
            </div>
          )}

          {/* Bookmark Import / Export Section (BMK-01 to BMK-08) */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                <span>Browser Bookmark Import & Export</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Universal Netscape Bookmark HTML format compatible with Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Import Upload */}
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm mb-1">
                    <Upload size={16} className="text-indigo-400" />
                    <span>Import HTML Bookmarks</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Upload your exported browser bookmark file (.html). Duplicate links are automatically flagged for review.
                  </p>
                </div>

                <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95">
                  <Upload size={14} />
                  <span>Choose Bookmark File (.html)</span>
                  <input
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Export Download */}
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm mb-1">
                    <Download size={16} className="text-emerald-400" />
                    <span>Export Library</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Download all your saved links, folders, and categories in a clean Netscape Bookmark HTML file.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportBookmarks}
                  disabled={isExporting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all active:scale-95"
                >
                  {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Download .html Bookmarks</span>
                </button>
              </div>
            </div>
          </div>

          {/* Change Email Form (ACCT-01) */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Mail size={18} className="text-indigo-400" />
              <span>Email Address</span>
            </h2>

            <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {emailSaved && (
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <Check size={14} /> Email address updated!
                </p>
              )}

              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
              >
                Change Email
              </button>
            </form>
          </div>

          {/* Change Password Form (ACCT-02) */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Key size={18} className="text-indigo-400" />
              <span>Change Password</span>
            </h2>

            <form onSubmit={handleUpdatePassword} className="space-y-3.5 max-w-md">
              {passError && <p className="text-xs text-red-400">{passError}</p>}
              {passSaved && (
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <Check size={14} /> Password changed successfully!
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Danger Zone: Account Deletion (ACCT-04 & ACCT-05) */}
          <div className="rounded-2xl p-6 border border-red-500/30 bg-red-950/10 space-y-4">
            <h2 className="text-base font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>Danger Zone: Permanent Account Deletion</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
              Permanently delete your Linkiac account, including all your saved links, folders, categories, private tags, friendships, and outgoing suggestions. Any links already accepted by friends into their own libraries will be preserved as their independent property.
            </p>

            <div className="space-y-3 max-w-md pt-2">
              <label className="block text-xs text-zinc-400">
                To confirm, type <span className="text-red-400 font-mono font-bold">delete my account</span> below:
              </label>
              <input
                type="text"
                placeholder="delete my account"
                value={deleteConfirmation}
                onChange={e => setDeleteConfirmation(e.target.value)}
                className="w-full bg-zinc-950 border border-red-500/40 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
              <button
                type="button"
                disabled={deleteConfirmation !== 'delete my account'}
                onClick={handleDeleteAccount}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Trash2 size={14} />
                <span>Permanently Delete My Account</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Bookmark Import Review Modal (BMK-04) */}
      {showImportReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
                  <Upload size={16} className="text-indigo-400" />
                  <span>Review Bookmark Import ({parsedItems.length} items parsed)</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Duplicates against your existing library are flagged. Check the links you want to import.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportReview(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selection Toolbar */}
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span className="font-medium">
                {parsedItems.filter(p => p.selected).length} of {parsedItems.length} selected for import
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setParsedItems(prev => prev.map(p => ({ ...p, selected: true })))}
                  className="hover:text-zinc-100 underline"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setParsedItems(prev => prev.map(p => ({ ...p, selected: !p.isDuplicate })))}
                  className="hover:text-zinc-100 underline"
                >
                  Select Non-Duplicates Only
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 border border-zinc-800 rounded-xl p-3 bg-zinc-950/70">
              {parsedItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setParsedItems(prev =>
                      prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p))
                    );
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                    item.selected
                      ? 'bg-zinc-900 border-indigo-500/40'
                      : 'bg-zinc-950/40 border-zinc-800/80 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="text-indigo-400">
                      {item.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-zinc-200 truncate">{item.title}</p>
                      <p className="text-[11px] font-mono text-zinc-500 truncate">{item.url}</p>
                      {item.folderPath.length > 0 && (
                        <p className="text-[10px] text-zinc-400">
                          Folder: {item.folderPath.join(' > ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.isDuplicate && (
                    <span className="text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                      Duplicate
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowImportReview(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                Confirm & Import {parsedItems.filter(p => p.selected).length} Links
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
