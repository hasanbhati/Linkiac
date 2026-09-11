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
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
  ShieldAlert,
} from 'lucide-react-native';
import { isSafeWebUrl, ensureUrlProtocol, SendRecipient, parseNormalizedDomain, unpackSharedComment } from '@linkiac/shared';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/context/ThemeContext';

export default function MobileInboxScreen() {
  const { currentUser, suggestions, folders, acceptSuggestion, rejectSuggestion, syncAllFromSupabase } = useApp();
  const { theme } = useTheme();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const pendingSuggestions = suggestions.filter(
    s => s.status === 'pending' && s.recipient_id === currentUser.id
  );

  // Destination filing modal state
  const [acceptingItem, setAcceptingItem] = useState<SendRecipient | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
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

  const handleReport = (item: SendRecipient) => {
    const senderUsername = item.send?.sender?.username || 'friend';
    Alert.alert(
      'Report Objectionable Content',
      `Please select a category for reporting this link sent by @${senderUsername}. Our team reviews all reports within 24 hours under our zero-tolerance policy.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Spam or Scam',
          style: 'destructive',
          onPress: () => submitReport(item, 'Spam or Scam'),
        },
        {
          text: 'Inappropriate / Harassment',
          style: 'destructive',
          onPress: () => submitReport(item, 'Inappropriate / Harassment'),
        },
        {
          text: 'Malicious Link / Phishing',
          style: 'destructive',
          onPress: () => submitReport(item, 'Malicious Link / Phishing'),
        },
      ]
    );
  };

  const submitReport = async (item: SendRecipient, reason: string) => {
    setProcessingId(item.id);
    try {
      await rejectSuggestion(item.id);
      Alert.alert(
        'Report Submitted',
        `Thank you for reporting this content (${reason}). The link has been removed from your inbox and the sender account has been flagged for moderation review.`
      );
    } catch {
      Alert.alert('Error', 'Failed to submit report.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBlockSender = (item: SendRecipient) => {
    const senderUsername = item.send?.sender?.username || 'friend';
    Alert.alert(
      `Block @${senderUsername}`,
      `Are you sure you want to block @${senderUsername}? This link will be removed and they will no longer be able to send you links or friend requests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(item.id);
            try {
              await rejectSuggestion(item.id);
              Alert.alert('User Blocked', `@${senderUsername} has been blocked.`);
            } catch {
              Alert.alert('Error', 'Failed to block user.');
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
    setTargetFolderId(null);
    const { title: unpackedTitle, note: unpackedNote } = unpackSharedComment(item.send?.comment);
    setCommentInput(unpackedNote || (unpackedTitle ? '' : (item.send?.comment || '')));
    const rawSendTitle = item.send?.title ? String(item.send.title).trim() : '';
    const rawSourceTitle = item.send?.source_link?.title ? String(item.send.source_link.title).trim() : '';
    let initialTitle = rawSendTitle || unpackedTitle || rawSourceTitle;
    if (!initialTitle || initialTitle.toLowerCase().startsWith('shared by @')) {
      initialTitle = (item.send?.url ? parseNormalizedDomain(item.send.url) : '') || item.send?.url || '';
    }
    setTitleInput(initialTitle);
  };

  const handleConfirmAccept = async () => {
    if (!acceptingItem) return;
    setIsAccepting(true);
    try {
      const link = await acceptSuggestion(acceptingItem.id, {
        category_id: null,
        folder_id: targetFolderId,
        title: titleInput.trim() || null,
        comment: commentInput.trim() || null,
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
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      <Text style={[styles.heading, { color: theme.textPrimary }]}>Inbox</Text>
      <Text style={[styles.subheading, { color: theme.textSecondary }]}>Links sent privately from your accepted friends</Text>

      <FlatList
        data={pendingSuggestions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accentPrimary}
            colors={[theme.accentPrimary]}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <InboxIcon color={theme.textMuted} size={52} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Inbox Zero</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              You have no pending link suggestions from friends.
            </Text>
            <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
              When friends share links or recommendations with you, they will appear here for you to accept or decline.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const senderUsername = item.send?.sender?.username || 'friend';
          const senderDisplayName = item.send?.sender?.display_name || senderUsername;
          const senderAvatar = item.send?.sender?.avatar_url;
          const url = item.send?.url || '';
          const isProcessing = processingId === item.id;
          const isWeb = isSafeWebUrl(url);
          const { title: unpackedTitle, note: unpackedNote } = unpackSharedComment(item.send?.comment);
          const rawSendTitle = item.send?.title ? String(item.send.title).trim() : '';
          const rawSourceTitle = item.send?.source_link?.title ? String(item.send.source_link.title).trim() : '';
          let itemTitle = rawSendTitle || unpackedTitle || rawSourceTitle;
          if (itemTitle.toLowerCase().startsWith('shared by @')) {
            itemTitle = '';
          }
          const displayComment = unpackedTitle ? unpackedNote : item.send?.comment;

          return (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {/* Sender info */}
              <View style={styles.senderRow}>
                <View style={styles.senderInfoLeft}>
                  <View style={[styles.avatarMini, { backgroundColor: theme.accentPrimaryMuted }]}>
                    {senderAvatar ? (
                      <Image source={{ uri: senderAvatar }} style={styles.avatarImg} />
                    ) : (
                      <User color={theme.accentPrimary} size={14} />
                    )}
                  </View>
                  <View>
                    <Text style={[styles.senderText, { color: theme.accentPrimary }]}>@{senderUsername}</Text>
                    {senderDisplayName !== senderUsername && (
                      <Text style={[styles.senderSubtext, { color: theme.textMuted }]}>{senderDisplayName}</Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.reportBtn, { backgroundColor: theme.surfaceSubtle }]}
                    activeOpacity={0.7}
                    onPress={() => handleReport(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Report Objectionable Content"
                  >
                    <ShieldAlert color={theme.textMuted} size={13} />
                    <Text style={[styles.reportBtnText, { color: theme.textMuted }]}>Report</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reportBtn, { backgroundColor: theme.surfaceSubtle }]}
                    activeOpacity={0.7}
                    onPress={() => handleBlockSender(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Block Sender"
                  >
                    <Text style={[styles.reportBtnText, { color: theme.danger }]}>Block</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* URL & Title - tap to preview */}
              {url ? (
                <TouchableOpacity
                  style={[styles.urlTouchable, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}
                  activeOpacity={0.7}
                  onPress={() => handleOpenUrl(url)}
                >
                  {itemTitle ? (
                    <Text style={[styles.cardItemTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                      {itemTitle}
                    </Text>
                  ) : null}
                  <Text style={[itemTitle ? styles.cardUrlSubtext : styles.urlText, { color: itemTitle ? theme.accentPrimary : theme.textSecondary }]} numberOfLines={itemTitle ? 1 : 2}>
                    {url}
                  </Text>
                  {isWeb && (
                    <View style={styles.previewTag}>
                      <ExternalLink color={theme.accentPrimary} size={12} />
                      <Text style={[styles.previewTagText, { color: theme.accentPrimary }]}>Tap to preview</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}

              {/* Sender's Comment / Note */}
              {displayComment ? (
                <View style={[styles.commentBox, { backgroundColor: theme.surfaceSubtle }]}>
                  <MessageSquare color={theme.textMuted} size={12} style={{ marginTop: 2 }} />
                  <Text style={[styles.commentText, { color: theme.textSecondary }]}>"{displayComment}"</Text>
                </View>
              ) : null}

              {/* Actions: Decline & Accept */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.rejectBtn, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
                  activeOpacity={0.7}
                  disabled={isProcessing}
                  onPress={() => handleDecline(item.id, senderUsername)}
                >
                  <X color={theme.danger} size={16} />
                  <Text style={[styles.rejectText, { color: theme.danger }]}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.acceptBtn, { backgroundColor: theme.accentPrimary }]}
                  activeOpacity={0.7}
                  disabled={isProcessing}
                  onPress={() => handleOpenAcceptModal(item)}
                >
                  <Check color={theme.accentText} size={16} />
                  <Text style={[styles.acceptText, { color: theme.accentText }]}>Accept to Library</Text>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Check color="#10b981" size={18} />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Accept to My Library</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAcceptingItem(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color={theme.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView
              style={styles.modalScrollableBody}
              contentContainerStyle={styles.modalScrollableContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {acceptingItem && (
                <View style={[styles.modalItemPreview, { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle }]}>
                  <View style={styles.modalSenderBadge}>
                    <User color={theme.accentPrimary} size={13} />
                    <Text style={[styles.modalSenderLabel, { color: theme.accentPrimary }]}>
                      Recommended by @{acceptingItem.send?.sender?.username || 'friend'}
                    </Text>
                  </View>
                  <Text style={[styles.modalUrlPreview, { color: theme.textSecondary }]} numberOfLines={2}>
                    {acceptingItem.send?.url}
                  </Text>
                </View>
              )}

              {/* Editable Link Title */}
              <View style={styles.modalSectionHeader}>
                <Text style={[styles.modalSectionTitle, { color: theme.textMuted }]}>Link Title</Text>
                <Text style={[styles.modalSectionSubtitle, { color: theme.textMuted }]}>Keep original or edit before saving</Text>
              </View>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                value={titleInput}
                onChangeText={setTitleInput}
                placeholder="Title for your library (keep or edit)..."
                placeholderTextColor={theme.textMuted}
                autoCapitalize="sentences"
                returnKeyType="done"
              />

              {/* Destination Folder */}
              <Text style={[styles.modalSectionTitle, { color: theme.textMuted }]}>File into Folder</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalScrollRow}>
                <TouchableOpacity
                  style={[
                    styles.modalPill,
                    { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                    targetFolderId === null && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
                  ]}
                  onPress={() => setTargetFolderId(null)}
                >
                  <Text
                    style={[
                      styles.modalPillText,
                      { color: theme.textSecondary },
                      targetFolderId === null && { color: theme.accentText, fontWeight: '600' },
                    ]}
                  >
                    No folder (Unfiled)
                  </Text>
                </TouchableOpacity>
                {folders.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.modalPill,
                      { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
                      targetFolderId === f.id && { backgroundColor: theme.accentPrimary, borderColor: theme.accentPrimary },
                    ]}
                    onPress={() => setTargetFolderId(f.id)}
                  >
                    <Folder color={targetFolderId === f.id ? theme.accentText : '#f59e0b'} size={12} style={{ marginRight: 4 }} />
                    <Text
                      style={[
                        styles.modalPillText,
                        { color: theme.textSecondary },
                        targetFolderId === f.id && { color: theme.accentText, fontWeight: '600' },
                      ]}
                    >
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Personal Note / Comment */}
              <Text style={[styles.modalSectionTitle, { color: theme.textMuted }]}>Personal Note (Saved to your copy)</Text>
              <TextInput
                style={[styles.modalTextarea, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                value={commentInput}
                onChangeText={setCommentInput}
                placeholder="Add your note or retain friend recommendation note..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                autoCapitalize="sentences"
              />
            </ScrollView>

            {/* Fixed Footer Actions */}
            <View style={[styles.modalActions, { borderTopColor: theme.borderSubtle }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.surfaceSubtle }]}
                onPress={() => setAcceptingItem(null)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: theme.accentPrimary }, isAccepting && { opacity: 0.6 }]}
                disabled={isAccepting}
                onPress={handleConfirmAccept}
              >
                {isAccepting ? (
                  <ActivityIndicator size="small" color={theme.accentText} />
                ) : (
                  <>
                    <Check color={theme.accentText} size={16} />
                    <Text style={[styles.modalSubmitText, { color: theme.accentText }]}>Save to Library</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  senderInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reportBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    color: '#BCD94E',
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
  cardItemTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardUrlSubtext: {
    color: '#BCD94E',
    fontSize: 12,
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
    color: '#BCD94E',
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalScrollableBody: {
    maxHeight: 460,
  },
  modalScrollableContent: {
    paddingBottom: 8,
  },
  modalItemPreview: {
    backgroundColor: '#09090b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 14,
  },
  modalSenderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  modalSenderLabel: {
    color: '#BCD94E',
    fontSize: 12,
    fontWeight: '600',
  },
  modalUrlPreview: {
    color: '#d4d4d8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  modalSectionTitle: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 6,
  },
  modalSectionSubtitle: {
    color: '#71717a',
    fontSize: 11,
  },
  modalTextInput: {
    backgroundColor: '#09090b',
    color: '#fafafa',
    fontSize: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalTextarea: {
    backgroundColor: '#09090b',
    color: '#fafafa',
    fontSize: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 70,
    marginBottom: 10,
  },
  modalScrollRow: {
    marginBottom: 12,
  },
  modalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#27272a',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  modalPillActive: {
    backgroundColor: 'rgba(188, 217, 78, 0.15)',
    borderColor: '#BCD94E',
  },
  modalPillText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  modalPillTextActive: {
    color: '#BCD94E',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 14,
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
    backgroundColor: '#059669',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
