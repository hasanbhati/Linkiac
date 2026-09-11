import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  Platform,
  Image,
} from 'react-native';
import * as Linking from 'expo-linking';
import {
  X,
  Plus,
  ExternalLink,
  Share2,
  Trash2,
  Clock,
  BookOpen,
  CheckCircle2,
  Globe,
  Folder,
  Send,
} from 'lucide-react-native';
import { Link, ReadingStatus, isSafeWebUrl, ensureUrlProtocol, extractDefaultThumbnail } from '@linkiac/shared';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

interface LinkDetailModalProps {
  visible: boolean;
  link: Link | null;
  onClose: () => void;
  onShareToFriends?: (link: Link) => void;
}

export function LinkDetailModal({ visible, link, onClose, onShareToFriends }: LinkDetailModalProps) {
  const { updateLink, deleteLink, folders } = useApp();
  const { theme, isDark } = useTheme();

  if (!link) return null;

  const isWebUrl = isSafeWebUrl(link.url);

  const handleOpenBrowser = async () => {
    if (!isWebUrl) {
      Alert.alert('Not a Web URL', 'This saved item is free-form text or a note, not an HTTP/HTTPS web address.');
      return;
    }
    const targetUrl = ensureUrlProtocol(link.url);
    try {
      await Linking.openURL(targetUrl);
    } catch {
      Alert.alert('Cannot Open URL', `Unable to open: ${targetUrl}`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: link.title || 'Saved Link / Note',
        message: link.url,
      });
    } catch {
      // Ignored
    }
  };

  const handleStatusChange = async (status: ReadingStatus) => {
    await updateLink(link.id, { reading_status: status });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this from your library?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLink(link.id);
            onClose();
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
            <View style={styles.headerLeft}>
              {isWebUrl ? (
                <Globe color={theme.accentPrimary} size={18} />
              ) : (
                <BookOpen color={theme.textMuted} size={18} />
              )}
              <Text style={[styles.headerTitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {isWebUrl ? 'Web Link' : 'Saved Note'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <X color={theme.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.body}>
            {/* Thumbnail Header */}
            {(() => {
              const effectiveThumbnail = link.thumbnail_url || extractDefaultThumbnail(link.url);
              if (!effectiveThumbnail) return null;
              const isFavicon = effectiveThumbnail.includes('google.com/s2/favicons');
              return (
                <View style={[styles.detailThumbnailContainer, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }, isFavicon && styles.detailFaviconContainer]}>
                  <Image
                    source={{ uri: effectiveThumbnail }}
                    style={isFavicon ? styles.detailFaviconImg : styles.detailThumbnailImg}
                    resizeMode={isFavicon ? 'contain' : 'cover'}
                  />
                </View>
              );
            })()}

            {/* Title */}
            {link.title ? (
              <Text style={[styles.title, { color: theme.textPrimary }]}>{link.title}</Text>
            ) : null}

            {/* URL or Content */}
            <View style={[styles.contentBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
              <Text style={[styles.contentLabel, { color: theme.textMuted }]}>
                {isWebUrl ? 'Destination URL' : 'Content / Snippet'}
              </Text>
              <Text style={[styles.contentText, { color: theme.textPrimary }]} selectable>
                {link.url}
              </Text>
            </View>

            {/* Comment */}
            {link.comment ? (
              <View style={[styles.commentBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                <Text style={[styles.commentLabel, { color: theme.textMuted }]}>Personal Note</Text>
                <Text style={[styles.commentText, { color: theme.textSecondary }]}>"{link.comment}"</Text>
              </View>
            ) : null}

            {/* Status pills */}
            <View style={styles.statusSection}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Reading Status</Text>
              <View style={styles.statusRow}>
                {(
                  [
                    { id: 'to_read', label: 'To Read', icon: Clock, color: '#f59e0b' },
                    { id: 'reading', label: 'Reading', icon: BookOpen, color: isDark ? '#38bdf8' : '#0284c7' },
                    { id: 'done', label: 'Done', icon: CheckCircle2, color: '#10b981' },
                  ] as const
                ).map(item => {
                  const isSelected = link.reading_status === item.id;
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleStatusChange(item.id)}
                      style={[
                        styles.statusBtn,
                        {
                          backgroundColor: isSelected ? `${item.color}20` : theme.surfaceSubtle,
                          borderColor: isSelected ? item.color : theme.border,
                        },
                      ]}
                    >
                      <Icon
                        color={isSelected ? item.color : theme.textMuted}
                        size={14}
                      />
                      <Text
                        style={[
                          styles.statusBtnText,
                          {
                            color: isSelected ? (isDark ? '#fafafa' : item.color) : theme.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
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

            {/* Folder */}
            {folders.length > 0 && (
              <View style={styles.categorizeSection}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Folder</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  <TouchableOpacity
                    onPress={() => updateLink(link.id, { folder_id: null })}
                    style={[
                      styles.smallChip,
                      {
                        backgroundColor: !link.folder_id ? theme.accentPrimaryMuted : theme.surfaceSubtle,
                        borderColor: !link.folder_id ? theme.accentPrimary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.smallChipText,
                        {
                          color: !link.folder_id ? theme.accentPrimary : theme.textSecondary,
                          fontWeight: !link.folder_id ? '600' : '500',
                        },
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {folders.map(f => {
                    const isSelected = link.folder_id === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => updateLink(link.id, { folder_id: isSelected ? null : f.id })}
                        style={[
                          styles.smallChip,
                          {
                            backgroundColor: isSelected ? theme.accentPrimaryMuted : theme.surfaceSubtle,
                            borderColor: isSelected ? theme.accentPrimary : theme.border,
                          },
                        ]}
                      >
                        <Folder color={isSelected ? theme.accentPrimary : '#f59e0b'} size={11} style={{ marginRight: 4 }} />
                        <Text
                          style={[
                            styles.smallChipText,
                            {
                              color: isSelected ? theme.accentPrimary : theme.textSecondary,
                              fontWeight: isSelected ? '600' : '500',
                            },
                          ]}
                        >
                          {f.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Meta info */}
            <View style={[styles.metaRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                Saved on {new Date(link.created_at).toLocaleDateString()}
              </Text>
              {link.domain ? (
                <Text style={[styles.metaDomain, { color: theme.accentPrimary }]}>{link.domain}</Text>
              ) : null}
            </View>
          </ScrollView>

          {/* Action Footer (Redesigned 2-Tier Layout) */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            {isWebUrl ? (
              <TouchableOpacity
                onPress={handleOpenBrowser}
                style={[styles.openBrowserBtn, { backgroundColor: theme.accentPrimary }]}
                activeOpacity={0.8}
              >
                <ExternalLink color={theme.accentText} size={16} />
                <Text style={[styles.openBrowserBtnText, { color: theme.accentText }]}>Open in Browser</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                onPress={() => {
                  if (onShareToFriends) {
                    onShareToFriends(link);
                  }
                }}
                style={[styles.actionIconBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
                activeOpacity={0.7}
              >
                <Send color={theme.accentPrimary} size={15} />
                <Text style={[styles.actionBtnLabel, { color: theme.textPrimary }]}>Send</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={[styles.actionIconBtn, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}
                activeOpacity={0.7}
              >
                <Share2 color={theme.textSecondary} size={15} />
                <Text style={[styles.actionBtnLabel, { color: theme.textPrimary }]}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.deleteBtn, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
                activeOpacity={0.7}
              >
                <Trash2 color={theme.danger} size={15} />
                <Text style={[styles.deleteBtnLabel, { color: theme.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>
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
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    paddingHorizontal: 20,
  },
  body: {
    paddingVertical: 16,
  },
  title: {
    color: '#fafafa',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 24,
  },
  contentBox: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 12,
  },
  contentLabel: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  contentText: {
    color: '#e4e4e7',
    fontSize: 14,
    lineHeight: 20,
  },
  commentBox: {
    backgroundColor: '#1c1917',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#44403c',
    marginBottom: 16,
  },
  commentLabel: {
    color: '#a8a29e',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    color: '#fafaf9',
    fontSize: 13,
    fontStyle: 'italic',
  },
  statusSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
  },
  statusBtnText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  categorizeSection: {
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  smallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  smallChipActive: {
    backgroundColor: 'rgba(188, 217, 78, 0.15)',
    borderColor: '#BCD94E',
  },
  smallChipText: {
    color: '#a1a1aa',
    fontSize: 11,
  },
  smallChipTextActive: {
    color: '#BCD94E',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  metaText: {
    color: '#71717a',
    fontSize: 11,
  },
  metaDomain: {
    color: '#BCD94E',
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    gap: 10,
  },
  openBrowserBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    elevation: 3,
  },
  openBrowserBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  actionIconBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
  },
  actionBtnLabel: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '500',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: '#271214',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 10,
  },
  deleteBtnLabel: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  detailThumbnailContainer: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 14,
  },
  detailThumbnailImg: {
    width: '100%',
    height: '100%',
  },
  detailFaviconContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181b',
  },
  detailFaviconImg: {
    width: 48,
    height: 48,
  },
});
