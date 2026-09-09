'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Friendship, Profile } from '@linkiac/shared';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SendLinkModal } from '@/components/SendLinkModal';
import { useApp } from '@/lib/app-context';
import { getSupabase } from '@/lib/supabase/client';
import { Users, UserPlus, UserCheck, Search, Send, UserX, Check, X, Shield, Loader2 } from 'lucide-react';

export default function FriendsPage() {
  const { currentUser, friends, acceptFriendRequest, removeFriend, syncAllFromSupabase } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sendingModalOpen, setSendingModalOpen] = useState(false);
  const [requestSentUsernames, setRequestSentUsernames] = useState<Set<string>>(new Set());

  // Connection map: otherUserId -> { status, isIncoming, friendshipId }
  const connectionMap = useMemo(() => {
    const map = new Map<string, { status: string; isIncoming: boolean; friendshipId: string }>();
    friends.forEach(f => {
      const isRequester = f.requester_id === currentUser.id;
      const otherId = isRequester ? f.recipient_id : f.requester_id;
      map.set(otherId, {
        status: f.status,
        isIncoming: !isRequester,
        friendshipId: f.id,
      });
    });
    return map;
  }, [friends, currentUser.id]);

  // Query Supabase public.profiles live on search query
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase().replace(/^@/, '');
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .neq('id', currentUser.id)
          .limit(10);

        if (error) {
          console.warn('Friend search error:', error);
          setSearchError('Search failed: ' + error.message);
        } else {
          setSearchResults(data || []);
        }
      } catch (err: any) {
        setSearchError(err.message || 'Error querying profiles');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id]);

  const acceptedFriends = useMemo(() => friends.filter(f => f.status === 'accepted'), [friends]);
  const incomingRequests = useMemo(() => friends.filter(f => f.status === 'pending' && f.recipient_id === currentUser.id), [friends, currentUser.id]);
  const outgoingRequests = useMemo(() => friends.filter(f => f.status === 'pending' && f.requester_id === currentUser.id), [friends, currentUser.id]);

  const handleAccept = async (friendshipId: string) => {
    await acceptFriendRequest(friendshipId);
  };

  const handleDecline = async (friendshipId: string) => {
    await removeFriend(friendshipId);
  };

  const handleCancelRequest = async (friendshipId: string) => {
    await removeFriend(friendshipId);
  };

  const handleRemoveFriend = async (friendshipId: string, name: string) => {
    if (confirm(`Remove @${name} from your friends? You will no longer be able to send links directly.`)) {
      await removeFriend(friendshipId);
    }
  };

  const handleSendRequest = async (targetUser: Profile) => {
    try {
      const supabase = getSupabase();

      // Ensure no duplicate request
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(requester_id.eq.${currentUser.id},recipient_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},recipient_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (existing) {
        alert(`A connection or request with @${targetUser.username} already exists (${existing.status}).`);
        return;
      }

      const { error } = await supabase.from('friendships').insert({
        requester_id: currentUser.id,
        recipient_id: targetUser.id,
        status: 'pending',
      });

      if (error) {
        alert('Could not send friend request: ' + error.message);
        return;
      }

      setRequestSentUsernames(prev => new Set(prev).add(targetUser.username));
      await syncAllFromSupabase();
    } catch (err: any) {
      alert(err.message || 'Failed to send friend request');
    }
  };

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto overflow-hidden">
        <Sidebar
          selectedFolderId={null}
          isUnfiledOnly={false}
          onSelectAll={() => {}}
          onSelectUnfiled={() => {}}
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
                {isSearching && (
                  <div className="flex items-center gap-2 py-3 text-xs text-zinc-400 justify-center">
                    <Loader2 size={14} className="animate-spin text-indigo-400" />
                    <span>Searching for Linkiac users...</span>
                  </div>
                )}

                {searchError && (
                  <p className="text-xs text-red-400 py-1">{searchError}</p>
                )}

                {!isSearching && searchResults.length === 0 && (
                  <p className="text-xs text-zinc-500 py-2 text-center">
                    No users found matching &ldquo;@{searchQuery.trim()}&rdquo;.
                  </p>
                )}

                {!isSearching &&
                  searchResults.map(user => {
                    const conn = connectionMap.get(user.id);
                    const isConnected = conn?.status === 'accepted';
                    const isPendingIncoming = conn?.status === 'pending' && conn.isIncoming;
                    const isPendingOutgoing = (conn?.status === 'pending' && !conn.isIncoming) || requestSentUsernames.has(user.username);

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-900/40 border border-zinc-700 flex items-center justify-center shrink-0">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                              <Users size={14} className="text-indigo-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-200">
                              {user.display_name || `@${user.username}`}{' '}
                              <span className="text-zinc-500 font-mono text-[11px]">@{user.username}</span>
                            </p>
                            <p className="text-zinc-500 text-[10px]">
                              Member since {new Date(user.created_at || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                            <Check size={12} /> Friends
                          </span>
                        ) : isPendingIncoming ? (
                          <button
                            type="button"
                            onClick={() => handleAccept(conn!.friendshipId)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-medium transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95"
                          >
                            <Check size={12} /> Accept Request
                          </button>
                        ) : isPendingOutgoing ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                            Request Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendRequest(user)}
                            className="px-3 py-1.5 rounded-xl font-medium transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95"
                          >
                            Add Friend
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Incoming / Pending Friend Requests */}
          {incomingRequests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                <span>Pending Requests</span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {incomingRequests.length}
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incomingRequests.map((req: Friendship) => {
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

          {/* Outgoing Friend Requests Sent */}
          {outgoingRequests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                <span>Sent Requests</span>
                <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {outgoingRequests.length}
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outgoingRequests.map((req: Friendship) => {
                  const profile = req.recipient;
                  const targetName = profile?.display_name || profile?.username || 'user';
                  const targetUsername = profile?.username || 'user';
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt={targetUsername} className="w-full h-full object-cover" />
                          ) : (
                            <Users size={16} className="text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-200">{targetName}</p>
                          <p className="text-zinc-500 font-mono text-[11px]">@{targetUsername}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Awaiting their acceptance</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-2.5 py-1 text-[11px] rounded-lg border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                      >
                        Cancel Request
                      </button>
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
                You haven&apos;t added any friends yet. Search for usernames above to connect!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {acceptedFriends.map((f: Friendship) => {
                  const profile = f.requester_id === currentUser.id ? f.recipient : f.requester;
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
