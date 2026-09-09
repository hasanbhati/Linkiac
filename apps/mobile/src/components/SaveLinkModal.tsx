import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Image,
} from 'react-native';
import { X, Bookmark, Check, Plus, Folder as FolderIcon } from 'lucide-react-native';
import { ReadingStatus, extractDefaultThumbnail } from '@linkiac/shared';
import { useApp } from '../context/AppContext';

interface SaveLinkModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SaveLinkModal({ visible, onClose }: SaveLinkModalProps) {
  const { addLink, folders } = useApp();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('to_read');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setComment('');
    setReadingStatus('to_read');
    setSelectedFolderId(null);
    setThumbnailUrl('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Auto-fetch preview on mobile when URL changes
  useEffect(() => {
    const raw = url.trim();
    if (!raw || !visible || !/^https?:\/\//i.test(raw)) return;

    // Immediately set default thumbnail if no custom thumbnail
    const defaultThumb = extractDefaultThumbnail(raw);
    if (defaultThumb && !thumbnailUrl) {
      setThumbnailUrl(defaultThumb);
    }

    const timer = setTimeout(async () => {
      try {
        // Fast-path oEmbed for YouTube
        if (raw.includes('youtube.com') || raw.includes('youtu.be')) {
          const ytMatch = raw.match(/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
          if (ytMatch && ytMatch[1]) {
            const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(raw)}&format=json`);
            if (res.ok) {
              const data = await res.json();
              if (data.title && !title) setTitle(data.title);
              if (data.thumbnail_url) setThumbnailUrl(data.thumbnail_url);
              return;
            }
          }
        }

        // Fast-path oEmbed for Spotify
        if (raw.includes('spotify.com')) {
          const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(raw)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.title && !title) setTitle(data.title);
            if (data.thumbnail_url) setThumbnailUrl(data.thumbnail_url);
            return;
          }
        }

        // Direct HTML fetch using social crawler User-Agent
        const res = await fetch(raw, {
          headers: {
            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });
        if (res.ok) {
          const html = await res.text();
          const titleMatch = html.substring(0, 200000).match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1] && !title) {
            setTitle(titleMatch[1].trim());
          }
          const ogImg =
            html.substring(0, 200000).match(/<meta[^>]+property=["']og:image(?::(?:url|secure_url))?["'][^>]+content=["']([^"']+)["']/i) ||
            html.substring(0, 200000).match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::(?:url|secure_url))?["']/i) ||
            html.substring(0, 200000).match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i);
          if (ogImg && ogImg[1]) {
            let imgUrl = ogImg[1].trim();
            if (!/^https?:\/\//i.test(imgUrl)) {
              try {
                imgUrl = new URL(imgUrl, raw).toString();
              } catch {}
            }
            setThumbnailUrl(imgUrl);
          }
        }
      } catch {
        // Fallback default thumbnail already set
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [url, visible]);

  const handleSave = async () => {
    if (!url.trim()) {
      setErrorMessage('Please enter a URL, idea snippet, or note to save.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const defaultThumb = extractDefaultThumbnail(url.trim());
      const finalThumb = thumbnailUrl.trim() || defaultThumb || null;

      await addLink({
        url: url.trim(),
        title: title.trim() || null,
        comment: comment.trim() || null,
        reading_status: readingStatus,
        category_id: null,
        folder_id: selectedFolderId,
        thumbnail_url: finalThumb,
      });

      handleClose();
    } catch (err) {
      setErrorMessage('Failed to save link. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bookmark color="#6366f1" size={20} />
              <Text style={styles.modalTitle}>Save Link or Note</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <X color="#a1a1aa" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* URL or Free Text */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                URL or Note / Idea <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="https://example.com, or paste an idea, snippet, or broken link"
                placeholderTextColor="#71717a"
                value={url}
                onChangeText={text => {
                  setUrl(text);
                  if (errorMessage) setErrorMessage(null);
                  if (!thumbnailUrl && text.trim()) {
                    const defaultThumb = extractDefaultThumbnail(text.trim());
                    if (defaultThumb) {
                      setThumbnailUrl(defaultThumb);
                    }
                  }
                }}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.hint}>
                Accepts any web URL, article, or arbitrary text snippet.
              </Text>
            </View>

            {/* Title (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Give this link or note a memorable title"
                placeholderTextColor="#71717a"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Personal Comment / Annotation */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Personal Note / Comment</Text>
              <TextInput
                style={[styles.input, styles.commentInput]}
                placeholder="Why is this useful? Key takeaways or notes..."
                placeholderTextColor="#71717a"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Reading Status Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reading Status</Text>
              <View style={styles.statusPills}>
                {(
                  [
                    { id: 'to_read', label: 'To Read' },
                    { id: 'reading', label: 'Reading' },
                    { id: 'done', label: 'Done' },
                  ] as const
                ).map(item => {
                  const isSelected = readingStatus === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setReadingStatus(item.id)}
                      style={[
                        styles.statusPill,
                        isSelected && styles.statusPillSelected,
                      ]}
                    >
                      {isSelected ? <Check color="#ffffff" size={14} style={{ marginRight: 4 }} /> : null}
                      <Text
                        style={[
                          styles.statusPillText,
                          isSelected && styles.statusPillTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Folder Selection */}
            {folders.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Folder (Optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.folderScroll}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedFolderId(null)}
                    style={[
                      styles.folderChip,
                      selectedFolderId === null && styles.folderChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.folderChipText,
                        selectedFolderId === null && styles.folderChipTextSelected,
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>

                  {folders.map(fld => {
                    const isSelected = selectedFolderId === fld.id;
                    return (
                      <TouchableOpacity
                        key={fld.id}
                        onPress={() => setSelectedFolderId(isSelected ? null : fld.id)}
                        style={[
                          styles.folderChip,
                          isSelected && styles.folderChipSelected,
                        ]}
                      >
                        <FolderIcon
                          color={isSelected ? '#ffffff' : '#f59e0b'}
                          size={12}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.folderChipText,
                            isSelected && styles.folderChipTextSelected,
                          ]}
                        >
                          {fld.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Thumbnail Preview & URL */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.label}>Thumbnail / Cover Image</Text>
                {thumbnailUrl ? (
                  <TouchableOpacity onPress={() => setThumbnailUrl('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {thumbnailUrl ? (
                <View style={styles.thumbnailPreviewContainer}>
                  <Image source={{ uri: thumbnailUrl }} style={styles.thumbnailPreviewImg} resizeMode="cover" />
                </View>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder="Auto-detected or paste custom image link..."
                placeholderTextColor="#71717a"
                value={thumbnailUrl}
                onChangeText={setThumbnailUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.cancelBtn}
              disabled={isSaving}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={styles.submitBtn}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Save to Library</Text>
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
    maxHeight: '90%',
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
  modalTitle: {
    color: '#fafafa',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    paddingHorizontal: 20,
  },
  formContainer: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#b91c1c',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
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
  required: {
    color: '#ef4444',
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
    minHeight: 50,
  },
  hint: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 4,
  },
  statusPills: {
    flexDirection: 'row',
    gap: 8,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
  },
  statusPillSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  statusPillText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
  statusPillTextSelected: {
    color: '#ffffff',
  },
  folderScroll: {
    flexDirection: 'row',
  },
  folderChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    marginRight: 8,
  },
  folderChipSelected: {
    backgroundColor: '#27272a',
    borderColor: '#818cf8',
  },
  folderChipText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  folderChipTextSelected: {
    color: '#fafafa',
    fontWeight: '600',
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
  submitBtn: {
    flex: 2,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  thumbnailPreviewContainer: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 8,
  },
  thumbnailPreviewImg: {
    width: '100%',
    height: '100%',
  },
});
