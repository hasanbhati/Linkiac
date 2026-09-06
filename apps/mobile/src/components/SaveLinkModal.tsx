import React, { useState } from 'react';
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
} from 'react-native';
import { X, Bookmark, Tag as TagIcon, Check, Plus } from 'lucide-react-native';
import { ReadingStatus } from '@linkiac/shared';
import { useApp } from '../context/AppContext';

interface SaveLinkModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SaveLinkModal({ visible, onClose }: SaveLinkModalProps) {
  const { addLink, categories } = useApp();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('to_read');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setComment('');
    setReadingStatus('to_read');
    setSelectedCategoryId(null);
    setTagInput('');
    setTags([]);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!url.trim()) {
      setErrorMessage('Please enter a URL, idea snippet, or note to save.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await addLink({
        url: url.trim(),
        title: title.trim() || null,
        comment: comment.trim() || null,
        reading_status: readingStatus,
        category_id: selectedCategoryId,
        tags,
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

            {/* Category Selector (Optional) */}
            {categories.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    onPress={() => setSelectedCategoryId(null)}
                    style={[
                      styles.categoryChip,
                      selectedCategoryId === null && styles.categoryChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategoryId === null && styles.categoryChipTextSelected,
                      ]}
                    >
                      Uncategorized
                    </Text>
                  </TouchableOpacity>
                  {categories.map(cat => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setSelectedCategoryId(cat.id)}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            isSelected && styles.categoryChipTextSelected,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Tags */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tags</Text>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.input, styles.tagTextInput]}
                  placeholder="Add tag (e.g. frontend, ai)"
                  placeholderTextColor="#71717a"
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={handleAddTag}
                  style={styles.addTagBtn}
                  disabled={!tagInput.trim()}
                >
                  <Plus color="#ffffff" size={16} />
                </TouchableOpacity>
              </View>
              {tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {tags.map(t => (
                    <View key={t} style={styles.tagBadge}>
                      <TagIcon color="#818cf8" size={12} />
                      <Text style={styles.tagBadgeText}>#{t}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveTag(t)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X color="#a1a1aa" size={12} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
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
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#27272a',
    borderColor: '#818cf8',
  },
  categoryChipText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  categoryChipTextSelected: {
    color: '#fafafa',
    fontWeight: '600',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagTextInput: {
    flex: 1,
  },
  addTagBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagBadgeText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '500',
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
});
