import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Check, X, User, ExternalLink, Inbox as InboxIcon, MessageSquare } from 'lucide-react-native';
import { isSafeWebUrl, ensureUrlProtocol } from '@linkiac/shared';
import { useApp } from '../../src/context/AppContext';

export default function MobileInboxScreen() {
  const { suggestions, acceptSuggestion, rejectSuggestion } = useApp();
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const handleAccept = async (id: string, url: string) => {
    setProcessingId(id);
    try {
      const link = await acceptSuggestion(id);
      if (link) {
        Alert.alert(
          'Saved to Library!',
          'This suggestion has been accepted and added to your personal library.'
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to accept suggestion to library.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Suggestions Inbox</Text>
      <Text style={styles.subheading}>Links sent privately from your accepted friends</Text>

      <FlatList
        data={suggestions}
        keyExtractor={item => item.id}
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
                  onPress={() => handleAccept(item.id, url)}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Check color="#ffffff" size={16} />
                      <Text style={styles.acceptText}>Accept to Library</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
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
});
