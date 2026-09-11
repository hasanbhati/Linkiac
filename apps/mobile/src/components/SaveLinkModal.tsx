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
import { ReadingStatus, extractDefaultThumbnail, validatePreviewUrl } from '@linkiac/shared';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

interface SaveLinkModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SaveLinkModal({ visible, onClose }: SaveLinkModalProps) {
  const { addLink, folders } = useApp();
  const { theme, isDark } = useTheme();

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
        const validation = validatePreviewUrl(raw);
        if (!validation.safe) return;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        try {
          // Fast-path oEmbed for YouTube
          if (raw.includes('youtube.com') || raw.includes('youtu.be')) {
            const ytMatch = raw.match(/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
            if (ytMatch && ytMatch[1]) {
              const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(raw)}&format=json`, {
                signal: controller.signal,
              });
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
            const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(raw)}`, {
              signal: controller.signal,
            });
            if (res.ok) {
              const data = await res.json();
              if (data.title && !title) setTitle(data.title);
              if (data.thumbnail_url) setThumbnailUrl(data.thumbnail_url);
              return;
            }
          }

          // Direct HTML fetch using social crawler User-Agent
          const res = await fetch(raw, {
            signal: controller.signal,
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
        } finally {
          clearTimeout(timeoutId);
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
        <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <Bookmark color={theme.accentPrimary} size={20} />
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Save Link or Note</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <X color={theme.textMuted} size={20} />
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
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                URL or Note / Idea <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="https://example.com, or paste an idea, snippet, or broken link"
                placeholderTextColor={theme.textMuted}
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
              <Text style={[styles.hint, { color: theme.textMuted }]}>
                Accepts any web URL, article, or arbitrary text snippet.
              </Text>
            </View>

            {/* Title (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Title (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Give this link or note a memorable title"
                placeholderTextColor={theme.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Personal Comment / Annotation */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Personal Note / Comment</Text>
              <TextInput
                style={[styles.input, styles.commentInput, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Why is this useful? Key takeaways or notes..."
                placeholderTextColor={theme.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Reading Status Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Reading Status</Text>
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
                        {
                          backgroundColor: isSelected ? theme.accentPrimary : theme.surfaceSubtle,
                          borderColor: isSelected ? theme.accentPrimary : theme.border,
                        },
                      ]}
                    >
                      {isSelected ? <Check color={theme.accentText} size={14} style={{ marginRight: 4 }} /> : null}
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color: isSelected ? theme.accentText : theme.textSecondary,
                            fontWeight: isSelected ? '700' : '600',
                          },
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
                <Text style={[styles.label, { color: theme.textPrimary }]}>Folder (Optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.folderScroll}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedFolderId(null)}
                    style={[
                      styles.folderChip,
                      {
                        backgroundColor: selectedFolderId === null ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)') : theme.surfaceSubtle,
                        borderColor: selectedFolderId === null ? '#f59e0b' : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.folderChipText,
                        {
                          color: selectedFolderId === null ? (isDark ? '#fbbf24' : '#b45309') : theme.textSecondary,
                          fontWeight: selectedFolderId === null ? '600' : '500',
                        },
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
                          {
                            backgroundColor: isSelected ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)') : theme.surfaceSubtle,
                            borderColor: isSelected ? '#f59e0b' : theme.border,
                          },
                        ]}
                      >
                        <FolderIcon
                          color={isSelected ? (isDark ? '#fbbf24' : '#b45309') : '#f59e0b'}
                          size={12}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.folderChipText,
                            {
                              color: isSelected ? (isDark ? '#fbbf24' : '#b45309') : theme.textSecondary,
                              fontWeight: isSelected ? '600' : '500',
                            },
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
                <Text style={[styles.label, { color: theme.textPrimary }]}>Thumbnail / Cover Image</Text>
                {thumbnailUrl ? (
                  <TouchableOpacity onPress={() => setThumbnailUrl('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {thumbnailUrl ? (
                <View style={[styles.thumbnailPreviewContainer, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                  <Image source={{ uri: thumbnailUrl }} style={styles.thumbnailPreviewImg} resizeMode="cover" />
                </View>
              ) : null}

              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Auto-detected or paste custom image link..."
                placeholderTextColor={theme.textMuted}
                value={thumbnailUrl}
                onChangeText={setThumbnailUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.cancelBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
              disabled={isSaving}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.submitBtn, { backgroundColor: theme.accentPrimary }]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.accentText} />
              ) : (
                <Text style={[styles.submitBtnText, { color: theme.accentText }]}>Save to Library</Text>
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
    backgroundColor: 'rgba(188, 217, 78, 0.15)',
    borderColor: '#BCD94E',
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
    borderColor: '#BCD94E',
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
