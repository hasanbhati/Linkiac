'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useApp } from '@/lib/app-context';
import {
  Shield,
  Users,
  Bookmark,
  Search,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Trash2,
  Lock,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';

interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  created_at: string;
  links_count: number;
}

export default function AdminPage() {
  const { currentUser, links } = useApp();

  const [users, setUsers] = useState<AdminUserRow[]>([
    {
      id: currentUser.id,
      username: currentUser.username,
      email: 'hasan@example.com',
      display_name: currentUser.display_name || 'Hasan (Admin)',
      role: 'admin',
      status: 'active',
      created_at: currentUser.created_at,
      links_count: links.length,
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      username: 'sarah_engineer',
      email: 'sarah@example.com',
      display_name: 'Sarah Connor',
      role: 'user',
      status: 'active',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      links_count: 14,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      username: 'alex_curator',
      email: 'alex@example.com',
      display_name: 'Alex Rivera',
      role: 'user',
      status: 'active',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      links_count: 28,
    },
    {
      id: 'd0000000-0000-0000-0000-000000000004',
      username: 'spammer_bot',
      email: 'bot@shady.net',
      display_name: 'Spam Bot 9000',
      role: 'user',
      status: 'suspended',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      links_count: 0,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Authorization Check (ADM-01)
  if (!currentUser.is_admin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">Access Denied (403)</h2>
          <p className="text-xs text-zinc-400">
            This administration portal is restricted to authorized operators only.
          </p>
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          >
            <ArrowLeft size={14} />
            <span>Return to Library</span>
          </Link>
        </div>
      </div>
    );
  }

  // Aggregate Stats (ADM-10)
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const suspendedUsers = users.filter(u => u.status === 'suspended').length;
  const totalPlatformLinks = users.reduce((acc, u) => acc + u.links_count, 0);

  // Filtered user list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUsername = u.username.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesName = u.display_name.toLowerCase().includes(q);
        if (!matchesUsername && !matchesEmail && !matchesName) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Suspend / Reactivate (ADM-05, ADM-06)
  const toggleUserStatus = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'suspended' : 'active';
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, status: newStatus } : u)));
    showFeedback(`User @${target.username} marked as ${newStatus}.`);
  };

  // Promote / Demote with Safeguards (ADM-08, ADM-09)
  const toggleAdminRole = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    // Safeguard 1: Prevent self-demotion
    if (userId === currentUser.id && target.role === 'admin') {
      alert('Safeguard: You cannot demote yourself from admin.');
      return;
    }

    // Safeguard 2: Prevent loss of last active admin
    const activeAdmins = users.filter(u => u.role === 'admin' && u.status === 'active');
    if (target.role === 'admin' && activeAdmins.length <= 1) {
      alert('Safeguard: Cannot remove the final active admin.');
      return;
    }

    const newRole = target.role === 'admin' ? 'user' : 'admin';
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
    showFeedback(`User @${target.username} role changed to ${newRole}.`);
  };

  // Delete User (ADM-07)
  const handleDeleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    if (userId === currentUser.id) {
      alert('Cannot delete your own admin account through user management.');
      return;
    }

    if (confirm(`Permanently delete @${target.username} and all associated data? This is irreversible.`)) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      showFeedback(`User @${target.username} was permanently deleted.`);
    }
  };

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

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-8">
          {/* Header */}
          <div className="border-b border-zinc-800/80 pb-5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
                <Shield size={22} className="text-indigo-400" />
                <span>Operator Admin Panel</span>
              </h1>
              <span className="text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                Privileged Access
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Protected web portal for user lifecycle management, suspension, role assignment, and system metrics.
            </p>
          </div>

          {actionNotice && (
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={16} />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Aggregate Stats (ADM-10) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-4 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Users size={13} className="text-indigo-400" /> Total Registered Users
              </span>
              <p className="text-2xl font-extrabold text-zinc-100">{totalUsers}</p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={13} className="text-emerald-400" /> Active Users
              </span>
              <p className="text-2xl font-extrabold text-emerald-400">{activeUsers}</p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <UserX size={13} className="text-red-400" /> Suspended Accounts
              </span>
              <p className="text-2xl font-extrabold text-red-400">{suspendedUsers}</p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-zinc-800 space-y-1">
              <span className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark size={13} className="text-amber-400" /> Total Links Saved
              </span>
              <p className="text-2xl font-extrabold text-amber-400">{totalPlatformLinks}</p>
            </div>
          </div>

          {/* User Table (ADM-02, ADM-03) */}
          <div className="glass-card rounded-2xl border border-zinc-800 overflow-hidden space-y-4 p-5">
            {/* Table Search & Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter users by username or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>

                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins</option>
                  <option value="user">Regular Users</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950/80 text-zinc-400 font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Links</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-zinc-100">{user.display_name}</p>
                        <p className="text-[11px] font-mono text-zinc-500">@{user.username}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">{user.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            user.role === 'admin'
                              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {user.role === 'admin' && <Shield size={10} />}
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            user.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          />
                          {user.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{user.links_count}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleAdminRole(user.id)}
                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
                            title={user.role === 'admin' ? 'Demote to regular user' : 'Promote to admin'}
                          >
                            {user.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>

                          {/* Status Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(user.id)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${
                              user.status === 'active'
                                ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800"
                            title="Permanently delete user"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
