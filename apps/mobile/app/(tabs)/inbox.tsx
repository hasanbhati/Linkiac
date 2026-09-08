import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import {
  Check,
  X,
  User,
  ExternalLink,
  Inbox as InboxIcon,
  MessageSquare,
  Folder,
  Tag,
} from 'lucide-react-native';
import { isSafeWebUrl, ensureUrlProtocol, SendRecipient } from '@linkiac/shared';
import { useApp } from '../../src/context/AppContext';

export default function MobileInboxScreen() {
  const { currentUser, suggestions, categories, folders, acceptSuggestion, rejectSuggestion, syncAllFromSupabase } = useApp();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const pendingSuggestions = suggestions.filter(
    s => s.status === 'pending' && s.recipient_id === currentUser.id
  );

  // Destination filing modal state
  const [acceptingItem, setAcceptingItem] = useState<SendRecipient | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllFromSupabase();
    setRefreshing(false);
  }, [syncAllFromSupabase]);

  const handleOpenUrl = async (rawUrl: string) => {
    if (!isSafeWebUrl(rawUrl)) {
      Alert.alert('Note / Free Text', `"${rawUrl}" is not an external web link.`);
      return;
    }
    const targetUrl = ensureUrlProtocol(rawUrl);
    try {
      await Linking.openURL(targetUrl);
    } catch {
      Alert.alert('Cannot Open URL', `Unable to open: ${targetUrl}`);
    }
  };

  const handleDecline = (id: string, senderName: string) => {
    Alert.alert(
      'Decline Suggestion',
      `Are you sure you want to decline this link suggestion from @${senderName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(id);
            try {
              await rejectSuggestion(id);
              Alert.alert('Suggestion Declined', 'The link suggestion has been removed from your inbox.');
            } catch (err) {
              Alert.alert('Error', 'Failed to decline suggestion.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenAcceptModal = (item: SendRecipient) => {
    setAcceptingItem(item);
    setTargetCategoryId(null);
    setTargetFolderId(null);
  };

  const handleConfirmAccept = async () => {
    if (!acceptingItem) return;
    setIsAccepting(true);
    try {
      const link = await acceptSuggestion(acceptingItem.id, {
        category_id: targetCategoryId,
        folder_id: targetFolderId,
      });
      if (link) {
        Alert.alert(
          'Saved to Library!',
          'This suggestion has been accepted and added to your personal library.'
        );
      }
      setAcceptingItem(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept suggestion to library.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Suggestions Inbox</Text>
      <Text style={styles.subheading}>Links sent privately from your accepted friends</Text>

      <FlatList
        data={pendingSuggestions}
        keyExtractor={(item) => item.id}
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
            <InboxIcon color="#3f3f46" size={52} />
            <Text style={styles.emptyTitle}>Inbox Zero</Text>
            <Text style={styles.emptySubtitle}>
              You have no pending link suggestions from friends.
            </Text>
            <Text style={styles.emptyHint}>
              When friends share links or recommendations with you, they will appear here for you to accept or decline.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const senderUsername = item.send?.sender?.username || 'friend';
          const senderDisplayName = item.send?.sender?.display_name || senderUsername;
          const senderAvatar = item.send?.sender?.avatar_url;
          const url = item.send?.url || '';
          const comment = item.send?.comment;
          const isProcessing = processingId === item.id;
          const isWeb = isSafeWebUrl(url);

          return (
            <View style={styles.card}>
              {/* Sender info */}
              <View style={styles.senderRow}>
                <View style={styles.avatarMini}>
                  {senderAvatar ? (
                    <Image source={{ uri: senderAvatar }} style={styles.avatarImg} />
                  ) : (
                    <User color="#818cf8" size={14} />
                  )}
                </View>
                <View>
                  <Text style={styles.senderText}>@{senderUsername}</Text>
                  {senderDisplayName !== senderUsername && (
                    <Text style={styles.senderSubtext}>{senderDisplayName}</Text>
                  )}
                </View>
              </View>

              {/* URL - tap to preview */}
              {url ? (
                <TouchableOpacity
                  style={styles.urlTouchable}
                  activeOpacity={0.7}
                  onPress={() => handleOpenUrl(url)}
                >
                  <Text style={styles.urlText} numberOfLines={2}>
                    {url}
                  </Text>
                  {isWeb && (
                    <View style={styles.previewTag}>
                      <ExternalLink color="#818cf8" size={12} />
                      <Text style={styles.previewTagText}>Tap to preview</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}

              {/* Sender's Comment / Note */}
              {comment ? (
                <View style={styles.commentBox}>
                  <MessageSquare color="#a1a1aa" size={12} style={{ marginTop: 2 }} />
                  <Text style={styles.commentText}>"{comment}"</Text>
                </View>
              ) : null}

              {/* Actions: Decline & Accept */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  activeOpacity={0.7}
                  disabled={isProcessing}
                  onPress={() => handleDecline(item.id, senderUsername)}
                >
                  <X color="#ef4444" size={16} />
                  <Text style={styles.rejectText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.acceptBtn}
                  activeOpacity={0.7}
                  disabled={isProcessing}
                  onPress={() => handleOpenAcceptModal(item)}
                >
                  <Check color="#ffffff" size={16} />
                  <Text style={styles.acceptText}>Accept to Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Accept & File Modal */}
      <Modal
        visible={!!acceptingItem}
        animationType="slide"
        transparent
        onRequestClose={() => setAcceptingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Suggestion</Text>
              <TouchableOpacity onPress={() => setAcceptingItem(null)}>
                <X color="#a1a1aa" size={20} />
              </TouchableOpacity>
            </View>

            {acceptingItem && (
              <View style={styles.modalItemPreview}>
                <Text style={styles.modalSenderLabel}>
                  From @{acceptingItem.send?.sender?.username || 'friend'}
                </Text>
                <Text style={styles.modalUrlPreview} numberOfLines={2}>
                  {acceptingItem.send?.url}
                </Text>
                {acceptingItem.send?.comment ? (
                  <Text style={styles.modalCommentPreview}>
                    "{acceptingItem.send?.comment}"
                  </Text>
                ) : null}
              </View>
            )}

            <Text style={styles.modalSectionTitle}>Choose Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalScrollRow}>
              <TouchableOpacity
                style={[
                  styles.modalPill,
                  targetCategoryId === null && styles.modalPillActive,
                ]}
                onPress={() => {
                  setTargetCategoryId(null);
                  setTargetFolderId(null);
                }}
              >
                <Text
                  style={[
                    styles.modalPillText,
                    targetCategoryId === null && styles.modalPillTextActive,
                  ]}
                >
                  Unfiled
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.modalPill,
                    targetCategoryId === cat.id && styles.modalPillActive,
                  ]}
                  onPress={() => {
                    setTargetCategoryId(cat.id);
                    setTargetFolderId(null);
                  }}
                >
                  <Tag color={targetCategoryId === cat.id ? '#ffffff' : '#818cf8'} size={12} style={{ marginRight: 4 }} />
                  <Text
                    style={[
                      styles.modalPillText,
                      targetCategoryId === cat.id && styles.modalPillTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalSectionTitle}>Choose Folder (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalScrollRow}>
              <TouchableOpacity
                style={[
                  styles.modalPill,
                  targetFolderId === null && styles.modalPillActive,
                ]}
                onPress={() => setTargetFolderId(null)}
              >
                <Text
                  style={[
                    styles.modalPillText,
                    targetFolderId === null && styles.modalPillTextActive,
                  ]}
                >
                  No Folder
                </Text>
              </TouchableOpacity>
              {folders
                .filter((f) => !targetCategoryId || f.category_id === targetCategoryId)
                .map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.modalPill,
                      targetFolderId === f.id && styles.modalPillActive,
                    ]}
                    onPress={() => setTargetFolderId(f.id)}
                  >
                    <Folder color={targetFolderId === f.id ? '#ffffff' : '#f59e0b'} size={12} style={{ marginRight: 4 }} />
                    <Text
                      style={[
                        styles.modalPillText,
                        targetFolderId === f.id && styles.modalPillTextActive,
                      ]}
                    >
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAcceptingItem(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isAccepting && { opacity: 0.6 }]}
                disabled={isAccepting}
                onPress={handleConfirmAccept}
              >
                {isAccepting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check color="#ffffff" size={16} />
                    <Text style={styles.modalSubmitText}>Save to Library</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 12,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#312e81',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  senderText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
  senderSubtext: {
    color: '#71717a',
    fontSize: 11,
  },
  urlTouchable: {
    backgroundColor: '#121215',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 10,
  },
  urlText: {
    color: '#fafafa',
    fontSize: 14,
    lineHeight: 20,
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  previewTagText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '500',
  },
  commentBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  commentText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  rejectText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#fafafa',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#a1a1aa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHint: {
    color: '#71717a',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalItemPreview: {
    backgroundColor: '#121215',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 14,
  },
  modalSenderLabel: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalUrlPreview: {
    color: '#fafafa',
    fontSize: 13,
    lineHeight: 18,
  },
  modalCommentPreview: {
    color: '#a1a1aa',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
  },
  modalSectionTitle: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  modalScrollRow: {
    marginBottom: 10,
  },
  modalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#27272a',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  modalPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  modalPillText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  modalPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#27272a',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
