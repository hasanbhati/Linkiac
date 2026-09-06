import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { UserCheck, UserPlus, Search, Users, ChevronRight, User } from 'lucide-react-native';
import { Friendship } from '@linkiac/shared';
import { useApp } from '../../src/context/AppContext';
import { FriendDetailModal } from '../../src/components/FriendDetailModal';
import { SendFriendLinkModal } from '../../src/components/SendFriendLinkModal';

export default function MobileFriendsScreen() {
  const { friends, acceptFriendRequest } = useApp();
  const [query, setQuery] = useState('');
  const [selectedFriendship, setSelectedFriendship] = useState<Friendship | null>(null);
  const [sendFriendship, setSendFriendship] = useState<Friendship | null>(null);

  // Filter friends by query
  const filteredFriends = useMemo(() => {
    if (!query.trim()) return friends;
    const q = query.toLowerCase().trim();
    return friends.filter(f => {
      const username = f.requester?.username?.toLowerCase() || '';
      const displayName = f.requester?.display_name?.toLowerCase() || '';
      return username.includes(q) || displayName.includes(q);
    });
  }, [friends, query]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Friends & Sharing</Text>
      <Text style={styles.subheading}>Connect with curators and exchange private recommendations</Text>
      
      {/* Search Input */}
      <View style={styles.searchBox}>
        <Search color="#71717a" size={16} />
        <TextInput
          style={styles.input}
          placeholder="Search friends by username or name..."
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
                : 'Connect with other users to share links directly to their inbox.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const username = item.requester?.username || 'user';
          const displayName = item.requester?.display_name || username;
          const isAccepted = item.status === 'accepted';

          return (
            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.7}
              onPress={() => setSelectedFriendship(item)}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.avatarMini, isAccepted ? styles.avatarAccepted : styles.avatarPending]}>
                  <User color="#ffffff" size={16} />
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
                ) : (
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
                )}
                <ChevronRight color="#52525b" size={16} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

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
});
