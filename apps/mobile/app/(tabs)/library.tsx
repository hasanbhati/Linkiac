import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
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
} from 'lucide-react-native';
import { Link, isSafeWebUrl, ensureUrlProtocol } from '@linkiac/shared';
import { useApp } from '../../src/context/AppContext';
import { SaveLinkModal } from '../../src/components/SaveLinkModal';
import { LinkDetailModal } from '../../src/components/LinkDetailModal';
import { ManageFoldersModal } from '../../src/components/ManageFoldersModal';

export default function MobileLibraryScreen() {
  const { links, categories, folders } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null); // null = all, 'unfiled' = unfiled, or UUID
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);

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
              Unfiled ({links.filter(l => !l.category_id && !l.folder_id).length})
            </Text>
          </TouchableOpacity>

          {categories.map(cat => {
            const count = links.filter(l => l.category_id === cat.id).length;
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

            {availableFolders.map(f => {
              const fCount = links.filter(l => l.folder_id === f.id).length;
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
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
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
          const isWeb = isSafeWebUrl(item.url);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => handleLinkPress(item)}
            >
              <View style={styles.cardHeader}>
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
                const cat = categories.find(c => c.id === item.category_id);
                const fld = folders.find(f => f.id === item.folder_id);
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

                <TouchableOpacity
                  style={styles.detailsBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={e => {
                    e.stopPropagation();
                    setSelectedLink(item);
                  }}
                >
                  <MoreHorizontal color="#a1a1aa" size={16} />
                  <Text style={styles.detailsBtnText}>Details</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

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
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
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
});
