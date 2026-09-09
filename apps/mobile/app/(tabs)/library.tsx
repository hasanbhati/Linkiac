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
  BookOpen,
  CheckCircle2,
  Folder,
  FolderPlus,
  Check,
  Trash2,
  X,
  ArrowLeft,
  ChevronRight,
  Layers,
} from 'lucide-react-native';
import { Link, isSafeWebUrl, ensureUrlProtocol, extractDefaultThumbnail } from '@linkiac/shared';
import { useApp } from '../../src/context/AppContext';
import { SaveLinkModal } from '../../src/components/SaveLinkModal';
import { LinkDetailModal } from '../../src/components/LinkDetailModal';
import { ManageFoldersModal } from '../../src/components/ManageFoldersModal';
import { SendLinkToFriendsModal } from '../../src/components/SendLinkToFriendsModal';

export default function MobileLibraryScreen() {
  const { links, folders, categories, syncAllFromSupabase, bulkMoveLinks, bulkDeleteLinks } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [topTab, setTopTab] = useState<'all' | 'unfiled' | 'folders'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);

  // Bulk selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isSendFriendsModalOpen, setIsSendFriendsModalOpen] = useState(false);
  const [directShareLinks, setDirectShareLinks] = useState<Link[]>([]);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // Selected links derived from selectedLinkIds
  const selectedLinks = useMemo(() => {
    return links.filter(l => selectedLinkIds.has(l.id));
  }, [links, selectedLinkIds]);

  // Root folders (top level without parent, optionally filtered by category)
  const rootFolders = useMemo(() => {
    return folders.filter(
      f => f.parent_folder_id === null && (!selectedCategoryId || f.category_id === selectedCategoryId)
    );
  }, [folders, selectedCategoryId]);

  // Active folder details
  const activeFolder = useMemo(() => {
    return selectedFolderId ? folders.find(f => f.id === selectedFolderId) : null;
  }, [folders, selectedFolderId]);

  // Subfolders contained in active folder
  const subfolders = useMemo(() => {
    return selectedFolderId ? folders.filter(f => f.parent_folder_id === selectedFolderId) : [];
  }, [folders, selectedFolderId]);

  // Parent folder for back navigation
  const parentFolder = useMemo(() => {
    return activeFolder?.parent_folder_id ? folders.find(f => f.id === activeFolder.parent_folder_id) : null;
  }, [folders, activeFolder]);

  // Matching folders for search query (Item 5)
  const matchingFolders = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    return folders.filter(f => f.name.toLowerCase().includes(q));
  }, [folders, search]);

  // Filter links by search query, top tab, and folder drill-down
  const filteredLinks = useMemo(() => {
    return links.filter(item => {
      // 1. Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchUrl = item.url.toLowerCase().includes(query);
        const matchDomain = item.domain?.toLowerCase().includes(query);
        const matchComment = item.comment?.toLowerCase().includes(query);
        if (!matchTitle && !matchUrl && !matchDomain && !matchComment) {
          return false;
        }
      }

      // 2. Top tab filter
      if (topTab === 'unfiled') {
        if (item.folder_id) return false;
      } else if (topTab === 'folders') {
        if (selectedFolderId) {
          if (item.folder_id !== selectedFolderId) return false;
        } else {
          // If no specific folder selected, only show items filed in any folder
          if (!item.folder_id) return false;
        }
      }

      // 3. Category filter
      if (selectedCategoryId) {
        const linkMatchesCat = item.category_id === selectedCategoryId;
        const folderMatchesCat = folders.find(f => f.id === item.folder_id)?.category_id === selectedCategoryId;
        if (!linkMatchesCat && !folderMatchesCat) return false;
      }

      return true;
    });
  }, [links, search, topTab, selectedFolderId, selectedCategoryId, folders]);

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
      await bulkMoveLinks(Array.from(selectedLinkIds), null, moveTargetFolderId);
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
            <BookOpen color="#a5b4fc" size={11} />
            <Text style={[styles.statusText, { color: '#a5b4fc' }]}>Reading</Text>
          </View>
        );
      case 'done':
        return (
          <View style={[styles.statusBadge, styles.statusDone]}>
            <CheckCircle2 color="#6ee7b7" size={11} />
            <Text style={[styles.statusText, { color: '#6ee7b7' }]}>Done</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, styles.statusToRead]}>
            <Text style={[styles.statusText, { color: '#a1a1aa' }]}>To Read</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Library</Text>
        <TouchableOpacity
          style={[styles.selectModeBtn, isSelectionMode && styles.selectModeBtnActive]}
          onPress={() => {
            setIsSelectionMode(!isSelectionMode);
            if (isSelectionMode) setSelectedLinkIds(new Set());
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
          placeholder="Search links, notes, or folders..."
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

      {/* Matching Folders from Search (Item 5) */}
      {matchingFolders.length > 0 && (
        <View style={styles.matchingFoldersContainer}>
          <Text style={styles.matchingFoldersTitle}>MATCHING FOLDERS ({matchingFolders.length}):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchingFoldersScroll}>
            {matchingFolders.map(mf => (
              <TouchableOpacity
                key={mf.id}
                style={styles.matchingFolderChip}
                onPress={() => {
                  setTopTab('folders');
                  setSelectedFolderId(mf.id);
                  setSearch('');
                }}
              >
                <Folder color="#f59e0b" size={12} style={{ marginRight: 4 }} />
                <Text style={styles.matchingFolderChipText}>{mf.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Top Tab Filter Switcher (Item 1: All links | Unfiled | Folders) */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.topTabBtn, topTab === 'all' && styles.topTabBtnActive]}
          activeOpacity={0.8}
          onPress={() => {
            setTopTab('all');
            setSelectedFolderId(null);
          }}
        >
          <Text style={[styles.topTabBtnText, topTab === 'all' && styles.topTabBtnTextActive]}>
            All links ({links.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, topTab === 'unfiled' && styles.topTabBtnActive]}
          activeOpacity={0.8}
          onPress={() => {
            setTopTab('unfiled');
            setSelectedFolderId(null);
          }}
        >
          <Text style={[styles.topTabBtnText, topTab === 'unfiled' && styles.topTabBtnTextActive]}>
            Unfiled ({links.filter(l => !l.folder_id).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, topTab === 'folders' && styles.topTabBtnActive]}
          activeOpacity={0.8}
          onPress={() => {
            setTopTab('folders');
            if (!selectedFolderId && rootFolders.length > 0) {
              setSelectedFolderId(rootFolders[0].id);
            }
          }}
        >
          <Folder color={topTab === 'folders' ? '#ffffff' : '#f59e0b'} size={13} style={{ marginRight: 4 }} />
          <Text style={[styles.topTabBtnText, topTab === 'folders' && styles.topTabBtnTextActive]}>
            Folders ({folders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Category Filter Bar (GAP-01) */}
      {categories.length > 0 && (
        <View style={styles.categoryBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryBarScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryBarChip,
                selectedCategoryId === null && styles.categoryBarChipActive,
              ]}
              onPress={() => setSelectedCategoryId(null)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryBarChipText,
                  selectedCategoryId === null && styles.categoryBarChipTextActive,
                ]}
              >
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map(cat => {
              const isSelected = selectedCategoryId === cat.id;
              const catLinksCount = links.filter(
                l => l.category_id === cat.id || folders.find(f => f.id === l.folder_id)?.category_id === cat.id
              ).length;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryBarChip,
                    isSelected && styles.categoryBarChipActive,
                  ]}
                  onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                  activeOpacity={0.8}
                >
                  <Layers
                    color={isSelected ? '#ffffff' : '#818cf8'}
                    size={11}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.categoryBarChipText,
                      isSelected && styles.categoryBarChipTextActive,
                    ]}
                  >
                    {cat.name} ({catLinksCount})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Horizontal Draggable Folder Bar (Shown when Folders tab is active, Item 1) */}
      {topTab === 'folders' && (
        <View style={styles.horizontalFolderContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.horizontalFolderScroll}
          >
            {rootFolders.map(rf => {
              const isSelected = selectedFolderId === rf.id || activeFolder?.parent_folder_id === rf.id;
              const fCount = links.filter(l => l.folder_id === rf.id).length;
              return (
                <TouchableOpacity
                  key={rf.id}
                  style={[styles.horizontalFolderChip, isSelected && styles.horizontalFolderChipActive]}
                  onPress={() => setSelectedFolderId(rf.id)}
                >
                  <Folder color={isSelected ? '#ffffff' : '#f59e0b'} size={13} style={{ marginRight: 5 }} />
                  <Text style={[styles.horizontalFolderChipText, isSelected && styles.horizontalFolderChipTextActive]}>
                    {rf.name} ({fCount})
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.horizontalManageBtn}
              onPress={() => setIsManageModalOpen(true)}
            >
              <FolderPlus color="#a1a1aa" size={13} style={{ marginRight: 4 }} />
              <Text style={styles.horizontalManageText}>+ Folder</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Active Folder Subfolders and Back Button (Item 1 & 4) */}
      {topTab === 'folders' && activeFolder && (parentFolder || subfolders.length > 0) && (
        <View style={styles.activeFolderHeader}>
          {parentFolder && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setSelectedFolderId(parentFolder.id)}
            >
              <ArrowLeft color="#818cf8" size={13} style={{ marginRight: 4 }} />
              <Text style={styles.backBtnText}>Back to {parentFolder.name}</Text>
            </TouchableOpacity>
          )}

          {/* Subfolders Grid inside active folder */}
          {subfolders.length > 0 && (
            <View style={styles.subfolderSection}>
              <Text style={styles.subfolderSectionTitle}>SUBFOLDERS ({subfolders.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subfoldersScroll}>
                {subfolders.map(sub => {
                  const subCount = links.filter(l => l.folder_id === sub.id).length;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={styles.subfolderCard}
                      onPress={() => setSelectedFolderId(sub.id)}
                    >
                      <Folder color="#f59e0b" size={13} style={{ marginRight: 5 }} />
                      <Text style={styles.subfolderCardName} numberOfLines={1}>{sub.name}</Text>
                      <Text style={styles.subfolderCardCount}>({subCount})</Text>
                      <ChevronRight color="#71717a" size={11} style={{ marginLeft: 3 }} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}

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
          { paddingBottom: isSelectionMode ? 120 : 85 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BookOpen color="#3f3f46" size={48} />
            <Text style={styles.emptyTitle}>
              {search ? 'No matching links or notes' : 'No items found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try a different search term or clear the filter.'
                : 'Tap the + button below to save a link or note!'}
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
                {/* Title & Status Row */}
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

                {/* Folder Badge if filed */}
                {(() => {
                  const fld = folders.find((f) => f.id === item.folder_id);
                  if (!fld) return null;
                  return (
                    <View style={styles.cardMetaRow}>
                      <View style={styles.cardFolderBadge}>
                        <Folder color="#f59e0b" size={10} />
                        <Text style={styles.cardFolderBadgeText}>{fld.name}</Text>
                      </View>
                    </View>
                  );
                })()}

                {item.comment ? (
                  <Text style={styles.commentText} numberOfLines={2}>
                    &quot;{item.comment}&quot;
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

                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => setSelectedLink(item)}
                  >
                    <Text style={styles.detailsBtnText}>Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Centered + Action Button (Item 4) */}
      {!isSelectionMode && (
        <TouchableOpacity
          style={styles.floatingAddBtn}
          activeOpacity={0.8}
          onPress={() => setIsSaveModalOpen(true)}
        >
          <Plus color="#ffffff" size={26} strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      {/* Floating Selection Action Bar */}
      {isSelectionMode && (
        <View style={styles.floatingActionBar}>
          <View style={styles.actionBarLeft}>
            <Text style={styles.actionSelectedCount}>
              {selectedLinkIds.size} selected
            </Text>
            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
              <Text style={styles.selectAllBtnText}>
                {selectedLinkIds.size === filteredLinks.length && filteredLinks.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionBarRight}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnSend,
                selectedLinkIds.size === 0 && styles.actionBtnDisabled,
              ]}
              disabled={selectedLinkIds.size === 0}
              onPress={() => setIsSendFriendsModalOpen(true)}
            >
              <Text style={styles.actionBtnSendText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnMove,
                selectedLinkIds.size === 0 && styles.actionBtnDisabled,
              ]}
              disabled={selectedLinkIds.size === 0}
              onPress={() => {
                setMoveTargetFolderId(null);
                setIsMoveModalOpen(true);
              }}
            >
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
              <Trash2 color="#ef4444" size={16} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Move Modal */}
      <Modal
        visible={isMoveModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsMoveModalOpen(false)}
      >
        <View style={styles.moveModalOverlay}>
          <View style={styles.moveModalContent}>
            <View style={styles.moveModalHeader}>
              <Text style={styles.moveModalTitle}>Move {selectedLinkIds.size} Link(s)</Text>
              <TouchableOpacity onPress={() => setIsMoveModalOpen(false)}>
                <X color="#a1a1aa" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.moveModalSubtitle}>Select Destination Folder</Text>
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
                  Unfiled (No folder)
                </Text>
              </TouchableOpacity>
              {folders.map((f) => (
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
        link={selectedLink ? (links.find(l => l.id === selectedLink.id) || selectedLink) : null}
        onClose={() => setSelectedLink(null)}
        onShareToFriends={(link) => {
          setSelectedLink(null);
          setDirectShareLinks([link]);
          setIsSendFriendsModalOpen(true);
        }}
      />

      {/* Manage Folders Modal */}
      <ManageFoldersModal
        visible={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />

      {/* Send Links to Friends Modal */}
      <SendLinkToFriendsModal
        visible={isSendFriendsModalOpen}
        links={directShareLinks.length > 0 ? directShareLinks : selectedLinks}
        onClose={() => {
          setIsSendFriendsModalOpen(false);
          setDirectShareLinks([]);
        }}
        onSuccess={() => {
          setIsSendFriendsModalOpen(false);
          setDirectShareLinks([]);
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
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
  matchingFoldersContainer: {
    marginBottom: 10,
    backgroundColor: '#18181b',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  matchingFoldersTitle: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  matchingFoldersScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  matchingFolderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  matchingFolderChipText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
  },
  topTabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  topTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  topTabBtnActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  topTabBtnText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  topTabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  categoryBarContainer: {
    marginBottom: 10,
  },
  categoryBarScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  categoryBarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  categoryBarChipActive: {
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
  },
  categoryBarChipText: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '500',
  },
  categoryBarChipTextActive: {
    color: '#e0e7ff',
    fontWeight: '700',
  },
  horizontalFolderContainer: {
    marginBottom: 10,
    backgroundColor: '#141416',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  horizontalFolderScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  horizontalFolderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1f1f23',
    borderWidth: 1,
    borderColor: '#2e2e34',
  },
  horizontalFolderChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#f59e0b',
  },
  horizontalFolderChipText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  horizontalFolderChipTextActive: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  horizontalManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1c1917',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  horizontalManageText: {
    color: '#d4d4d8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeFolderHeader: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  backBtnText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeFolderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeFolderTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  activeFolderLinkCount: {
    color: '#71717a',
    fontSize: 11,
    marginLeft: 6,
  },
  subfolderSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  subfolderSectionTitle: {
    color: '#71717a',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subfoldersScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  subfolderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  subfolderCardName: {
    color: '#fafafa',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 100,
  },
  subfolderCardCount: {
    color: '#71717a',
    fontSize: 10,
    marginLeft: 3,
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -28 }],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 40,
  },
  listContent: {
    paddingTop: 4,
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
    marginBottom: 4,
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
    paddingHorizontal: 7,
    paddingVertical: 2.5,
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
    fontSize: 10,
    fontWeight: '600',
  },
  cardUrl: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
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
  commentText: {
    color: '#d4d4d8',
    fontSize: 12,
    fontStyle: 'italic',
    backgroundColor: '#141416',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
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
    fontSize: 11,
  },
  detailsBtn: {
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
  cardSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  selectCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
  },
  actionBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnSend: {
    backgroundColor: '#4f46e5',
  },
  actionBtnSendText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnMove: {
    backgroundColor: '#27272a',
  },
  actionBtnText: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnDelete: {
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
  },
  moveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  moveModalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
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
    fontSize: 16,
    fontWeight: '700',
  },
  moveModalSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },
  moveScrollRow: {
    marginBottom: 20,
  },
  moveModalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
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
    color: '#d4d4d8',
    fontSize: 13,
  },
  moveModalPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  moveModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  moveModalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#27272a',
  },
  moveModalCancelText: {
    color: '#d4d4d8',
    fontSize: 13,
  },
  moveModalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
  },
  moveModalSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
