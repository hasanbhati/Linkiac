'use client';

import React, { useState } from 'react';
import { Friendship } from '@linkiac/shared';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SendLinkModal } from '@/components/SendLinkModal';
import { useApp } from '@/lib/app-context';
import { Users, UserPlus, UserCheck, Search, Send, UserX, Check, X, Shield } from 'lucide-react';

export default function FriendsPage() {
  const { friends, acceptFriendRequest, removeFriend } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingModalOpen, setSendingModalOpen] = useState(false);
  const [requestSentUsernames, setRequestSentUsernames] = useState<Set<string>>(new Set());

  // Demo discoverable public users
  const discoverableUsers = [
    { id: 'u-1', username: 'elena_designer', display_name: 'Elena Rostova', bio: 'Product Designer & Design Systems' },
    { id: 'u-2', username: 'marcus_ai', display_name: 'Marcus Vance', bio: 'ML Engineer & Distributed Systems' },
    { id: 'u-3', username: 'chloe_dev', display_name: 'Chloe Zhang', bio: 'Frontend Specialist' },
  ];

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => f.status === 'pending');

  const handleAccept = async (friendshipId: string) => {
    await acceptFriendRequest(friendshipId);
  };

  const handleDecline = async (friendshipId: string) => {
    await removeFriend(friendshipId);
  };

  const handleRemoveFriend = async (friendshipId: string, name: string) => {
    if (confirm(`Remove @${name} from your friends? You will no longer be able to send links directly.`)) {
      await removeFriend(friendshipId);
    }
  };

  const handleSendRequest = (username: string) => {
    setRequestSentUsernames(prev => {
      const next = new Set(prev);
      next.add(username);
      return next;
    });
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
                <Users size={22} className="text-indigo-400" />
                <span>Friends & Social Recommendations</span>
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Connect with friends by username to privately send and receive link recommendations.
            </p>
          </div>

          {/* Find New Friends */}
          <div className="glass-card rounded-2xl p-5 border border-zinc-800 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <UserPlus size={16} className="text-indigo-400" />
              <span>Discover & Add Friends</span>
            </h2>

            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by public username (e.g. alex_curator, elena_designer)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {searchQuery.trim() && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                {discoverableUsers
                  .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(user => {
                    const hasRequested = requestSentUsernames.has(user.username);
                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-zinc-200">
                            {user.display_name}{' '}
                            <span className="text-zinc-500 font-mono text-[11px]">@{user.username}</span>
                          </p>
                          <p className="text-zinc-400 text-[11px]">{user.bio}</p>
                        </div>
                        <button
                          type="button"
                          disabled={hasRequested}
                          onClick={() => handleSendRequest(user.username)}
                          className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                            hasRequested
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                          }`}
                        >
                          {hasRequested ? 'Request Sent' : 'Add Friend'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Pending Friend Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                <span>Pending Requests</span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingRequests.map(req => {
                  const profile = req.requester;
                  if (!profile) return null;
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-zinc-900 border border-amber-500/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                          ) : (
                            <Users size={16} className="text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-100">{profile.display_name || profile.username}</p>
                          <p className="text-zinc-500 font-mono text-[11px]">@{profile.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecline(req.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800"
                          title="Decline"
                        >
                          <X size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAccept(req.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20"
                        >
                          <Check size={14} />
                          <span>Accept</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accepted Friends List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <UserCheck size={16} className="text-emerald-400" />
                <span>My Friends</span>
                <span className="bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {acceptedFriends.length}
                </span>
              </h2>

              <button
                type="button"
                onClick={() => setSendingModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/25 text-xs font-semibold"
              >
                <Send size={13} />
                <span>Broadcast Link</span>
              </button>
            </div>

            {acceptedFriends.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800 text-xs text-zinc-500">
                You haven't added any friends yet. Search for usernames above to connect!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {acceptedFriends.map(f => {
                  const profile = f.requester;
                  if (!profile) return null;
                  return (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                          ) : (
                            <Users size={16} className="text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-100">{profile.display_name || profile.username}</p>
                          <p className="text-zinc-500 font-mono text-[11px]">@{profile.username}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Connected
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSendingModalOpen(true)}
                          className="p-2 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                          title="Send a link to this friend"
                        >
                          <Send size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(f.id, profile.username)}
                          className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                          title="Remove friend"
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <SendLinkModal
        isOpen={sendingModalOpen}
        onClose={() => setSendingModalOpen(false)}
      />

      <MobileBottomNav />
    </div>
  );
}
