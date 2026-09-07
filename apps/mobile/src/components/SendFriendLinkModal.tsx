import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Send, User } from 'lucide-react-native';
import { Friendship } from '@linkiac/shared';
import { useApp } from '../context/AppContext';

interface SendFriendLinkModalProps {
  visible: boolean;
  friendship: Friendship | null;
  onClose: () => void;
}

export function SendFriendLinkModal({
  visible,
  friendship,
  onClose,
}: SendFriendLinkModalProps) {
  const { currentUser, sendLinkToFriend } = useApp();
  const [url, setUrl] = useState('');
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!friendship) return null;

  const other = friendship.requester_id === currentUser.id ? friendship.recipient : friendship.requester;
  const friendUsername = other?.username || 'friend';
  const friendDisplayName = other?.display_name || friendUsername;
  const recipientId = friendship.requester_id === currentUser.id ? friendship.recipient_id : friendship.requester_id;

  const handleSend = async () => {
    if (!url.trim()) {
      Alert.alert('Missing URL or Content', 'Please enter a URL, article link, or note to share.');
      return;
    }

    setIsSending(true);
    try {
      await sendLinkToFriend({
        url: url.trim(),
        comment: comment.trim() || null,
        recipient_id: recipientId,
      });

      setUrl('');
      setComment('');
      onClose();
      Alert.alert(
        'Link Sent!',
        `Your link was successfully sent to @${friendUsername}'s suggestions inbox.`
      );
    } catch {
      Alert.alert('Error', 'Failed to send link. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

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
              <Text style={styles.headerTitle}>Send Link to @{friendUsername}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X color="#a1a1aa" size={20} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.body}>
            <View style={styles.recipientBadge}>
              <User color="#818cf8" size={14} />
              <Text style={styles.recipientText}>
                Recipient: {friendDisplayName} (@{friendUsername})
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>URL or Content to Share *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="https://example.com/article, or any idea note"
                placeholderTextColor="#71717a"
                value={url}
                onChangeText={setUrl}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Personal Message (Optional)</Text>
              <TextInput
                style={[styles.input, styles.commentInput]}
                placeholder="Why are you recommending this link?"
                placeholderTextColor="#71717a"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>

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
              style={styles.sendBtn}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send color="#ffffff" size={15} />
                  <Text style={styles.sendBtnText}>Send to Friend</Text>
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
  body: {
    padding: 20,
  },
  recipientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  recipientText: {
    color: '#c7d2fe',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fafafa',
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 70,
  },
  commentInput: {
    minHeight: 55,
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
  sendBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
