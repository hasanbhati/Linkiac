import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { X, Send, User, Check, ExternalLink } from 'lucide-react-native';
import { Link } from '@linkiac/shared';
import { useApp } from '../context/AppContext';

interface SendLinkToFriendsModalProps {
  visible: boolean;
  links: Link[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendLinkToFriendsModal({
  visible,
  links,
  onClose,
  onSuccess,
}: SendLinkToFriendsModalProps) {
  const { currentUser, friends, sendLinkToFriends } = useApp();
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  React.useEffect(() => {
    if (visible && links.length === 1) {
      setTitle(links[0].title || '');
    } else if (!visible) {
      setTitle('');
      setComment('');
      setSelectedRecipientIds(new Set());
    }
  }, [visible, links]);

  // Accepted friends list
  const acceptedFriends = useMemo(() => {
    return friends
      .filter(f => f.status === 'accepted')
      .map(f => {
        const isRequester = f.requester_id === currentUser.id;
        const other = isRequester ? f.recipient : f.requester;
        const otherId = isRequester ? f.recipient_id : f.requester_id;
        return {
          friendshipId: f.id,
          recipientId: otherId,
          username: other?.username || 'friend',
          displayName: other?.display_name || other?.username || 'Friend',
          avatarUrl: other?.avatar_url,
        };
      });
  }, [friends, currentUser.id]);

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedRecipientIds.size === 0) {
      Alert.alert('Select a Friend', 'Please choose at least one friend to send to.');
      return;
    }

    if (links.length === 0) {
      Alert.alert('No Links', 'No links are currently selected.');
      return;
    }

    setIsSending(true);
    try {
      const recipientIds = Array.from(selectedRecipientIds);
      for (const link of links) {
        const itemTitle = (links.length === 1 && title.trim()) ? title.trim() : (link.title || null);
        await sendLinkToFriends({
          url: link.url,
          title: itemTitle,
          comment: comment.trim() || null,
          recipient_ids: recipientIds,
          source_link_id: link.id,
          thumbnail_url: link.thumbnail_url || null,
        });
      }

      const friendNames = acceptedFriends
        .filter(f => selectedRecipientIds.has(f.recipientId))
        .map(f => `@${f.username}`)
        .join(', ');

      Alert.alert(
        'Recommendation Sent!',
        `Successfully sent ${links.length} link${links.length === 1 ? '' : 's'} to ${friendNames}.`
      );

      setSelectedRecipientIds(new Set());
      setComment('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Failed to Send', err.message || 'Could not send link recommendations.');
    } finally {
      setIsSending(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Send color="#6366f1" size={18} />
              <Text style={styles.headerTitle}>
                Send {links.length} Link{links.length === 1 ? '' : 's'} to Friend
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X color="#a1a1aa" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Selected Link(s) Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.sectionLabel}>SELECTED LINK{links.length === 1 ? '' : 'S'}</Text>
              {links.length === 1 ? (
                <View style={styles.singleLinkCard}>
                  <View style={styles.titleHeaderRow}>
                    <Text style={styles.titleHeaderLabel}>LINK TITLE</Text>
                    <Text style={styles.titleHeaderHint}>Keep or edit before sending</Text>
                  </View>
                  <TextInput
                    style={styles.titleInput}
                    placeholder="Title for this link..."
                    placeholderTextColor="#71717a"
                    value={title}
                    onChangeText={setTitle}
                    autoCapitalize="sentences"
                    returnKeyType="done"
                  />
                  <Text style={styles.singleLinkUrl} numberOfLines={1}>
                    {links[0].url}
                  </Text>
                  {links[0].domain && (
                    <View style={styles.domainBadge}>
                      <ExternalLink color="#818cf8" size={10} />
                      <Text style={styles.domainBadgeText}>{links[0].domain}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.multiLinksCard}>
                  <Text style={styles.multiLinksCount}>{links.length} links selected</Text>
                  <Text style={styles.multiLinksSub}>
                    {links.map(l => l.title || l.domain || l.url).slice(0, 3).join(', ')}
                    {links.length > 3 ? ` and ${links.length - 3} more` : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Friend Selector */}
            <View style={styles.recipientSection}>
              <Text style={styles.sectionLabel}>CHOOSE RECIPIENT(S) *</Text>
              {acceptedFriends.length === 0 ? (
                <View style={styles.emptyFriendsBox}>
                  <User color="#52525b" size={24} />
                  <Text style={styles.emptyFriendsTitle}>No friends connected yet</Text>
                  <Text style={styles.emptyFriendsSub}>
                    Add friends in the Friends tab to recommend links to them directly.
                  </Text>
                </View>
              ) : (
                <View style={styles.friendsList}>
                  {acceptedFriends.map(friend => {
                    const isSelected = selectedRecipientIds.has(friend.recipientId);
                    return (
                      <TouchableOpacity
                        key={friend.recipientId}
                        style={[
                          styles.friendItem,
                          isSelected && styles.friendItemSelected,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => toggleRecipient(friend.recipientId)}
                      >
                        <View style={styles.friendLeft}>
                          <View style={styles.avatarMini}>
                            {friend.avatarUrl ? (
                              <Image source={{ uri: friend.avatarUrl }} style={styles.avatarImg} />
                            ) : (
                              <User color="#a5b4fc" size={14} />
                            )}
                          </View>
                          <View>
                            <Text style={styles.friendUsername}>@{friend.username}</Text>
                            <Text style={styles.friendDisplayName}>{friend.displayName}</Text>
                          </View>
                        </View>
                        <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                          {isSelected && <Check color="#ffffff" size={13} strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Optional Personal Note */}
            <View style={styles.noteSection}>
              <Text style={styles.sectionLabel}>PERSONAL NOTE / WHY ARE YOU SHARING? (OPTIONAL)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note or comment for your friend..."
                placeholderTextColor="#71717a"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelBtn}
              disabled={isSending}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendBtn,
                (isSending || selectedRecipientIds.size === 0) && styles.sendBtnDisabled,
              ]}
              disabled={isSending || selectedRecipientIds.size === 0}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send color="#ffffff" size={15} />
                  <Text style={styles.sendBtnText}>
                    Send to {selectedRecipientIds.size > 0 ? `${selectedRecipientIds.size} Friend${selectedRecipientIds.size === 1 ? '' : 's'}` : 'Friend'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollArea: {
    maxHeight: 480,
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewSection: {
    marginBottom: 16,
  },
  singleLinkCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  titleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleHeaderLabel: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleHeaderHint: {
    color: '#71717a',
    fontSize: 10,
  },
  titleInput: {
    backgroundColor: '#121215',
    color: '#fafafa',
    fontSize: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  singleLinkTitle: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  singleLinkUrl: {
    color: '#71717a',
    fontSize: 12,
    marginBottom: 6,
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  domainBadgeText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '500',
  },
  multiLinksCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  multiLinksCount: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  multiLinksSub: {
    color: '#71717a',
    fontSize: 12,
  },
  recipientSection: {
    marginBottom: 16,
  },
  emptyFriendsBox: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  emptyFriendsTitle: {
    color: '#d4d4d8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyFriendsSub: {
    color: '#71717a',
    fontSize: 12,
    textAlign: 'center',
  },
  friendsList: {
    gap: 8,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  friendItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: '#6366f1',
  },
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#312e81',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  friendUsername: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '600',
  },
  friendDisplayName: {
    color: '#71717a',
    fontSize: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#52525b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  noteSection: {
    marginBottom: 10,
  },
  noteInput: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fafafa',
    fontSize: 13,
    minHeight: 60,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
  },
  cancelBtnText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
  },
  sendBtn: {
    flex: 2,
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
