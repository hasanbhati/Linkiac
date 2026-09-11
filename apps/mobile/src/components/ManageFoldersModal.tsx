import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Folder, FolderPlus, Trash2, Plus, ChevronRight, Layers } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

interface ManageFoldersModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ManageFoldersModal({ visible, onClose }: ManageFoldersModalProps) {
  const { folders, links, categories, addFolder, deleteFolder, addCategory, deleteCategory } = useApp();
  const { theme, isDark } = useTheme();

  // Active sub-tab in modal
  const [modalTab, setModalTab] = useState<'folders' | 'categories'>('folders');

  // Folder creation state
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [folderCategoryId, setFolderCategoryId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Category creation state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await addFolder(newFolderName.trim(), folderCategoryId, parentFolderId);
      setNewFolderName('');
      setParentFolderId(null);
      setFolderCategoryId(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create folder.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = (id: string, name: string) => {
    Alert.alert(
      'Delete Folder',
      `Delete folder "${name}"? Contained links will remain in your library as unfiled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(id);
            } catch {
              Alert.alert('Error', 'Could not delete folder.');
            }
          },
        },
      ]
    );
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      await addCategory(newCategoryName.trim());
      setNewCategoryName('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create category.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    Alert.alert(
      'Delete Category',
      `Delete category "${name}"? Folders and links inside this category will remain, but will no longer be grouped under it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(id);
            } catch {
              Alert.alert('Error', 'Could not delete category.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.content, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.titleRow}>
              {modalTab === 'folders' ? (
                <Folder color="#f59e0b" size={20} />
              ) : (
                <Layers color={theme.accentPrimary} size={20} />
              )}
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {modalTab === 'folders' ? 'Manage Folders' : 'Manage Categories'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={theme.textMuted} size={20} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Switcher */}
          <View style={[styles.segmentedControl, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                modalTab === 'folders' ? { backgroundColor: theme.surface } : { backgroundColor: 'transparent' }
              ]}
              onPress={() => setModalTab('folders')}
              activeOpacity={0.8}
            >
              <Folder
                color={modalTab === 'folders' ? '#f59e0b' : theme.textMuted}
                size={14}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, { color: modalTab === 'folders' ? theme.textPrimary : theme.textSecondary, fontWeight: modalTab === 'folders' ? '700' : '500' }]}>
                Folders ({folders.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                modalTab === 'categories' ? { backgroundColor: theme.surface } : { backgroundColor: 'transparent' }
              ]}
              onPress={() => setModalTab('categories')}
              activeOpacity={0.8}
            >
              <Layers
                color={modalTab === 'categories' ? theme.accentPrimary : theme.textMuted}
                size={14}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, { color: modalTab === 'categories' ? theme.textPrimary : theme.textSecondary, fontWeight: modalTab === 'categories' ? '700' : '500' }]}>
                Categories ({categories.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {modalTab === 'folders' ? (
              <View style={styles.section}>
                {/* Create Folder Box */}
                <View style={[styles.createBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                  <Text style={[styles.createLabel, { color: theme.textMuted }]}>CREATE NEW FOLDER</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary, marginBottom: 10 }]}
                    placeholder="Folder name (e.g. Articles, Dev Tools)..."
                    placeholderTextColor={theme.textMuted}
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                  />

                  {/* Optional Category Picker */}
                  {categories.length > 0 && (
                    <View style={styles.catPickerRow}>
                      <Text style={[styles.catPickerLabel, { color: theme.textMuted }]}>Assign to Category (Optional):</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
                        <TouchableOpacity
                          style={[
                            styles.catChip,
                            {
                              backgroundColor: folderCategoryId === null ? theme.accentPrimaryMuted : theme.surface,
                              borderColor: folderCategoryId === null ? theme.accentPrimary : theme.border,
                            }
                          ]}
                          onPress={() => setFolderCategoryId(null)}
                        >
                          <Text style={[
                            styles.catChipText,
                            {
                              color: folderCategoryId === null ? theme.accentPrimary : theme.textSecondary,
                              fontWeight: folderCategoryId === null ? '600' : '400',
                            }
                          ]}>
                            No Category
                          </Text>
                        </TouchableOpacity>
                        {categories.map(c => {
                          const isCatSelected = folderCategoryId === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[
                                styles.catChip,
                                {
                                  backgroundColor: isCatSelected ? theme.accentPrimaryMuted : theme.surface,
                                  borderColor: isCatSelected ? theme.accentPrimary : theme.border,
                                }
                              ]}
                              onPress={() => setFolderCategoryId(c.id)}
                            >
                              <Layers
                                color={isCatSelected ? theme.accentPrimary : theme.textMuted}
                                size={12}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={[
                                styles.catChipText,
                                {
                                  color: isCatSelected ? theme.accentPrimary : theme.textSecondary,
                                  fontWeight: isCatSelected ? '600' : '400',
                                }
                              ]}>
                                {c.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Optional parent folder picker for nesting */}
                  {folders.length > 0 && (
                    <View style={styles.catPickerRow}>
                      <Text style={[styles.catPickerLabel, { color: theme.textMuted }]}>Nest under parent folder (Optional):</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
                        <TouchableOpacity
                          style={[
                            styles.catChip,
                            {
                              backgroundColor: parentFolderId === null ? theme.accentPrimaryMuted : theme.surface,
                              borderColor: parentFolderId === null ? theme.accentPrimary : theme.border,
                            }
                          ]}
                          onPress={() => setParentFolderId(null)}
                        >
                          <Text style={[
                            styles.catChipText,
                            {
                              color: parentFolderId === null ? theme.accentPrimary : theme.textSecondary,
                              fontWeight: parentFolderId === null ? '600' : '400',
                            }
                          ]}>
                            Root Folder
                          </Text>
                        </TouchableOpacity>
                        {folders.map(f => {
                          const isFolderSelected = parentFolderId === f.id;
                          return (
                            <TouchableOpacity
                              key={f.id}
                              style={[
                                styles.catChip,
                                {
                                  backgroundColor: isFolderSelected ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)') : theme.surface,
                                  borderColor: isFolderSelected ? '#f59e0b' : theme.border,
                                }
                              ]}
                              onPress={() => setParentFolderId(f.id)}
                            >
                              <Folder
                                color={isFolderSelected ? (isDark ? '#fbbf24' : '#b45309') : '#f59e0b'}
                                size={12}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={[
                                styles.catChipText,
                                {
                                  color: isFolderSelected ? (isDark ? '#fbbf24' : '#b45309') : theme.textSecondary,
                                  fontWeight: isFolderSelected ? '600' : '400',
                                }
                              ]}>
                                {f.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.folderSubmitBtn, { backgroundColor: theme.accentPrimary }, !newFolderName.trim() && styles.btnDisabled]}
                    disabled={!newFolderName.trim() || isCreatingFolder}
                    onPress={handleCreateFolder}
                  >
                    <FolderPlus color={theme.accentText} size={16} />
                    <Text style={[styles.folderSubmitBtnText, { color: theme.accentText }]}>Create Folder</Text>
                  </TouchableOpacity>
                </View>

                {/* Folder List */}
                <Text style={[styles.listHeader, { color: theme.textMuted }]}>EXISTING FOLDERS ({folders.length})</Text>
                {folders.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>No folders created yet.</Text>
                  </View>
                ) : (
                  folders.map(folder => {
                    const count = links.filter(l => l.folder_id === folder.id).length;
                    const parentName = folders.find(f => f.id === folder.parent_folder_id)?.name;
                    const catName = categories.find(c => c.id === folder.category_id)?.name;
                    return (
                      <View key={folder.id} style={[styles.itemRow, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                        <View style={styles.itemLeft}>
                          <View style={styles.itemIconFolder}>
                            <Folder color="#f59e0b" size={16} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.itemName, { color: theme.textPrimary }]}>{folder.name}</Text>
                            <Text style={[styles.itemSub, { color: theme.textMuted }]} numberOfLines={1}>
                              {count} {count === 1 ? 'link' : 'links'}
                              {catName ? ` • Category: ${catName}` : ''}
                              {parentName ? ` • in ${parentName}` : ' • Root'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteFolder(folder.id, folder.name)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 color={theme.danger} size={16} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            ) : (
              <View style={styles.section}>
                {/* Create Category Box */}
                <View style={[styles.createBox, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                  <Text style={[styles.createLabel, { color: theme.textMuted }]}>CREATE NEW CATEGORY</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.textPrimary, marginBottom: 10 }]}
                    placeholder="Category name (e.g. Work, Tech, Personal)..."
                    placeholderTextColor={theme.textMuted}
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                  />

                  <TouchableOpacity
                    style={[styles.folderSubmitBtn, { backgroundColor: theme.accentPrimary }, !newCategoryName.trim() && styles.btnDisabled]}
                    disabled={!newCategoryName.trim() || isCreatingCategory}
                    onPress={handleCreateCategory}
                  >
                    <Plus color={theme.accentText} size={16} />
                    <Text style={[styles.folderSubmitBtnText, { color: theme.accentText }]}>Create Category</Text>
                  </TouchableOpacity>
                </View>

                {/* Category List */}
                <Text style={[styles.listHeader, { color: theme.textMuted }]}>EXISTING CATEGORIES ({categories.length})</Text>
                {categories.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>No categories created yet.</Text>
                  </View>
                ) : (
                  categories.map(category => {
                    const folderCount = folders.filter(f => f.category_id === category.id).length;
                    const directLinksCount = links.filter(l => l.category_id === category.id).length;
                    return (
                      <View key={category.id} style={[styles.itemRow, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                        <View style={styles.itemLeft}>
                          <View style={styles.itemIconCategory}>
                            <Layers color={theme.accentPrimary} size={16} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.itemName, { color: theme.textPrimary }]}>{category.name}</Text>
                            <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                              {folderCount} {folderCount === 1 ? 'folder' : 'folders'} • {directLinksCount} direct links
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteCategory(category.id, category.name)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 color={theme.danger} size={16} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fafafa',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    gap: 16,
  },
  createBox: {
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 14,
  },
  createLabel: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  folderSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
  },
  folderSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  catPickerRow: {
    marginBottom: 10,
  },
  catPickerLabel: {
    color: '#71717a',
    fontSize: 11,
    marginBottom: 6,
  },
  catChips: {
    flexDirection: 'row',
    gap: 6,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  catChipActive: {
    backgroundColor: 'rgba(188, 217, 78, 0.15)',
    borderColor: '#BCD94E',
  },
  catChipText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  catChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listHeader: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemIconFolder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 13,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#09090b',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#27272a',
  },
  segmentText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  itemIconCategory: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
