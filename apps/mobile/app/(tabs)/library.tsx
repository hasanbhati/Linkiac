import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import * as Linking from 'expo-linking';
import {
  Plus,
  Search,
  ExternalLink,
  MoreHorizontal,
  BookOpen,
  Clock,
  CheckCircle2,
  Folder,
  Tag,
  Layers,
  FolderPlus,
  Check,
  Trash2,
  X,
  Send,
} from 'lucide-react-native';
import { Link, isSafeWebUrl, ensureUrlProtocol, extractDefaultThumbnail } from '@linkiac/shared';
import { useApp } from '../../src/context/AppContext';
import { SaveLinkModal } from '../../src/components/SaveLinkModal';
import { LinkDetailModal } from '../../src/components/LinkDetailModal';
import { ManageFoldersModal } from '../../src/components/ManageFoldersModal';
import { SendLinkToFriendsModal } from '../../src/components/SendLinkToFriendsModal';

export default function MobileLibraryScreen() {
  const { links, categories, folders, syncAllFromSupabase, bulkMoveLinks, bulkDeleteLinks } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); // null = all, 'unfiled' = unfiled, or UUID
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);

  // Bulk selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isSendFriendsModalOpen, setIsSendFriendsModalOpen] = useState(false);
  const [moveTargetCategoryId, setMoveTargetCategoryId] = useState<string | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // Selected links derived from selectedLinkIds
  const selectedLinks = useMemo(() => {
    return links.filter(l => selectedLinkIds.has(l.id));
  }, [links, selectedLinkIds]);

  // Available folders filtered by selected category if applicable
  const availableFolders = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === 'unfiled') {
      return folders;
    }
    return folders.filter(f => f.category_id === selectedCategoryId);
  }, [folders, selectedCategoryId]);

  // Filter links by search query, category, and folder
  const filteredLinks = useMemo(() => {
    return links.filter(item => {
      // 1. Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchUrl = item.url.toLowerCase().includes(query);
        const matchDomain = item.domain?.toLowerCase().includes(query);
        const matchComment = item.comment?.toLowerCase().includes(query);
        const matchTags = item.tags?.some(t => t.name.toLowerCase().includes(query));
        if (!matchTitle && !matchUrl && !matchDomain && !matchComment && !matchTags) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategoryId === 'unfiled') {
        if (item.category_id || item.folder_id) return false;
      } else if (selectedCategoryId !== null) {
        if (item.category_id !== selectedCategoryId) return false;
      }

      // 3. Folder filter
      if (selectedFolderId !== null) {
        if (item.folder_id !== selectedFolderId) return false;
      }

      return true;
    });
  }, [links, search, selectedCategoryId, selectedFolderId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllFromSupabase();
    setRefreshing(false);
  }, [syncAllFromSupabase]);

  const toggleSelectLink = (id: string) => {
    setSelectedLinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCardLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedLinkIds(new Set([id]));
    } else {
      toggleSelectLink(id);
    }
  };

  const toggleSelectAll = () => {
    const allFilteredIds = filteredLinks.map((l) => l.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedLinkIds.has(id));
    if (isAllSelected) {
      setSelectedLinkIds(new Set());
    } else {
      setSelectedLinkIds(new Set(allFilteredIds));
    }
  };

  const handleBulkDelete = () => {
    if (selectedLinkIds.size === 0) return;
    const count = selectedLinkIds.size;
    Alert.alert(
      `Delete ${count} Link${count === 1 ? '' : 's'}`,
      `Are you sure you want to permanently delete ${count} selected link${count === 1 ? '' : 's'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bulkDeleteLinks(Array.from(selectedLinkIds));
              setSelectedLinkIds(new Set());
              setIsSelectionMode(false);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete selected links.');
            }
          },
        },
      ]
    );
  };

  const handleBulkMove = async () => {
    if (selectedLinkIds.size === 0) return;
    setIsBulkMoving(true);
    try {
      await bulkMoveLinks(Array.from(selectedLinkIds), moveTargetCategoryId, moveTargetFolderId);
      setSelectedLinkIds(new Set());
      setIsSelectionMode(false);
      setIsMoveModalOpen(false);
      Alert.alert('Success', `Moved selected link(s).`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to move links.');
    } finally {
      setIsBulkMoving(false);
    }
  };

  const handleLinkPress = async (item: Link) => {
    const isWeb = isSafeWebUrl(item.url);
    if (isWeb) {
      const targetUrl = ensureUrlProtocol(item.url);
      try {
        await Linking.openURL(targetUrl);
      } catch {
        setSelectedLink(item);
      }
    } else {
      setSelectedLink(item);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reading':
        return (
          <View style={[styles.statusBadge, styles.statusReading]}>
            <BookOpen color="#a5b4fc" size={12} />
            <Text style={[styles.statusText, { color: '#a5b4fc' }]}>Reading</Text>
          </View>
        );
      case 'done':
        return (
          <View style={[styles.statusBadge, styles.statusDone]}>
            <CheckCircle2 color="#6ee7b7" size={12} />
            <Text style={[styles.statusText, { color: '#6ee7b7' }]}>Done</Text>
          </View>
        );
      case 'to_read':
      default:
        return (
          <View style={[styles.statusBadge, styles.statusToRead]}>
            <Clock color="#d4d4d8" size={12} />
            <Text style={[styles.statusText, { color: '#d4d4d8' }]}>To Read</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Row with Selection Mode Toggle */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Library</Text>
        <TouchableOpacity
          style={[styles.selectModeBtn, isSelectionMode && styles.selectModeBtnActive]}
          onPress={() => {
            if (isSelectionMode) {
              setIsSelectionMode(false);
              setSelectedLinkIds(new Set());
            } else {
              setIsSelectionMode(true);
            }
          }}
        >
          <Text style={[styles.selectModeBtnText, isSelectionMode && styles.selectModeBtnTextActive]}>
            {isSelectionMode ? 'Done' : 'Select'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Action Bar */}
      <View style={styles.searchBar}>
        <Search color="#71717a" size={18} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search links, notes, tags..."
          placeholderTextColor="#71717a"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearSearchText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Pills Bar */}
      <View style={styles.categoryBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.catPill, selectedCategoryId === null && styles.catPillActive]}
            activeOpacity={0.8}
            onPress={() => {
              setSelectedCategoryId(null);
              setSelectedFolderId(null);
            }}
          >
            <Text style={[styles.catPillText, selectedCategoryId === null && styles.catPillTextActive]}>
              All ({links.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.catPill, selectedCategoryId === 'unfiled' && styles.catPillActive]}
            activeOpacity={0.8}
            onPress={() => {
              setSelectedCategoryId('unfiled');
              setSelectedFolderId(null);
            }}
          >
            <Text style={[styles.catPillText, selectedCategoryId === 'unfiled' && styles.catPillTextActive]}>
              Unfiled ({links.filter((l) => !l.category_id && !l.folder_id).length})
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const count = links.filter((l) => l.category_id === cat.id).length;
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catPill, isSelected && styles.catPillActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedCategoryId(isSelected ? null : cat.id);
                  setSelectedFolderId(null);
                }}
              >
                <Tag color={isSelected ? '#ffffff' : '#818cf8'} size={12} style={{ marginRight: 4 }} />
                <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                  {cat.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.managePill}
            activeOpacity={0.8}
            onPress={() => setIsManageModalOpen(true)}
          >
            <Layers color="#a1a1aa" size={13} style={{ marginRight: 4 }} />
            <Text style={styles.managePillText}>+ Organize</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Folder Pills Bar (shown if folders exist) */}
      {availableFolders.length > 0 && selectedCategoryId !== 'unfiled' && (
        <View style={styles.folderBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderScroll}>
            <TouchableOpacity
              style={[styles.folderChip, selectedFolderId === null && styles.folderChipActive]}
              onPress={() => setSelectedFolderId(null)}
            >
              <Text style={[styles.folderChipText, selectedFolderId === null && styles.folderChipTextActive]}>
                All Folders
              </Text>
            </TouchableOpacity>

            {availableFolders.map((f) => {
              const fCount = links.filter((l) => l.folder_id === f.id).length;
              const isSelected = selectedFolderId === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.folderChip, isSelected && styles.folderChipActive]}
                  onPress={() => setSelectedFolderId(isSelected ? null : f.id)}
                >
                  <Folder color={isSelected ? '#ffffff' : '#f59e0b'} size={12} style={{ marginRight: 4 }} />
                  <Text style={[styles.folderChipText, isSelected && styles.folderChipTextActive]}>
                    {f.name} ({fCount})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Quick Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.8}
        onPress={() => setIsSaveModalOpen(true)}
      >
        <Plus color="#ffffff" size={20} />
        <Text style={styles.addButtonText}>Save Link or Note</Text>
      </TouchableOpacity>

      {/* Link List */}
      <FlatList
        data={filteredLinks}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          isSelectionMode && { paddingBottom: 110 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BookOpen color="#3f3f46" size={48} />
            <Text style={styles.emptyTitle}>
              {search ? 'No matching links or notes' : 'Your library is empty'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try a different search term or clear the filter.'
                : 'Tap "Save Link or Note" above to add your first link or idea!'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedLinkIds.has(item.id);
          const effectiveThumbnail = item.thumbnail_url || extractDefaultThumbnail(item.url);
          const isFavicon = effectiveThumbnail?.includes('google.com/s2/favicons');

          return (
            <TouchableOpacity
              style={[
                styles.card,
                isSelectionMode && isSelected && styles.cardSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (isSelectionMode) {
                  toggleSelectLink(item.id);
                } else {
                  handleLinkPress(item);
                }
              }}
              onLongPress={() => handleCardLongPress(item.id)}
            >
              {effectiveThumbnail ? (
                <View style={[styles.cardThumbnailWrapper, isFavicon && styles.cardFaviconWrapper]}>
                  <Image
                    source={{ uri: effectiveThumbnail }}
                    style={isFavicon ? styles.cardFaviconImg : styles.cardThumbnailImg}
                    resizeMode={isFavicon ? 'contain' : 'cover'}
                  />
                </View>
              ) : null}

              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  {isSelectionMode && (
                    <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                      {isSelected && <Check color="#ffffff" size={13} strokeWidth={3} />}
                    </View>
                  )}
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title || item.url}
                  </Text>
                  {getStatusBadge(item.reading_status)}
                </View>

                <Text style={styles.cardUrl} numberOfLines={1}>
                  {item.url}
                </Text>

              {/* Category & Folder Badges */}
              {(() => {
                const cat = categories.find((c) => c.id === item.category_id);
                const fld = folders.find((f) => f.id === item.folder_id);
                if (!cat && !fld) return null;
                return (
                  <View style={styles.cardMetaRow}>
                    {cat && (
                      <View style={styles.cardCatBadge}>
                        <Tag color="#818cf8" size={10} />
                        <Text style={styles.cardCatBadgeText}>{cat.name}</Text>
                      </View>
                    )}
                    {fld && (
                      <View style={styles.cardFolderBadge}>
                        <Folder color="#f59e0b" size={10} />
                        <Text style={styles.cardFolderBadgeText}>{fld.name}</Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {item.comment ? (
                <Text style={styles.commentText} numberOfLines={2}>
                  "{item.comment}"
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                {item.domain ? (
                  <View style={styles.domainTag}>
                    <ExternalLink color="#a1a1aa" size={12} />
                    <Text style={styles.domainText}>{item.domain}</Text>
                  </View>
                ) : (
                  <View style={styles.domainTag}>
                    <Text style={styles.domainText}>Note / Snippet</Text>
                  </View>
                )}

                {!isSelectionMode && (
                  <TouchableOpacity
                    style={styles.detailsBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedLink(item);
                    }}
                  >
                    <MoreHorizontal color="#a1a1aa" size={16} />
                    <Text style={styles.detailsBtnText}>Details</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
        }}
      />

      {/* Bulk Selection Floating Action Bar */}
      {isSelectionMode && (
        <View style={styles.floatingActionBar}>
          <View style={styles.actionBarLeft}>
            <Text style={styles.actionSelectedCount}>
              {selectedLinkIds.size} selected
            </Text>
            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
              <Text style={styles.selectAllBtnText}>
                {filteredLinks.length > 0 && filteredLinks.every((l) => selectedLinkIds.has(l.id))
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionBarButtons}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnSend,
                selectedLinkIds.size === 0 && styles.actionBtnDisabled,
              ]}
              disabled={selectedLinkIds.size === 0}
              onPress={() => setIsSendFriendsModalOpen(true)}
            >
              <Send color="#ffffff" size={15} />
              <Text style={styles.actionBtnText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnMove,
                selectedLinkIds.size === 0 && styles.actionBtnDisabled,
              ]}
              disabled={selectedLinkIds.size === 0}
              onPress={() => {
                setMoveTargetCategoryId(null);
                setMoveTargetFolderId(null);
                setIsMoveModalOpen(true);
              }}
            >
              <Folder color="#ffffff" size={15} />
              <Text style={styles.actionBtnText}>Move</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnDelete,
                selectedLinkIds.size === 0 && styles.actionBtnDisabled,
              ]}
              disabled={selectedLinkIds.size === 0}
              onPress={handleBulkDelete}
            >
              <Trash2 color="#ffffff" size={15} />
              <Text style={styles.actionBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bulk Move Modal */}
      <Modal
        visible={isMoveModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsMoveModalOpen(false)}
      >
        <View style={styles.moveModalOverlay}>
          <View style={styles.moveModalContent}>
            <View style={styles.moveModalHeader}>
              <Text style={styles.moveModalTitle}>
                Move {selectedLinkIds.size} Link{selectedLinkIds.size === 1 ? '' : 's'}
              </Text>
              <TouchableOpacity onPress={() => setIsMoveModalOpen(false)}>
                <X color="#a1a1aa" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.moveModalSubtitle}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moveScrollRow}>
              <TouchableOpacity
                style={[
                  styles.moveModalPill,
                  moveTargetCategoryId === null && styles.moveModalPillActive,
                ]}
                onPress={() => {
                  setMoveTargetCategoryId(null);
                  setMoveTargetFolderId(null);
                }}
              >
                <Text
                  style={[
                    styles.moveModalPillText,
                    moveTargetCategoryId === null && styles.moveModalPillTextActive,
                  ]}
                >
                  None (Unfiled)
                </Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.moveModalPill,
                    moveTargetCategoryId === c.id && styles.moveModalPillActive,
                  ]}
                  onPress={() => {
                    setMoveTargetCategoryId(c.id);
                    setMoveTargetFolderId(null);
                  }}
                >
                  <Tag color={moveTargetCategoryId === c.id ? '#ffffff' : '#818cf8'} size={12} style={{ marginRight: 4 }} />
                  <Text
                    style={[
                      styles.moveModalPillText,
                      moveTargetCategoryId === c.id && styles.moveModalPillTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.moveModalSubtitle}>Select Folder (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moveScrollRow}>
              <TouchableOpacity
                style={[
                  styles.moveModalPill,
                  moveTargetFolderId === null && styles.moveModalPillActive,
                ]}
                onPress={() => setMoveTargetFolderId(null)}
              >
                <Text
                  style={[
                    styles.moveModalPillText,
                    moveTargetFolderId === null && styles.moveModalPillTextActive,
                  ]}
                >
                  No Folder
                </Text>
              </TouchableOpacity>
              {folders
                .filter((f) => !moveTargetCategoryId || f.category_id === moveTargetCategoryId)
                .map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.moveModalPill,
                      moveTargetFolderId === f.id && styles.moveModalPillActive,
                    ]}
                    onPress={() => setMoveTargetFolderId(f.id)}
                  >
                    <Folder color={moveTargetFolderId === f.id ? '#ffffff' : '#f59e0b'} size={12} style={{ marginRight: 4 }} />
                    <Text
                      style={[
                        styles.moveModalPillText,
                        moveTargetFolderId === f.id && styles.moveModalPillTextActive,
                      ]}
                    >
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.moveModalActions}>
              <TouchableOpacity
                style={styles.moveModalCancelBtn}
                onPress={() => setIsMoveModalOpen(false)}
              >
                <Text style={styles.moveModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moveModalSubmitBtn, isBulkMoving && { opacity: 0.6 }]}
                onPress={handleBulkMove}
                disabled={isBulkMoving}
              >
                <Text style={styles.moveModalSubmitText}>
                  {isBulkMoving ? 'Moving...' : 'Move Links'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Save Link Modal */}
      <SaveLinkModal
        visible={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />

      {/* Link / Note Detail Modal */}
      <LinkDetailModal
        visible={!!selectedLink}
        link={selectedLink}
        onClose={() => setSelectedLink(null)}
      />

      {/* Manage Folders & Categories Modal */}
      <ManageFoldersModal
        visible={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />

      {/* Send Selected Links to Friends Modal */}
      <SendLinkToFriendsModal
        visible={isSendFriendsModalOpen}
        links={selectedLinks}
        onClose={() => setIsSendFriendsModalOpen(false)}
        onSuccess={() => {
          setIsSelectionMode(false);
          setSelectedLinkIds(new Set());
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  searchInput: {
    flex: 1,
    color: '#fafafa',
    marginLeft: 8,
    fontSize: 14,
  },
  clearSearchText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  categoryBarContainer: {
    marginBottom: 10,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  catPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  catPillText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  catPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  managePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  managePillText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '600',
  },
  folderBarContainer: {
    marginBottom: 12,
  },
  folderScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  folderChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: '#f59e0b',
  },
  folderChipText: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '500',
  },
  folderChipTextActive: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  cardCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  cardCatBadgeText: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '600',
  },
  cardFolderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  cardFolderBadgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 46,
    marginBottom: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  cardThumbnailWrapper: {
    width: '100%',
    height: 120,
    backgroundColor: '#09090b',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  cardThumbnailImg: {
    width: '100%',
    height: '100%',
  },
  cardFaviconWrapper: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141417',
  },
  cardFaviconImg: {
    width: 32,
    height: 32,
  },
  cardBody: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    color: '#fafafa',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusReading: {
    backgroundColor: '#1e1b4b',
  },
  statusToRead: {
    backgroundColor: '#27272a',
  },
  statusDone: {
    backgroundColor: '#064e3b',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardUrl: {
    color: '#a1a1aa',
    fontSize: 13,
    marginBottom: 8,
  },
  commentText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontStyle: 'italic',
    backgroundColor: '#141416',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#6366f1',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  domainTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  domainText: {
    color: '#71717a',
    fontSize: 12,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  detailsBtnText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#71717a',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  selectModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#27272a',
  },
  selectModeBtnActive: {
    backgroundColor: '#4f46e5',
  },
  selectModeBtnText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  selectModeBtnTextActive: {
    color: '#ffffff',
  },
  cardSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  selectCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#52525b',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  floatingActionBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#18181b',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBarLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  actionSelectedCount: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '700',
  },
  selectAllBtn: {
    paddingVertical: 2,
  },
  selectAllBtnText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBarButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnSend: {
    backgroundColor: '#6366f1',
  },
  actionBtnMove: {
    backgroundColor: '#3b82f6',
  },
  actionBtnDelete: {
    backgroundColor: '#dc2626',
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  moveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  moveModalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  moveModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moveModalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  moveModalSubtitle: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  moveScrollRow: {
    marginBottom: 10,
  },
  moveModalPill: {
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
  moveModalPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  moveModalPillText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  moveModalPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  moveModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  moveModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#27272a',
    alignItems: 'center',
  },
  moveModalCancelText: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '600',
  },
  moveModalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  moveModalSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
