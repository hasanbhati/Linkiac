import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { X, User, Send, Trash2, UserCheck, UserPlus, Clock, ShieldAlert } from 'lucide-react-native';
import { Friendship } from '@linkiac/shared';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

interface FriendDetailModalProps {
  visible: boolean;
  friendship: Friendship | null;
  onClose: () => void;
  onOpenSendModal: (friendship: Friendship) => void;
}

export function FriendDetailModal({
  visible,
  friendship,
  onClose,
  onOpenSendModal,
}: FriendDetailModalProps) {
  const { currentUser, acceptFriendRequest, removeFriend } = useApp();
  const { theme, isDark } = useTheme();

  if (!friendship) return null;

  const other = friendship.requester_id === currentUser.id ? friendship.recipient : friendship.requester;
  const username = other?.username || 'user';
  const displayName = other?.display_name || username;
  const avatarUrl = other?.avatar_url;
  const isAccepted = friendship.status === 'accepted';
  const isIncoming = !isAccepted && friendship.recipient_id === currentUser.id;
  const isOutgoing = !isAccepted && friendship.requester_id === currentUser.id;

  const handleAccept = async () => {
    try {
      await acceptFriendRequest(friendship.id);
      Alert.alert('Friend Request Accepted', `You and @${username} are now friends!`);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to accept friend request.');
    }
  };

  const handleRemove = () => {
    let title = 'Remove Friend';
    let message = `Are you sure you want to remove @${username} from your friends?`;
    let confirmBtn = 'Remove';

    if (isIncoming) {
      title = 'Decline Request';
      message = `Decline friend request from @${username}?`;
      confirmBtn = 'Decline';
    } else if (isOutgoing) {
      title = 'Cancel Request';
      message = `Cancel friend request sent to @${username}?`;
      confirmBtn = 'Cancel Request';
    }

    Alert.alert(title, message, [
      { text: 'Keep', style: 'cancel' },
      {
        text: confirmBtn,
        style: 'destructive',
        onPress: async () => {
          await removeFriend(friendship.id);
          onClose();
        },
      },
    ]);
  };

  const handleBlock = () => {
    Alert.alert(
      `Block @${username}`,
      `Are you sure you want to block @${username}? They will be removed from your friends and won't be able to send you links or requests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friendship.id);
              Alert.alert('User Blocked', `@${username} has been blocked and removed.`);
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to block user.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Friend Profile</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X color={theme.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          {/* Profile Details */}
          <View style={styles.profileSection}>
            <View style={[styles.avatarLarge, { backgroundColor: theme.accentPrimary }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImgLarge} />
              ) : (
                <User color="#ffffff" size={36} />
              )}
            </View>
            <Text style={[styles.displayName, { color: theme.textPrimary }]}>{displayName}</Text>
            <Text style={[styles.username, { color: theme.accentPrimary }]}>@{username}</Text>

            <View style={styles.statusRow}>
              {isAccepted ? (
                <View style={[styles.badgeAccepted, { backgroundColor: isDark ? '#064e3b' : '#dcfce7' }]}>
                  <UserCheck color={isDark ? '#34d399' : '#15803d'} size={14} />
                  <Text style={[styles.badgeTextAccepted, { color: isDark ? '#34d399' : '#15803d' }]}>Connected Friends</Text>
                </View>
              ) : isIncoming ? (
                <View style={[styles.badgePending, { backgroundColor: theme.accentPrimaryMuted }]}>
                  <Clock color={theme.accentPrimary} size={14} />
                  <Text style={[styles.badgeTextPending, { color: theme.accentPrimary }]}>Friend Request Received</Text>
                </View>
              ) : (
                <View style={[styles.badgePendingOutgoing, { backgroundColor: isDark ? '#451a03' : '#fef3c7' }]}>
                  <Clock color={isDark ? '#fbbf24' : '#d97706'} size={14} />
                  <Text style={[styles.badgeTextPendingOutgoing, { color: isDark ? '#fbbf24' : '#d97706' }]}>Request Sent (Pending)</Text>
                </View>
              )}
            </View>

            <Text style={[styles.metaDate, { color: theme.textMuted }]}>
              {isAccepted
                ? `Friends since ${new Date(friendship.created_at).toLocaleDateString()}`
                : `Requested on ${new Date(friendship.created_at).toLocaleDateString()}`}
            </Text>
          </View>

          {/* Action List */}
          <View style={styles.actionsSection}>
            {isAccepted && (
              <TouchableOpacity
                style={[styles.actionPrimary, { backgroundColor: theme.accentPrimary }]}
                onPress={() => {
                  onClose();
                  onOpenSendModal(friendship);
                }}
              >
                <Send color={theme.accentText} size={16} />
                <Text style={[styles.actionPrimaryText, { color: theme.accentText }]}>Send Link to @{username}</Text>
              </TouchableOpacity>
            )}

            {isIncoming && (
              <TouchableOpacity
                style={[styles.actionPrimary, { backgroundColor: theme.accentPrimary }]}
                onPress={handleAccept}
              >
                <UserPlus color={theme.accentText} size={16} />
                <Text style={[styles.actionPrimaryText, { color: theme.accentText }]}>Accept Friend Request</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionDanger, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
              onPress={handleRemove}
            >
              <Trash2 color={theme.danger} size={16} />
              <Text style={[styles.actionDangerText, { color: theme.danger }]}>
                {isAccepted
                  ? 'Remove Friend'
                  : isIncoming
                  ? 'Decline Request'
                  : 'Cancel Sent Request'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionDanger, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
              onPress={handleBlock}
            >
              <ShieldAlert color={theme.danger} size={16} />
              <Text style={[styles.actionDangerText, { color: theme.danger }]}>
                Block @{username}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121215',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '700',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImgLarge: {
    width: '100%',
    height: '100%',
  },
  displayName: {
    color: '#fafafa',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  statusRow: {
    marginBottom: 8,
  },
  badgeAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064e3b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeTextAccepted: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
  },
  badgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeTextPending: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgePendingOutgoing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#451a03',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeTextPendingOutgoing: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  metaDate: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 4,
  },
  actionsSection: {
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 8,
  },
  actionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 10,
  },
  actionPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#3f1c1c',
    height: 46,
    borderRadius: 10,
  },
  actionDangerText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
