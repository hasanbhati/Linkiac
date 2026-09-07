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
  User,
  Camera,
} from 'lucide-react';
import { parseNetscapeBookmarks, ParsedBookmark } from '@linkiac/shared';
import { getSupabase } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { currentUser, links, folders, categories, importBookmarks, syncAllFromSupabase } = useApp();

  // Profile & Username State
  const [username, setUsername] = useState(currentUser?.username || '');
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Email form
  const [email, setEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Password form
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSaved, setPassSaved] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<(ParsedBookmark & { isDuplicate: boolean; selected: boolean })[]>([]);
  const [showImportReview, setShowImportReview] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Danger Zone
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  // Hydrate email from Supabase Auth
  React.useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const { data: { user } } = await getSupabase().auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        }
      } catch (err) {
        console.warn('Failed to load user email:', err);
      }
    };
    fetchUserEmail();
  }, []);

  // Sync profile state when currentUser loads or changes
  React.useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setDisplayName(currentUser.display_name || '');
      setAvatarUrl(currentUser.avatar_url || '');
    }
  }, [currentUser]);

  // Handle Profile Update (Username, Display Name, Avatar URL)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      setProfileError('Username must be at least 3 characters (letters, numbers, underscores).');
      return;
    }

    setProfileLoading(true);
    try {
      const supabase = getSupabase();

      // Check if another user already has this username
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', currentUser.id)
        .maybeSingle();

      if (existing) {
        setProfileError(`Username @${cleanUsername} is already taken. Please choose another.`);
        setProfileLoading(false);
        return;
      }

      // Update public.profiles
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          username: cleanUsername,
          display_name: displayName.trim() || cleanUsername,
          avatar_url: avatarUrl.trim() || null,
        })
        .eq('id', currentUser.id);

      if (profileErr) throw profileErr;

      // Update Supabase auth user metadata so session reflects new username & name
      await supabase.auth.updateUser({
        data: {
          username: cleanUsername,
          full_name: displayName.trim() || cleanUsername,
          avatar_url: avatarUrl.trim() || null,
        },
      });

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 4000);
      await syncAllFromSupabase();
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Upload Avatar File
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setAvatarError('Image file must be under 3MB.');
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      const supabase = getSupabase();
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${currentUser.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadErr) {
        console.warn('Avatar upload error:', uploadErr);
        throw new Error(uploadErr.message || 'Could not upload to storage');
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(publicUrl);

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      await syncAllFromSupabase();
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload avatar image.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Remove Avatar
  const handleRemoveAvatar = async () => {
    setAvatarUrl('');
    try {
      const supabase = getSupabase();
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', currentUser.id);
      await supabase.auth.updateUser({ data: { avatar_url: null } });
      await syncAllFromSupabase();
    } catch (err) {
      console.warn('Remove avatar error:', err);
    }
  };

  // Email update
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSaved(false);
    setEmailLoading(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) {
        setEmailError(error.message);
      } else {
        setEmailSaved(true);
        setTimeout(() => setEmailSaved(false), 5000);
      }
    } catch (err: any) {
      setEmailError(err.message || 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  // Password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSaved(false);

    if (newPass.length < 8) {
      setPassError('Password must be at least 8 characters long');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match');
      return;
    }

    setPassLoading(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        setPassError(error.message);
      } else {
        setPassSaved(true);
        setNewPass('');
        setConfirmPass('');
        setTimeout(() => setPassSaved(false), 4000);
      }
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setPassLoading(false);
    }
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
  const handleConfirmImport = async () => {
    const toImport = parsedItems.filter(p => p.selected);
    const result = await importBookmarks(toImport);
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

  // Delete Account (ACCT-04)
  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim().toLowerCase() !== 'delete my account') {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const supabase = getSupabase();
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) {
        // Fallback: delete profile record directly which cascades to user's links, folders, etc.
        const { error: profileErr } = await supabase
          .from('profiles')
          .delete()
          .eq('id', currentUser.id);

        if (profileErr) {
          throw new Error(rpcError.message || profileErr.message);
        }
      }

      await supabase.auth.signOut({ scope: 'global' });
      try {
        localStorage.clear();
      } catch {}
      setIsDeleted(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
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

          {/* Public Profile & Username Section */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <User size={18} className="text-indigo-400" />
                <span>Public Profile & Username</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Your username is unique and visible to friends when discovering and exchanging link recommendations.
              </p>
            </div>

            {profileError && (
              <p className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                {profileError}
              </p>
            )}
            {profileSaved && (
              <p className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-1.5">
                <Check size={14} /> Profile and username saved successfully!
              </p>
            )}

            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-5 border-b border-zinc-800/80">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-indigo-950/80 border-2 border-zinc-700 flex items-center justify-center shadow-lg">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    <User size={36} className="text-indigo-400" />
                  )}
                </div>
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95">
                    <Camera size={14} />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileSelect}
                      className="hidden"
                    />
                  </label>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Upload an image from your device (PNG, JPG, or WebP up to 3MB) or enter an image URL below.
                </p>
                {avatarError && <p className="text-[11px] text-red-400 font-medium">{avatarError}</p>}
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    minLength={3}
                    placeholder="your_username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  At least 3 characters. Letters, numbers, and underscores only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Curator"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Avatar Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {profileLoading && <Loader2 size={12} className="animate-spin" />}
                <span>Save Profile Changes</span>
              </button>
            </form>
          </div>

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
              {emailError && <p className="text-xs text-red-400">{emailError}</p>}
              {emailSaved && (
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <Check size={14} /> Confirmation email sent to new address! Please check your inbox.
                </p>
              )}

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

              <button
                type="submit"
                disabled={emailLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {emailLoading && <Loader2 size={12} className="animate-spin" />}
                <span>Change Email</span>
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
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
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
                  minLength={8}
                  placeholder="••••••••"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {passLoading && <Loader2 size={12} className="animate-spin" />}
                <span>Update Password</span>
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

            {deleteError && (
              <p className="text-xs text-red-400 font-medium">{deleteError}</p>
            )}

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
                disabled={deleteConfirmation !== 'delete my account' || isDeleting}
                onClick={handleDeleteAccount}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center gap-2"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
