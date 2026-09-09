import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { UserCheck, UserPlus, Search, Users, ChevronRight, User, Check, Sparkles } from 'lucide-react-native';
import { Friendship, Profile } from '@linkiac/shared';
import { useApp } from '../../src/context/AppContext';
import { FriendDetailModal } from '../../src/components/FriendDetailModal';
import { SendFriendLinkModal } from '../../src/components/SendFriendLinkModal';
import { supabase } from '../../lib/supabase';

export default function MobileFriendsScreen() {
  const { currentUser, friends, acceptFriendRequest, syncAllFromSupabase } = useApp();
  const [activeTab, setActiveTab] = useState<'my_friends' | 'discover'>('my_friends');
  const [query, setQuery] = useState('');
  const [selectedFriendship, setSelectedFriendship] = useState<Friendship | null>(null);
  const [sendFriendship, setSendFriendship] = useState<Friendship | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllFromSupabase();
    setRefreshing(false);
  }, [syncAllFromSupabase]);

  // Discover state
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // Connection status map: otherUserId -> { status, isIncoming, friendshipId }
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

  // Filter existing friends
  const filteredFriends = useMemo(() => {
    if (!query.trim()) return friends;
    const q = query.toLowerCase().trim();
    return friends.filter(f => {
      const other = f.requester_id === currentUser.id ? f.recipient : f.requester;
      const username = other?.username?.toLowerCase() || '';
      const displayName = other?.display_name?.toLowerCase() || '';
      return username.includes(q) || displayName.includes(q);
    });
  }, [friends, query, currentUser.id]);

  // Live Supabase query for discovering people
  useEffect(() => {
    const q = discoverQuery.trim().toLowerCase().replace(/^@/, '');
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .neq('id', currentUser.id)
          .limit(15);

        if (!error && Array.isArray(data)) {
          setSearchResults(data);
        }
      } catch (err) {
        console.warn('Discover users error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [discoverQuery, currentUser.id]);

  const handleAccept = async (id: string, username: string) => {
    try {
      await acceptFriendRequest(id);
      Alert.alert(
        'Friend Request Accepted',
        `You and @${username} are now connected! You can send each other link recommendations.`
      );
    } catch {
      Alert.alert('Error', 'Could not accept friend request.');
    }
  };

  const handleSendFriendRequest = async (targetUser: Profile) => {
    try {
      // Check existing connection
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(requester_id.eq.${currentUser.id},recipient_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},recipient_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (existing) {
        Alert.alert('Already Connected', `A connection or request with @${targetUser.username} already exists (${existing.status}).`);
        return;
      }

      const { error } = await supabase.from('friendships').insert({
        requester_id: currentUser.id,
        recipient_id: targetUser.id,
        status: 'pending',
      });

      if (error) {
        Alert.alert('Error', error.message || 'Could not send friend request.');
        return;
      }

      setSentRequests(prev => new Set(prev).add(targetUser.id));
      Alert.alert('Request Sent', `Friend request sent to @${targetUser.username}!`);
      await syncAllFromSupabase();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send request.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Friends & Sharing</Text>
      <Text style={styles.subheading}>Connect with curators and exchange private recommendations</Text>

      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'my_friends' && styles.segmentBtnActive]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('my_friends')}
        >
          <Users color={activeTab === 'my_friends' ? '#ffffff' : '#a1a1aa'} size={15} />
          <Text style={[styles.segmentText, activeTab === 'my_friends' && styles.segmentTextActive]}>
            My Friends ({friends.filter(f => f.status === 'accepted').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'discover' && styles.segmentBtnActive]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('discover')}
        >
          <Sparkles color={activeTab === 'discover' ? '#ffffff' : '#a1a1aa'} size={15} />
          <Text style={[styles.segmentText, activeTab === 'discover' && styles.segmentTextActive]}>
            Find People
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'my_friends' ? (
        <>
          {/* Search Input */}
          <View style={styles.searchBox}>
            <Search color="#71717a" size={16} />
            <TextInput
              style={styles.input}
              placeholder="Filter my friends by username or name..."
              placeholderTextColor="#71717a"
              value={query}
              onChangeText={setQuery}
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={filteredFriends}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#6366f1"
                colors={['#6366f1']}
              />
            }
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users color="#3f3f46" size={48} />
                <Text style={styles.emptyTitle}>
                  {query ? 'No friends found' : 'No friends connected yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {query
                    ? `No one matching "${query}".`
                    : 'Tap "Find People" above to search and connect with other Linkiac curators.'}
                </Text>
                {!query && (
                  <TouchableOpacity
                    style={styles.findPeopleCta}
                    onPress={() => setActiveTab('discover')}
                  >
                    <UserPlus color="#ffffff" size={16} />
                    <Text style={styles.findPeopleCtaText}>Discover & Add Friends</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const other = item.requester_id === currentUser.id ? item.recipient : item.requester;
              const username = other?.username || 'user';
              const displayName = other?.display_name || username;
              const isAccepted = item.status === 'accepted';
              const isIncoming = !isAccepted && item.recipient_id === currentUser.id;

              return (
                <TouchableOpacity
                  style={styles.item}
                  activeOpacity={0.7}
                  onPress={() => setSelectedFriendship(item)}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.avatarMini, isAccepted ? styles.avatarAccepted : styles.avatarPending]}>
                      {other?.avatar_url ? (
                        <Image source={{ uri: other.avatar_url }} style={styles.avatarImg} />
                      ) : (
                        <User color="#ffffff" size={16} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.username}>@{username}</Text>
                      <Text style={styles.name}>{displayName}</Text>
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    {isAccepted ? (
                      <View style={styles.badgeAccepted}>
                        <UserCheck color="#34d399" size={14} />
                        <Text style={styles.badgeTextAccepted}>Friends</Text>
                      </View>
                    ) : isIncoming ? (
                      <TouchableOpacity
                        style={styles.badgePending}
                        activeOpacity={0.7}
                        onPress={e => {
                          e.stopPropagation();
                          handleAccept(item.id, username);
                        }}
                      >
                        <UserPlus color="#ffffff" size={14} />
                        <Text style={styles.badgeTextPending}>Accept</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.badgePendingSent}>
                        <Text style={styles.badgeTextPendingSent}>Pending</Text>
                      </View>
                    )}
                    <ChevronRight color="#52525b" size={16} style={{ marginLeft: 6 }} />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      ) : (
        <>
          {/* Search Bar for Discovering Users */}
          <View style={styles.searchBox}>
            <Search color="#71717a" size={16} />
            <TextInput
              style={styles.input}
              placeholder="Search by username or name (e.g. alex_curator)..."
              placeholderTextColor="#71717a"
              value={discoverQuery}
              onChangeText={setDiscoverQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {discoverQuery ? (
              <TouchableOpacity onPress={() => setDiscoverQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isSearching && (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.searchingText}>Searching for users...</Text>
            </View>
          )}

          <FlatList
            data={searchResults}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              discoverQuery.trim() && !isSearching ? (
                <View style={styles.emptyContainer}>
                  <Users color="#3f3f46" size={40} />
                  <Text style={styles.emptyTitle}>No users found</Text>
                  <Text style={styles.emptySubtitle}>
                    No Linkiac accounts found matching &ldquo;@{discoverQuery.trim()}&rdquo;.
                  </Text>
                </View>
              ) : !discoverQuery.trim() ? (
                <View style={styles.emptyContainer}>
                  <Search color="#3f3f46" size={40} />
                  <Text style={styles.emptyTitle}>Find Linkiac Curators</Text>
                  <Text style={styles.emptySubtitle}>
                    Type a username or display name above to find and connect with people.
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const conn = connectionMap.get(item.id);
              const isAccepted = conn?.status === 'accepted';
              const isPendingIncoming = conn?.status === 'pending' && conn.isIncoming;
              const isPendingOutgoing = (conn?.status === 'pending' && !conn.isIncoming) || sentRequests.has(item.id);

              return (
                <View style={styles.item}>
                  <View style={styles.itemLeft}>
                    <View style={styles.avatarMiniDiscover}>
                      {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                      ) : (
                        <User color="#a5b4fc" size={16} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.username}>@{item.username}</Text>
                      <Text style={styles.name}>{item.display_name || `@${item.username}`}</Text>
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    {isAccepted ? (
                      <View style={styles.badgeAccepted}>
                        <Check color="#34d399" size={14} />
                        <Text style={styles.badgeTextAccepted}>Friends</Text>
                      </View>
                    ) : isPendingIncoming ? (
                      <TouchableOpacity
                        style={styles.badgePending}
                        activeOpacity={0.7}
                        onPress={() => handleAccept(conn!.friendshipId, item.username)}
                      >
                        <UserPlus color="#ffffff" size={14} />
                        <Text style={styles.badgeTextPending}>Accept</Text>
                      </TouchableOpacity>
                    ) : isPendingOutgoing ? (
                      <View style={styles.badgePendingSent}>
                        <Text style={styles.badgeTextPendingSent}>Pending</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addFriendBtn}
                        activeOpacity={0.8}
                        onPress={() => handleSendFriendRequest(item)}
                      >
                        <UserPlus color="#ffffff" size={14} />
                        <Text style={styles.addFriendBtnText}>Add Friend</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </>
      )}

      {/* Friend Detail / Actions Modal */}
      <FriendDetailModal
        visible={!!selectedFriendship}
        friendship={selectedFriendship}
        onClose={() => setSelectedFriendship(null)}
        onOpenSendModal={friendship => setSendFriendship(friendship)}
      />

      {/* Send Link Modal */}
      <SendFriendLinkModal
        visible={!!sendFriendship}
        friendship={sendFriendship}
        onClose={() => setSendFriendship(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    padding: 16,
  },
  heading: {
    color: '#fafafa',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subheading: {
    color: '#a1a1aa',
    fontSize: 13,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  input: {
    flex: 1,
    color: '#fafafa',
    marginLeft: 8,
    fontSize: 14,
  },
  clearText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  list: {
    paddingBottom: 24,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAccepted: {
    backgroundColor: '#065f46',
  },
  avatarPending: {
    backgroundColor: '#4338ca',
  },
  username: {
    color: '#fafafa',
    fontSize: 15,
    fontWeight: '600',
  },
  name: {
    color: '#71717a',
    fontSize: 13,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  badgeTextAccepted: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
  },
  badgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  badgeTextPending: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#71717a',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#4f46e5',
  },
  segmentText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarMiniDiscover: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#312e81',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgePendingSent: {
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeTextPendingSent: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  addFriendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  findPeopleCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  findPeopleCtaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  searchingText: {
    color: '#a1a1aa',
    fontSize: 13,
  },
});
